"use client";

import React, { useState } from "react";
import {
  Layers, Plus, Search, Trash2, ArrowLeft, Sparkles, UserCheck,
  Users, CheckCircle2, Clock, BookOpen, Code2, FileText, Video,
  ChevronRight, ShieldCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface CourseModuleItem {
  id: string;
  courseTitle: string;
  title: string;
  duration: string;
  type: "video" | "coding" | "reading" | "quiz";
  sequenceOrder: number;
  contentSummary: string;
  assignedBatches: string[];  // batches this module is assigned to as practice
  assignedStudents: string[]; // individual student IDs assigned
}

// Mock student roster for assignment
const allStudents = [
  { id: "std_101", name: "Dharunkumar Sengottuvelu", email: "dharunkumar@gmail.com", batch: "Batch 2026-A" },
  { id: "std_102", name: "Alex Rivera",              email: "alex.rivera@techcorp.com", batch: "Batch 2026-A" },
  { id: "std_103", name: "Sarah Chen",               email: "sarah.chen@techcorp.com", batch: "Batch 2026-B" },
  { id: "std_104", name: "Michael Chang",            email: "m.chang@enterprise.com",  batch: "Batch 2026-B" },
  { id: "std_105", name: "Priya Nair",               email: "priya.nair@org.in",       batch: "Batch 2026-A" },
  { id: "std_106", name: "James Okafor",             email: "j.okafor@techcorp.com",   batch: "Batch 2026-B" },
];

const allBatches = ["Batch 2026-A", "Batch 2026-B"];

const initialModules: CourseModuleItem[] = [
  {
    id: "m_1",
    courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Next.js 16 App Router & Server Components Fundamentals",
    duration: "45 mins",
    type: "video",
    sequenceOrder: 1,
    contentSummary: "Deep dive into React Server Components (RSC), layout nesting, and streaming SSR.",
    assignedBatches: ["Batch 2026-A"],
    assignedStudents: ["std_101", "std_102", "std_105"],
  },
  {
    id: "m_2",
    courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Server Actions & Supabase Authentication Integration",
    duration: "60 mins",
    type: "video",
    sequenceOrder: 2,
    contentSummary: "Implement secure server actions, JWT cookies, and Supabase RLS policies.",
    assignedBatches: [],
    assignedStudents: [],
  },
  {
    id: "m_3",
    courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Monaco Code Editor & Judge0 Code Execution Challenge",
    duration: "90 mins",
    type: "coding",
    sequenceOrder: 3,
    contentSummary: "Interactive browser coding challenge with automated testcase assertions.",
    assignedBatches: [],
    assignedStudents: [],
  },
];

type ViewState = "list" | "create" | "assign";

export function ModuleManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [modules, setModules] = useState<CourseModuleItem[]>(initialModules);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedModule, setSelectedModule] = useState<CourseModuleItem | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newCourse, setNewCourse] = useState("Full Stack Next.js 16 & React 19 Enterprise Architecture");
  const [newDuration, setNewDuration] = useState("45 mins");
  const [newType, setNewType] = useState<"video" | "coding" | "reading" | "quiz">("video");
  const [newSummary, setNewSummary] = useState("");

  // Assign form state
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignBatchFilter, setAssignBatchFilter] = useState("all");

  const filtered = modules.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.courseTitle.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = courseFilter === "all" || m.courseTitle === courseFilter;
    const matchesType = typeFilter === "all" || m.type === typeFilter;
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
    };
    setModules((prev) => [created, ...prev]);
    setViewState("list");
    setNewTitle("");
    setNewSummary("");
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

  const toggleBatch = (batch: string) => {
    setSelectedBatches((prev) => {
      if (prev.includes(batch)) return prev.filter((b) => b !== batch);
      return [...prev, batch];
    });
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      return [...prev, id];
    });
  };

  const selectAllInBatch = (batch: string) => {
    const batchStudentIds = allStudents.filter((s) => s.batch === batch).map((s) => s.id);
    const allSelected = batchStudentIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !batchStudentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => [...new Set([...prev, ...batchStudentIds])]);
    }
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
    const totalAssigned = selectedStudentIds.length;
    toast({
      title: "Module Practice Assigned",
      description: `"${selectedModule.title}" assigned to ${totalAssigned} student${totalAssigned !== 1 ? "s" : ""} across ${selectedBatches.length} batch${selectedBatches.length !== 1 ? "es" : ""}.`,
    });
    setViewState("list");
  };

  // ─── TYPE ICON ─────────────────────────────────────────────
  const typeIcon = (type: string) => {
    if (type === "video") return <Video className="h-3.5 w-3.5" />;
    if (type === "coding") return <Code2 className="h-3.5 w-3.5" />;
    if (type === "quiz") return <BookOpen className="h-3.5 w-3.5" />;
    return <FileText className="h-3.5 w-3.5" />;
  };

  const typeBg = (type: string) =>
    type === "video"
      ? "bg-[#2563EB] text-white"
      : type === "coding"
      ? "bg-[#9333EA] text-white"
      : type === "quiz"
      ? "bg-[#F59E0B] text-white"
      : "bg-[#16A34A] text-white";

  // ─── FULL PAGE: CREATE MODULE ───────────────────────────────
  if (viewState === "create") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button onClick={() => setViewState("list")} variant="outline" size="sm"
            className="h-9 font-bold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]">
            <ArrowLeft className="h-4 w-4" /> Back to Modules Directory
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              Author New Module / Lesson
            </h1>
            <p className="text-xs text-[#6B7280]">Configure video lesson, coding challenge, or reading content</p>
          </div>
        </div>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleCreateModule} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module / Lesson Title</label>
              <Input placeholder="e.g. Next.js 16 Middleware & JWT Verification" value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)} required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Parent Course</label>
              <Select value={newCourse} onValueChange={(v) => setNewCourse(v || "Full Stack Next.js 16 & React 19 Enterprise Architecture")}>
                <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Stack Next.js 16 & React 19 Enterprise Architecture">Next.js 16 Enterprise</SelectItem>
                  <SelectItem value="Python AI & Deep Learning LLM Agentic Engineering">Python AI LLM</SelectItem>
                  <SelectItem value="PostgreSQL & Supabase High-Availability Systems">PostgreSQL & Supabase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Type</label>
                <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Lesson</SelectItem>
                    <SelectItem value="coding">Coding Challenge (Judge0)</SelectItem>
                    <SelectItem value="reading">Reading Material</SelectItem>
                    <SelectItem value="quiz">Quiz Evaluation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Estimated Duration</label>
                <Input placeholder="e.g. 45 mins" value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)} required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Overview & Syllabus Notes</label>
              <Textarea placeholder="Brief summary of key concepts covered in this module..." value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)} rows={4}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")}
                className="h-[48px] px-6 font-bold text-xs rounded-xl">Cancel</Button>
              <Button type="submit"
                className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
                <Sparkles className="h-4 w-4" /> Save & Publish Module
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ─── FULL PAGE: ASSIGN TO STUDENTS ─────────────────────────
  if (viewState === "assign" && selectedModule) {
    const displayStudents =
      assignBatchFilter === "all"
        ? allStudents
        : allStudents.filter((s) => s.batch === assignBatchFilter);

    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-start gap-3">
            <Button onClick={() => setViewState("list")} variant="outline" size="sm"
              className="h-9 font-bold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A] mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                Assign Module as Practice Track
              </h1>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Assign <span className="font-bold text-[#2563EB]">"{selectedModule.title}"</span> to individual students or entire batches
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveAssignment}
            className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#16A34A]/20 shrink-0"
          >
            <CheckCircle2 className="h-4 w-4" /> Save Assignment ({selectedStudentIds.length} Students)
          </Button>
        </div>

        {/* Module Info Card */}
        <Card className="bg-[#2563EB]/5 border border-[#2563EB]/20 dark:bg-[#2563EB]/10 p-5 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBg(selectedModule.type)}`}>
              {typeIcon(selectedModule.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm truncate">{selectedModule.title}</p>
              <p className="text-xs text-[#6B7280] mt-0.5 truncate">{selectedModule.courseTitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs font-mono border-[#2563EB]/40 text-[#2563EB]">
                <Clock className="h-3 w-3 mr-1" /> {selectedModule.duration}
              </Badge>
              <Badge className={`text-[10px] font-bold capitalize ${typeBg(selectedModule.type)}`}>
                {selectedModule.type}
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Batch-level Assignment */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#2563EB]" /> Assign by Entire Batch
            </h2>
            {allBatches.map((batch) => {
              const isSelected = selectedBatches.includes(batch);
              const count = allStudents.filter((s) => s.batch === batch).length;
              return (
                <button
                  key={batch}
                  type="button"
                  onClick={() => {
                    toggleBatch(batch);
                    selectAllInBatch(batch);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
                    isSelected
                      ? "border-[#2563EB] bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
                      : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#2563EB]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{batch}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{count} enrolled students</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-[#D1D5DB] dark:border-[#52525B]"
                    }`}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-[#2563EB]/20">
                      <span className="text-[10px] font-bold text-[#2563EB] flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> All {count} students selected
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT: Individual Student Assignment */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#9333EA]" /> Assign to Individual Students
              </h2>
              <Select value={assignBatchFilter} onValueChange={(v) => setAssignBatchFilter(v || "all")}>
                <SelectTrigger className="h-9 text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="Batch 2026-A">Batch 2026-A</SelectItem>
                  <SelectItem value="Batch 2026-B">Batch 2026-B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden">
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                {displayStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 transition-all duration-100 ${
                        isSelected
                          ? "bg-[#2563EB]/5 dark:bg-[#2563EB]/10"
                          : "hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
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
                          isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-[#D1D5DB] dark:border-[#52525B]"
                        }`}>
                          {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Summary Footer */}
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
              <div className="text-xs text-[#6B7280]">
                <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{selectedStudentIds.length}</span>
                {" "}of {allStudents.length} students selected
                {selectedBatches.length > 0 && (
                  <span className="ml-2 text-[#2563EB] font-semibold">
                    • {selectedBatches.join(", ")} assigned as batch
                  </span>
                )}
              </div>
              <Button
                type="button"
                onClick={handleSaveAssignment}
                className="h-9 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Assign
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Enterprise Course Modules & Lesson Manager" : "Curriculum Modules Manager"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Author lessons, assign modules as student practice tracks, and manage course syllabi
          </p>
        </div>
        <Button
          onClick={() => setViewState("create")}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20"
        >
          <Plus className="h-4 w-4" /> Create New Module
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input placeholder="Search module title..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]" />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={courseFilter} onValueChange={(v) => setCourseFilter(v || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[240px] bg-[#F9FAFB] dark:bg-[#09090B]">
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
              <SelectTrigger className="h-[44px] text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video Lesson</SelectItem>
                <SelectItem value="coding">Coding Challenge</SelectItem>
                <SelectItem value="reading">Reading Material</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Modules Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Seq #</th>
                <th className="p-4">Module / Lesson Title</th>
                <th className="p-4">Parent Course</th>
                <th className="p-4">Type</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Practice Assignment</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                  <td className="p-4 pl-6 font-bold text-xs text-[#2563EB]">
                    #{m.sequenceOrder}
                  </td>

                  <td className="p-4 space-y-0.5">
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{m.title}</p>
                    <p className="text-[11px] text-[#6B7280] line-clamp-1">{m.contentSummary}</p>
                  </td>

                  <td className="p-4">
                    <Badge variant="outline" className="text-xs font-bold border-[#2563EB]/30 text-[#2563EB] max-w-[180px] truncate">
                      {m.courseTitle}
                    </Badge>
                  </td>

                  <td className="p-4">
                    <Badge className={`text-[10px] font-bold capitalize gap-1 ${typeBg(m.type)}`}>
                      {typeIcon(m.type)} {m.type}
                    </Badge>
                  </td>

                  <td className="p-4 text-xs font-mono text-[#6B7280]">
                    {m.duration}
                  </td>

                  {/* Practice Assignment Status */}
                  <td className="p-4">
                    {m.assignedStudents.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <Badge className="bg-[#16A34A] text-white text-[10px] font-bold gap-1 w-fit">
                          <UserCheck className="h-3 w-3" /> {m.assignedStudents.length} Students
                        </Badge>
                        {m.assignedBatches.length > 0 && (
                          <span className="text-[10px] text-[#6B7280]">
                            {m.assignedBatches.join(", ")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF] italic">Not assigned yet</span>
                    )}
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => openAssignView(m)}
                        size="sm"
                        className="h-8 px-3 text-xs font-bold bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-lg gap-1"
                      >
                        <Users className="h-3.5 w-3.5" /> Assign to Students
                      </Button>
                      <Button
                        onClick={() => handleDeleteModule(m.id, m.title)}
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-[#DC2626]"
                      >
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
