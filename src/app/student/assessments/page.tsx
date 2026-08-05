"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Clock, ArrowRight, CheckCircle2, AlertCircle, Search, Filter, Code2, Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const mockPracticeModules = [
  {
    id: "p1",
    title: "React 19 & Next.js App Router Evaluation",
    type: "mcq", // MCQ format
    duration_minutes: 30,
    total_marks: 100,
    question_count: 10,
    passing_marks: 70,
    my_status: "not_started",
    assigned_by: "Admin (Dharun)",
    category: "Frontend Development",
  },
  {
    id: "p2",
    title: "Data Structures & Algorithms - Arrays & Strings",
    type: "coding", // Coding format
    duration_minutes: 45,
    total_marks: 150,
    question_count: 3,
    passing_marks: 100,
    my_status: "in_progress",
    assigned_by: "Trainer (Alex)",
    category: "Algorithms",
  },
  {
    id: "p3",
    title: "Fullstack Architecture & System Design",
    type: "mixed", // Mixed MCQ + Coding format
    duration_minutes: 60,
    total_marks: 200,
    question_count: 12,
    passing_marks: 140,
    my_status: "completed",
    score: 180,
    assigned_by: "Admin (Dharun)",
    category: "Fullstack Engineering",
  },
];

export default function StudentPracticePage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "mcq" | "coding" | "mixed">("all");

  const filteredModules = mockPracticeModules.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || p.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Practice Modules
          </h1>
          <p className="text-[16px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
            Solve assigned practice modules created by Admin & Trainers. Supports MCQ, Coding, or Mixed formats.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4B5563]" />
          <Input
            placeholder="Search practice modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-[44px] text-sm bg-white dark:bg-[#18181B]"
          />
        </div>
      </div>

      {/* Format Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3 overflow-x-auto">
        <Button
          variant={filterType === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("all")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "all" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          All Practice
        </Button>
        <Button
          variant={filterType === "mcq" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("mcq")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "mcq" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          MCQ Format
        </Button>
        <Button
          variant={filterType === "coding" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("coding")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "coding" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          Coding Format
        </Button>
        <Button
          variant={filterType === "mixed" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("mixed")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterType === "mixed" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          Mixed (MCQ + Coding)
        </Button>
      </div>

      {/* Practice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => (
          <Card key={module.id} className="flex flex-col justify-between hover:border-[#2563EB]/50 transition-all duration-200 bg-white dark:bg-[#18181B]">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                {/* Format Badges */}
                {module.type === "mcq" && (
                  <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-semibold px-2.5 py-0.5">
                    <ClipboardList className="h-3 w-3 mr-1 inline" /> MCQ Format
                  </Badge>
                )}
                {module.type === "coding" && (
                  <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 text-xs font-semibold px-2.5 py-0.5">
                    <Code2 className="h-3 w-3 mr-1 inline" /> Coding Format
                  </Badge>
                )}
                {module.type === "mixed" && (
                  <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/20 text-xs font-semibold px-2.5 py-0.5">
                    <Layers className="h-3 w-3 mr-1 inline" /> Mixed (MCQ + Coding)
                  </Badge>
                )}

                <span className="text-[11px] font-medium text-[#6B7280]">
                  By {module.assigned_by}
                </span>
              </div>

              <CardTitle className="text-[18px] font-semibold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                {module.title}
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">
                {module.category}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
              {/* Details Row */}
              <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-[#E5E7EB] dark:border-[#27272A]">
                <div>
                  <span className="text-[#6B7280]">Duration:</span>{" "}
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{module.duration_minutes} Mins</span>
                </div>
                <div>
                  <span className="text-[#6B7280]">Questions:</span>{" "}
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{module.question_count} Items</span>
                </div>
                <div>
                  <span className="text-[#6B7280]">Total Marks:</span>{" "}
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{module.total_marks}</span>
                </div>
                <div>
                  <span className="text-[#6B7280]">Passing Marks:</span>{" "}
                  <span className="font-semibold text-[#16A34A]">{module.passing_marks}</span>
                </div>
              </div>

              {/* Action Button */}
              {module.my_status === "completed" ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/20">
                  <span className="text-xs font-bold text-[#16A34A] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Score: {module.score}/{module.total_marks} (Passed)
                  </span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-[#2563EB]" asChild>
                    <Link href={`/student/assessments/${module.id}`}>Review</Link>
                  </Button>
                </div>
              ) : (
                <Button className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2" asChild>
                  <Link href={`/student/assessments/${module.id}`}>
                    {module.my_status === "in_progress" ? "Resume Practice" : "Start Practice"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
