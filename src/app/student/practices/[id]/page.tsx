"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FolderKanban, Clock, CheckCircle2, Play, Code2, Layers,
  ClipboardList, ShieldCheck, MonitorCheck, Maximize, CopyX, Award, Check,
  ChevronRight, BookOpen, AlertCircle, Loader2, RefreshCw, Eye, RotateCcw, User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getPracticeTrackProgress } from "@/lib/practice-progress";

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

const getProgressStyles = (percent: number, isDone: boolean) => {
  if (isDone || percent >= 100) {
    return {
      stroke: "text-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-600 text-white",
      pillBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    };
  }
  if (percent === 0) {
    return {
      stroke: "text-transparent",
      text: "text-slate-400 dark:text-zinc-500",
      badge: "bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
      pillBg: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200 dark:border-zinc-700",
    };
  }
  if (percent < 40) {
    // 1% - 39%: Warm Vibrant Amber
    return {
      stroke: "text-amber-500",
      text: "text-amber-500 dark:text-amber-400",
      badge: "bg-amber-500 text-white",
      pillBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    };
  }
  if (percent < 80) {
    // 40% - 79%: Royal Blue
    return {
      stroke: "text-blue-600",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-600 text-white",
      pillBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    };
  }
  // 80% - 99%: Teal
  return {
    stroke: "text-teal-500",
    text: "text-teal-600 dark:text-teal-400",
    badge: "bg-teal-600 text-white",
    pillBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
  };
};

export default function StudentTrackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const trackId = (params?.id as string) || "";
  const [track, setTrack] = useState<PracticeTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [storageTick, setStorageTick] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

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
    setIsMounted(true);
    fetchTrackDetails();
    setStorageTick((t) => t + 1);

    const handleFocus = () => {
      fetchTrackDetails();
      setStorageTick((t) => t + 1);
    };
    const handleStorage = () => {
      setStorageTick((t) => t + 1);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
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

  // Authoritative dynamic overall track progress and module details across any number of modules
  const trackProgress = getPracticeTrackProgress(track.subModules || [], isMounted);
  const {
    totalModules: totalSubModulesCount,
    completedModules: completedSubModulesCount,
    totalQuestions: totalTrackQuestions,
    completedQuestions: totalAnsweredQuestions,
    percentage: dynamicProgressPercentage,
    moduleDetails,
    nextSubModuleToContinue,
    resumeQuestionLabel,
  } = trackProgress;

  const headerProgressStyles = getProgressStyles(dynamicProgressPercentage, dynamicProgressPercentage === 100);

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Top Header - Spacious Enterprise MNC Track Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Column: Breadcrumb + Track Title + Description + Metadata */}
          <div className="min-w-0 flex-1 space-y-2.5">
            {/* Breadcrumb Navigation */}
            <div>
              <button
                type="button"
                onClick={() => router.push("/student/practices")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back to Practice Tracks</span>
              </button>
            </div>

            {/* Track Title & Category Badge */}
            <div className="flex items-center gap-3 flex-wrap py-0.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-normal">
                {track.title}
              </h1>
              {track.category && (
                <Badge variant="outline" className="text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 px-3 py-1 rounded-full shrink-0 shadow-2xs">
                  {track.category}
                </Badge>
              )}
            </div>

            {/* Track Description */}
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal">
              {track.description || "Interactive practice track for hands-on learning."}
            </p>

            {/* Instructor & Module Counts Metadata */}
            <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-zinc-400 flex-wrap pt-1">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Assigned By: <strong className="font-semibold text-slate-700 dark:text-zinc-200">{track.assignedByName}</strong></span>
              </span>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <span className="flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{totalSubModulesCount} Practice Modules</span>
              </span>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{totalTrackQuestions} Total Questions</span>
              </span>
            </div>
          </div>

          {/* Right Column: Compact Premium MNC Resume Learning Card */}
          <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-zinc-900/80 rounded-xl border border-slate-200/80 dark:border-zinc-800/90 shadow-2xs shrink-0 space-y-2 min-w-[240px] max-w-[270px] flex flex-col justify-between">
            {/* Header: Label & Completion Pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400">
                Active Module
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                <span className={cn("w-1.5 h-1.5 rounded-full", dynamicProgressPercentage === 100 ? "bg-emerald-500" : dynamicProgressPercentage > 0 ? "bg-amber-500 animate-pulse" : "bg-slate-400")} />
                <span className={cn("text-[11px] font-bold", headerProgressStyles.text)}>
                  {dynamicProgressPercentage}% Done
                </span>
              </div>
            </div>

            {/* Active Module Title & Left-off Info */}
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                {nextSubModuleToContinue?.title || moduleDetails[0]?.title || track.title}
              </h4>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                {totalAnsweredQuestions > 0 && dynamicProgressPercentage < 100 ? (
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    Left off at: <strong className="text-blue-600 dark:text-blue-400 font-bold">{resumeQuestionLabel}</strong>
                  </span>
                ) : dynamicProgressPercentage === 100 ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Finished
                  </span>
                ) : (
                  <span>Ready to start</span>
                )}
                <span className="text-[10px] font-semibold text-slate-400">
                  {totalAnsweredQuestions}/{totalTrackQuestions} Qs
                </span>
              </div>
            </div>

            {/* High-Impact MNC Action Button - Compact */}
            {dynamicProgressPercentage < 100 && nextSubModuleToContinue ? (
              <Button
                onClick={() => handleStartSubModule(nextSubModuleToContinue.rawModule || nextSubModuleToContinue)}
                className="w-full h-8 rounded-lg font-bold text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs gap-1.5 flex items-center justify-center transition-all group mt-1"
              >
                <Play className="h-3 w-3 fill-current transition-transform group-hover:scale-110" />
                <span>{totalAnsweredQuestions > 0 ? "Continue" : "Start Practice"}</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleStartSubModule(moduleDetails[0]?.rawModule || track.subModules[0])}
                variant="outline"
                className="w-full h-8 rounded-lg font-bold text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1.5 flex items-center justify-center mt-1"
              >
                <Eye className="h-3 w-3" />
                <span>Review Track</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
            Practice Modules ({moduleDetails.length})
          </h2>
        </div>

        <div className="space-y-4">
          {moduleDetails.map((modDetail, idx) => {
            const sub = modDetail.rawModule;
            const {
              isCompleted,
              isInProgress,
              totalQuestions: totalQuestionsCount,
              completedQuestions: answeredQuestionsCount,
              percentage: moduleProgressPercent,
            } = modDetail;

            const modStyles = getProgressStyles(moduleProgressPercent, isCompleted);
            const directMcqs = (sub as any).mcqQuestions?.length || (sub as any).mcqs?.length || 0;
            const directCoding = (sub as any).codingQuestions?.length || (sub as any).codingProblems?.length || 0;
            const mcqsCount = directMcqs;
            const codingCount = directCoding > 0 ? directCoding : Math.max(0, totalQuestionsCount - directMcqs);
            const localScore = sub.score ?? null;
            const maxAtt = (sub as any).maxAttempts ?? (track as any).maxAttempts ?? 0;
            const isLocked = isCompleted && maxAtt === 1;

            return (
              <Card
                key={sub.id || `mod_${idx}`}
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
                        sub.type === "coding" ? "bg-[#2563EB] text-white" : sub.type === "mcq" ? "bg-[#2563EB] text-white" : "bg-[#F59E0B] text-white"
                      }`}>
                        {sub.type === "coding" ? "Coding Exercise" : sub.type === "mcq" ? "MCQ Suite" : "Mixed Practice"}
                      </Badge>

                      {isCompleted && (
                        <Badge className="bg-[#16A34A] text-white text-[10px] font-semibold">
                          Completed {sub.score || localScore !== null ? `(${sub.score ?? localScore}/${sub.totalMarks || 100} Marks)` : ""}
                        </Badge>
                      )}
                      {isInProgress && (
                        <Badge className={cn("text-[10px] font-bold gap-1.5 flex items-center", modStyles.badge)}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {sub.durationMinutes > 0 ? `${sub.durationMinutes} mins` : "No Time Limit"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-[#2563EB]" /> {totalQuestionsCount} Questions ({mcqsCount} MCQs, {codingCount} Coding) • {sub.totalMarks} Marks</span>
                    </div>
                  </div>

                  {/* Circular Tracker & Action Button */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    {/* Clean Centered Circular Progress Tracker with Multi-tier Colors */}
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
                        {/* Dynamic Progress Fill with Multi-Stage Color */}
                        <path
                          className={cn("transition-all duration-500", modStyles.stroke)}
                          strokeDasharray={`${moduleProgressPercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>

                      {/* Centered Indicator with Matching Percentage Text Color */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                        ) : (
                          <span className={cn("text-[10px] font-black leading-none", modStyles.text)}>
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
                        className="h-11 px-6 font-bold gap-2 rounded-xl transition-all bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm"
                        onClick={() => handleStartSubModule(sub)}
                      >
                        <Play className="h-4 w-4 fill-current" />
                        {isInProgress ? "Continue" : "Start Module"}
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
