"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FolderKanban, Clock, CheckCircle2, Play, Code2, Layers,
  ClipboardList, ShieldCheck, MonitorCheck, Maximize, CopyX, Award, Check, ChevronRight,
  ChevronDown, BookOpen, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface SubModuleItem {
  id: string;
  subModuleNumber: string; // e.g. "1.1", "1.2"
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

interface MainModuleItem {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  subModules: SubModuleItem[];
}

interface PracticeCourseTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  assignedBy: "Admin" | "Trainer";
  assignedByName: string;
  mainModules: MainModuleItem[];
}

const mockPracticeTracksData: Record<string, PracticeCourseTrack> = {};

export default function StudentTrackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const trackId = (params?.id as string) || "";
  const track = mockPracticeTracksData[trackId] ?? {
    id: trackId,
    title: "Practice Track",
    category: "General",
    description: "No practice track data available.",
    assignedBy: "Admin",
    assignedByName: "System",
    mainModules: []
  };

  // Flatten all submodules for progress calculation
  const allSubModules = track.mainModules.flatMap((m) => m.subModules);
  const completedCount = allSubModules.filter((m) => m.status === "completed").length;
  const totalCount = allSubModules.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
      title: "Launching Practice Sub-Module",
      description: `Starting ${subModule.title}... ${
        subModule.proctoring.enabled ? "Security Controls Active." : "Standard Mode."
      }`,
    });
    router.push(`/student/assessments/${subModule.id}`);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 pb-12 w-full">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Track Title Header */}
      <div className="space-y-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
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
            <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA]">
              {track.description}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-sm shrink-0 space-y-2 min-w-[240px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7280]">Track Completion:</span>
              <span className="font-bold text-[#16A34A]">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2.5 bg-[#E5E7EB] dark:bg-[#27272A]" />
            <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
              <span>{completedCount} of {totalCount} Sub-Modules Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN MODULES & NESTED SUB-MODULES LIST */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#2563EB]" /> Main Practice Modules ({track.mainModules.length})
          </h2>
          <Badge variant="outline" className="text-xs font-bold border-[#2563EB] text-[#2563EB]">
            {totalCount} Total Sub-Modules
          </Badge>
        </div>

        {track.mainModules.map((mainMod) => (
          <Card key={mainMod.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
            {/* Main Module Banner */}
            <CardHeader className="p-6 bg-[#2563EB]/5 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-[#2563EB] text-white text-xs font-bold px-2.5 py-0.5">
                      Module {mainMod.moduleNumber}
                    </Badge>
                    <span className="text-xs text-[#6B7280] font-bold">
                      {mainMod.subModules.length} Sub-Modules Included
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {mainMod.title}
                  </CardTitle>
                  <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">
                    {mainMod.description}
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Sub-Modules List */}
            <CardContent className="p-6 space-y-4">
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#2563EB]" /> Interactive Sub-Modules:
              </p>

              <div className="space-y-3">
                {mainMod.subModules.map((sub) => {
                  const isCompleted = sub.status === "completed";
                  const isInProgress = sub.status === "in_progress";

                  return (
                    <div
                      key={sub.id}
                      className="p-5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] hover:border-[#2563EB] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left Sub-Module Info */}
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs font-bold border-[#2563EB]/40 text-[#2563EB] bg-[#2563EB]/5">
                            Sub-Module {sub.subModuleNumber}
                          </Badge>

                          <Badge className={`text-[10px] font-bold uppercase ${
                            sub.type === "coding" ? "bg-[#9333EA] text-white" : sub.type === "mcq" ? "bg-[#2563EB] text-white" : "bg-[#F59E0B] text-white"
                          }`}>
                            {sub.type === "coding" ? "Coding Exercise" : sub.type === "mcq" ? "MCQ Suite" : "Mixed Practice"}
                          </Badge>

                          {isCompleted && (
                            <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">
                              Completed ({sub.score} Marks)
                            </Badge>
                          )}
                          {isInProgress && (
                            <Badge className="bg-[#F59E0B] text-white text-[10px] font-bold">
                              In Progress
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                          {sub.title}
                        </h3>
                        <p className="text-xs text-[#6B7280] dark:text-[#D1D5DB] leading-relaxed">
                          {sub.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] pt-1">
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {sub.duration_minutes} mins</span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-[#2563EB]" /> {sub.question_count} Questions ({sub.total_marks} Marks)</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0">
                        <Button
                          className={`h-[44px] px-6 font-bold gap-2 ${
                            isCompleted
                              ? "bg-[#F3F4F6] dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA] hover:bg-[#E5E7EB]"
                              : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                          }`}
                          onClick={() => handleStartSubModule(sub)}
                        >
                          <Play className="h-4 w-4" />
                          {isCompleted ? "Re-take Sub-Module" : isInProgress ? "Continue Sub-Module" : "Start Sub-Module"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
