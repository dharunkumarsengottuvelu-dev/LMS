"use client";

import React, { useState } from "react";
import {
  BookOpen, Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle2,
  Clock, Users, Award, PlayCircle, FileText, Sparkles, Layers, Video, HelpCircle, Code2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export interface ManagedCourse {
  id: string;
  title: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "published" | "draft";
  enrolledStudents: number;
  lessonsCount: number;
  duration: string;
  description: string;
  modules: { id: string; title: string; duration: string; type: "video" | "reading" | "quiz" | "coding" }[];
}

const initialCourses: ManagedCourse[] = [
  {
    id: "mc_1",
    title: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    category: "Web Development",
    level: "Advanced",
    status: "published",
    enrolledStudents: 142,
    lessonsCount: 18,
    duration: "24 Hours",
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
    lessonsCount: 24,
    duration: "32 Hours",
    description: "PyTorch, Hugging Face, Transformers, and LLM fine-tuning for high-performance corporate applications.",
    modules: [
      { id: "mod_4", title: "Transformers Architecture Deep Dive", duration: "75 mins", type: "video" },
      { id: "mod_5", title: "Agentic AI Tools & LangChain", duration: "60 mins", type: "reading" },
    ],
  },
  {
    id: "mc_3",
    title: "PostgreSQL & Supabase High-Availability Systems",
    category: "Database Architecture",
    level: "Intermediate",
    status: "published",
    enrolledStudents: 96,
    lessonsCount: 14,
    duration: "18 Hours",
    description: "Row Level Security, connection pooling, indexes, and failover replication.",
    modules: [
      { id: "mod_6", title: "RLS Policies & Multitenant Isolation", duration: "40 mins", type: "video" },
    ],
  },
];

export function CourseManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [courses, setCourses] = useState<ManagedCourse[]>(initialCourses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Create Course Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Web Development");
  const [newLevel, setNewLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState("12 Hours");

  // View Syllabus & Add Module Modal State
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [modTitle, setModTitle] = useState("");
  const [modDuration, setModDuration] = useState("45 mins");
  const [modType, setModType] = useState<"video" | "reading" | "quiz" | "coding">("video");

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const created: ManagedCourse = {
      id: `mc_${Date.now()}`,
      title: newTitle,
      category: newCategory,
      level: newLevel,
      status: "published",
      enrolledStudents: 0,
      lessonsCount: 1,
      duration: newDuration,
      description: newDesc || "Newly authored interactive training module.",
      modules: [{ id: `mod_${Date.now()}`, title: "Module 1: Course Overview & Environment Setup", duration: "30 mins", type: "video" }],
    };

    setCourses((prev) => [created, ...prev]);
    setIsCreateOpen(false);
    setNewTitle("");
    setNewDesc("");
    toast({
      title: "Course Authoring Successful",
      description: `"${newTitle}" is now live and active in the course catalog.`,
    });
  };

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !modTitle) return;

    const newMod = {
      id: `mod_${Date.now()}`,
      title: modTitle,
      duration: modDuration,
      type: modType,
    };

    const updatedModules = [...selectedCourse.modules, newMod];
    const updatedCourse = {
      ...selectedCourse,
      modules: updatedModules,
      lessonsCount: updatedModules.length,
    };

    setSelectedCourse(updatedCourse);
    setCourses((prev) => prev.map((c) => (c.id === selectedCourse.id ? updatedCourse : c)));

    setIsAddModuleOpen(false);
    setModTitle("");
    toast({
      title: "Module Added to Syllabus",
      description: `Added "${modTitle}" to ${selectedCourse.title}.`,
    });
  };

  const handleToggleStatus = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === "published" ? "draft" : "published";
          toast({
            title: "Course Status Updated",
            description: `${c.title} is now set to ${nextStatus.toUpperCase()}`,
          });
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleDeleteCourse = (id: string, title: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast({
      title: "Course Removed",
      description: `${title} has been removed.`,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Enterprise Course & Curriculum Manager" : "Assigned Training Courses"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Author courses, manage syllabus modules, track learner enrollment, and publish curricula
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0"
        >
          <Plus className="h-4 w-4" /> Author New Course
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search course title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
            <SelectTrigger className="h-[44px] text-xs w-[220px] bg-[#F9FAFB] dark:bg-[#09090B]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Web Development">Web Development</SelectItem>
              <SelectItem value="AI & Machine Learning">AI & Machine Learning</SelectItem>
              <SelectItem value="Database Architecture">Database Architecture</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
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
                <h3 className="font-bold text-base text-[#111827] dark:text-[#FAFAFA] leading-snug">
                  {course.title}
                </h3>
                <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5 leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B7280] pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <span className="flex items-center gap-1 font-bold text-[#111827] dark:text-[#FAFAFA]">
                  <Users className="h-3.5 w-3.5 text-[#2563EB]" /> {course.enrolledStudents} Learners
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#16A34A]" /> {course.duration}
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  onClick={() => {
                    setSelectedCourse(course);
                    setIsSyllabusOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs font-bold gap-1 border-[#2563EB] text-[#2563EB]"
                >
                  <Eye className="h-3.5 w-3.5" /> Syllabus ({course.modules.length} Modules)
                </Button>

                <Button
                  onClick={() => handleToggleStatus(course.id)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-bold text-[#6B7280]"
                >
                  {course.status === "published" ? "Unpublish" : "Publish"}
                </Button>

                <Button
                  onClick={() => handleDeleteCourse(course.id, course.title)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#DC2626]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SYLLABUS INSPECTOR & MODULE MANAGER MODAL */}
      <Dialog open={isSyllabusOpen} onOpenChange={setIsSyllabusOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-4 rounded-2xl shadow-xl">
          <DialogHeader className="pb-2 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                {selectedCourse?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                {selectedCourse?.modules.length} Modules • Category: {selectedCourse?.category}
              </DialogDescription>
            </div>
            <Button
              onClick={() => setIsAddModuleOpen(true)}
              size="sm"
              className="h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Module
            </Button>
          </DialogHeader>

          <div className="space-y-2.5">
            {selectedCourse?.modules.map((m, idx) => (
              <div key={m.id} className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{m.title}</p>
                    <span className="text-[10px] text-[#6B7280] capitalize">Type: {m.type}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">{m.duration}</Badge>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button onClick={() => setIsSyllabusOpen(false)} className="w-full font-bold h-10">
              Close Syllabus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD MODULE MODAL */}
      <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-4 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Module / Lesson</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Add a new video, reading, coding practice, or quiz module to {selectedCourse?.title}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddModule} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module / Lesson Title</label>
              <Input
                placeholder="e.g. Building Middleware & JWT Verification"
                value={modTitle}
                onChange={(e) => setModTitle(e.target.value)}
                required
                className="h-[44px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Type</label>
              <Select value={modType} onValueChange={(val) => setModType((val as any) || "video")}>
                <SelectTrigger className="h-[44px] text-xs">
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Estimated Duration</label>
              <Input
                placeholder="e.g. 45 mins"
                value={modDuration}
                onChange={(e) => setModDuration(e.target.value)}
                required
                className="h-[44px] text-xs"
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold">
                Save Module to Syllabus
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE NEW COURSE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-4 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Author New Course</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Create and publish a new interactive training module.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Course Title</label>
              <Input
                placeholder="e.g. React 19 & Next.js 16 Production Blueprint"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-[44px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Domain Category</label>
              <Select value={newCategory} onValueChange={(val) => setNewCategory(val || "Web Development")}>
                <SelectTrigger className="h-[44px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Web Development">Web Development</SelectItem>
                  <SelectItem value="AI & Machine Learning">AI & Machine Learning</SelectItem>
                  <SelectItem value="Database Architecture">Database Architecture</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Difficulty Level</label>
              <Select value={newLevel} onValueChange={(val) => setNewLevel((val as any) || "Intermediate")}>
                <SelectTrigger className="h-[44px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Estimated Total Duration</label>
              <Input
                placeholder="e.g. 16 Hours"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                required
                className="h-[44px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Overview Description</label>
              <Textarea
                placeholder="Brief summary of course curriculum..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold">
                Publish Course Now
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
