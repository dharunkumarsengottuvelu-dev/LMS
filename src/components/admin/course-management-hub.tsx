"use client";

import React, { useState } from "react";
import {
  BookOpen, Plus, Search, Edit, Trash2, Eye,
  Clock, Users, Sparkles, ArrowLeft, Layers, Save,
  User, GraduationCap, ListChecks
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ─── Types (aligned with student portal) ──────────────────
export interface ManagedCourse {
  id: string;
  title: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "published" | "draft";
  enrolledStudents: number;
  totalLessons: number;        // students see "X of Y lessons"
  instructor: string;          // students see "Instructor: ..."
  durationHours: number;
  durationMins: number;
  description: string;
  modules: {
    id: string;
    title: string;
    duration: string;
    type: "video" | "reading" | "quiz" | "coding";
  }[];
}

function formatDuration(h: number, m: number) {
  if (h === 0 && m === 0) return "—";
  return [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : ""].filter(Boolean).join(" ");
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
      { id: "mod_1", title: "Next.js 16 App Router Fundamentals", duration: "45 mins", type: "video" },
      { id: "mod_2", title: "Server Actions & Supabase Authentication", duration: "60 mins", type: "video" },
      { id: "mod_3", title: "Monaco Code Editor & Judge0 Integration", duration: "90 mins", type: "coding" },
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
      { id: "mod_4", title: "Transformers Architecture Deep Dive", duration: "75 mins", type: "video" },
      { id: "mod_5", title: "Agentic AI Tools & LangChain", duration: "60 mins", type: "reading" },
    ],
  },
  {
    id: "mc_3",
    title: "Data Structures & Algorithms in Python",
    category: "Computer Science",
    level: "Advanced",
    status: "published",
    enrolledStudents: 96,
    totalLessons: 24,
    instructor: "Dr. Elena Rostova",
    durationHours: 18,
    durationMins: 0,
    description: "Master essential algorithmic problem solving — arrays, trees, graphs, dynamic programming.",
    modules: [
      { id: "mod_6", title: "Arrays & Hash Maps", duration: "40 mins", type: "coding" },
    ],
  },
];

type ViewState = "list" | "create" | "edit" | "syllabus" | "add-module";

// ─── Duration Picker ───────────────────────────────────────
function DurationPicker({ hours, mins, onH, onM }: {
  hours: number; mins: number;
  onH: (v: number) => void; onM: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 space-y-1">
        <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Hours</label>
        <div className="relative">
          <Input type="number" min={0} max={999} value={hours}
            onChange={(e) => onH(Math.max(0, Number(e.target.value)))}
            className="h-[48px] text-sm font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] pr-12" />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">hrs</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Minutes</label>
        <div className="relative">
          <Input type="number" min={0} max={59} value={mins}
            onChange={(e) => onM(Math.min(59, Math.max(0, Number(e.target.value))))}
            className="h-[48px] text-sm font-bold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] pr-12" />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">min</span>
        </div>
      </div>
      {(hours > 0 || mins > 0) && (
        <div className="pt-5">
          <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
            <Clock className="h-3 w-3 mr-1" /> {formatDuration(hours, mins)}
          </Badge>
        </div>
      )}
    </div>
  );
}

// ─── Shared Course Form (Create + Edit) ────────────────────
function CourseForm({
  title, setTitle, category, setCategory,
  level, setLevel, instructor, setInstructor,
  totalLessons, setTotalLessons,
  hours, setHours, mins, setMins,
  desc, setDesc, onSubmit, onCancel, isEdit,
}: {
  title: string; setTitle: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  level: "Beginner" | "Intermediate" | "Advanced"; setLevel: (v: "Beginner" | "Intermediate" | "Advanced") => void;
  instructor: string; setInstructor: (v: string) => void;
  totalLessons: number; setTotalLessons: (v: number) => void;
  hours: number; setHours: (v: number) => void;
  mins: number; setMins: (v: number) => void;
  desc: string; setDesc: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  return (
    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
      <form onSubmit={onSubmit} className="space-y-6">

        {/* Course Title */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
            <span>Course Title</span>
            <span className="text-[10px] font-semibold text-[#2563EB]">Required</span>
          </label>
          <Input placeholder="e.g. React 19 & Next.js 16 Enterprise Production Blueprint"
            value={title} onChange={(e) => setTitle(e.target.value)} required
            className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Domain Category — free text (students see this as badge) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
              <span>Domain Category</span>
              <span className="text-[10px] text-[#6B7280]">Shown as badge on student portal</span>
            </label>
            <Input placeholder="e.g. Web Development, AI & ML, Cloud & DevOps..."
              value={category} onChange={(e) => setCategory(e.target.value)} required
              className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
          </div>

          {/* Difficulty Level — students see this as a badge */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
              <span>Difficulty Level</span>
              <span className="text-[10px] text-[#6B7280]">Shown as badge on student portal</span>
            </label>
            <Select value={level} onValueChange={(v) => setLevel((v as any) || "Intermediate")}>
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

        {/* Instructor Name — students see "Instructor: ..." */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[#2563EB]" /> Instructor Name
            <span className="text-[10px] text-[#6B7280] font-normal">— shown as "Instructor: ..." on student My Courses</span>
          </label>
          <Input placeholder="e.g. Dr. Elena Rostova or Alex Rivera"
            value={instructor} onChange={(e) => setInstructor(e.target.value)} required
            className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Total Lessons — students see "X of Y lessons" */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-[#2563EB]" /> Total Lessons Count
              <span className="text-[10px] text-[#6B7280] font-normal">— "X of Y lessons" progress on student portal</span>
            </label>
            <Input type="number" min={1} placeholder="e.g. 28"
              value={totalLessons} onChange={(e) => setTotalLessons(Math.max(1, Number(e.target.value)))} required
              className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
          </div>

          {/* Enrolled students (informational) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
              Initial Enrolled Students <span className="text-[10px] text-[#6B7280] font-normal">(optional)</span>
            </label>
            <Input type="number" min={0} placeholder="0" defaultValue={0}
              className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
          </div>
        </div>

        {/* Duration — students see this as clock icon + "X Hours" */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[#16A34A]" /> Estimated Total Duration
            </span>
            <span className="text-[10px] text-[#6B7280]">Shown as ⏱ on student portal course card</span>
          </label>
          <DurationPicker hours={hours} mins={mins} onH={setHours} onM={setMins} />
        </div>

        {/* Overview Description — students see this as course description */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
            <span>Overview Description & Learning Outcomes</span>
            <span className="text-[10px] text-[#6B7280]">Shown on student course card</span>
          </label>
          <Textarea
            placeholder="Write a comprehensive description of what learners will build and master..."
            value={desc} onChange={(e) => setDesc(e.target.value)} rows={5}
            className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
          <Button type="button" variant="outline" onClick={onCancel}
            className="h-[48px] px-6 font-bold text-xs rounded-xl">Cancel</Button>
          <Button type="submit"
            className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
            {isEdit ? <><Save className="h-4 w-4" /> Save Changes</> : <><Sparkles className="h-4 w-4" /> Publish Course Now</>}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Main Hub ──────────────────────────────────────────────
export function CourseManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [courses, setCourses] = useState<ManagedCourse[]>(initialCourses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [fTitle, setFTitle]           = useState("");
  const [fCategory, setFCategory]     = useState("");
  const [fLevel, setFLevel]           = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [fInstructor, setFInstructor] = useState("");
  const [fLessons, setFLessons]       = useState(20);
  const [fHours, setFHours]           = useState(0);
  const [fMins, setFMins]             = useState(0);
  const [fDesc, setFDesc]             = useState("");

  // Module form
  const [modTitle, setModTitle]   = useState("");
  const [modDur, setModDur]       = useState("45 mins");
  const [modType, setModType]     = useState<"video" | "reading" | "quiz" | "coding">("video");

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    (categoryFilter === "all" || c.category.toLowerCase().includes(categoryFilter.toLowerCase()))
  );

  const openCreate = () => {
    setEditingId(null);
    setFTitle(""); setFCategory(""); setFLevel("Intermediate");
    setFInstructor(""); setFLessons(20); setFHours(0); setFMins(0); setFDesc("");
    setViewState("create");
  };

  const openEdit = (c: ManagedCourse) => {
    setEditingId(c.id);
    setFTitle(c.title); setFCategory(c.category); setFLevel(c.level);
    setFInstructor(c.instructor); setFLessons(c.totalLessons);
    setFHours(c.durationHours); setFMins(c.durationMins); setFDesc(c.description);
    setViewState("edit");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const created: ManagedCourse = {
      id: `mc_${Date.now()}`,
      title: fTitle, category: fCategory || "General",
      level: fLevel, status: "published",
      enrolledStudents: 0, totalLessons: fLessons,
      instructor: fInstructor || "Course Instructor",
      durationHours: fHours, durationMins: fMins,
      description: fDesc || "Newly authored interactive training module.",
      modules: [{ id: `mod_${Date.now()}`, title: "Module 1: Course Overview", duration: "30 mins", type: "video" }],
    };
    setCourses((prev) => [created, ...prev]);
    setViewState("list");
    toast({ title: "Course Published ✅", description: `"${fTitle}" is live for students.` });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setCourses((prev) => prev.map((c) =>
      c.id === editingId ? {
        ...c, title: fTitle, category: fCategory || "General", level: fLevel,
        instructor: fInstructor, totalLessons: fLessons,
        durationHours: fHours, durationMins: fMins, description: fDesc,
      } : c
    ));
    setViewState("list");
    toast({ title: "Course Updated ✅", description: `"${fTitle}" saved.` });
  };

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !modTitle) return;
    const updated = {
      ...selectedCourse,
      modules: [...selectedCourse.modules, { id: `mod_${Date.now()}`, title: modTitle, duration: modDur, type: modType }],
      lessonsCount: selectedCourse.modules.length + 1,
    };
    setSelectedCourse(updated);
    setCourses((prev) => prev.map((c) => (c.id === selectedCourse.id ? updated : c)));
    setViewState("syllabus"); setModTitle("");
    toast({ title: "Module Added", description: `"${modTitle}" added.` });
  };

  const handleToggleStatus = (id: string) =>
    setCourses((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const next = c.status === "published" ? "draft" : "published";
      toast({ title: "Status Updated", description: `${c.title} → ${next.toUpperCase()}` });
      return { ...c, status: next };
    }));

  const handleDelete = (id: string, title: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Course Removed", description: title, variant: "destructive" });
  };

  // ── VIEW: CREATE ─────────────────────────────────────────
  if (viewState === "create") return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <Button onClick={() => setViewState("list")} variant="outline" size="sm"
          className="h-9 font-bold text-xs gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Author New Enterprise Course</h1>
          <p className="text-xs text-[#6B7280]">All fields here are shown to students on their portal</p>
        </div>
      </div>
      <CourseForm title={fTitle} setTitle={setFTitle} category={fCategory} setCategory={setFCategory}
        level={fLevel} setLevel={setFLevel} instructor={fInstructor} setInstructor={setFInstructor}
        totalLessons={fLessons} setTotalLessons={setFLessons}
        hours={fHours} setHours={setFHours} mins={fMins} setMins={setFMins}
        desc={fDesc} setDesc={setFDesc} onSubmit={handleCreate} onCancel={() => setViewState("list")} isEdit={false} />
    </div>
  );

  // ── VIEW: EDIT ───────────────────────────────────────────
  if (viewState === "edit") return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <Button onClick={() => setViewState("list")} variant="outline" size="sm"
          className="h-9 font-bold text-xs gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Edit Course Details</h1>
          <p className="text-xs text-[#6B7280]">Changes reflect immediately on student portal</p>
        </div>
      </div>
      <CourseForm title={fTitle} setTitle={setFTitle} category={fCategory} setCategory={setFCategory}
        level={fLevel} setLevel={setFLevel} instructor={fInstructor} setInstructor={setFInstructor}
        totalLessons={fLessons} setTotalLessons={setFLessons}
        hours={fHours} setHours={setFHours} mins={fMins} setMins={setFMins}
        desc={fDesc} setDesc={setFDesc} onSubmit={handleEdit} onCancel={() => setViewState("list")} isEdit={true} />
    </div>
  );

  // ── VIEW: SYLLABUS ───────────────────────────────────────
  if (viewState === "syllabus" && selectedCourse) return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex items-center gap-3">
          <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-bold text-xs gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">{selectedCourse.title}</h1>
            <p className="text-xs text-[#6B7280]">{selectedCourse.category} • {selectedCourse.level} • Instructor: {selectedCourse.instructor}</p>
          </div>
        </div>
        <Button onClick={() => setViewState("add-module")}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-2 px-5 rounded-xl shrink-0">
          <Plus className="h-4 w-4" /> Add Module
        </Button>
      </div>
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-3xl shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#2563EB]" /> Syllabus ({selectedCourse.modules.length} Modules)
        </h2>
        <div className="space-y-3">
          {selectedCourse.modules.map((m, idx) => (
            <div key={m.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <span className="w-8 h-8 rounded-xl bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs flex items-center justify-center border border-[#2563EB]/20">{idx + 1}</span>
                <div>
                  <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{m.title}</p>
                  <span className="text-[10px] text-[#6B7280] capitalize">Type: {m.type}</span>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold px-3 py-1 border-[#2563EB]/30 text-[#2563EB]">{m.duration}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── VIEW: ADD MODULE ─────────────────────────────────────
  if (viewState === "add-module" && selectedCourse) return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <Button onClick={() => setViewState("syllabus")} variant="outline" size="sm" className="h-9 font-bold text-xs gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Syllabus
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Add Module</h1>
          <p className="text-xs text-[#6B7280]">{selectedCourse.title}</p>
        </div>
      </div>
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
        <form onSubmit={handleAddModule} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module / Lesson Title</label>
            <Input placeholder="e.g. Server Actions & JWT Authentication" value={modTitle}
              onChange={(e) => setModTitle(e.target.value)} required
              className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Type</label>
              <Select value={modType} onValueChange={(v) => setModType((v as any) || "video")}>
                <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">📹 Video Lesson</SelectItem>
                  <SelectItem value="coding">💻 Coding Challenge</SelectItem>
                  <SelectItem value="reading">📄 Reading Material</SelectItem>
                  <SelectItem value="quiz">❓ Quiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration</label>
              <Input placeholder="e.g. 45 mins" value={modDur} onChange={(e) => setModDur(e.target.value)} required
                className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]" />
            </div>
          </div>
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setViewState("syllabus")} className="h-[48px] px-6 font-bold text-xs rounded-xl">Cancel</Button>
            <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
              <Sparkles className="h-4 w-4" /> Save Module
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );

  // ── VIEW: LIST ───────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Enterprise Course & Curriculum Manager" : "Assigned Training Courses"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Courses authored here appear on the student portal with all metadata, instructor, and lesson count
          </p>
        </div>
        <Button onClick={openCreate}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20">
          <Plus className="h-4 w-4" /> Author New Course
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

      {/* Course Cards — matching student portal layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course) => (
          <Card key={course.id}
            className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
            <CardContent className="p-6 space-y-4">
              {/* Same badges as student portal */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-bold border-[#2563EB]/30 text-[#2563EB]">
                  {course.category}
                </Badge>
                <Badge className={course.status === "published" ? "bg-[#16A34A] text-white text-[10px]" : "bg-[#6B7280] text-white text-[10px]"}>
                  {course.status}
                </Badge>
              </div>

              {/* Title + Difficulty (same as student portal) */}
              <div>
                <h3 className="font-bold text-base text-[#111827] dark:text-[#FAFAFA] leading-snug">{course.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-[10px] font-medium">{course.level}</Badge>
                  <span className="text-xs text-[#6B7280]">Instructor: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{course.instructor}</span></span>
                </div>
                <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5 leading-relaxed">{course.description}</p>
              </div>

              {/* Stats — same as student portal shows */}
              <div className="flex items-center justify-between text-xs text-[#6B7280] pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <span className="flex items-center gap-1 font-bold text-[#111827] dark:text-[#FAFAFA]">
                  <Users className="h-3.5 w-3.5 text-[#2563EB]" /> {course.enrolledStudents} Learners
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-[#9333EA]" /> {course.totalLessons} Lessons
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#16A34A]" /> {formatDuration(course.durationHours, course.durationMins)}
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <Button onClick={() => { setSelectedCourse(course); setViewState("syllabus"); }}
                  variant="outline" size="sm"
                  className="flex-1 h-8 text-xs font-bold gap-1 border-[#2563EB] text-[#2563EB] min-w-0">
                  <Eye className="h-3.5 w-3.5" /> Syllabus ({course.modules.length})
                </Button>
                <Button onClick={() => openEdit(course)} variant="outline" size="sm"
                  className="h-8 text-xs font-bold gap-1 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/5">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button onClick={() => handleToggleStatus(course.id)} variant="outline" size="sm"
                  className="h-8 text-xs font-bold text-[#6B7280]">
                  {course.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button onClick={() => handleDelete(course.id, course.title)} variant="ghost" size="icon"
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
