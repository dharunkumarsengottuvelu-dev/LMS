"use client";

import React, { useState } from "react";
import {
  BookOpen, Plus, Search, Edit, Trash2, Eye,
  Clock, Users, Sparkles, ArrowLeft, ArrowRight, Layers, Save,
  User, GraduationCap, ListChecks, PlayCircle, Link2,
  StickyNote, Code2, Dumbbell, FileText, CheckCircle2,
  PenLine, Check, ChevronRight, AlertCircle, ShieldCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ─── Module Rich Item ──────────────────────────────────────
export interface CourseSyllabusModule {
  id: string;
  title: string;
  duration: string;
  type: "video" | "reading" | "quiz" | "coding";
  videoUrl?: string;
  notes?: string;
  readingContent?: string;
  practiceDescription?: string;
  practiceTestCases?: string;
  practiceStarterCode?: string;
  quizQuestions?: string;
}

// ─── Managed Course ────────────────────────────────────────
export interface ManagedCourse {
  id: string;
  title: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "published" | "draft";
  enrolledStudents: number;
  totalLessons: number;
  instructor: string;
  durationHours: number;
  durationMins: number;
  description: string;
  modules: CourseSyllabusModule[];
}

function formatDuration(h: number, m: number) {
  if (h === 0 && m === 0) return "Self-paced";
  return [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : ""].filter(Boolean).join(" ");
}

// Helper to auto-calculate total duration from modules list
function calculateModulesTotalDuration(modules: CourseSyllabusModule[] = []): string {
  let totalMins = 0;
  (modules || []).forEach((m) => {
    if (m && m.duration) {
      const match = m.duration.match(/(\d+)/);
      if (match && match[1]) {
        totalMins += parseInt(match[1], 10);
      }
    }
  });
  if (totalMins === 0) return "Self-paced";
  const h = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return formatDuration(h, mins);
}

const initialCourses: ManagedCourse[] = [
  {
    id: "mc_1",
    title: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    category: "Web Development",
    level: "Advanced",
    status: "published",
    enrolledStudents: 142,
    totalLessons: 28,
    instructor: "Alex Rivera",
    durationHours: 24,
    durationMins: 0,
    description: "Production-ready enterprise web application engineering with React Server Components, Supabase, and TailwindCSS.",
    modules: [
      {
        id: "mod_1",
        title: "Next.js 16 App Router Fundamentals",
        duration: "45 mins",
        type: "video",
        videoUrl: "https://www.youtube.com/watch?v=example1",
        notes: "# Next.js 16 Fundamentals\n- React Server Components\n- App router folder structure",
      },
      {
        id: "mod_2",
        title: "Server Actions & Supabase Authentication",
        duration: "60 mins",
        type: "video",
        videoUrl: "https://www.youtube.com/watch?v=example2",
        notes: "JWT authentication and Supabase RLS security setup.",
      },
      {
        id: "mod_3",
        title: "Monaco Code Editor & Judge0 Integration",
        duration: "90 mins",
        type: "coding",
        practiceDescription: "Create a function to execute code using Monaco Editor.",
        practiceTestCases: "Input: 'test' → Output: 'test'\n",
        practiceStarterCode: "function solution(code) {\n  return code;\n}",
      },
    ],
  },
  {
    id: "mc_2",
    title: "Python AI & Deep Learning LLM Agentic Engineering",
    category: "AI & Machine Learning",
    level: "Intermediate",
    status: "published",
    enrolledStudents: 189,
    totalLessons: 30,
    instructor: "Dr. Elena Rostova",
    durationHours: 32,
    durationMins: 0,
    description: "PyTorch, Hugging Face, Transformers, and LLM fine-tuning for high-performance corporate applications.",
    modules: [
      {
        id: "mod_4",
        title: "Transformers Architecture Deep Dive",
        duration: "75 mins",
        type: "video",
        videoUrl: "https://youtube.com/watch?v=ai123",
        notes: "Attention mechanism and positional embeddings breakdown.",
      },
      {
        id: "mod_5",
        title: "Agentic AI Tools & LangChain",
        duration: "60 mins",
        type: "reading",
        readingContent: "# LangChain Agents Overview\n\nLearn how to create ReAct agents.",
      },
    ],
  },
];

type ViewState = "list" | "wizard" | "syllabus" | "add-module" | "edit-module";

// ─── Main Hub ──────────────────────────────────────────────
export function CourseManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [courses, setCourses] = useState<ManagedCourse[]>(initialCourses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);

  // ── Multi-Step Wizard State ──
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Step 1: Course Info (Cleaned up: Removed manual duration inputs)
  const [fTitle, setFTitle]           = useState("");
  const [fCategory, setFCategory]     = useState("");
  const [fLevel, setFLevel]           = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [fInstructor, setFInstructor] = useState("");
  const [fDesc, setFDesc]             = useState("");

  // Step 2: Course Modules Draft
  const [draftModules, setDraftModules] = useState<CourseSyllabusModule[]>([]);

  // Temp Module Builder inside Wizard Step 2
  const [showModuleBuilder, setShowModuleBuilder] = useState(false);
  const [modTitle, setModTitle]         = useState("");
  const [modDur, setModDur]             = useState("45 mins");
  const [modType, setModType]           = useState<"video" | "reading" | "quiz" | "coding">("video");
  const [modVideoUrl, setModVideoUrl]   = useState("");
  const [modNotes, setModNotes]         = useState("");
  const [modReading, setModReading]     = useState("");
  const [modDesc, setModDesc]           = useState("");
  const [modTestCases, setModTestCases] = useState("");
  const [modStarter, setModStarter]     = useState("");
  const [modQuiz, setModQuiz]           = useState("");

  // Syllabus View Edit Module state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const resetModuleBuilder = () => {
    setModTitle("");
    setModDur("45 mins");
    setModType("video");
    setModVideoUrl("");
    setModNotes("");
    setModReading("");
    setModDesc("");
    setModTestCases("");
    setModStarter("");
    setModQuiz("");
  };

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    (categoryFilter === "all" || c.category.toLowerCase().includes(categoryFilter.toLowerCase()))
  );

  // ── Open Wizard (Create or Edit) ──
  const openCreateWizard = () => {
    setEditingCourseId(null);
    setFTitle(""); setFCategory(""); setFLevel("Intermediate");
    setFInstructor(""); setFDesc("");
    setDraftModules([]);
    resetModuleBuilder();
    setShowModuleBuilder(false);
    setWizardStep(1);
    setViewState("wizard");
  };

  const openEditWizard = (c: ManagedCourse) => {
    setEditingCourseId(c.id);
    setFTitle(c.title); setFCategory(c.category); setFLevel(c.level);
    setFInstructor(c.instructor); setFDesc(c.description);
    setDraftModules([...c.modules]);
    resetModuleBuilder();
    setShowModuleBuilder(false);
    setWizardStep(1);
    setViewState("wizard");
  };

  // ── Add module to Wizard Step 2 draft ──
  const handleAddModuleToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle) return;
    const newMod: CourseSyllabusModule = {
      id: `mod_${Date.now()}`,
      title: modTitle,
      duration: modDur,
      type: modType,
      videoUrl: modType === "video" ? modVideoUrl : undefined,
      notes: modType === "video" ? modNotes : undefined,
      readingContent: modType === "reading" ? modReading : undefined,
      practiceDescription: modType === "coding" ? modDesc : undefined,
      practiceTestCases: modType === "coding" ? modTestCases : undefined,
      practiceStarterCode: modType === "coding" ? modStarter : undefined,
      quizQuestions: modType === "quiz" ? modQuiz : undefined,
    };
    setDraftModules((prev) => [...prev, newMod]);
    resetModuleBuilder();
    setShowModuleBuilder(false);
    toast({ title: "Module Added to Draft", description: `"${modTitle}" added.` });
  };

  const removeDraftModule = (id: string) => {
    setDraftModules((prev) => prev.filter((m) => m.id !== id));
  };

  // ── Final Step 3: Finish / Publish Course ──
  const handlePublishCourse = () => {
    if (!fTitle) {
      toast({ title: "Course Title Required", description: "Please go to Step 1 and enter a title.", variant: "destructive" });
      setWizardStep(1);
      return;
    }

    if (editingCourseId) {
      // Update existing course
      setCourses((prev) => prev.map((c) =>
        c.id === editingCourseId ? {
          ...c,
          title: fTitle,
          category: fCategory || "General",
          level: fLevel,
          instructor: fInstructor || "Course Instructor",
          description: fDesc,
          modules: draftModules,
          totalLessons: draftModules.length,
        } : c
      ));
      toast({ title: "Course Updated Successfully ✅", description: `"${fTitle}" saved with ${draftModules.length} modules.` });
    } else {
      // Create new course
      const created: ManagedCourse = {
        id: `mc_${Date.now()}`,
        title: fTitle,
        category: fCategory || "General",
        level: fLevel,
        status: "published",
        enrolledStudents: 0,
        totalLessons: draftModules.length,
        instructor: fInstructor || "Course Instructor",
        durationHours: 0,
        durationMins: 0,
        description: fDesc || "Newly authored interactive training course.",
        modules: draftModules,
      };
      setCourses((prev) => [created, ...prev]);
      toast({ title: "Course Published Successfully 🎉", description: `"${fTitle}" is now live for students!` });
    }

    setViewState("list");
  };

  // ── Separate Syllabus View Module Handlers ──
  const openAddModuleFromSyllabus = () => {
    resetModuleBuilder();
    setEditingModuleId(null);
    setViewState("add-module");
  };

  const openEditModuleFromSyllabus = (m: CourseSyllabusModule) => {
    setEditingModuleId(m.id);
    setModTitle(m.title);
    setModDur(m.duration);
    setModType(m.type);
    setModVideoUrl(m.videoUrl || "");
    setModNotes(m.notes || "");
    setModReading(m.readingContent || "");
    setModDesc(m.practiceDescription || "");
    setModTestCases(m.practiceTestCases || "");
    setModStarter(m.practiceStarterCode || "");
    setModQuiz(m.quizQuestions || "");
    setViewState("edit-module");
  };

  const handleSaveModuleInSyllabus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !modTitle) return;

    const moduleData: CourseSyllabusModule = {
      id: editingModuleId || `mod_${Date.now()}`,
      title: modTitle,
      duration: modDur,
      type: modType,
      videoUrl: modType === "video" ? modVideoUrl : undefined,
      notes: modType === "video" ? modNotes : undefined,
      readingContent: modType === "reading" ? modReading : undefined,
      practiceDescription: modType === "coding" ? modDesc : undefined,
      practiceTestCases: modType === "coding" ? modTestCases : undefined,
      practiceStarterCode: modType === "coding" ? modStarter : undefined,
      quizQuestions: modType === "quiz" ? modQuiz : undefined,
    };

    let updatedModules: CourseSyllabusModule[];
    if (editingModuleId) {
      updatedModules = selectedCourse.modules.map((m) => m.id === editingModuleId ? moduleData : m);
    } else {
      updatedModules = [...selectedCourse.modules, moduleData];
    }

    const updatedCourse = {
      ...selectedCourse,
      modules: updatedModules,
      totalLessons: updatedModules.length,
    };

    setSelectedCourse(updatedCourse);
    setCourses((prev) => prev.map((c) => (c.id === selectedCourse.id ? updatedCourse : c)));
    resetModuleBuilder();
    setViewState("syllabus");
    toast({ title: editingModuleId ? "Module Updated ✅" : "Module Added ✅", description: `"${modTitle}" saved to course.` });
  };

  const handleDeleteModuleInSyllabus = (modId: string, title: string) => {
    if (!selectedCourse) return;
    const updatedModules = selectedCourse.modules.filter((m) => m.id !== modId);
    const updatedCourse = { ...selectedCourse, modules: updatedModules, totalLessons: updatedModules.length };
    setSelectedCourse(updatedCourse);
    setCourses((prev) => prev.map((c) => (c.id === selectedCourse.id ? updatedCourse : c)));
    toast({ title: "Module Deleted", description: title, variant: "destructive" });
  };

  const handleToggleStatus = (id: string) =>
    setCourses((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const next = c.status === "published" ? "draft" : "published";
      toast({ title: "Status Updated", description: `${c.title} → ${next.toUpperCase()}` });
      return { ...c, status: next };
    }));

  const handleDeleteCourse = (id: string, title: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Course Removed", description: title, variant: "destructive" });
  };

  // ════════════════════════════════════════════════════════════
  // VIEW: MULTI-STEP WIZARD (STEP 1 → STEP 2 → STEP 3)
  // ════════════════════════════════════════════════════════════
  if (viewState === "wizard") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-center gap-3">
            <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-bold text-xs gap-2">
              <ArrowLeft className="h-4 w-4" /> Cancel & Exit Wizard
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                {editingCourseId ? "Edit Course Wizard" : "Author New Course Wizard"}
              </h1>
              <p className="text-xs text-[#6B7280]">Step-by-step course authoring & curriculum setup</p>
            </div>
          </div>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: 1, title: "1. Course Details", desc: "Title, instructor, category" },
            { step: 2, title: "2. Curriculum & Content", desc: "Videos, notes, coding, quiz" },
            { step: 3, title: "3. Review & Publish", desc: "Final verification" },
          ].map((item) => {
            const isActive = wizardStep === item.step;
            const isCompleted = wizardStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setWizardStep(item.step as 1 | 2 | 3)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
                    : isCompleted
                    ? "border-[#16A34A] bg-[#16A34A]/5"
                    : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? "text-[#2563EB]" : isCompleted ? "text-[#16A34A]" : "text-[#6B7280]"}`}>
                    {item.title}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  ) : (
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isActive ? "bg-[#2563EB] text-white" : "bg-[#E5E7EB] text-[#6B7280]"
                    }`}>
                      {item.step}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">{item.desc}</p>
              </button>
            );
          })}
        </div>

        {/* ── STEP 1: COURSE METADATA (REMOVED MANUAL DURATION) ── */}
        {wizardStep === 1 && (
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
              <BookOpen className="h-4 w-4 text-[#2563EB]" /> Step 1: Basic Course Metadata
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                <span>Course Title</span>
                <span className="text-[10px] font-semibold text-[#2563EB]">Required</span>
              </label>
              <Input placeholder="e.g. React 19 & Next.js 16 Enterprise Production Blueprint"
                value={fTitle} onChange={(e) => setFTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Domain Category</label>
                <Input placeholder="e.g. Web Development, AI & ML, DevOps..."
                  value={fCategory} onChange={(e) => setFCategory(e.target.value)} required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Difficulty Level</label>
                <Select value={fLevel} onValueChange={(v) => setFLevel((v as any) || "Intermediate")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">🟢 Beginner</SelectItem>
                    <SelectItem value="Intermediate">🟡 Intermediate</SelectItem>
                    <SelectItem value="Advanced">🔴 Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[#2563EB]" /> Instructor Name
              </label>
              <Input placeholder="e.g. Dr. Elena Rostova or Alex Rivera"
                value={fInstructor} onChange={(e) => setFInstructor(e.target.value)} required
                className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Overview Description & Learning Outcomes</label>
              <Textarea placeholder="Write course description for student portal..."
                value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={5}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="pt-4 flex items-center justify-end border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" onClick={() => {
                if (!fTitle) {
                  toast({ title: "Title Required", description: "Please enter course title first.", variant: "destructive" });
                  return;
                }
                setWizardStep(2);
              }} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
                Next: Add Curriculum Content <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* ── STEP 2: CURRICULUM MODULES & CONTENT ── */}
        {wizardStep === 2 && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-3xl shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                    <Layers className="h-4 w-4 text-[#9333EA]" /> Step 2: Curriculum Modules & Content ({draftModules.length} Modules)
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">Configure Video URLs, Notes, Coding Challenges, and Quizzes</p>
                </div>
                <Button type="button" onClick={() => { resetModuleBuilder(); setShowModuleBuilder(true); }}
                  className="h-10 px-4 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold text-xs rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> Add Module
                </Button>
              </div>

              {/* Draft Modules List */}
              {draftModules.length === 0 && !showModuleBuilder && (
                <div className="text-center py-12 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-[#9CA3AF]">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">No modules added to this course draft yet.</p>
                  <p className="text-[11px] mt-1">Click "Add Module" to configure videos, notes, coding challenges or quizzes.</p>
                </div>
              )}

              <div className="space-y-3">
                {draftModules.map((m, idx) => (
                  <div key={m.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 text-[#9333EA] font-bold text-xs flex items-center justify-center border border-[#9333EA]/20 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm truncate">{m.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className="text-[10px] font-bold capitalize bg-[#9333EA] text-white">{m.type}</Badge>
                          {m.videoUrl && (
                            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 text-[9px] font-bold gap-0.5">
                              <PlayCircle className="h-2.5 w-2.5" /> Video URL
                            </Badge>
                          )}
                          {m.notes && (
                            <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 text-[9px] font-bold gap-0.5">
                              <StickyNote className="h-2.5 w-2.5" /> Notes
                            </Badge>
                          )}
                          {m.readingContent && (
                            <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 text-[9px] font-bold gap-0.5">
                              <FileText className="h-2.5 w-2.5" /> Article
                            </Badge>
                          )}
                          {m.practiceDescription && (
                            <Badge className="bg-[#9333EA]/10 text-[#9333EA] border border-[#9333EA]/20 text-[9px] font-bold gap-0.5">
                              <Dumbbell className="h-2.5 w-2.5" /> Code Challenge
                            </Badge>
                          )}
                          {m.quizQuestions && (
                            <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[9px] font-bold gap-0.5">
                              <ListChecks className="h-2.5 w-2.5" /> Quiz
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-xs font-mono font-bold px-3 py-1 border-[#9333EA]/30 text-[#9333EA]">
                        {m.duration}
                      </Badge>
                      <Button type="button" onClick={() => removeDraftModule(m.id)} variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626]">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* INLINE MODULE BUILDER */}
            {showModuleBuilder && (
              <Card className="bg-white dark:bg-[#18181B] border-2 border-[#9333EA] p-6 rounded-3xl space-y-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#9333EA] flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Add Module Content
                  </h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowModuleBuilder(false)} className="text-xs">
                    Cancel
                  </Button>
                </div>

                <form onSubmit={handleAddModuleToDraft} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module / Lesson Title</label>
                    <Input placeholder="e.g. Next.js 16 Middleware & JWT Verification" value={modTitle}
                      onChange={(e) => setModTitle(e.target.value)} required
                      className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Type</label>
                      <Select value={modType} onValueChange={(v) => setModType((v as any) || "video")}>
                        <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">📹 Video Lesson + Notes</SelectItem>
                          <SelectItem value="coding">💻 Coding Challenge (Monaco)</SelectItem>
                          <SelectItem value="reading">📄 Reading Material</SelectItem>
                          <SelectItem value="quiz">❓ Quiz Evaluation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration</label>
                      <Input placeholder="e.g. 45 mins" value={modDur} onChange={(e) => setModDur(e.target.value)} required
                        className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
                    </div>
                  </div>

                  {/* VIDEO TYPE FIELDS */}
                  {modType === "video" && (
                    <div className="p-5 rounded-2xl border border-[#2563EB]/20 bg-[#2563EB]/5 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 text-[#2563EB]" /> Video URL (YouTube, Vimeo, Loom, Drive)
                        </label>
                        <Input type="url" placeholder="https://www.youtube.com/watch?v=..." value={modVideoUrl}
                          onChange={(e) => setModVideoUrl(e.target.value)} className="h-[44px] text-xs rounded-xl bg-white dark:bg-[#09090B]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <StickyNote className="h-3.5 w-3.5 text-[#2563EB]" /> Lesson Notes & Key Takeaways
                        </label>
                        <Textarea placeholder="# Lesson Notes..." value={modNotes} onChange={(e) => setModNotes(e.target.value)} rows={5}
                          className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
                      </div>
                    </div>
                  )}

                  {/* READING TYPE FIELDS */}
                  {modType === "reading" && (
                    <div className="p-5 rounded-2xl border border-[#16A34A]/20 bg-[#16A34A]/5 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Full Article Content</label>
                        <Textarea placeholder="# Article Content..." value={modReading} onChange={(e) => setModReading(e.target.value)} rows={8}
                          className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
                      </div>
                    </div>
                  )}

                  {/* CODING TYPE FIELDS */}
                  {modType === "coding" && (
                    <div className="p-5 rounded-2xl border border-[#9333EA]/20 bg-[#9333EA]/5 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Description</label>
                        <Textarea placeholder="Problem statement..." value={modDesc} onChange={(e) => setModDesc(e.target.value)} rows={4}
                          className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Test Cases (Input → Output)</label>
                        <Textarea placeholder="Input: 'hello' → Output: 'olleh'" value={modTestCases} onChange={(e) => setModTestCases(e.target.value)} rows={3}
                          className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Starter Code</label>
                        <Textarea placeholder="function solution(input) {}" value={modStarter} onChange={(e) => setModStarter(e.target.value)} rows={4}
                          className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
                      </div>
                    </div>
                  )}

                  {/* QUIZ TYPE FIELDS */}
                  {modType === "quiz" && (
                    <div className="p-5 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Quiz MCQ Questions</label>
                        <Textarea placeholder={"Q1. Question?\nA) Option 1\nB) Option 2 ✓"} value={modQuiz} onChange={(e) => setModQuiz(e.target.value)} rows={6}
                          className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowModuleBuilder(false)} className="h-10 text-xs font-bold">Cancel</Button>
                    <Button type="submit" className="h-10 px-6 bg-[#9333EA] text-white font-bold text-xs rounded-xl">Add Module to Draft</Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Step 2 Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setWizardStep(1)} className="h-[48px] px-6 font-bold text-xs gap-2 rounded-xl">
                <ArrowLeft className="h-4 w-4" /> Previous: Course Info
              </Button>
              <Button type="button" onClick={() => setWizardStep(3)} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
                Next: Review & Publish <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW & PUBLISH ── */}
        {wizardStep === 3 && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm space-y-6">
              <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Step 3: Final Verification & Publish
              </h2>

              <div className="p-6 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-bold border-[#2563EB]/30 text-[#2563EB]">
                    {fCategory || "General"}
                  </Badge>
                  <Badge className="bg-[#16A34A] text-white text-xs">{fLevel}</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">{fTitle || "Untitled Course"}</h3>
                  <p className="text-xs text-[#6B7280] mt-1">Instructor: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{fInstructor || "Course Instructor"}</span></p>
                  <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">{fDesc || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] text-xs">
                  <div>
                    <span className="text-[#6B7280]">Calculated Duration:</span>
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{calculateModulesTotalDuration(draftModules)}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Total Modules:</span>
                    <p className="font-bold text-[#2563EB]">{draftModules.length} Modules</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Status:</span>
                    <p className="font-bold text-[#16A34A]">Published</p>
                  </div>
                </div>
              </div>

              {/* Modules Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Curriculum Modules Summary ({draftModules.length}):</h4>
                {draftModules.map((m, idx) => (
                  <div key={m.id} className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{idx + 1}. {m.title}</span>
                    <Badge className="text-[10px] bg-[#9333EA] text-white capitalize">{m.type} ({m.duration})</Badge>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <Button type="button" variant="outline" onClick={() => setWizardStep(2)} className="h-[48px] px-6 font-bold text-xs gap-2 rounded-xl">
                  <ArrowLeft className="h-4 w-4" /> Previous: Modules
                </Button>
                <Button type="button" onClick={handlePublishCourse} className="h-[48px] px-8 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#16A34A]/20">
                  <Sparkles className="h-4 w-4" /> {editingCourseId ? "Save & Update Course" : "🚀 Publish Course Now"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: SYLLABUS DIRECT VIEW
  // ════════════════════════════════════════════════════════════
  if (viewState === "syllabus" && selectedCourse) return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex items-center gap-3">
          <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-bold text-xs gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Courses
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">{selectedCourse.title}</h1>
            <p className="text-xs text-[#6B7280]">{selectedCourse.category} • {selectedCourse.level} • Instructor: {selectedCourse.instructor}</p>
          </div>
        </div>
        <Button onClick={openAddModuleFromSyllabus}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-2 px-5 rounded-xl shrink-0">
          <Plus className="h-4 w-4" /> Add Module / Lesson
        </Button>
      </div>

      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-3xl shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#2563EB]" /> Course Syllabus ({selectedCourse.modules.length} Lessons)
          </span>
        </h2>

        {selectedCourse.modules.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-[#9CA3AF]">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold">No modules authored for this course yet.</p>
            <Button onClick={openAddModuleFromSyllabus} size="sm" className="mt-3 bg-[#2563EB] text-white font-bold text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add First Module
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {selectedCourse.modules.map((m, idx) => (
            <div key={m.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs flex items-center justify-center border border-[#2563EB]/20 shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm truncate">{m.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className="text-[10px] font-bold capitalize bg-[#2563EB] text-white">{m.type}</Badge>
                    {m.videoUrl && (
                      <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 text-[9px] font-bold gap-0.5">
                        <PlayCircle className="h-2.5 w-2.5" /> Video URL
                      </Badge>
                    )}
                    {m.notes && (
                      <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 text-[9px] font-bold gap-0.5">
                        <StickyNote className="h-2.5 w-2.5" /> Notes
                      </Badge>
                    )}
                    {m.practiceDescription && (
                      <Badge className="bg-[#9333EA]/10 text-[#9333EA] border border-[#9333EA]/20 text-[9px] font-bold gap-0.5">
                        <Dumbbell className="h-2.5 w-2.5" /> Code Challenge
                      </Badge>
                    )}
                    {m.quizQuestions && (
                      <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[9px] font-bold gap-0.5">
                        <ListChecks className="h-2.5 w-2.5" /> Quiz
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className="text-xs font-mono font-bold px-3 py-1 border-[#2563EB]/30 text-[#2563EB]">
                  {m.duration}
                </Badge>
                <Button onClick={() => openEditModuleFromSyllabus(m)} variant="outline" size="sm" className="h-8 text-xs font-bold gap-1 border-[#F59E0B] text-[#F59E0B]">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button onClick={() => handleDeleteModuleInSyllabus(m.id, m.title)} variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626]">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── VIEW: ADD / EDIT MODULE IN SYLLABUS DIRECT VIEW ─────
  if ((viewState === "add-module" || viewState === "edit-module") && selectedCourse) {
    const isEditMod = viewState === "edit-module";
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button onClick={() => setViewState("syllabus")} variant="outline" size="sm" className="h-9 font-bold text-xs gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Syllabus
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              {isEditMod ? "Edit Lesson / Module Content" : "Author New Lesson / Module"}
            </h1>
            <p className="text-xs text-[#6B7280]">{selectedCourse.title}</p>
          </div>
        </div>

        <form onSubmit={handleSaveModuleInSyllabus} className="space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-3xl shadow-sm space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module / Lesson Title</label>
              <Input placeholder="e.g. Next.js 16 Middleware & JWT Verification" value={modTitle}
                onChange={(e) => setModTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Type</label>
                <Select value={modType} onValueChange={(v) => setModType((v as any) || "video")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">📹 Video Lesson + Notes</SelectItem>
                    <SelectItem value="coding">💻 Coding Challenge (Monaco)</SelectItem>
                    <SelectItem value="reading">📄 Reading Material</SelectItem>
                    <SelectItem value="quiz">❓ Quiz Evaluation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Lesson Duration</label>
                <Input placeholder="e.g. 45 mins" value={modDur} onChange={(e) => setModDur(e.target.value)} required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
              </div>
            </div>
          </Card>

          {/* VIDEO */}
          {modType === "video" && (
            <Card className="p-6 rounded-3xl border-2 border-[#2563EB]/20 bg-[#2563EB]/5 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-[#2563EB]" /> Video URL
                </label>
                <Input type="url" placeholder="https://www.youtube.com/watch?v=..." value={modVideoUrl}
                  onChange={(e) => setModVideoUrl(e.target.value)} className="h-[48px] text-xs rounded-xl bg-white dark:bg-[#09090B]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Lesson Notes</label>
                <Textarea placeholder="# Lesson Notes..." value={modNotes} onChange={(e) => setModNotes(e.target.value)} rows={6}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
              </div>
            </Card>
          )}

          {/* CODING */}
          {modType === "coding" && (
            <Card className="p-6 rounded-3xl border-2 border-[#9333EA]/20 bg-[#9333EA]/5 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Description</label>
                <Textarea placeholder="Problem statement..." value={modDesc} onChange={(e) => setModDesc(e.target.value)} rows={4}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Test Cases</label>
                <Textarea placeholder="Input: 'hello' → Output: 'olleh'" value={modTestCases} onChange={(e) => setModTestCases(e.target.value)} rows={3}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Starter Code</label>
                <Textarea placeholder="function solution() {}" value={modStarter} onChange={(e) => setModStarter(e.target.value)} rows={4}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
              </div>
            </Card>
          )}

          {/* QUIZ */}
          {modType === "quiz" && (
            <Card className="p-6 rounded-3xl border-2 border-[#F59E0B]/20 bg-[#F59E0B]/5 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Quiz MCQ Questions</label>
                <Textarea placeholder={"Q1. Question?\nA) Option 1\nB) Option 2 ✓"} value={modQuiz} onChange={(e) => setModQuiz(e.target.value)} rows={8}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B]" />
              </div>
            </Card>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setViewState("syllabus")} className="h-[48px] px-6 font-bold text-xs rounded-xl">Cancel</Button>
            <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
              <Sparkles className="h-4 w-4" /> Save Module
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VIEW: LIST COURSES
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Enterprise Course & Curriculum Manager" : "Assigned Training Courses"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Author courses with step-by-step wizard (Course Info → Curriculum Modules → Review & Publish)
          </p>
        </div>
        <Button onClick={openCreateWizard}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20">
          <Plus className="h-4 w-4" /> Author New Course (3-Step Wizard)
        </Button>
      </div>

      {/* Filter */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input placeholder="Search course title..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]" />
          </div>
          <Input placeholder="Filter by category..." value={categoryFilter === "all" ? "" : categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value || "all")}
            className="h-[44px] text-xs w-full md:w-[220px] bg-[#F9FAFB] dark:bg-[#09090B]" />
        </div>
      </Card>

      {/* Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course) => (
          <Card key={course.id}
            className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-bold border-[#2563EB]/30 text-[#2563EB]">
                  {course.category}
                </Badge>
                <Badge className={course.status === "published" ? "bg-[#16A34A] text-white text-[10px]" : "bg-[#6B7280] text-white text-[10px]"}>
                  {course.status}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-base text-[#111827] dark:text-[#FAFAFA] leading-snug">{course.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-[10px] font-medium">{course.level}</Badge>
                  <span className="text-xs text-[#6B7280]">Instructor: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{course.instructor}</span></span>
                </div>
                <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5 leading-relaxed">{course.description}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B7280] pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <span className="flex items-center gap-1 font-bold text-[#111827] dark:text-[#FAFAFA]">
                  <Users className="h-3.5 w-3.5 text-[#2563EB]" /> {course.enrolledStudents} Learners
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-[#9333EA]" /> {course.totalLessons} Lessons
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#16A34A]" /> {calculateModulesTotalDuration(course.modules)}
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <Button onClick={() => { setSelectedCourse(course); setViewState("syllabus"); }}
                  variant="outline" size="sm"
                  className="flex-1 h-8 text-xs font-bold gap-1 border-[#2563EB] text-[#2563EB] min-w-0">
                  <Eye className="h-3.5 w-3.5" /> Syllabus ({course.modules.length})
                </Button>
                <Button onClick={() => openEditWizard(course)} variant="outline" size="sm"
                  className="h-8 text-xs font-bold gap-1 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/5">
                  <Edit className="h-3.5 w-3.5" /> Edit Wizard
                </Button>
                <Button onClick={() => handleToggleStatus(course.id)} variant="outline" size="sm"
                  className="h-8 text-xs font-bold text-[#6B7280]">
                  {course.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button onClick={() => handleDeleteCourse(course.id, course.title)} variant="ghost" size="icon"
                  className="h-8 w-8 text-[#DC2626]">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
