"use client";

import React, { useState } from "react";
import {
  Dumbbell, Search, Users, CheckCircle2, Clock,
  BookOpen, Code2, FileText, Video, UserCheck,
  ShieldCheck, PlayCircle, StickyNote, ListChecks,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────
interface PracticeModule {
  id: string;
  courseTitle: string;
  title: string;
  duration: string;
  type: "video" | "coding" | "reading" | "quiz";
  sequenceOrder: number;
  contentSummary: string;
  assignedBatches: string[];
  assignedStudents: string[];
  hasVideo: boolean;
  hasNotes: boolean;
  hasPractice: boolean;
  hasQuiz: boolean;
}

// ─── Mock students ─────────────────────────────────────────
const allStudents = [
  { id: "std_101", name: "Dharunkumar Sengottuvelu", email: "dharunkumar@gmail.com",  batch: "Batch 2026-A" },
  { id: "std_102", name: "Alex Rivera",              email: "alex.rivera@techcorp.com",  batch: "Batch 2026-A" },
  { id: "std_103", name: "Sarah Chen",               email: "sarah.chen@techcorp.com",   batch: "Batch 2026-B" },
  { id: "std_104", name: "Michael Chang",            email: "m.chang@enterprise.com",    batch: "Batch 2026-B" },
  { id: "std_105", name: "Priya Nair",               email: "priya.nair@org.in",         batch: "Batch 2026-A" },
  { id: "std_106", name: "James Okafor",             email: "j.okafor@techcorp.com",     batch: "Batch 2026-B" },
];

const allBatches = ["Batch 2026-A", "Batch 2026-B"];

// ─── Mock practice modules (authored from Courses → Syllabus)
const initialModules: PracticeModule[] = [
  {
    id: "m_1", courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Next.js 16 App Router & Server Components Fundamentals",
    duration: "45 mins", type: "video", sequenceOrder: 1,
    contentSummary: "Deep dive into React Server Components, layout nesting, and streaming SSR.",
    assignedBatches: ["Batch 2026-A"], assignedStudents: ["std_101", "std_102", "std_105"],
    hasVideo: true, hasNotes: true, hasPractice: false, hasQuiz: false,
  },
  {
    id: "m_2", courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Server Actions & Supabase Authentication Integration",
    duration: "60 mins", type: "video", sequenceOrder: 2,
    contentSummary: "Implement secure server actions, JWT cookies, and Supabase RLS policies.",
    assignedBatches: [], assignedStudents: [],
    hasVideo: true, hasNotes: false, hasPractice: false, hasQuiz: false,
  },
  {
    id: "m_3", courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Monaco Code Editor & Judge0 Code Execution Challenge",
    duration: "90 mins", type: "coding", sequenceOrder: 3,
    contentSummary: "Interactive browser coding challenge with automated testcase assertions.",
    assignedBatches: [], assignedStudents: [],
    hasVideo: false, hasNotes: false, hasPractice: true, hasQuiz: false,
  },
  {
    id: "m_4", courseTitle: "Python AI & Deep Learning LLM Agentic Engineering",
    title: "Transformers Architecture Deep Dive",
    duration: "75 mins", type: "video", sequenceOrder: 1,
    contentSummary: "Self-attention, positional encoding, and encoder-decoder architecture.",
    assignedBatches: [], assignedStudents: [],
    hasVideo: true, hasNotes: true, hasPractice: false, hasQuiz: true,
  },
  {
    id: "m_5", courseTitle: "Python AI & Deep Learning LLM Agentic Engineering",
    title: "Agentic AI Tools & LangChain Practice",
    duration: "60 mins", type: "coding", sequenceOrder: 2,
    contentSummary: "Build ReAct agents with tools, memory, and LangChain pipelines.",
    assignedBatches: [], assignedStudents: [],
    hasVideo: false, hasNotes: true, hasPractice: true, hasQuiz: false,
  },
];

// ─── Helpers ───────────────────────────────────────────────
function typeIcon(type: string) {
  if (type === "video")   return <Video   className="h-3.5 w-3.5" />;
  if (type === "coding")  return <Code2   className="h-3.5 w-3.5" />;
  if (type === "quiz")    return <BookOpen className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}
function typeBg(type: string) {
  return type === "video"   ? "bg-[#2563EB] text-white"
       : type === "coding"  ? "bg-[#9333EA] text-white"
       : type === "quiz"    ? "bg-[#F59E0B] text-white"
       : "bg-[#16A34A] text-white";
}

// ─── Main Component ────────────────────────────────────────
export function PracticesHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [modules, setModules] = useState<PracticeModule[]>(initialModules);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assigningModule, setAssigningModule] = useState<PracticeModule | null>(null);

  // Assign state
  const [selectedBatches, setSelectedBatches]       = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchFilter, setBatchFilter]               = useState("all");

  const filtered = modules.filter((m) => {
    const matchSearch  = m.title.toLowerCase().includes(search.toLowerCase()) ||
                         m.courseTitle.toLowerCase().includes(search.toLowerCase());
    const matchCourse  = courseFilter === "all" || m.courseTitle === courseFilter;
    const matchType    = typeFilter === "all" || m.type === typeFilter;
    return matchSearch && matchCourse && matchType;
  });

  const openAssign = (mod: PracticeModule) => {
    setAssigningModule(mod);
    setSelectedBatches([...mod.assignedBatches]);
    setSelectedStudentIds([...mod.assignedStudents]);
    setBatchFilter("all");
  };

  const closeAssign = () => setAssigningModule(null);

  const toggleBatch = (batch: string) => {
    const batchIds = allStudents.filter((s) => s.batch === batch).map((s) => s.id);
    const allSel = batchIds.every((id) => selectedStudentIds.includes(id));
    if (selectedBatches.includes(batch)) {
      setSelectedBatches((prev) => prev.filter((b) => b !== batch));
      setSelectedStudentIds((prev) => prev.filter((id) => !batchIds.includes(id)));
    } else {
      setSelectedBatches((prev) => [...prev, batch]);
      if (!allSel) setSelectedStudentIds((prev) => [...new Set([...prev, ...batchIds])]);
    }
  };

  const toggleStudent = (id: string) =>
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const handleSaveAssignment = () => {
    if (!assigningModule) return;
    setModules((prev) =>
      prev.map((m) =>
        m.id === assigningModule.id
          ? { ...m, assignedBatches: selectedBatches, assignedStudents: selectedStudentIds }
          : m
      )
    );
    toast({
      title: "Practice Track Assigned ✅",
      description: `"${assigningModule.title}" → ${selectedStudentIds.length} students in ${selectedBatches.length || "no"} batch.`,
    });
    closeAssign();
  };

  const displayStudents = batchFilter === "all" ? allStudents : allStudents.filter((s) => s.batch === batchFilter);

  // ── ASSIGN PANEL ────────────────────────────────────────
  if (assigningModule) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-start gap-3">
            <Button onClick={closeAssign} variant="outline" size="sm"
              className="h-9 font-bold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A] mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" /> Back to Practices
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                Assign Practice Track
              </h1>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Assigning: <span className="font-bold text-[#9333EA]">"{assigningModule.title}"</span>
              </p>
            </div>
          </div>
          <Button onClick={handleSaveAssignment}
            className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#16A34A]/20 shrink-0">
            <CheckCircle2 className="h-4 w-4" /> Save ({selectedStudentIds.length} Students)
          </Button>
        </div>

        {/* Module Info */}
        <Card className="bg-[#9333EA]/5 border border-[#9333EA]/20 dark:bg-[#9333EA]/10 p-5 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBg(assigningModule.type)}`}>
              {typeIcon(assigningModule.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm truncate">{assigningModule.title}</p>
              <p className="text-xs text-[#6B7280] truncate">{assigningModule.courseTitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
              <Badge variant="outline" className="text-xs font-mono border-[#9333EA]/40 text-[#9333EA]">
                <Clock className="h-3 w-3 mr-1" />{assigningModule.duration}
              </Badge>
              {assigningModule.hasVideo && (
                <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 text-[9px] font-bold gap-0.5">
                  <PlayCircle className="h-2.5 w-2.5" /> Video
                </Badge>
              )}
              {assigningModule.hasNotes && (
                <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 text-[9px] font-bold gap-0.5">
                  <StickyNote className="h-2.5 w-2.5" /> Notes
                </Badge>
              )}
              {assigningModule.hasPractice && (
                <Badge className="bg-[#9333EA]/10 text-[#9333EA] border border-[#9333EA]/20 text-[9px] font-bold gap-0.5">
                  <Dumbbell className="h-2.5 w-2.5" /> Practice
                </Badge>
              )}
              {assigningModule.hasQuiz && (
                <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[9px] font-bold gap-0.5">
                  <ListChecks className="h-2.5 w-2.5" /> Quiz
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batch Panel */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#2563EB]" /> Assign Entire Batch
            </h2>
            {allBatches.map((batch) => {
              const isSel  = selectedBatches.includes(batch);
              const count  = allStudents.filter((s) => s.batch === batch).length;
              return (
                <button key={batch} type="button" onClick={() => toggleBatch(batch)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
                    isSel
                      ? "border-[#9333EA] bg-[#9333EA]/5 dark:bg-[#9333EA]/10"
                      : "border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#9333EA]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{batch}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{count} enrolled</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSel ? "border-[#9333EA] bg-[#9333EA]" : "border-[#D1D5DB] dark:border-[#52525B]"
                    }`}>
                      {isSel && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  {isSel && (
                    <div className="mt-2 pt-2 border-t border-[#9333EA]/20">
                      <span className="text-[10px] font-bold text-[#9333EA] flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> All {count} students selected
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Individual Student Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#9333EA]" /> Individual Students
              </h2>
              <Select value={batchFilter} onValueChange={(v) => setBatchFilter(v || "all")}>
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
                  const isSel = selectedStudentIds.includes(student.id);
                  return (
                    <button key={student.id} type="button" onClick={() => toggleStudent(student.id)}
                      className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 transition-all ${
                        isSel ? "bg-[#9333EA]/5 dark:bg-[#9333EA]/10" : "hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSel ? "bg-[#9333EA] text-white" : "bg-[#9333EA]/10 text-[#9333EA]"
                        }`}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#111827] dark:text-[#FAFAFA] truncate">{student.name}</p>
                          <p className="text-[11px] text-[#6B7280] truncate">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] border-[#9333EA]/30 text-[#9333EA]">
                          {student.batch}
                        </Badge>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSel ? "border-[#9333EA] bg-[#9333EA]" : "border-[#D1D5DB] dark:border-[#52525B]"
                        }`}>
                          {isSel && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Summary footer */}
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
              <p className="text-xs text-[#6B7280]">
                <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{selectedStudentIds.length}</span>
                {" "}of {allStudents.length} students selected
                {selectedBatches.length > 0 && (
                  <span className="text-[#9333EA] font-semibold ml-2">• {selectedBatches.join(", ")}</span>
                )}
              </p>
              <Button onClick={handleSaveAssignment}
                className="h-9 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Assign
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ───────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          {role === "admin" ? "Practice Track Assignment Hub" : "Student Practice Assignments"}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
          Assign course modules as practice tracks to individual students or entire batches
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Modules", value: modules.length,                                  color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
          { label: "Assigned",      value: modules.filter((m) => m.assignedStudents.length > 0).length, color: "text-[#16A34A]", bg: "bg-[#16A34A]/10" },
          { label: "Unassigned",    value: modules.filter((m) => m.assignedStudents.length === 0).length, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
          { label: "Total Students", value: allStudents.length,                              color: "text-[#9333EA]", bg: "bg-[#9333EA]/10" },
        ].map((stat) => (
          <Card key={stat.label} className={`${stat.bg} border-0 p-5 rounded-2xl`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[#6B7280] font-semibold mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input placeholder="Search module or course..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]" />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={courseFilter} onValueChange={(v) => setCourseFilter(v || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[220px] bg-[#F9FAFB] dark:bg-[#09090B]">
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
              <SelectTrigger className="h-[44px] text-xs w-[150px] bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">📹 Video</SelectItem>
                <SelectItem value="coding">💻 Coding</SelectItem>
                <SelectItem value="reading">📄 Reading</SelectItem>
                <SelectItem value="quiz">❓ Quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Module Cards */}
      <div className="space-y-3">
        {filtered.map((m) => (
          <Card key={m.id}
            className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Module info */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${typeBg(m.type)}`}>
                    {typeIcon(m.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{m.title}</p>
                      <Badge className={`text-[9px] font-bold capitalize ${typeBg(m.type)}`}>{m.type}</Badge>
                    </div>
                    <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{m.courseTitle}</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5 line-clamp-1">{m.contentSummary}</p>

                    {/* Content badges */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {m.hasVideo && (
                        <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 text-[9px] font-bold gap-0.5">
                          <PlayCircle className="h-2.5 w-2.5" /> Video
                        </Badge>
                      )}
                      {m.hasNotes && (
                        <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 text-[9px] font-bold gap-0.5">
                          <StickyNote className="h-2.5 w-2.5" /> Notes
                        </Badge>
                      )}
                      {m.hasPractice && (
                        <Badge className="bg-[#9333EA]/10 text-[#9333EA] border border-[#9333EA]/20 text-[9px] font-bold gap-0.5">
                          <Dumbbell className="h-2.5 w-2.5" /> Practice
                        </Badge>
                      )}
                      {m.hasQuiz && (
                        <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[9px] font-bold gap-0.5">
                          <ListChecks className="h-2.5 w-2.5" /> Quiz
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] font-mono border-[#E5E7EB] text-[#6B7280]">
                        <Clock className="h-2.5 w-2.5 mr-1" />{m.duration}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Right: Assignment status + button */}
                <div className="flex items-center gap-3 shrink-0">
                  {m.assignedStudents.length > 0 ? (
                    <div className="text-right">
                      <Badge className="bg-[#16A34A] text-white text-xs font-bold gap-1">
                        <UserCheck className="h-3 w-3" /> {m.assignedStudents.length} Students
                      </Badge>
                      {m.assignedBatches.length > 0 && (
                        <p className="text-[10px] text-[#6B7280] mt-1">{m.assignedBatches.join(", ")}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#9CA3AF] italic">Not assigned</span>
                  )}
                  <Button onClick={() => openAssign(m)} size="sm"
                    className="h-9 px-4 text-xs font-bold bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl gap-1.5 shrink-0">
                    <Users className="h-3.5 w-3.5" />
                    {m.assignedStudents.length > 0 ? "Re-Assign" : "Assign"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#9CA3AF]">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No modules found</p>
            <p className="text-xs mt-1">Modules are authored inside Courses → Syllabus → Add Module</p>
          </div>
        )}
      </div>
    </div>
  );
}
