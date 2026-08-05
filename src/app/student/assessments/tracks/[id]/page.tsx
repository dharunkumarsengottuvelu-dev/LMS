"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FolderKanban, Clock, CheckCircle2, Play, Code2, Layers,
  ClipboardList, ShieldCheck, MonitorCheck, Maximize, CopyX, Award, Check, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface SubModuleItem {
  id: string;
  title: string;
  description: string;
  type: "mcq" | "coding" | "mixed";
  duration_minutes: number;
  total_marks: number;
  question_count: number;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
  proctoring: {
    enabled: boolean;
    webcamTracking: boolean;
    tabSwitchLock: boolean;
    fullscreenLock: boolean;
    safeExamBrowserRequired: boolean;
    copyPasteRestricted: boolean;
  };
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

const mockPracticeTracksData: Record<string, PracticeCourseTrack> = {
  "track-1": {
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
        description: "Evaluate your understanding of React 19 Server Components, hydration boundaries, and client component directives.",
        type: "mcq",
        duration_minutes: 30,
        total_marks: 100,
        question_count: 10,
        status: "completed",
        score: 90,
        proctoring: {
          enabled: true,
          webcamTracking: true,
          tabSwitchLock: true,
          fullscreenLock: true,
          safeExamBrowserRequired: true,
          copyPasteRestricted: true,
        },
      },
      {
        id: "p1-m2",
        title: "Module 2: Custom Middleware & JWT Auth Handshake",
        description: "Write production Next.js Middleware logic to intercept HTTP request headers and validate authentication session cookies.",
        type: "coding",
        duration_minutes: 45,
        total_marks: 150,
        question_count: 2,
        status: "in_progress",
        proctoring: {
          enabled: true,
          webcamTracking: true,
          tabSwitchLock: true,
          fullscreenLock: true,
          safeExamBrowserRequired: false,
          copyPasteRestricted: true,
        },
      },
      {
        id: "p1-m3",
        title: "Module 3: Fullstack Server Action & PostgreSQL RLS",
        description: "Build end-to-end fullstack mutation actions connected to Supabase database with Row Level Security isolation.",
        type: "mixed",
        duration_minutes: 60,
        total_marks: 200,
        question_count: 8,
        status: "not_started",
        proctoring: {
          enabled: false,
          webcamTracking: false,
          tabSwitchLock: false,
          fullscreenLock: false,
          safeExamBrowserRequired: false,
          copyPasteRestricted: false,
        },
      },
    ],
  },
  "track-2": {
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
        description: "Solve algorithmic problems involving array deduplication, two-sum target pairs, and string sliding windows.",
        type: "coding",
        duration_minutes: 45,
        total_marks: 150,
        question_count: 3,
        status: "in_progress",
        proctoring: {
          enabled: true,
          webcamTracking: true,
          tabSwitchLock: true,
          fullscreenLock: true,
          safeExamBrowserRequired: false,
          copyPasteRestricted: true,
        },
      },
      {
        id: "p2-m2",
        title: "Module 2: Dynamic Programming & Recursion Fundamentals",
        description: "Practice optimal subproblem memoization and recursive tree traversal solutions.",
        type: "coding",
        duration_minutes: 60,
        total_marks: 200,
        question_count: 4,
        status: "not_started",
        proctoring: {
          enabled: true,
          webcamTracking: true,
          tabSwitchLock: true,
          fullscreenLock: true,
          safeExamBrowserRequired: true,
          copyPasteRestricted: true,
        },
      },
    ],
  },
  "track-3": {
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
        description: "Practice designing 3NF database schemas, foreign key constraints, and B-tree indexes.",
        type: "mixed",
        duration_minutes: 60,
        total_marks: 200,
        question_count: 12,
        status: "completed",
        score: 180,
        proctoring: {
          enabled: false,
          webcamTracking: false,
          tabSwitchLock: false,
          fullscreenLock: false,
          safeExamBrowserRequired: false,
          copyPasteRestricted: false,
        },
      },
    ],
  },
};

export default function PracticeTrackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const trackId = params?.id as string;
  const track = mockPracticeTracksData[trackId] || mockPracticeTracksData["track-1"] || {
    id: "track-1",
    title: "React 19 & Next.js 16 Enterprise Masterclass",
    category: "Frontend Development",
    description: "Complete hands-on practice suite covering Server Components, App Router Navigation, and Custom Middleware.",
    assignedBy: "Admin",
    assignedByName: "Dharunkumar S",
    subModules: []
  };

  const completedCount = track.subModules.filter((m) => m.status === "completed").length;
  const totalCount = track.subModules.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  const handleStartSubModule = async (subModule: SubModuleItem) => {
    // Direct Fullscreen Trigger on User Click
    if (subModule.proctoring.fullscreenLock) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen error:", err);
      }
    }

    toast({
      title: "Launching Practice Module",
      description: `Starting ${subModule.title}... ${
        subModule.proctoring.enabled ? "Security Active." : "Standard Mode."
      }`,
    });
    router.push(`/student/assessments/${subModule.id}`);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 pb-12 w-full">
      {/* Back Button & Track Title Header */}
      <div className="space-y-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
          onClick={() => router.push("/student/assessments")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Practice Tracks
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[32px] md:text-[36px] font-bold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                {track.title}
              </h1>
              <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1">
                {track.category}
              </Badge>
            </div>
            <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
              {track.description}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-sm shrink-0 space-y-1.5 w-full md:w-72">
            <div className="flex justify-between text-xs">
              <span className="text-[#6B7280]">Track Completion:</span>
              <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{progressPercentage}% ({completedCount}/{totalCount})</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-[#E5E7EB]" />
            <p className="text-[11px] text-[#6B7280] pt-0.5">Assigned by {track.assignedBy}: {track.assignedByName}</p>
          </div>
        </div>
      </div>

      {/* Sub-Modules List Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-[#2563EB]" /> Practice Sub-Modules ({totalCount})
        </h2>
      </div>

      {/* Modules List Cards */}
      <div className="space-y-4">
        {track.subModules.map((module, idx) => (
          <Card
            key={module.id}
            className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm hover:border-[#2563EB]/50 transition-all p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left Info */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#2563EB] bg-[#2563EB]/10 px-2.5 py-1 rounded-lg">
                    Module #{idx + 1}
                  </span>

                  {module.type === "mcq" && (
                    <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-semibold px-2.5 py-0.5">
                      <ClipboardList className="h-3 w-3 mr-1 inline" /> MCQ Single/Multi Choice
                    </Badge>
                  )}
                  {module.type === "coding" && (
                    <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 text-xs font-semibold px-2.5 py-0.5">
                      <Code2 className="h-3 w-3 mr-1 inline" /> Coding Problem
                    </Badge>
                  )}
                  {module.type === "mixed" && (
                    <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/20 text-xs font-semibold px-2.5 py-0.5">
                      <Layers className="h-3 w-3 mr-1 inline" /> Mixed Format (MCQ + Coding)
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-[20px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                    {module.title}
                  </h3>
                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] mt-1 leading-relaxed">
                    {module.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] pt-1">
                  <span>Duration: <strong className="text-[#111827] dark:text-[#FAFAFA]">{module.duration_minutes} Mins</strong></span>
                  <span>•</span>
                  <span>Questions: <strong className="text-[#111827] dark:text-[#FAFAFA]">{module.question_count} Items</strong></span>
                  <span>•</span>
                  <span>Total Marks: <strong className="text-[#111827] dark:text-[#FAFAFA]">{module.total_marks} Marks</strong></span>
                </div>

                {/* Security Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {module.proctoring.safeExamBrowserRequired && (
                    <Badge variant="outline" className="text-[10px] border-[#9333EA]/30 text-[#9333EA] bg-[#9333EA]/5">
                      SEB Required
                    </Badge>
                  )}
                  {module.proctoring.fullscreenLock && (
                    <Badge variant="outline" className="text-[10px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                      Fullscreen Lock
                    </Badge>
                  )}
                  {module.proctoring.copyPasteRestricted && (
                    <Badge variant="outline" className="text-[10px] border-[#DC2626]/30 text-[#DC2626] bg-[#DC2626]/5">
                      Copy-Paste Disabled
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right Launcher Action */}
              <div className="shrink-0 flex items-center gap-3">
                {module.status === "completed" ? (
                  <Button
                    variant="secondary"
                    className="h-[48px] px-6 text-sm font-bold gap-2 text-[#16A34A]"
                    onClick={() => handleStartSubModule(module)}
                  >
                    <CheckCircle2 className="h-5 w-5" /> Score: {module.score}% (Passed)
                  </Button>
                ) : (
                  <Button
                    className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm gap-2"
                    onClick={() => handleStartSubModule(module)}
                  >
                    <Play className="h-4 w-4" /> {module.status === "in_progress" ? "Resume Module" : "Start Module"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
