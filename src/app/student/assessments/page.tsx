"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Clock, ArrowRight, CheckCircle2, AlertCircle, Search, Filter, Code2, Layers,
  ShieldCheck, MonitorCheck, Maximize, CopyX, Play, Shield, FolderKanban, Check, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SubModuleItem {
  id: string;
  title: string;
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
];

export default function StudentPracticePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedTrack, setSelectedTrack] = useState<PracticeCourseTrack | null>(null);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);

  const handleOpenTrackModules = (track: PracticeCourseTrack) => {
    setSelectedTrack(track);
    setIsModulesModalOpen(true);
  };

  const handleStartSubModule = async (subModule: SubModuleItem) => {
    setIsModulesModalOpen(false);

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

  const filteredTracks = mockPracticeTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(search.toLowerCase()) || track.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || track.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 pb-12 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-bold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Practice Tracks & Modules Hub
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

      {/* Category Filters */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3 overflow-x-auto">
        <Button
          variant={filterCategory === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterCategory("all")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterCategory === "all" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          All Practice Tracks
        </Button>
        <Button
          variant={filterCategory === "Frontend Development" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterCategory("Frontend Development")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterCategory === "Frontend Development" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          Frontend Development
        </Button>
        <Button
          variant={filterCategory === "Algorithms & Logic" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterCategory("Algorithms & Logic")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterCategory === "Algorithms & Logic" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          Algorithms & Logic
        </Button>
        <Button
          variant={filterCategory === "System Engineering" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterCategory("System Engineering")}
          className={`h-9 px-4 font-semibold text-xs rounded-lg ${filterCategory === "System Engineering" ? "bg-[#2563EB] text-white" : "text-[#4B5563] dark:text-[#D1D5DB]"}`}
        >
          System Engineering
        </Button>
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
                  onClick={() => handleOpenTrackModules(track)}
                  className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2"
                >
                  View All Modules ({totalCount}) <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* MULTI-MODULE SELECTION MODAL */}
      <Dialog open={isModulesModalOpen} onOpenChange={setIsModulesModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-[#2563EB]" />
              <DialogTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                {selectedTrack?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280] pt-1">
              Select a practice module to begin evaluation. Configured by {selectedTrack?.assignedBy} ({selectedTrack?.assignedByName})
            </DialogDescription>
          </DialogHeader>

          {/* Sub-Modules List */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {selectedTrack?.subModules.map((module, idx) => (
              <div
                key={module.id}
                className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#2563EB]/40 transition-all"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2563EB]">#{idx + 1}</span>
                    <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] truncate">
                      {module.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">
                    {module.type === "mcq" && (
                      <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-[10px] font-semibold px-2 py-0.5">
                        MCQ Single/Multi
                      </Badge>
                    )}
                    {module.type === "coding" && (
                      <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 text-[10px] font-semibold px-2 py-0.5">
                        Coding Problem
                      </Badge>
                    )}
                    {module.type === "mixed" && (
                      <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/20 text-[10px] font-semibold px-2 py-0.5">
                        Mixed Format
                      </Badge>
                    )}

                    <span>Duration: <strong>{module.duration_minutes} Mins</strong></span>
                    <span>•</span>
                    <span>Questions: <strong>{module.question_count} Items</strong></span>
                    <span>•</span>
                    <span>Marks: <strong>{module.total_marks}</strong></span>
                  </div>

                  {/* Security tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {module.proctoring.safeExamBrowserRequired && (
                      <Badge variant="outline" className="text-[9px] border-[#9333EA]/30 text-[#9333EA] bg-[#9333EA]/5">
                        SEB Required
                      </Badge>
                    )}
                    {module.proctoring.fullscreenLock && (
                      <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                        Fullscreen Lock
                      </Badge>
                    )}
                    {module.proctoring.copyPasteRestricted && (
                      <Badge variant="outline" className="text-[9px] border-[#DC2626]/30 text-[#DC2626] bg-[#DC2626]/5">
                        Copy-Paste Disabled
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Sub-Module Launcher Button */}
                <div className="shrink-0">
                  {module.status === "completed" ? (
                    <Button
                      variant="secondary"
                      className="h-10 text-xs font-bold gap-1 text-[#16A34A]"
                      onClick={() => handleStartSubModule(module)}
                    >
                      <Check className="h-4 w-4" /> Score: {module.score}%
                    </Button>
                  ) : (
                    <Button
                      className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-1.5"
                      onClick={() => handleStartSubModule(module)}
                    >
                      <Play className="h-3.5 w-3.5" /> {module.status === "in_progress" ? "Resume" : "Start Module"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="h-10 text-xs font-semibold" onClick={() => setIsModulesModalOpen(false)}>
              Close Track Window
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
