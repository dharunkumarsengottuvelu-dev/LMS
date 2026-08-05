"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Clock, ArrowRight, CheckCircle2, AlertCircle, Search, Filter, Code2, Layers,
  ShieldCheck, MonitorCheck, Maximize, CopyX, Play, Shield, FolderKanban, Check, ChevronRight, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface SubModuleItem {
  id: string;
  title: string;
  type: "mcq" | "coding" | "mixed";
  duration_minutes: number;
  total_marks: number;
  question_count: number;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
}

interface PracticeCourseTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  assignedBy: "Admin" | "Trainer";
  assignedByName: string;
  subModules: SubModuleItem[];
}

const mockPracticeTracks: PracticeCourseTrack[] = [
  {
    id: "track-1",
    title: "React 19 & Next.js 16 Enterprise Masterclass",
    category: "Frontend Development",
    description: "Complete hands-on practice suite covering Server Components, App Router Navigation, and Custom Middleware.",
    assignedBy: "Admin",
    assignedByName: "Dharunkumar S",
    subModules: [
      {
        id: "p1",
        title: "Module 1: React 19 Server Components Architecture",
        type: "mcq",
        duration_minutes: 30,
        total_marks: 100,
        question_count: 10,
        status: "completed",
        score: 90,
      },
      {
        id: "p1-m2",
        title: "Module 2: Custom Middleware & JWT Auth Handshake",
        type: "coding",
        duration_minutes: 45,
        total_marks: 150,
        question_count: 2,
        status: "in_progress",
      },
      {
        id: "p1-m3",
        title: "Module 3: Fullstack Server Action & PostgreSQL RLS",
        type: "mixed",
        duration_minutes: 60,
        total_marks: 200,
        question_count: 8,
        status: "not_started",
      },
    ],
  },
  {
    id: "track-2",
    title: "Data Structures & Algorithms Problem Solving Track",
    category: "Algorithms & Logic",
    description: "Master essential algorithmic problem solving with live code execution and test cases.",
    assignedBy: "Trainer",
    assignedByName: "Dr. Arunkumar (Lead Technical Trainer)",
    subModules: [
      {
        id: "p2",
        title: "Module 1: Arrays, Hash Maps & Two Pointer Technique",
        type: "coding",
        duration_minutes: 45,
        total_marks: 150,
        question_count: 3,
        status: "in_progress",
      },
      {
        id: "p2-m2",
        title: "Module 2: Dynamic Programming & Recursion Fundamentals",
        type: "coding",
        duration_minutes: 60,
        total_marks: 200,
        question_count: 4,
        status: "not_started",
      },
    ],
  },
  {
    id: "track-3",
    title: "Fullstack Architecture & System Design Track",
    category: "System Engineering",
    description: "Architect scaleable cloud databases, microservices, and client-side caching.",
    assignedBy: "Admin",
    assignedByName: "System Admin",
    subModules: [
      {
        id: "p3",
        title: "Module 1: Database Normalization & Index Optimization",
        type: "mixed",
        duration_minutes: 60,
        total_marks: 200,
        question_count: 12,
        status: "completed",
        score: 180,
      },
    ],
  },
];

export default function StudentPracticePage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredTracks = mockPracticeTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(search.toLowerCase()) || track.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || track.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 pb-12 w-full">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
        onClick={() => router.push("/student/dashboard")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-bold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Practice Tracks Hub
          </h1>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4B5563]" />
          <Input
            placeholder="Search practice tracks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-[44px] text-xs bg-white dark:bg-[#18181B]"
          />
        </div>
      </div>



      {/* Practice Tracks Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {filteredTracks.map((track) => {
          const completedCount = track.subModules.filter((m) => m.status === "completed").length;
          const totalCount = track.subModules.length;
          const progressPercentage = Math.round((completedCount / totalCount) * 100);

          return (
            <Card key={track.id} className="flex flex-col justify-between hover:border-[#2563EB]/50 transition-all duration-200 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardHeader className="p-6 pb-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                    <FolderKanban className="h-3 w-3 mr-1 inline" /> {track.category}
                  </Badge>

                  <span className="text-[11px] font-bold text-[#2563EB]">
                    {track.assignedBy}: {track.assignedByName}
                  </span>
                </div>

                <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                  {track.title}
                </CardTitle>

                <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] line-clamp-2 leading-relaxed">
                  {track.description}
                </p>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4">
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Modules Count:</span>
                    <span className="font-bold text-[#2563EB]">{totalCount} Practice Modules</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#6B7280]">Track Completion:</span>
                      <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{progressPercentage}% ({completedCount}/{totalCount})</span>
                    </div>
                    <Progress value={progressPercentage} className="h-1.5 bg-[#E5E7EB]" />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  onClick={() => router.push(`/student/assessments/tracks/${track.id}`)}
                  className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2"
                >
                  Explore Practice Track ({totalCount} Modules) <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
