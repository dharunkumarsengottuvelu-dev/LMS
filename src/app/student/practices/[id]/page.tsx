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
      text: "text-emerald-700 dark:text-emerald-300",
      badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50",
      pillBg: "bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50",
      dotBg: "bg-emerald-500",
    };
  }
  if (percent === 0) {
    return {
      stroke: "text-slate-200 dark:text-zinc-700",
      text: "text-slate-500 dark:text-zinc-400",
      badge: "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700",
      pillBg: "bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200 dark:border-zinc-700",
      dotBg: "bg-slate-400",
    };
  }
  if (percent < 50) {
    // 1% - 49%: Enterprise Warm Amber
    return {
      stroke: "text-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50",
      pillBg: "bg-amber-50/90 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50",
      dotBg: "bg-amber-500",
    };
  }
  // 50% - 99%: Enterprise High-Trust Blue
  return {
    stroke: "text-blue-600",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/50",
    pillBg: "bg-blue-50/90 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/50",
    dotBg: "bg-blue-600",
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

  const handleRetakeSubModule = (subModule: SubModuleItem) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`lms_completed_assessment_${subModule.id}`);
        localStorage.removeItem(`lms_practice_session_${subModule.id}`);
        localStorage.removeItem(`lms_practice_session_${subModule.id}_submitted`);
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("edunexus_draft_") || k.startsWith("draft_") || k.includes(subModule.id))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        window.dispatchEvent(new Event("storage"));
      } catch {}
    }
    fetch(`/api/student/drafts?key=lms_practice_session_${subModule.id}`, { method: "DELETE" }).catch(() => {});
    setStorageTick((t) => t + 1);
    router.push(`/student/assessments/${subModule.id}?trackId=${trackId}&retake=true&t=${Date.now()}`);
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
      {/* Top Header - Compact Enterprise Track Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Column: Breadcrumb + Track Title + Description + Metadata */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Breadcrumb Navigation */}
            <div>
              <button
                type="button"
                onClick={() => router.push("/student/practices")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0"
              >
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back to Practice Tracks</span>
              </button>
            </div>

            {/* Track Title */}
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {track.title}
            </h1>

            {/* Track Description */}
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal line-clamp-1">
              {track.description || "Interactive practice track for hands-on learning."}
            </p>

            {/* Module Counts Metadata */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap pt-0.5">
              <span className="flex items-center gap-1">
                <FolderKanban className="h-3 w-3 text-slate-400 shrink-0" />
                <span>
                  {completedSubModulesCount} of {totalSubModulesCount} {totalSubModulesCount === 1 ? "Module" : "Modules"} Completed ({totalAnsweredQuestions}/{totalTrackQuestions} Questions)
                </span>
              </span>
            </div>
          </div>

          {/* Right Column: Compact Premium MNC Resume Learning Card */}
          <div className="p-3 bg-slate-50/90 dark:bg-zinc-900/80 rounded-xl border border-slate-200/80 dark:border-zinc-800/90 shadow-2xs shrink-0 space-y-1.5 min-w-[210px] max-w-[240px] flex flex-col justify-between">
            {/* Header: Label & Completion Pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400">
                Track Completion
              </span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                <span className={cn("w-1.5 h-1.5 rounded-full", headerProgressStyles.dotBg)} />
                <span className={cn("text-[10px] font-bold", headerProgressStyles.text)}>
                  {dynamicProgressPercentage}%
                </span>
              </div>
            </div>

            {/* Active Module Title & Left-off Info */}
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                {nextSubModuleToContinue?.title || moduleDetails[0]?.title || track.title}
              </h4>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                {dynamicProgressPercentage === 100 ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Finished
                  </span>
                ) : totalAnsweredQuestions > 0 ? (
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    Left off at: <strong className="text-blue-600 dark:text-blue-400 font-bold">{resumeQuestionLabel}</strong>
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
            {dynamicProgressPercentage === 100 ? (
              <Button
                onClick={() => handleStartSubModule(moduleDetails[0]?.rawModule || track.subModules[0])}
                className="w-full h-8 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 flex items-center justify-center transition-all group mt-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Completed</span>
              </Button>
            ) : (trackProgress.hasSubmittedModule || nextSubModuleToContinue?.isSubmitted) ? (
              <Button
                onClick={() => handleStartSubModule(nextSubModuleToContinue?.rawModule || moduleDetails[0]?.rawModule || track.subModules[0])}
                className="w-full h-8 rounded-lg font-bold text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs gap-1.5 flex items-center justify-center transition-all group mt-1"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Review Submission</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleStartSubModule(nextSubModuleToContinue?.rawModule || track.subModules[0])}
                className="w-full h-8 rounded-lg font-bold text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs gap-1.5 flex items-center justify-center transition-all group mt-1"
              >
                <Play className="h-3 w-3 fill-current transition-transform group-hover:scale-110" />
                <span>{totalAnsweredQuestions > 0 ? "Continue" : "Start Practice"}</span>
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
              isSubmitted,
              totalQuestions: totalQuestionsCount,
              completedQuestions: answeredQuestionsCount,
              percentage: moduleProgressPercent,
            } = modDetail;

            const modStyles = getProgressStyles(moduleProgressPercent, moduleProgressPercent === 100);
            const directMcqs = (sub as any).mcqQuestions?.length || (sub as any).mcqs?.length || 0;
            const directCoding = (sub as any).codingQuestions?.length || (sub as any).codingProblems?.length || 0;
            const mcqsCount = directMcqs;
            const codingCount = directCoding > 0 ? directCoding : Math.max(0, totalQuestionsCount - directMcqs);
            let localScore = sub.score ?? null;
            if (typeof window !== "undefined" && localScore === null) {
              try {
                const compStr = localStorage.getItem(`lms_completed_assessment_${sub.id}`);
                if (compStr) {
                  const compObj = JSON.parse(compStr);
                  if (typeof compObj.score === "number") localScore = compObj.score;
                }
              } catch {}
            }

            return (
              <Card
                key={sub.id || `mod_${idx}`}
                className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-xl overflow-hidden hover:border-blue-500/50 transition-all"
              >
                <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                  {/* Left Module Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/60 px-2 py-0 rounded-md">
                        Module {idx + 1}
                      </Badge>

                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0 rounded-md border",
                        sub.type === "coding"
                          ? "bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/40"
                          : sub.type === "mcq"
                          ? "bg-sky-50/80 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/40"
                          : "bg-purple-50/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/40"
                      )}>
                        {sub.type === "coding" ? "Coding Exercise" : sub.type === "mcq" ? "MCQ Suite" : "Mixed Practice"}
                      </Badge>

                      {moduleProgressPercent === 100 ? (
                        <Badge variant="outline" className="bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50 text-[10px] font-semibold flex items-center gap-1 px-2 py-0 rounded-md shadow-2xs">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          Completed {localScore !== null ? `(${localScore}/${sub.totalMarks || 100} Marks)` : ""}
                        </Badge>
                      ) : answeredQuestionsCount > 0 ? (
                        <Badge variant="outline" className={cn("text-[10px] font-semibold flex items-center gap-1.5 px-2 py-0 rounded-md border shadow-2xs", modStyles.badge)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", modStyles.dotBg)} />
                          In Progress ({answeredQuestionsCount}/{totalQuestionsCount} Qs)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-800/40 px-2 py-0 rounded-md">
                          Not Started
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-snug">
                      {sub.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-1">
                      {sub.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-blue-600" /> {sub.durationMinutes > 0 ? `${sub.durationMinutes} mins` : "No Time Limit"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3 text-blue-600" /> {totalQuestionsCount} Questions ({mcqsCount} MCQs, {codingCount} Coding) • {sub.totalMarks} Marks</span>
                    </div>
                  </div>

                  {/* Circular Tracker & Action Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Clean Centered Circular Progress Tracker */}
                    <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                      <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100 dark:text-zinc-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
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

                      <div className="absolute inset-0 flex items-center justify-center">
                        {moduleProgressPercent === 100 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <span className={cn("text-[9px] font-black leading-none", modStyles.text)}>
                            {moduleProgressPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button(s) */}
                    {moduleProgressPercent === 100 ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          className="h-8.5 px-4 font-bold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs text-xs transition-all"
                          onClick={() => handleStartSubModule(sub)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completed
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8.5 px-3 font-semibold gap-1 rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-muted text-xs transition-all"
                          onClick={() => handleRetakeSubModule(sub)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retake
                        </Button>
                      </div>
                    ) : isSubmitted ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          className="h-8.5 px-4 font-bold gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-2xs text-xs transition-all"
                          onClick={() => handleStartSubModule(sub)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review Submission
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8.5 px-3 font-semibold gap-1 rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-muted text-xs transition-all"
                          onClick={() => handleRetakeSubModule(sub)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="h-8.5 px-4 font-bold gap-1.5 rounded-lg transition-all bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-2xs text-xs"
                        onClick={() => handleStartSubModule(sub)}
                      >
                        <Play className="h-3 w-3 fill-current" />
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
