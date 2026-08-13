"use client";

import React, { useState, useEffect } from "react";
import { CourseService } from "@/services/course.service";
import {
  BookOpen, Plus, Search, Edit, Trash2, Eye,
  Clock, Users, Sparkles, ArrowLeft, ArrowRight, Layers,
  User, GraduationCap, ListChecks, PlayCircle,
  StickyNote, Code2, FileText, CheckCircle2,
  Check, ShieldCheck,
  UploadCloud, PenSquare, HardDrive
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";
import { QuizMcqCreator } from "@/components/admin/quiz-mcq-creator";
import { useLMSStore } from "@/lib/store/lms-store";
import { PageHeader } from "@/components/layouts/page-header";

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
  thumbnail?: string;
  modules: CourseSyllabusModule[];
  assignedBatches?: string[];
  assignedStudents?: string[];
}

function formatDuration(h: number, m: number) {
  if (h === 0 && m === 0) return "Self-paced";
  return [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : ""].filter(Boolean).join(" ");
}

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

const initialCourses: ManagedCourse[] = [];

type ViewState = "list" | "wizard" | "syllabus" | "add-module" | "edit-module";

export function CourseManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<string[]>([]);
  const [courses, setCourses] = useState<ManagedCourse[]>(initialCourses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const { data: studentsData } = await supabase.from("profiles").select("*").eq("role", "student");
        if (studentsData) {
          setAllStudents(studentsData.map((s: any) => ({
            id: s.id,
            name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Unknown",
            email: s.email,
            batch: s.batch || "Unassigned Batch"
          })));
        }

        const { data: batchesData } = await supabase.from("batches").select("batch_name");
        if (batchesData) {
          setAllBatches(batchesData.map((b: any) => b.batch_name));
        }
      } catch(err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadCourses() {
      try {
        const dbCourses = await CourseService.getCourses();
        if (dbCourses && dbCourses.length > 0) {
          const mapped: ManagedCourse[] = dbCourses.map(c => ({
            id: c.id,
            title: c.title,
            category: c.category?.name || "General",
            level: c.difficulty === "beginner" ? "Beginner" : c.difficulty === "advanced" ? "Advanced" : "Intermediate",
            status: c.status === "published" ? "published" : "draft",
            enrolledStudents: c.enrollment_count || 0,
            totalLessons: c.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0,
            instructor: c.trainer?.first_name ? `${c.trainer.first_name} ${c.trainer.last_name}` : "Admin",
            durationHours: c.duration_hours || 0,
            durationMins: 0,
            description: c.description || "",
            thumbnail: c.thumbnail_url || undefined,
            modules: [],
            assignedBatches: [],
            assignedStudents: []
          }));
          setCourses(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    }
    loadCourses();
  }, []);

  // Assign Modal State
  const [assigningCourse, setAssigningCourse] = useState<ManagedCourse | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignBatchFilter, setAssignBatchFilter] = useState("all");

  const openAssignModal = (course: ManagedCourse) => {
    setAssigningCourse(course);
    setSelectedBatches(course.assignedBatches || []);
    setSelectedStudentIds(course.assignedStudents || []);
    setAssignBatchFilter("all");
  };

  const handleSaveAssignments = () => {
    if (!assigningCourse) return;
    setCourses((prev) =>
      prev.map((c) =>
        c.id === assigningCourse.id
          ? {
              ...c,
              assignedBatches: selectedBatches,
              assignedStudents: selectedStudentIds,
              enrolledStudents: selectedStudentIds.length || c.enrolledStudents,
            }
          : c
      )
    );
    toast({
      title: "Course Assigned",
      description: `Course "${assigningCourse.title}" assigned to ${selectedBatches.length} batch(es) and ${selectedStudentIds.length} student(s).`,
    });
    setAssigningCourse(null);
  };

  // Multi-Step Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Step 1: Course Metadata
  const [fTitle, setFTitle]           = useState("");
  const [fCategory, setFCategory]     = useState("");
  const [fLevel, setFLevel]           = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [fInstructor, setFInstructor] = useState("");
  const [fDesc, setFDesc]             = useState("");
  const [fThumbnail, setFThumbnail]   = useState("");

  // Step 2: Course Modules Draft
  const [draftModules, setDraftModules] = useState<CourseSyllabusModule[]>([]);

  // Temp Module Builder inside Wizard Step 2
  const [showModuleBuilder, setShowModuleBuilder] = useState(false);
  const [modTitle, setModTitle]         = useState("");
  const [modDurEnabled, setModDurEnabled] = useState(true);
  const [modStartTime, setModStartTime]   = useState("09:00");
  const [modEndTime, setModEndTime]     = useState("09:45");
  const [modDur, setModDur]             = useState("45 mins");
  const [modType, setModType]           = useState<"video" | "reading" | "quiz" | "coding">("video");
  const [modVideoUrl, setModVideoUrl]   = useState("");
  const [modNotes, setModNotes]         = useState("");
  const [modNotesFile, setModNotesFile] = useState<File | null>(null);
  const [modNotesType, setModNotesType] = useState<"text" | "pdf">("text");
  const [modReading, setModReading]     = useState("");
  const [modReadingFile, setModReadingFile] = useState<File | null>(null);
  const [modReadingType, setModReadingType] = useState<"text" | "pdf">("text");
  const [modDesc, setModDesc]           = useState("");
  const [modTestCases, setModTestCases] = useState("");
  const [modStarter, setModStarter]     = useState("");
  const [modQuiz, setModQuiz]           = useState("");

  const [showCodingProblemBuilder, setShowCodingProblemBuilder] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const [sH = 0, sM = 0] = start.split(":").map(Number);
    const [eH = 0, eM = 0] = end.split(":").map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    let diff = endMins - startMins;
    if (diff <= 0) diff += 24 * 60; // wrap around midnight if needed
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} mins`;
    if (hours > 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${mins} mins`;
  };

  const handleTimeChange = (start: string, end: string) => {
    setModStartTime(start);
    setModEndTime(end);
    if (modDurEnabled) {
      setModDur(calculateDuration(start, end));
    }
  };

  const handleToggleDuration = (enabled: boolean) => {
    setModDurEnabled(enabled);
    if (enabled) {
      setModDur(calculateDuration(modStartTime, modEndTime));
    } else {
      setModDur("N/A");
    }
  };

  const resetModuleBuilder = () => {
    setEditingModuleId(null);
    setModTitle("");
    setModDurEnabled(true);
    setModStartTime("09:00");
    setModEndTime("09:45");
    setModDur("45 mins");
    setModType("video");
    setModVideoUrl("");
    setModNotes("");
    setModNotesFile(null);
    setModNotesType("text");
    setModReading("");
    setModReadingFile(null);
    setModReadingType("text");
    setModDesc("");
    setModTestCases("");
    setModStarter("");
    setModQuiz("");
  };

  const openEditDraftModule = (m: CourseSyllabusModule) => {
    setEditingModuleId(m.id);
    setModTitle(m.title);
    setModDur(m.duration);
    setModDurEnabled(m.duration !== "N/A" && m.duration !== "Disabled");
    setModType(m.type);
    setModVideoUrl(m.videoUrl || "");
    setModNotes(m.notes || "");
    setModReading(m.readingContent || "");
    setModDesc(m.practiceDescription || "");
    setModTestCases(m.practiceTestCases || "");
    setModStarter(m.practiceStarterCode || "");
    setModQuiz(m.quizQuestions || "");
    setShowModuleBuilder(true);
  };

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    (categoryFilter === "all" || c.category.toLowerCase().includes(categoryFilter.toLowerCase()))
  );

  const openCreateWizard = () => {
    setEditingCourseId(null);
    setFTitle(""); setFCategory(""); setFLevel("Intermediate");
    setFInstructor(""); setFDesc(""); setFThumbnail("");
    setDraftModules([]);
    resetModuleBuilder();
    setShowModuleBuilder(false);
    setWizardStep(1);
    setViewState("wizard");
  };

  const openEditWizard = (c: ManagedCourse) => {
    setEditingCourseId(c.id);
    setFTitle(c.title); setFCategory(c.category); setFLevel(c.level);
    setFInstructor(c.instructor); setFDesc(c.description); setFThumbnail(c.thumbnail || "");
    setDraftModules([...c.modules]);
    resetModuleBuilder();
    setShowModuleBuilder(false);
    setWizardStep(1);
    setViewState("wizard");
  };

  const handleAddModuleToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle) return;
    const newMod: CourseSyllabusModule = {
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
    if (editingModuleId) {
      setDraftModules((prev) => prev.map((m) => (m.id === editingModuleId ? newMod : m)));
      toast({ title: "Module Updated", description: `"${modTitle}" updated in curriculum draft.` });
    } else {
      setDraftModules((prev) => [...prev, newMod]);
      toast({ title: "Module Added", description: `"${modTitle}" appended to curriculum draft.` });
    }
    resetModuleBuilder();
    setShowModuleBuilder(false);
  };

  const removeDraftModule = (id: string) => {
    setDraftModules((prev) => prev.filter((m) => m.id !== id));
    if (editingModuleId === id) {
      resetModuleBuilder();
      setShowModuleBuilder(false);
    }
  };

  const handlePublishCourse = () => {
    if (!fTitle) {
      toast({ title: "Title Required", description: "Please enter a course title in Step 1.", variant: "destructive" });
      setWizardStep(1);
      return;
    }

    if (editingCourseId) {
      setCourses((prev) => prev.map((c) =>
        c.id === editingCourseId ? {
          ...c,
          title: fTitle,
          category: fCategory || "General",
          level: fLevel,
          instructor: fInstructor || "Course Instructor",
          description: fDesc,
          thumbnail: fThumbnail || c.thumbnail,
          modules: draftModules,
          totalLessons: draftModules.length,
        } : c
      ));
      toast({ title: "Course Updated", description: `"${fTitle}" saved successfully.` });
    } else {
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
        description: fDesc || "Newly authored enterprise training course.",
        thumbnail: fThumbnail || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
        modules: draftModules,
      };

      const difficultyMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
        "Beginner": "beginner",
        "Intermediate": "intermediate",
        "Advanced": "advanced"
      };

      CourseService.createCourse({
        title: created.title,
        description: created.description,
        category_id: "00000000-0000-0000-0000-000000000000",
        difficulty: difficultyMap[created.level] || "beginner",
        visibility: "public"
      }).then(dbCourse => {
        if (dbCourse) {
           created.id = dbCourse.id;
        }
      }).catch(err => console.error("Failed to save to Supabase", err));

      setCourses((prev) => [created, ...prev]);
      toast({ title: "Course Published", description: `"${fTitle}" is live.` });
    }

    setViewState("list");
  };

  const openAddModuleFromSyllabus = () => {
    resetModuleBuilder();
    setEditingModuleId(null);
    setViewState("add-module");
  };

  const openEditModuleFromSyllabus = (m: CourseSyllabusModule) => {
    setEditingModuleId(m.id);
    setModTitle(m.title);
    setModDur(m.duration);
    setModDurEnabled(m.duration !== "N/A" && m.duration !== "Disabled");
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
    toast({ title: editingModuleId ? "Module Saved" : "Module Created", description: `"${modTitle}" saved to course.` });
  };

  const handleDeleteModuleInSyllabus = (modId: string, title: string) => {
    if (!selectedCourse) return;
    const updatedModules = selectedCourse.modules.filter((m) => m.id !== modId);
    const updatedCourse = { ...selectedCourse, modules: updatedModules, totalLessons: updatedModules.length };
    setSelectedCourse(updatedCourse);
    setCourses((prev) => prev.map((c) => (c.id === selectedCourse.id ? updatedCourse : c)));
    toast({ title: "Module Removed", description: title, variant: "destructive" });
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
    toast({ title: "Course Deleted", description: title, variant: "destructive" });
  };

  // ════════════════════════════════════════════════════════════
  // VIEW: MULTI-STEP WIZARD (PROFESSIONAL MNC STYLING, ZERO EMOJIS)
  // ════════════════════════════════════════════════════════════
  if (viewState === "wizard") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <PageHeader
          title={editingCourseId ? "Course Configuration Wizard" : "Enterprise Course Creation Wizard"}
          description="Structured multi-step curriculum authoring"
          backAction={{ label: "Exit Authoring", onClick: () => setViewState("list") }}
        />

        {/* STEP PROGRESS INDICATOR */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: 1, title: "1. Basic Metadata", desc: "Title, category & instructor" },
            { step: 2, title: "2. Curriculum Content", desc: "Lessons, code & assessments" },
            { step: 3, title: "3. Review & Deploy", desc: "Verification & deployment" },
          ].map((item) => {
            const isActive = wizardStep === item.step;
            const isCompleted = wizardStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setWizardStep(item.step as 1 | 2 | 3)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
                    : isCompleted
                    ? "border-[#16A34A] bg-[#16A34A]/5"
                    : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]"
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
                      isActive ? "bg-[#2563EB] text-white" : "bg-[#E5E7EB] dark:bg-[#27272A] text-[#6B7280]"
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

        {/* STEP 1: METADATA */}
        {wizardStep === 1 && (
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
              <BookOpen className="h-4 w-4 text-[#2563EB]" /> Course Overview & Identity
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                <span>Course Title</span>
                <span className="text-[10px] font-semibold text-[#2563EB]">Required</span>
              </label>
              <Input placeholder="e.g. Full Stack Next.js 16 Enterprise Production Architecture"
                value={fTitle} onChange={(e) => setFTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Domain Category</label>
                <Input placeholder="e.g. Web Development, Cloud Systems, AI Engineering"
                  value={fCategory} onChange={(e) => setFCategory(e.target.value)} required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Difficulty Level</label>
                <Select value={fLevel} onValueChange={(v) => setFLevel(v || "Intermediate")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner Level</SelectItem>
                    <SelectItem value="Intermediate">Intermediate Level</SelectItem>
                    <SelectItem value="Advanced">Advanced Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[#2563EB]" /> Lead Instructor Name
              </label>
              <Input placeholder="e.g. Alex Rivera"
                value={fInstructor} onChange={(e) => setFInstructor(e.target.value)} required
                className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Executive Summary & Learning Outcomes</label>
              <Textarea placeholder="Write course objectives and syllabus takeaways..."
                value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={4}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                <span>Course Thumbnail Image</span>
                <span className="text-[10px] font-semibold text-[#2563EB]">Upload Local File OR Paste Image URL</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode 1: Manual File Upload from Computer / Device */}
                <div className="relative">
                  <input
                    type="file"
                    id="thumbnail-file-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setFThumbnail(event.target.result as string);
                            toast({ title: "Image Selected", description: `File "${file.name}" loaded for thumbnail.` });
                          }
                        };
                        reader.onerror = () => {
                          toast({ title: "File Error", description: "Failed to read the selected file.", variant: "destructive" });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="thumbnail-file-upload"
                    className="flex items-center justify-center gap-2 h-[48px] px-4 rounded-xl border border-dashed border-[#2563EB]/40 bg-[#2563EB]/5 hover:bg-[#2563EB]/10 text-[#2563EB] text-xs font-bold cursor-pointer transition-all w-full text-center"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload Image File from Device</span>
                  </label>
                </div>

                {/* Mode 2: Direct URL Input */}
                <div>
                  <Input
                    placeholder="Or paste image URL (https://...)"
                    value={fThumbnail}
                    onChange={(e) => setFThumbnail(e.target.value)}
                    className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                  />
                </div>
              </div>

              {/* Live Image Preview Box */}
              {fThumbnail && (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#E5E7EB] dark:border-[#27272A] bg-[#F1F5F9] dark:bg-[#09090B]">
                  <img src={fThumbnail} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <Badge className="bg-[#111827]/80 text-white text-[10px] font-bold">
                      Active Thumbnail
                    </Badge>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-[10px] px-2.5 font-bold"
                      onClick={() => setFThumbnail("")}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-end border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" onClick={() => {
                if (!fTitle) {
                  toast({ title: "Title Required", description: "Enter course title to proceed.", variant: "destructive" });
                  return;
                }
                setWizardStep(2);
              }} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
                Next Step: Curriculum Modules <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: CURRICULUM & CONTENT */}
        {wizardStep === 2 && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                    <Layers className="h-4 w-4 text-[#9333EA]" /> Step 2: Curriculum Structure ({draftModules.length} Modules)
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">Author video links, notes, coding challenges or assessments</p>
                </div>
                <Button type="button" onClick={() => { resetModuleBuilder(); setShowModuleBuilder(true); }}
                  className="h-10 px-4 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold text-xs rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> Add Module
                </Button>
              </div>

              {draftModules.length === 0 && !showModuleBuilder && (
                <div className="text-center py-12 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[#9CA3AF]">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">No modules configured in curriculum draft.</p>
                  <p className="text-[11px] text-[#6B7280] mt-1">Click &quot;Add Module&quot; above to add video, coding, or reading content.</p>
                </div>
              )}

              <div className="space-y-3">
                {draftModules.map((m, idx) => (
                  <div key={m.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#9333EA]/10 text-[#9333EA] font-bold text-xs flex items-center justify-center border border-[#9333EA]/20 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm truncate">{m.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className="text-[10px] font-bold capitalize bg-[#9333EA] text-white">{m.type}</Badge>
                          {m.videoUrl && (
                            <Badge variant="outline" className="text-[9px] font-semibold text-[#2563EB] border-[#2563EB]/30 gap-1">
                              <PlayCircle className="h-2.5 w-2.5" /> Video URL Configured
                            </Badge>
                          )}
                          {m.notes && (
                            <Badge variant="outline" className="text-[9px] font-semibold text-[#16A34A] border-[#16A34A]/30 gap-1">
                              <StickyNote className="h-2.5 w-2.5" /> Notes Included
                            </Badge>
                          )}
                          {m.readingContent && (
                            <Badge variant="outline" className="text-[9px] font-semibold text-[#16A34A] border-[#16A34A]/30 gap-1">
                              <FileText className="h-2.5 w-2.5" /> Article Document
                            </Badge>
                          )}
                          {m.practiceDescription && (
                            <Badge variant="outline" className="text-[9px] font-semibold text-[#9333EA] border-[#9333EA]/30 gap-1">
                              <Code2 className="h-2.5 w-2.5" /> Monaco Code Specs
                            </Badge>
                          )}
                          {m.quizQuestions && (
                            <Badge variant="outline" className="text-[9px] font-semibold text-[#D97706] border-[#D97706]/30 gap-1">
                              <ListChecks className="h-2.5 w-2.5" /> Quiz Items
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs font-mono font-semibold px-3 py-1 border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                        {m.duration}
                      </Badge>
                      <Button type="button" onClick={() => openEditDraftModule(m)} variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1 border-[#D97706] text-[#D97706] hover:bg-[#D97706]/10">
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button type="button" onClick={() => removeDraftModule(m.id)} variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626]">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* MODULE BUILDER */}
            {showModuleBuilder && (
              <Card className="bg-white dark:bg-[#18181B] border-2 border-[#9333EA] p-6 rounded-2xl space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#9333EA] flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> {editingModuleId ? "Edit Module Content" : "Module Content Authoring"}
                  </h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { resetModuleBuilder(); setShowModuleBuilder(false); }} className="text-xs">
                    Cancel
                  </Button>
                </div>

                <form onSubmit={handleAddModuleToDraft} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module / Lesson Title</label>
                    <Input placeholder="e.g. Next.js 16 Middleware & JWT Authorization" value={modTitle}
                      onChange={(e) => setModTitle(e.target.value)} required
                      className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Delivery Type</label>
                      <Select value={modType} onValueChange={(v) => setModType((v as "video" | "reading" | "quiz" | "coding") || "video")}>
                        <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video Lesson & Notes</SelectItem>
                          <SelectItem value="coding">Coding Challenge (Monaco Editor)</SelectItem>
                          <SelectItem value="reading">Reading Material & Documentation</SelectItem>
                          <SelectItem value="quiz">Quiz Assessment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Estimated Lesson Duration</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#6B7280] font-medium">
                            {modDurEnabled ? "Enabled" : "Off"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDuration(!modDurEnabled)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              modDurEnabled ? "bg-[#2563EB]" : "bg-gray-300 dark:bg-gray-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                modDurEnabled ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {modDurEnabled ? (
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="text-[10px] text-[#6B7280]">Start Time</span>
                            <Input
                              type="time"
                              value={modStartTime}
                              onChange={(e) => handleTimeChange(e.target.value, modEndTime)}
                              className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#6B7280]">End Time</span>
                            <Input
                              type="time"
                              value={modEndTime}
                              onChange={(e) => handleTimeChange(modStartTime, e.target.value)}
                              className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#6B7280]">Duration</span>
                            <div className="h-[40px] px-3 flex items-center text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl">
                              {modDur}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[44px] px-3 flex items-center text-xs text-[#6B7280] italic bg-gray-100 dark:bg-[#18181B] rounded-xl border border-dashed border-[#E5E7EB] dark:border-[#27272A]">
                          Duration tracking is turned off for this lesson.
                        </div>
                      )}
                    </div>
                  </div>

                  {modType === "video" && (
                    <div className="p-5 rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 space-y-5">

                      {/* ── Video URL (Google Drive / YouTube) ── */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <HardDrive className="h-3.5 w-3.5 text-[#2563EB]" /> Video Link
                          <span className="ml-auto text-[10px] font-medium text-[#6B7280] bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] px-2 py-0.5 rounded-md">
                            Google Drive or YouTube
                          </span>
                        </label>
                        <Input type="url"
                          placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                          value={modVideoUrl}
                          onChange={(e) => setModVideoUrl(e.target.value)}
                          className="h-[44px] text-xs rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                        <div className="flex items-start gap-2 p-3 bg-white dark:bg-[#09090B] border border-[#2563EB]/20 rounded-lg">
                          <HardDrive className="h-3.5 w-3.5 text-[#2563EB] mt-0.5 shrink-0" />
                          <div className="text-[10px] text-[#6B7280] leading-relaxed">
                            <p className="font-semibold text-[#2563EB] mb-0.5">Google Drive format:</p>
                            <p className="font-mono break-all">https://drive.google.com/file/d/<span className="text-[#9333EA]">FILE_ID</span>/view?usp=sharing</p>
                            <p className="mt-1">Make sure the file is shared as <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">&quot;Anyone with the link&quot;</span> in Drive settings.</p>
                          </div>
                        </div>
                      </div>

                      {/* ── Lesson Notes: text OR PDF upload ── */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                            <StickyNote className="h-3.5 w-3.5 text-[#2563EB]" /> Lesson Notes
                          </label>
                          <div className="flex items-center bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-lg p-0.5 gap-0.5">
                            <button type="button"
                              onClick={() => setModNotesType("text")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                modNotesType === "text"
                                  ? "bg-[#2563EB] text-white shadow-sm"
                                  : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                              }`}>
                              <PenSquare className="h-3 w-3" /> Write Notes
                            </button>
                            <button type="button"
                              onClick={() => setModNotesType("pdf")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                modNotesType === "pdf"
                                  ? "bg-[#2563EB] text-white shadow-sm"
                                  : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                              }`}>
                              <UploadCloud className="h-3 w-3" /> Upload PDF
                            </button>
                          </div>
                        </div>

                        {modNotesType === "text" ? (
                          <Textarea placeholder="# Key Concepts&#10;- Concept 1..." value={modNotes}
                            onChange={(e) => setModNotes(e.target.value)} rows={5}
                            className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                        ) : (
                          <div className="relative">
                            <label htmlFor="notes-pdf-wizard"
                              className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-[#2563EB]/40 rounded-xl bg-white dark:bg-[#09090B] cursor-pointer hover:bg-[#2563EB]/5 transition-colors">
                              {modNotesFile ? (
                                <div className="flex flex-col items-center gap-2">
                                  <FileText className="h-8 w-8 text-[#2563EB]" />
                                  <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] max-w-[250px] truncate">{modNotesFile.name}</p>
                                  <p className="text-[10px] text-[#6B7280]">{(modNotesFile.size / 1024).toFixed(1)} KB — click to replace</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <UploadCloud className="h-8 w-8 text-[#2563EB]/50" />
                                  <p className="text-xs font-semibold text-[#6B7280]">Click to upload PDF or Markdown file</p>
                                  <p className="text-[10px] text-[#9CA3AF]">PDF, DOC, DOCX, MD — max 20MB</p>
                                </div>
                              )}
                            </label>
                            <input id="notes-pdf-wizard" type="file" accept=".pdf,.doc,.docx,.md"
                              className="sr-only"
                              onChange={(e) => setModNotesFile(e.target.files?.[0] ?? null)} />
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {modType === "reading" && (
                    <div className="p-5 rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Full Article Document</label>
                        <div className="flex items-center gap-1 p-1 bg-[#16A34A]/10 rounded-lg">
                          <button type="button" onClick={() => setModReadingType("text")}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${modReadingType === "text" ? "bg-white dark:bg-[#27272A] text-[#16A34A] shadow-sm" : "text-[#16A34A]/70 hover:text-[#16A34A]"}`}>
                            Write Text
                          </button>
                          <button type="button" onClick={() => setModReadingType("pdf")}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${modReadingType === "pdf" ? "bg-white dark:bg-[#27272A] text-[#16A34A] shadow-sm" : "text-[#16A34A]/70 hover:text-[#16A34A]"}`}>
                            Upload File
                          </button>
                        </div>
                      </div>

                      {modReadingType === "text" ? (
                        <Textarea placeholder="# Reading Document Content..." value={modReading} onChange={(e) => setModReading(e.target.value)} rows={8}
                          className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                      ) : (
                        <div className="flex items-center justify-center border-2 border-dashed border-[#16A34A]/30 rounded-xl p-8 bg-white dark:bg-[#09090B] hover:bg-[#16A34A]/5 transition-colors group cursor-pointer relative overflow-hidden">
                          <label htmlFor="reading-pdf-wizard" className="cursor-pointer w-full flex flex-col items-center justify-center">
                            {modReadingFile ? (
                              <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 text-[#16A34A]" />
                                <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{modReadingFile.name}</p>
                                <p className="text-[10px] text-[#6B7280]">{(modReadingFile.size / 1024).toFixed(1)} KB — click to replace</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <UploadCloud className="h-8 w-8 text-[#16A34A]/50" />
                                <p className="text-xs font-semibold text-[#6B7280]">Click to upload Document file</p>
                                <p className="text-[10px] text-[#9CA3AF]">PDF, DOC, DOCX, PPT — max 20MB</p>
                              </div>
                            )}
                          </label>
                          <input id="reading-pdf-wizard" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx"
                            className="sr-only"
                            onChange={(e) => setModReadingFile(e.target.files?.[0] ?? null)} />
                        </div>
                      )}
                    </div>
                  )}

                  {((modType as string) === "coding" || (modType as string) === "mixed") && (
                    <div className="p-6 rounded-2xl border border-[#9333EA]/20 bg-[#9333EA]/5 space-y-6">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9333EA]">
                        <Code2 className="h-4 w-4" /> Coding Problem Specifications & Test Cases
                      </div>
                      <CodingProblemCreator
                        inline
                        initialTitle={modTitle || "Find the Largest Element"}
                        initialDescription={modDesc}
                        onChange={(problem) => {
                          if (!modTitle && problem.title) setModTitle(problem.title);
                          setModDesc(problem.description);
                          setModStarter(Object.values(problem.templates)[0] || "");
                          setModTestCases(problem.publicTestCases.map((t) => `${t.input} -> ${t.expected_output}`).join("\n"));
                        }}
                      />
                    </div>
                  )}

                  {((modType as string) === "quiz" || (modType as string) === "mixed") && (
                    <div className="p-6 rounded-2xl border border-[#D97706]/20 bg-[#D97706]/5 space-y-6">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D97706]">
                        <ListChecks className="h-4 w-4" /> Quiz / MCQ Specifications
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Quiz MCQ Items</label>
                        <QuizMcqCreator value={modQuiz} onChange={setModQuiz} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { resetModuleBuilder(); setShowModuleBuilder(false); }} className="h-10 text-xs font-semibold">Cancel</Button>
                    <Button type="submit" className="h-10 px-6 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold text-xs rounded-xl">
                      {editingModuleId ? "Update Module" : "Save Module"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setWizardStep(1)} className="h-[48px] px-6 font-semibold text-xs gap-2 rounded-xl border-[#E5E7EB] dark:border-[#27272A]">
                <ArrowLeft className="h-4 w-4" /> Previous Step
              </Button>
              <Button type="button" onClick={() => setWizardStep(3)} className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
                Next Step: Review & Deploy <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & PUBLISH */}
        {wizardStep === 3 && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm space-y-6">
              <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Step 3: Verification & Deployment
              </h2>

              <div className="p-6 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/30 text-[#2563EB]">
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
                    <span className="text-[#6B7280]">Deployment Status:</span>
                    <p className="font-bold text-[#16A34A]">Published</p>
                  </div>
                </div>
              </div>

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
                <Button type="button" variant="outline" onClick={() => setWizardStep(2)} className="h-[48px] px-6 font-semibold text-xs gap-2 rounded-xl border-[#E5E7EB] dark:border-[#27272A]">
                  <ArrowLeft className="h-4 w-4" /> Previous Step
                </Button>
                <Button type="button" onClick={handlePublishCourse} className="h-[48px] px-8 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
                  <ShieldCheck className="h-4 w-4" /> {editingCourseId ? "Save Changes" : "Publish Course"}
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
      <PageHeader
        title={selectedCourse.title}
        description={`${selectedCourse.category} • ${selectedCourse.level} • Instructor: ${selectedCourse.instructor}`}
        backAction={{ label: "Back to Courses", onClick: () => setViewState("list") }}
        actions={
          <Button onClick={openAddModuleFromSyllabus}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-2 px-5 rounded-xl shrink-0 shadow-sm">
            <Plus className="h-4 w-4" /> Add Module
          </Button>
        }
      />

      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#2563EB]" /> Course Syllabus ({selectedCourse.modules.length} Lessons)
          </span>
        </h2>

        {selectedCourse.modules.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[#9CA3AF]">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">No modules configured for this course yet.</p>
            <Button onClick={openAddModuleFromSyllabus} size="sm" className="mt-3 bg-[#2563EB] text-white font-semibold text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add First Module
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {selectedCourse.modules.map((m, idx) => (
            <div key={m.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs flex items-center justify-center border border-[#2563EB]/20 shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm truncate">{m.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className="text-[10px] font-bold capitalize bg-[#2563EB] text-white">{m.type}</Badge>
                    {m.videoUrl && (
                      <Badge variant="outline" className="text-[9px] font-semibold text-[#2563EB] border-[#2563EB]/30 gap-1">
                        <PlayCircle className="h-2.5 w-2.5" /> Video URL
                      </Badge>
                    )}
                    {m.notes && (
                      <Badge variant="outline" className="text-[9px] font-semibold text-[#16A34A] border-[#16A34A]/30 gap-1">
                        <StickyNote className="h-2.5 w-2.5" /> Notes
                      </Badge>
                    )}
                    {m.practiceDescription && (
                      <Badge variant="outline" className="text-[9px] font-semibold text-[#9333EA] border-[#9333EA]/30 gap-1">
                        <Code2 className="h-2.5 w-2.5" /> Code Challenge
                      </Badge>
                    )}
                    {m.quizQuestions && (
                      <Badge variant="outline" className="text-[9px] font-semibold text-[#D97706] border-[#D97706]/30 gap-1">
                        <ListChecks className="h-2.5 w-2.5" /> Quiz
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className="text-xs font-mono font-semibold px-3 py-1 border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                  {m.duration}
                </Badge>
                <Button onClick={() => openEditModuleFromSyllabus(m)} variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1 border-[#D97706] text-[#D97706]">
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
        <PageHeader
          title={isEditMod ? "Edit Lesson Content" : "Author New Lesson"}
          description={selectedCourse.title}
          backAction={{ label: "Back to Syllabus", onClick: () => setViewState("syllabus") }}
        />

        <form onSubmit={handleSaveModuleInSyllabus} className="space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module / Lesson Title</label>
              <Input placeholder="e.g. Next.js 16 Middleware & JWT Authorization" value={modTitle}
                onChange={(e) => setModTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Delivery Type</label>
                <Select value={modType} onValueChange={(v) => setModType((v as "video" | "reading" | "quiz" | "coding") || "video")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Lesson & Notes</SelectItem>
                    <SelectItem value="coding">Coding Challenge (Monaco Editor)</SelectItem>
                    <SelectItem value="reading">Reading Material & Documentation</SelectItem>
                    <SelectItem value="quiz">Quiz Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Lesson Duration</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6B7280] font-medium">
                      {modDurEnabled ? "Enabled" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleDuration(!modDurEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        modDurEnabled ? "bg-[#2563EB]" : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          modDurEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {modDurEnabled ? (
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div>
                      <span className="text-[10px] text-[#6B7280]">Start Time</span>
                      <Input
                        type="time"
                        value={modStartTime}
                        onChange={(e) => handleTimeChange(e.target.value, modEndTime)}
                        className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7280]">End Time</span>
                      <Input
                        type="time"
                        value={modEndTime}
                        onChange={(e) => handleTimeChange(modStartTime, e.target.value)}
                        className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7280]">Duration</span>
                      <div className="h-[40px] px-3 flex items-center text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl">
                        {modDur}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[44px] px-3 flex items-center text-xs text-[#6B7280] italic bg-gray-100 dark:bg-[#18181B] rounded-xl border border-dashed border-[#E5E7EB] dark:border-[#27272A]">
                    Duration tracking is turned off for this lesson.
                  </div>
                )}
              </div>
            </div>
          </Card>

          {modType === "video" && (
            <Card className="p-6 rounded-2xl border border-[#2563EB]/20 bg-[#2563EB]/5 space-y-5">

              {/* ── Video URL (Google Drive / YouTube) ── */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-[#2563EB]" /> Video Link
                  <span className="ml-auto text-[10px] font-medium text-[#6B7280] bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] px-2 py-0.5 rounded-md">
                    Google Drive or YouTube
                  </span>
                </label>
                <Input type="url"
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  value={modVideoUrl}
                  onChange={(e) => setModVideoUrl(e.target.value)}
                  className="h-[48px] text-xs rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                <div className="flex items-start gap-2 p-3 bg-white dark:bg-[#09090B] border border-[#2563EB]/20 rounded-lg">
                  <HardDrive className="h-3.5 w-3.5 text-[#2563EB] mt-0.5 shrink-0" />
                  <div className="text-[10px] text-[#6B7280] leading-relaxed">
                    <p className="font-semibold text-[#2563EB] mb-0.5">Google Drive format:</p>
                    <p className="font-mono break-all">https://drive.google.com/file/d/<span className="text-[#9333EA]">FILE_ID</span>/view?usp=sharing</p>
                    <p className="mt-1">Make sure the file is shared as <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">&quot;Anyone with the link&quot;</span> in Drive settings.</p>
                  </div>
                </div>
              </div>

              {/* ── Lesson Notes: text OR PDF upload ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                    <StickyNote className="h-3.5 w-3.5 text-[#2563EB]" /> Lesson Notes
                  </label>
                  <div className="flex items-center bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-lg p-0.5 gap-0.5">
                    <button type="button"
                      onClick={() => setModNotesType("text")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        modNotesType === "text"
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                      }`}>
                      <PenSquare className="h-3 w-3" /> Write Notes
                    </button>
                    <button type="button"
                      onClick={() => setModNotesType("pdf")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        modNotesType === "pdf"
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                      }`}>
                      <UploadCloud className="h-3 w-3" /> Upload PDF
                    </button>
                  </div>
                </div>

                {modNotesType === "text" ? (
                  <Textarea placeholder="# Lesson Notes..." value={modNotes}
                    onChange={(e) => setModNotes(e.target.value)} rows={6}
                    className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
                ) : (
                  <div className="relative">
                    <label htmlFor="notes-pdf-edit"
                      className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-[#2563EB]/40 rounded-xl bg-white dark:bg-[#09090B] cursor-pointer hover:bg-[#2563EB]/5 transition-colors">
                      {modNotesFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-[#2563EB]" />
                          <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] max-w-[250px] truncate">{modNotesFile.name}</p>
                          <p className="text-[10px] text-[#6B7280]">{(modNotesFile.size / 1024).toFixed(1)} KB — click to replace</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <UploadCloud className="h-8 w-8 text-[#2563EB]/50" />
                          <p className="text-xs font-semibold text-[#6B7280]">Click to upload PDF or Markdown file</p>
                          <p className="text-[10px] text-[#9CA3AF]">PDF, DOC, DOCX, MD — max 20MB</p>
                        </div>
                      )}
                    </label>
                    <input id="notes-pdf-edit" type="file" accept=".pdf,.doc,.docx,.md"
                      className="sr-only"
                      onChange={(e) => setModNotesFile(e.target.files?.[0] ?? null)} />
                  </div>
                )}
              </div>

            </Card>
          )}

          {modType === "coding" && (
            <Card className="p-6 rounded-2xl border border-[#9333EA]/20 bg-[#9333EA]/5 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Statement</label>
                <Textarea placeholder="Problem statement..." value={modDesc} onChange={(e) => setModDesc(e.target.value)} rows={4}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Test Cases</label>
                <Textarea placeholder="Input: 'hello' → Output: 'olleh'" value={modTestCases} onChange={(e) => setModTestCases(e.target.value)} rows={3}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Starter Code</label>
                <Textarea placeholder="function solution() {}" value={modStarter} onChange={(e) => setModStarter(e.target.value)} rows={4}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>
            </Card>
          )}

          {modType === "quiz" && (
            <Card className="p-6 rounded-2xl border border-[#D97706]/20 bg-[#D97706]/5 space-y-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D97706]">
                <ListChecks className="h-4 w-4" /> Quiz / MCQ Specifications
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Quiz MCQ Items</label>
                <QuizMcqCreator value={modQuiz} onChange={setModQuiz} />
              </div>
            </Card>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setViewState("syllabus")} className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">Cancel</Button>
            <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
              Save Module
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
      <PageHeader
        title={role === "admin" ? "Enterprise Course & Curriculum Management" : "Assigned Training Courses"}
        description="Author courses with step-by-step wizard (Course Info → Curriculum Modules → Review & Deploy)"
        actions={
          <Button onClick={openCreateWizard}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm">
            <Plus className="h-4 w-4" /> Author New Course
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 rounded-xl shadow-sm">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input placeholder="Search courses by title or instructor..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-none shadow-none focus-visible:ring-0 w-full rounded-lg" />
        </div>
        <div className="flex items-center w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#27272A] pt-3 md:pt-0 md:pl-4">
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
            <SelectTrigger className="h-10 text-xs w-full md:w-[220px] bg-transparent border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Filter by category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Web Development">Web Development</SelectItem>
              <SelectItem value="AI & Machine Learning">AI & Machine Learning</SelectItem>
              <SelectItem value="Cloud Computing">Cloud Computing</SelectItem>
              <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course) => (
          <Card key={course.id}
            className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
            {course.thumbnail && (
              <div className="relative w-full h-36 overflow-hidden border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F1F5F9]">
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-semibold border-[#2563EB]/30 text-[#2563EB]">
                  {course.category}
                </Badge>
                <Badge className={course.status === "published" ? "bg-[#16A34A] text-white text-[10px] font-medium" : "bg-[#6B7280] text-white text-[10px] font-medium"}>
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

              <div className="pt-4 flex flex-col gap-3">
                <Button onClick={() => openAssignModal(course)} size="sm"
                  className="w-full h-9 text-[13px] font-bold gap-2 bg-[#9333EA] hover:bg-[#7E22CE] text-white shadow-sm transition-all hover:-translate-y-[1px]">
                  <Users className="h-4 w-4" /> Assign Course
                </Button>
                <div className="flex items-center justify-between gap-2 w-full">
                  <Button onClick={() => { setSelectedCourse(course); setViewState("syllabus"); }}
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-[11px] font-semibold gap-1 border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/5 px-1 shadow-sm transition-colors">
                    <Eye className="h-3 w-3 shrink-0" /> Syllabus
                  </Button>
                  <Button onClick={() => openEditWizard(course)} variant="outline" size="sm"
                    className="flex-1 h-8 text-[11px] font-semibold gap-1 border-[#D97706]/40 text-[#D97706] hover:bg-[#D97706]/5 px-1 shadow-sm transition-colors">
                    <Edit className="h-3 w-3 shrink-0" /> Edit
                  </Button>
                  <Button onClick={() => handleToggleStatus(course.id)} variant="outline" size="sm"
                    className="flex-1 h-8 text-[11px] font-semibold text-[#6B7280] border-[#E5E7EB] dark:border-[#27272A] px-1 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] shadow-sm transition-colors">
                    {course.status === "published" ? "Draft" : "Publish"}
                  </Button>
                  <Button onClick={() => handleDeleteCourse(course.id, course.title)} variant="outline" size="icon"
                    className="h-8 w-8 shrink-0 text-[#DC2626] border-[#DC2626]/30 hover:bg-[#DC2626]/10 hover:border-[#DC2626]/50 shadow-sm transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── ASSIGN COURSE MODAL DIALOG ── */}
      {assigningCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <div>
                <h3 className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#9333EA]" /> Assign Course
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">{assigningCourse.title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAssigningCourse(null)} className="h-8 w-8 p-0 rounded-full">
                ✕
              </Button>
            </div>

            {/* Batch Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                <span>Assign to Entire Batches</span>
                <span className="text-[10px] text-[#6B7280] font-normal">{selectedBatches.length} batch(es) selected</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allBatches.map((b) => {
                  const isChecked = selectedBatches.includes(b);
                  return (
                    <label key={b} className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${isChecked ? "bg-[#9333EA]/10 border-[#9333EA] text-[#9333EA]" : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA]"}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatches((prev) => [...prev, b]);
                            // Select all students in this batch
                            const bStudents = allStudents.filter((s) => s.batch === b).map((s) => s.id);
                            setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...bStudents])));
                          } else {
                            setSelectedBatches((prev) => prev.filter((item) => item !== b));
                            // Also unselect all students in this batch
                            const bStudents = new Set(allStudents.filter((s) => s.batch === b).map((s) => s.id));
                            setSelectedStudentIds((prev) => prev.filter((id) => !bStudents.has(id)));
                          }
                        }}
                        className="rounded text-[#9333EA] focus:ring-[#9333EA]"
                      />
                      {b}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Individual Student Selection */}
            <div className="space-y-3 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Assign to Specific Students ({selectedStudentIds.length} enrolled)
                </label>
                <Select value={assignBatchFilter} onValueChange={(v) => setAssignBatchFilter(v || "all")}>
                  <SelectTrigger className="h-8 text-xs w-[140px] bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue placeholder="Filter batch..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {allBatches.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {allStudents
                  .filter((s) => assignBatchFilter === "all" || s.batch === assignBatchFilter)
                  .map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${isChecked ? "bg-[#2563EB]/10 border-[#2563EB]/40" : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"}`}>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds((prev) => [...prev, s.id]);
                              } else {
                                setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <div>
                            <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{s.name}</p>
                            <p className="text-[10px] text-[#6B7280]">{s.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px]">{s.batch}</Badge>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button variant="outline" onClick={() => setAssigningCourse(null)} className="h-10 text-xs font-semibold">
                Cancel
              </Button>
              <Button onClick={handleSaveAssignments} className="h-10 px-6 bg-[#9333EA] hover:bg-[#7E22CE] text-white text-xs font-semibold rounded-xl gap-2">
                <Check className="h-4 w-4" /> Save Assignments
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
