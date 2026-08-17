"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FolderKanban, Clock, CheckCircle2, Play, Code2, Layers,
  ClipboardList, ShieldCheck, MonitorCheck, Maximize, CopyX, Award, Check,
  ChevronRight, BookOpen, AlertCircle, Loader2, RefreshCw, Eye, RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SubModuleItem {
  id: string;
  subModuleNumber: string;
  title: string;
  description: string;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
  codingProblems?: any[];
}

interface PracticeTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail?: string;
  assignedByName: string;
  totalSubModules: number;
  completedCount: number;
  progressPercentage: number;
  subModules: SubModuleItem[];
}

export default function StudentTrackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const trackId = (params?.id as string) || "";
  const [track, setTrack] = useState<PracticeTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTrackDetails = async () => {
    if (!trackId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/student/practices/${trackId}`);
      const data = await res.json();
      
      if (res.ok && data.track) {
        setTrack(data.track);
        return;
      }
      
      throw new Error(data.error || "Failed to load practice track");
    } catch (err: any) {
      console.error("Error fetching practice track from API:", err);
      
      setErrorMsg(err.message || "Failed to load practice track.");
      toast({
        title: "Access Error",
        description: err.message || "You may not be assigned to this practice track.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackDetails();
    const handleFocus = () => {
      fetchTrackDetails();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [trackId]);

  const handleStartSubModule = (subModule: SubModuleItem) => {
    router.push(`/student/assessments/${subModule.id}?trackId=${trackId}`);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  if (errorMsg || !track) {
    return (
      <div className="w-full space-y-6 pb-12">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
          onClick={() => router.push("/student/practices")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Practices
        </Button>
        <Card className="text-center py-16 bg-white dark:bg-[#18181B] border-destructive/30 rounded-2xl">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <CardTitle className="text-lg">{errorMsg || "Practice track not found"}</CardTitle>
            <Button onClick={fetchTrackDetails} variant="outline" className="gap-2 rounded-xl">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate live dynamic statuses for all submodules
  const subModulesWithStatus = (track.subModules || []).map((sub) => {
    let isLocalInProgress = false;
    let isLocalCompleted = false;
    let localScore: number | null = null;
    let localAttemptsCount = 0;
    let answeredQuestionsCount = 0;

    if (typeof window !== "undefined") {
      try {
        const sessionKey = `lms_practice_session_${sub.id}`;
        const session = localStorage.getItem(sessionKey);
        if (session) {
          const parsed = JSON.parse(session);
          const ansLen = Object.keys(parsed.answers || {}).length;
          const codeLen = Object.keys(parsed.codeAnswers || {}).length;
          answeredQuestionsCount = ansLen + codeLen;
          if (answeredQuestionsCount > 0) {
            isLocalInProgress = true;
          }
        }

        const resultKey = `lms_completed_assessment_${sub.id}`;
        const resStr = localStorage.getItem(resultKey);
        if (resStr) {
          const parsedRes = JSON.parse(resStr);
          isLocalCompleted = true;
          localScore = parsedRes.score ?? null;
          localAttemptsCount = parsedRes.attemptsCount || 1;
        }
      } catch {}
    }

    const isCompleted = sub.status === "completed" || isLocalCompleted;
    const isInProgress = !isCompleted && (sub.status === "in_progress" || isLocalInProgress);
    const maxAtt = (sub as any).maxAttempts ?? (track as any).maxAttempts ?? 0;
    const isLocked = isCompleted && maxAtt === 1;
    const totalQ = sub.questionCount || (sub as any).codingQuestions?.length || (sub as any).mcqQuestions?.length || (sub.codingProblems?.length || 0) || 1;
    const rawPercent = Math.round((answeredQuestionsCount / totalQ) * 100);
    const moduleProgressPercent = isCompleted
      ? 100
      : isInProgress
      ? Math.min(99, Math.max(1, rawPercent))
      : 0;

    return {
      ...sub,
      isCompleted,
      isInProgress,
      localScore,
      localAttemptsCount,
      isLocked,
      moduleProgressPercent,
      answeredQuestionsCount,
    };
  });

  const totalSubModulesCount = subModulesWithStatus.length || track.totalSubModules || 1;
  const completedSubModulesCount = subModulesWithStatus.filter((s) => s.isCompleted).length;
  // Calculate dynamic overall track completion based on all sub-module progresses (both in-progress and completed)
  const totalModuleProgressSum = subModulesWithStatus.reduce((acc, s) => acc + s.moduleProgressPercent, 0);
  const dynamicProgressPercentage = totalSubModulesCount > 0
    ? Math.round(totalModuleProgressSum / totalSubModulesCount)
    : 0;

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A] rounded-xl hover:bg-muted"
        onClick={() => router.push("/student/practices")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Practices
      </Button>

      {/* Track Title Header */}
      <div className="space-y-4 pb-6 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="space-y-3">
              <Badge className="bg-[#2563EB] text-white text-xs font-semibold px-2.5 py-0.5">
                {track.category}
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA] leading-[1.15] max-w-4xl">
                {track.title}
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed font-normal">
              {track.description || "Interactive practice track for hands-on learning."}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>Assigned By: <strong className="text-foreground font-semibold">{track.assignedByName}</strong></span>
              <span>•</span>
              <span>{totalSubModulesCount} Practice Modules</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-sm shrink-0 space-y-2.5 min-w-[260px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Track Completion:</span>
              <span className="font-bold text-[#16A34A]">{dynamicProgressPercentage}%</span>
            </div>
            <Progress value={dynamicProgressPercentage} className="h-2.5 bg-muted rounded-full" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>
                {completedSubModulesCount} of {totalSubModulesCount} Modules Completed
                {dynamicProgressPercentage > 0 && completedSubModulesCount === 0 ? ` (${dynamicProgressPercentage}% in progress)` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
            Practice Modules ({subModulesWithStatus.length})
          </h2>
          <Badge variant="outline" className="text-xs font-semibold border-[#2563EB] text-[#2563EB]">
            {totalSubModulesCount} Total Modules
          </Badge>
        </div>

        <div className="space-y-4">
          {subModulesWithStatus.map((sub, idx) => {
            const { isCompleted, isInProgress, localScore, isLocked, moduleProgressPercent } = sub;

            return (
              <Card
                key={sub.id}
                className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden hover:border-[#2563EB]/60 transition-all"
              >
                <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Left Module Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/40 text-[#2563EB] bg-[#2563EB]/5">
                        Module {idx + 1}
                      </Badge>

                      <Badge className={`text-[10px] font-semibold uppercase ${
                        sub.type === "coding" ? "bg-[#9333EA] text-white" : sub.type === "mcq" ? "bg-[#2563EB] text-white" : "bg-[#F59E0B] text-white"
                      }`}>
                        {sub.type === "coding" ? "Coding Exercise" : sub.type === "mcq" ? "MCQ Suite" : "Mixed Practice"}
                      </Badge>

                      {isCompleted && (
                        <Badge className="bg-[#16A34A] text-white text-[10px] font-semibold">
                          Completed {sub.score || localScore !== null ? `(${sub.score ?? localScore} Marks)` : ""}
                        </Badge>
                      )}
                      {isInProgress && (
                        <Badge className="bg-[#F59E0B] text-white text-[10px] font-bold animate-pulse">
                          In Progress
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base md:text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {sub.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {sub.durationMinutes} mins</span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-[#2563EB]" /> {sub.questionCount} Problems ({sub.totalMarks} Marks)</span>
                    </div>
                  </div>

                  {/* Circular Tracker & Action Button */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    {/* Clean Centered Circular Progress Tracker */}
                    <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                        {/* Background Track Circle */}
                        <path
                          className="text-[#E5E7EB] dark:text-[#27272A]"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {/* Dynamic Progress Fill */}
                        <path
                          className={
                            isCompleted
                              ? "text-[#16A34A] transition-all duration-500"
                              : isInProgress
                              ? "text-[#F59E0B] transition-all duration-500"
                              : "text-transparent"
                          }
                          strokeDasharray={`${moduleProgressPercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>

                      {/* Centered Indicator */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                        ) : (
                          <span className={cn(
                            "text-[10px] font-black leading-none",
                            isInProgress ? "text-[#F59E0B]" : "text-muted-foreground/80"
                          )}>
                            {moduleProgressPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button(s) */}
                    {isCompleted ? (
                      <div className="flex items-center gap-2">
                        <Button
                          className="h-11 px-5 font-bold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                          onClick={() => handleStartSubModule(sub)}
                        >
                          <Eye className="h-4 w-4" />
                          Review Submission
                        </Button>
                        {!isLocked && (
                          <Button
                            variant="outline"
                            className="h-11 px-4 font-semibold gap-1.5 rounded-xl border-[#E5E7EB] dark:border-[#27272A] hover:bg-muted text-xs"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                localStorage.removeItem(`lms_completed_assessment_${sub.id}`);
                                localStorage.removeItem(`lms_practice_session_${sub.id}`);
                                localStorage.removeItem(`lms_practice_session_${sub.id}_submitted`);
                              }
                              handleStartSubModule(sub);
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retake
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        className={`h-11 px-6 font-bold gap-2 rounded-xl transition-all ${
                          isInProgress
                            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                            : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm"
                        }`}
                        onClick={() => handleStartSubModule(sub)}
                      >
                        <Play className="h-4 w-4" />
                        {isInProgress ? "Continue Module" : "Start Module"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
