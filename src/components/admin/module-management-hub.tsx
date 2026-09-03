"use client";

import React, { useState, useEffect } from "react";
import {
  Layers, Plus, Search, Trash2, ArrowLeft, Sparkles, UserCheck,
  Users, CheckCircle2, Clock, BookOpen, Code2, FileText, Video,
  ChevronDown, ShieldCheck, Link2, StickyNote, Dumbbell, AlertCircle,
  PlayCircle, ListChecks, PenLine, HardDrive
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
import { useLMSStore, ManagedModuleItem } from "@/lib/store/lms-store";
import { PageHeader } from "@/components/layouts/page-header";

// ─── Types ─────────────────────────────────────────────────
export interface CourseModuleItem {
  id: string;
  courseTitle: string;
  title: string;
  duration: string;
  type: "video" | "coding" | "reading" | "quiz";
  sequenceOrder: number;
  contentSummary: string;
  assignedBatches: string[];
  assignedStudents: string[];
  videoUrl?: string;
  notes?: string;
  practiceDescription?: string;
  practiceTestCases?: string;
  practiceStarterCode?: string;
  quizQuestions?: string;
}

const initialModules: CourseModuleItem[] = [];

type ViewState = "list" | "create" | "assign";

function SectionCard({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border ${color} rounded-2xl p-6 space-y-4 shadow-sm`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#FAFAFA]">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </Card>
  );
}


export function ModuleManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [modules, setModules] = useState<CourseModuleItem[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data: modulesData } = await supabase
        .from("modules")
        .select(`
          *,
          course:courses ( title )
        `)
        .order("created_at", { ascending: false });

      if (modulesData) {
        const mappedModules: CourseModuleItem[] = modulesData.map((m: any) => ({
          id: m.id,
          courseTitle: m.course?.title || "Unknown Course",
          title: m.title,
          duration: m.duration || "45 mins",
          type: m.type as any,
          sequenceOrder: m.order || 0,
          contentSummary: m.content || "",
          assignedBatches: [],
          assignedStudents: []
        }));
        setModules(mappedModules);
      }

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
    };
    fetchData();
  }, []);

  const syncModulesToStore = (newMods: CourseModuleItem[]) => {
    setModules(newMods);
  };
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedModule, setSelectedModule] = useState<CourseModuleItem | null>(null);

  const [newTitle, setNewTitle]     = useState("");
  const [newCourse, setNewCourse]   = useState("Full Stack Next.js 16 & React 19 Enterprise Architecture");
  const [newDurEnabled, setNewDurEnabled] = useState(true);
  const [newStartTime, setNewStartTime]   = useState("09:00");
  const [newEndTime, setNewEndTime]     = useState("09:45");
  const [newDuration, setNewDuration] = useState("45 mins");
  const [newType, setNewType]       = useState<"video" | "coding" | "reading" | "quiz">("video");
  const [newSummary, setNewSummary] = useState("");

  const [videoUrl, setVideoUrl]   = useState("");
  const [videoNotes, setVideoNotes] = useState("");
  const [readingContent, setReadingContent] = useState("");
  const [readingFile, setReadingFile] = useState<File | null>(null);
  const [readingType, setReadingType] = useState<"text" | "pdf">("text");

  const [practiceDesc, setPracticeDesc]         = useState("");
  const [practiceTestCases, setPracticeTestCases] = useState("");
  const [practiceStarter, setPracticeStarter]   = useState("");

  const [showCodingProblemBuilder, setShowCodingProblemBuilder] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState("");

  const [selectedBatches, setSelectedBatches]         = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds]   = useState<string[]>([]);
  const [assignBatchFilter, setAssignBatchFilter]     = useState("all");

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const sH = Number(start.split(":")[0] ?? 0);
    const sM = Number(start.split(":")[1] ?? 0);
    const eH = Number(end.split(":")[0] ?? 0);
    const eM = Number(end.split(":")[1] ?? 0);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    let diff = endMins - startMins;
    if (diff <= 0) diff += 24 * 60;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} mins`;
    if (hours > 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${mins} mins`;
  };

  const handleTimeChange = (start: string, end: string) => {
    setNewStartTime(start);
    setNewEndTime(end);
    if (newDurEnabled) {
      setNewDuration(calculateDuration(start, end));
    }
  };

  const handleToggleDuration = (enabled: boolean) => {
    setNewDurEnabled(enabled);
    if (enabled) {
      setNewDuration(calculateDuration(newStartTime, newEndTime));
    } else {
      setNewDuration("N/A");
    }
  };

  const resetForm = () => {
    setNewTitle(""); setNewSummary(""); setNewDuration("45 mins");
    setNewDurEnabled(true); setNewStartTime("09:00"); setNewEndTime("09:45");
    setNewType("video");
    setVideoUrl(""); setVideoNotes("");
    setReadingContent("");
    setReadingFile(null);
    setReadingType("text");
    setPracticeDesc(""); setPracticeTestCases(""); setPracticeStarter("");
    setQuizQuestions("");
  };

  const filtered = modules.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.courseTitle.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = courseFilter === "all" || m.courseTitle === courseFilter;
    const matchesType   = typeFilter === "all" || m.type === typeFilter;
    return matchesSearch && matchesCourse && matchesType;
  });

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const created: CourseModuleItem = {
      id: `m_${Date.now()}`,
      courseTitle: newCourse,
      title: newTitle,
      duration: newDuration,
      type: newType,
      sequenceOrder: modules.filter((m) => m.courseTitle === newCourse).length + 1,
      contentSummary: newSummary || "Structured learning module with interactive exercises.",
      assignedBatches: [],
      assignedStudents: [],
      videoUrl: newType === "video" ? videoUrl : undefined,
      notes: newType === "video" ? videoNotes : newType === "reading" ? readingContent : undefined,
      practiceDescription: newType === "coding" ? practiceDesc : undefined,
      practiceTestCases: newType === "coding" ? practiceTestCases : undefined,
      practiceStarterCode: newType === "coding" ? practiceStarter : undefined,
      quizQuestions: newType === "quiz" ? quizQuestions : undefined,
    };
    setModules((prev) => [created, ...prev]);
    resetForm();
    setViewState("list");
    toast({ title: "Module Published", description: `"${newTitle}" added to course.` });
  };

  const handleDeleteModule = (id: string, title: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "Module Deleted", description: `${title} removed.`, variant: "destructive" });
  };

  const openAssignView = (mod: CourseModuleItem) => {
    setSelectedModule(mod);
    setSelectedBatches([...mod.assignedBatches]);
    setSelectedStudentIds([...mod.assignedStudents]);
    setAssignBatchFilter("all");
    setViewState("assign");
  };

  const toggleBatch = (batch: string) =>
    setSelectedBatches((prev) =>
      prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch]
    );

  const toggleStudent = (id: string) =>
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const selectAllInBatch = (batch: string) => {
    const ids = allStudents.filter((s) => s.batch === batch).map((s) => s.id);
    const allSel = ids.every((id) => selectedStudentIds.includes(id));
    setSelectedStudentIds((prev) =>
      allSel ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  const handleSaveAssignment = () => {
    if (!selectedModule) return;
    setModules((prev) =>
      prev.map((m) =>
        m.id === selectedModule.id
          ? { ...m, assignedBatches: selectedBatches, assignedStudents: selectedStudentIds }
          : m
      )
    );
    toast({
      title: "Module Practice Assigned",
      description: `"${selectedModule.title}" → ${selectedStudentIds.length} students.`,
    });
    setViewState("list");
  };

  const typeIcon = (type: string) => {
    if (type === "video")   return <Video   className="h-3.5 w-3.5" />;
    if (type === "coding")  return <Code2   className="h-3.5 w-3.5" />;
    if (type === "quiz")    return <BookOpen className="h-3.5 w-3.5" />;
    return <FileText className="h-3.5 w-3.5" />;
  };
  const typeBg = (type: string) =>
    type === "video"   ? "bg-[#2563EB] text-white font-medium"
    : type === "coding"  ? "bg-[#2563EB] text-white font-medium"
    : type === "quiz"    ? "bg-[#D97706] text-white font-medium"
    : "bg-[#16A34A] text-white font-medium";

  // VIEW: CREATE MODULE
  if (viewState === "create") {
    return (
      <div className="space-y-8 w-full">
        <PageHeader
          title="Author New Module / Lesson"
          description="Add video URL, lesson notes, or practice exercises"
          backAction={{ label: "Back to Modules Directory", onClick: () => { resetForm(); setViewState("list"); } }}
        />

        <form onSubmit={handleCreateModule} className="space-y-6">

          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
            <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#2563EB]" /> Basic Module Info
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                <span>Module / Lesson Title</span>
                <span className="text-[10px] font-semibold text-[#2563EB]">Required</span>
              </label>
              <Input placeholder="e.g. Next.js 16 Middleware & JWT Verification" value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Parent Course</label>
              <Select value={newCourse}
                onValueChange={(v) => setNewCourse(v || "Full Stack Next.js 16 & React 19 Enterprise Architecture")}>
                <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Stack Next.js 16 & React 19 Enterprise Architecture">Next.js 16 Enterprise</SelectItem>
                  <SelectItem value="Python AI & Deep Learning LLM Agentic Engineering">Python AI LLM</SelectItem>
                  <SelectItem value="PostgreSQL & Supabase High-Availability Systems">PostgreSQL & Supabase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Type</label>
                <Select value={newType} onValueChange={(v) => { resetForm(); setNewTitle(newTitle); setNewCourse(newCourse); setNewDuration(newDuration); setNewSummary(newSummary); setNewType(v as any || "video"); }}>
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
                      {newDurEnabled ? "Enabled" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleDuration(!newDurEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        newDurEnabled ? "bg-[#2563EB]" : "bg-gray-300 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          newDurEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {newDurEnabled ? (
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div>
                      <span className="text-[10px] text-[#6B7280]">Start Time</span>
                      <Input
                        type="time"
                        value={newStartTime}
                        onChange={(e) => handleTimeChange(e.target.value, newEndTime)}
                        className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7280]">End Time</span>
                      <Input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => handleTimeChange(newStartTime, e.target.value)}
                        className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7280]">Duration</span>
                      <div className="h-[40px] px-3 flex items-center text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl">
                        {newDuration}
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Summary</label>
              <Input placeholder="Brief description of this lesson..." value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>
          </Card>

          {/* VIDEO LESSON CONTENT */}
          {newType === "video" && (
            <SectionCard
              icon={<PlayCircle className="h-4 w-4 text-[#2563EB]" />}
              title="Video Lesson Content"
              color="border-[#2563EB]/20 bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-[#2563EB]" /> Video URL
                </label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="h-[48px] text-xs rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
                <div className="flex items-start gap-2 p-3 bg-white dark:bg-[#09090B] border border-[#2563EB]/20 rounded-lg">
                  <HardDrive className="h-3.5 w-3.5 text-[#2563EB] mt-0.5 shrink-0" />
                  <div className="text-[10px] text-[#6B7280] leading-relaxed">
                    <p className="font-semibold text-[#2563EB] mb-0.5">Google Drive format:</p>
                    <p className="font-mono break-all">https://drive.google.com/file/d/<span className="text-[#2563EB]">FILE_ID</span>/view?usp=sharing</p>
                    <p className="mt-1">Make sure the file is shared as <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">&quot;Anyone with the link&quot;</span> in Drive settings.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <StickyNote className="h-3.5 w-3.5 text-[#2563EB]" /> Lesson Notes
                </label>
                <Textarea
                  placeholder={"# Key Concepts\n- Concept 1..."}
                  value={videoNotes}
                  onChange={(e) => setVideoNotes(e.target.value)}
                  rows={8}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </SectionCard>
          )}

          {/* READING MATERIAL */}
          {newType === "reading" && (
            <SectionCard
              icon={<FileText className="h-4 w-4 text-[#16A34A]" />}
              title="Reading Material Content"
              color="border-[#16A34A]/20 bg-[#16A34A]/5 dark:bg-[#16A34A]/10"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <PenLine className="h-3.5 w-3.5 text-[#16A34A]" /> Article Document
                </label>
                <div className="flex items-center gap-1 p-1 bg-[#16A34A]/10 rounded-lg">
                  <button type="button" onClick={() => setReadingType("text")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${readingType === "text" ? "bg-white dark:bg-[#27272A] text-[#16A34A] shadow-sm" : "text-[#16A34A]/70 hover:text-[#16A34A]"}`}>
                    Write Text
                  </button>
                  <button type="button" onClick={() => setReadingType("pdf")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${readingType === "pdf" ? "bg-white dark:bg-[#27272A] text-[#16A34A] shadow-sm" : "text-[#16A34A]/70 hover:text-[#16A34A]"}`}>
                    Upload File
                  </button>
                </div>
              </div>

              {readingType === "text" ? (
                <Textarea
                  placeholder={"# Topic Title\nWrite content here..."}
                  value={readingContent}
                  onChange={(e) => setReadingContent(e.target.value)}
                  rows={14}
                  className="text-xs font-mono rounded-xl bg-white dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              ) : (
                <div className="flex items-center justify-center border-2 border-dashed border-[#16A34A]/30 rounded-xl p-8 bg-white dark:bg-[#09090B] hover:bg-[#16A34A]/5 transition-colors group cursor-pointer relative overflow-hidden">
                  <label htmlFor="reading-pdf-wizard-module" className="cursor-pointer w-full flex flex-col items-center justify-center">
                    {readingFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-[#16A34A]" />
                        <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{readingFile.name}</p>
                        <p className="text-[10px] text-[#6B7280]">{(readingFile.size / 1024).toFixed(1)} KB — click to replace</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <HardDrive className="h-8 w-8 text-[#16A34A]/50" />
                        <p className="text-xs font-semibold text-[#6B7280]">Click to upload Document file</p>
                        <p className="text-[10px] text-[#9CA3AF]">PDF, DOC, DOCX, PPT — max 20MB</p>
                      </div>
                    )}
                  </label>
                  <input id="reading-pdf-wizard-module" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx"
                    className="sr-only"
                    onChange={(e) => setReadingFile(e.target.files?.[0] ?? null)} />
                </div>
              )}
            </SectionCard>
          )}

          {/* CODING PRACTICE */}
          {((newType as string) === "coding" || (newType as string) === "mixed") && (
            <SectionCard
              icon={<Code2 className="h-4 w-4 text-[#2563EB]" />}
              title="Coding Challenge Practice"
              color="border-[#2563EB]/20 bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
            >
              <CodingProblemCreator
                inline
                initialTitle={newTitle || "Find the Largest Element"}
                initialDescription={practiceDesc}
                onChange={(problem: any) => {
                  if (!newTitle && problem?.title) setNewTitle(problem.title);
                  if (problem?.description) setPracticeDesc(problem.description);
                  if (problem?.templates) {
                    const firstTmpl = Object.values(problem.templates)[0];
                    if (typeof firstTmpl === "string") setPracticeStarter(firstTmpl);
                  }
                  const cases = (problem?.test_cases || problem?.publicTestCases || []) as any[];
                  if (cases.length > 0) {
                    setPracticeTestCases(cases.map((t: any) => `${t.input} -> ${t.expected_output}`).join("\n"));
                  }
                }}
              />
            </SectionCard>
          )}

          {/* QUIZ */}
          {((newType as string) === "quiz" || (newType as string) === "mixed") && (
            <SectionCard
              icon={<BookOpen className="h-4 w-4 text-[#D97706]" />}
              title="Quiz Questions"
              color="border-[#D97706]/20 bg-[#D97706]/5 dark:bg-[#D97706]/10"
            >
              <div className="space-y-2">
                <QuizMcqCreator value={quizQuestions} onChange={setQuizQuestions} />
              </div>
            </SectionCard>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline"
              onClick={() => { resetForm(); setViewState("list"); }}
              className="h-[48px] px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]">
              Cancel
            </Button>
            <Button type="submit"
              className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm">
              Save Module
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // VIEW: ASSIGN TO STUDENTS
  if (viewState === "assign" && selectedModule) {
    const displayStudents =
      assignBatchFilter === "all"
        ? allStudents
        : allStudents.filter((s) => s.batch === assignBatchFilter);

    return (
      <div className="space-y-8 w-full">
        <PageHeader
          title="Assign Module as Practice Track"
          description={
            <>
              Assigning <span className="font-semibold text-[#2563EB]">&quot;{selectedModule.title}&quot;</span> to students
            </>
          }
          backAction={{ label: "Back", onClick: () => setViewState("list") }}
          actions={
            <Button onClick={handleSaveAssignment}
              className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm shrink-0">
              <CheckCircle2 className="h-4 w-4" /> Save Assignment ({selectedStudentIds.length})
            </Button>
          }
        />

        <Card className="bg-[#2563EB]/5 border border-[#2563EB]/20 dark:bg-[#2563EB]/10 p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBg(selectedModule.type)}`}>
              {typeIcon(selectedModule.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm truncate">{selectedModule.title}</p>
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{selectedModule.courseTitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs font-mono border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                <Clock className="h-3 w-3 mr-1" /> {selectedModule.duration}
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                <Users className="h-4 w-4 text-[#2563EB]" /> Assign by Student Batch
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] font-bold text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/10"
                onClick={() => {
                  if (selectedBatches.length === allBatches.length) {
                    setSelectedBatches([]);
                    setSelectedStudentIds([]);
                  } else {
                    setSelectedBatches([...allBatches]);
                    setSelectedStudentIds(allStudents.map((s) => s.id));
                  }
                }}
              >
                {selectedBatches.length === allBatches.length ? "Deselect All" : "Select All Batches"}
              </Button>
            </div>
            {allBatches.map((batch) => {
              const isSelected = selectedBatches.includes(batch);
              const count = allStudents.filter((s) => s.batch === batch).length;
              return (
                <button key={batch} type="button"
                  onClick={() => { toggleBatch(batch); selectAllInBatch(batch); }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
                      : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{batch}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{count} enrolled students</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-[#D1D5DB]"
                    }`}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2 uppercase tracking-wider">
                <UserCheck className="h-4 w-4 text-[#2563EB]" /> Individual Students
              </h2>
              <Select value={assignBatchFilter} onValueChange={(v) => setAssignBatchFilter(v || "all")}>
                <SelectTrigger className="h-9 text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="Batch 2026-A">Batch 2026-A</SelectItem>
                  <SelectItem value="Batch 2026-B">Batch 2026-B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-hidden">
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                {displayStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <button key={student.id} type="button" onClick={() => toggleStudent(student.id)}
                      className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 transition-all ${
                        isSelected ? "bg-[#2563EB]/5 dark:bg-[#2563EB]/10" : "hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? "bg-[#2563EB] text-white" : "bg-[#2563EB]/10 text-[#2563EB]"
                        }`}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#111827] dark:text-[#FAFAFA] truncate">{student.name}</p>
                          <p className="text-[11px] text-[#6B7280] truncate">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] border-[#2563EB]/30 text-[#2563EB]">
                          {student.batch}
                        </Badge>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-[#D1D5DB]"
                        }`}>
                          {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
              <div className="text-xs text-[#6B7280]">
                <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{selectedStudentIds.length}</span>
                {" "}of {allStudents.length} students selected
              </div>
              <Button type="button" onClick={handleSaveAssignment}
                className="h-9 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs rounded-xl gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW: LIST MODULES
  return (
    <div className="space-y-8">
      <PageHeader
        title={role === "admin" ? "Enterprise Course Modules Directory" : "Curriculum Modules Directory"}
        description="Author and assign course modules to student batches"
        actions={
          <Button onClick={() => { resetForm(); setViewState("create"); }}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm">
            <Plus className="h-4 w-4" /> Author New Module
          </Button>
        }
      />

      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input placeholder="Search module title..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={courseFilter} onValueChange={(v) => setCourseFilter(v || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[240px] bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="Full Stack Next.js 16 & React 19 Enterprise Architecture">Next.js 16 Enterprise</SelectItem>
                <SelectItem value="Python AI & Deep Learning LLM Agentic Engineering">Python AI LLM</SelectItem>
                <SelectItem value="PostgreSQL & Supabase High-Availability Systems">PostgreSQL & Supabase</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden rounded-xl">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Seq</th>
                <th className="p-4">Module Title</th>
                <th className="p-4">Course</th>
                <th className="p-4">Type</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Assigned</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                  <td className="p-4 pl-6 font-bold text-xs text-[#2563EB]">#{m.sequenceOrder}</td>
                  <td className="p-4 space-y-0.5">
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{m.title}</p>
                    <p className="text-[11px] text-[#6B7280] line-clamp-1">{m.contentSummary}</p>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/30 text-[#2563EB] max-w-[180px] truncate">
                      {m.courseTitle}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge className={`text-[10px] capitalize gap-1 ${typeBg(m.type)}`}>
                      {typeIcon(m.type)} {m.type}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs font-mono text-[#6B7280]">{m.duration}</td>
                  <td className="p-4">
                    {m.assignedStudents.length > 0 ? (
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-semibold gap-1">
                        <UserCheck className="h-3 w-3" /> {m.assignedStudents.length}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF] italic">Not assigned</span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button onClick={() => openAssignView(m)} size="sm"
                        className="h-8 px-3 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg gap-1">
                        <Users className="h-3.5 w-3.5" /> Assign
                      </Button>
                      <Button onClick={() => handleDeleteModule(m.id, m.title)}
                        variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626]">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
