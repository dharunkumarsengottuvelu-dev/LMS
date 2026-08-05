"use client";

import React, { useState } from "react";
import {
  Layers, Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle2,
  Clock, BookOpen, ArrowLeft, Sparkles, Video, Code2, FileText
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
}

const initialModules: CourseModuleItem[] = [
  {
    id: "m_1",
    courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Next.js 16 App Router & Server Components Fundamentals",
    duration: "45 mins",
    type: "video",
    sequenceOrder: 1,
    contentSummary: "Deep dive into React Server Components (RSC), layout nesting, and streaming SSR.",
  },
  {
    id: "m_2",
    courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Server Actions & Supabase Authentication Integration",
    duration: "60 mins",
    type: "video",
    sequenceOrder: 2,
    contentSummary: "Implement secure server actions, JWT cookies, and Supabase RLS policies.",
  },
  {
    id: "m_3",
    courseTitle: "Full Stack Next.js 16 & React 19 Enterprise Architecture",
    title: "Monaco Code Editor & Judge0 Code Execution Challenge",
    duration: "90 mins",
    type: "coding",
    sequenceOrder: 3,
    contentSummary: "Interactive browser coding challenge with automated testcase assertions.",
  },
];

export function ModuleManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [modules, setModules] = useState<CourseModuleItem[]>(initialModules);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // View state: "list" | "create"
  const [viewState, setViewState] = useState<"list" | "create">("list");

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCourse, setNewCourse] = useState("Full Stack Next.js 16 & React 19 Enterprise Architecture");
  const [newDuration, setNewDuration] = useState("45 mins");
  const [newType, setNewType] = useState<"video" | "coding" | "reading" | "quiz">("video");
  const [newSummary, setNewSummary] = useState("");

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
    };

    setModules((prev) => [created, ...prev]);
    setViewState("list");
    setNewTitle("");
    setNewSummary("");
    toast({
      title: "Module Published Successfully",
      description: `"${newTitle}" added to ${newCourse}.`,
    });
  };

  const handleDeleteModule = (id: string, title: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
    toast({
      title: "Module Deleted",
      description: `${title} has been removed.`,
      variant: "destructive",
    });
  };

  // FULL PAGE CREATION VIEW
  if (viewState === "create") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button
            onClick={() => setViewState("list")}
            variant="outline"
            size="sm"
            className="h-9 font-bold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]"
          >
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
              <Input
                placeholder="e.g. Next.js 16 Middleware & JWT Verification"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Parent Course</label>
              <Select value={newCourse} onValueChange={(val) => setNewCourse(val || "Full Stack Next.js 16 & React 19 Enterprise Architecture")}>
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
                <Select value={newType} onValueChange={(val) => setNewType((val as any) || "video")}>
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
                <Input
                  placeholder="e.g. 45 mins"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Module Overview & Syllabus Notes</label>
              <Textarea
                placeholder="Brief summary of key concepts covered in this module..."
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                rows={4}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
                <Sparkles className="h-4 w-4" /> Save & Publish Module
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Enterprise Course Modules & Lesson Manager" : "Curriculum Modules Manager"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Author video lessons, coding practice challenges, reading materials, and quizzes for enterprise courses
          </p>
        </div>

        <Button
          onClick={() => setViewState("create")}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20"
        >
          <Plus className="h-4 w-4" /> Create New Module
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search module title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={courseFilter} onValueChange={(val) => setCourseFilter(val || "all")}>
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

            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
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
                <th className="p-4">Module Type</th>
                <th className="p-4">Duration</th>
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
                    <Badge
                      className={`text-[10px] font-bold capitalize ${
                        m.type === "video"
                          ? "bg-[#2563EB] text-white"
                          : m.type === "coding"
                          ? "bg-[#9333EA] text-white"
                          : m.type === "quiz"
                          ? "bg-[#F59E0B] text-white"
                          : "bg-[#16A34A] text-white"
                      }`}
                    >
                      {m.type}
                    </Badge>
                  </td>

                  <td className="p-4 text-xs font-mono text-[#6B7280]">
                    {m.duration}
                  </td>

                  <td className="p-4 pr-6 text-right space-x-2">
                    <Button
                      onClick={() => handleDeleteModule(m.id, m.title)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#DC2626]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
