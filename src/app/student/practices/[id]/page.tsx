"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface StudentModule {
  id: string;
  submodule_id: string;
  main_module_id: string;
  name: string;
  title: string;
  description: string;
  type: "mcq" | "coding" | "mixed";
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  completedQuestions: number;
  percentage: number;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
  codingQuestions?: any[];
  mcqQuestions?: any[];
  isCompleted?: boolean;
  isInProgress?: boolean;
  isSubmitted?: boolean;
}

interface StudentSubmodule {
  id: string;
  main_module_id: string;
  name: string;
  title: string;
  description: string;
  status: string;
  display_order: number;
  modules: StudentModule[];
  moduleCount: number;
}

interface StudentTrackDetail {
  id: string;
  name: string;
  title: string;
  category: string;
  description: string;
  assignedByName: string;
  submodules: StudentSubmodule[];
  totalSubmodules: number;
  totalModules: number;
  completedModules: number;
  totalQuestions: number;
  completedQuestions: number;
  progressPercentage: number;
}

export default function StudentTrackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const trackId = (params?.id as string) || "";
  const [track, setTrack] = useState<StudentTrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const title = track?.title || track?.name;
    if (title) {
      document.title = `SensilLearn | ${title}`;
    }
  }, [track?.title, track?.name]);

  const fetchTrackDetails = useCallback(async (isSilent = false) => {
    if (!trackId) return;
    if (!isSilent) {
      setLoading(true);
    }
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
      if (!isSilent) {
        setErrorMsg(err.message || "Failed to load practice track.");
        toast({
          title: "Access Error",
          description: err.message || "You may not be assigned to this practice track.",
          variant: "destructive",
        });
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [trackId, toast]);

  useEffect(() => {
    fetchTrackDetails(false);
  }, [fetchTrackDetails]);

  const handleStartModule = (mod: StudentModule, mode = "practice") => {
    const hasCoding = mod.type === "coding" || (Array.isArray(mod.codingQuestions) && mod.codingQuestions.length > 0);
    const query = `trackId=${trackId}${mode === "review" ? "&mode=review" : ""}`;
    if (hasCoding) {
      router.push(`/student/practices/coding/${mod.id}?${query}`);
    } else {
      router.push(`/student/assessments/${mod.id}?${query}`);
    }
  };

  if (loading && !track) {
    return (
      <div className="flex h-72 items-center justify-center font-sans">
        <p className="text-xs font-semibold text-slate-500">Loading module hierarchy...</p>
      </div>
    );
  }

  if (errorMsg || !track) {
    return (
      <div className="w-full space-y-6 pb-12 font-sans">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 cursor-pointer"
          onClick={() => router.push("/student/practices")}
        >
          Back to Practice Tracks
        </Button>
        <Card className="text-center py-12 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xs">
          <CardContent className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {errorMsg || "Practice track not found"}
            </h3>
            <Button
              onClick={() => fetchTrackDetails(false)}
              variant="outline"
              className="h-8 px-4 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submodules = track.submodules || [];
  const progressPercent = track.progressPercentage || 0;

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* ─── TOP TRACK HEADER ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.push("/student/practices")}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
              >
                <span>&larr;</span> Back to Practice Tracks
              </button>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
                {track.category || "Practice Track"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {track.name || track.title}
            </h1>

            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed">
              {track.description || "Interactive curriculum with structured modules and hands-on coding challenges."}
            </p>

            <div className="text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
              <span>
                {track.completedModules || 0} of {track.totalModules || 0} Modules Completed
              </span>
            </div>
          </div>

          {/* Right: Progress Summary Box */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs min-w-[220px] space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="uppercase text-slate-500 dark:text-zinc-400">Track Progress</span>
              <span className={progressPercent === 100 ? "text-emerald-600" : "text-blue-600"}>
                {progressPercent}%
              </span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2 bg-slate-200 dark:bg-zinc-800 rounded-full"
            />
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 text-center font-medium">
              {progressPercent === 100 ? "All Modules Completed" : `${(track.totalModules || 0) - (track.completedModules || 0)} Modules Remaining`}
            </div>
          </div>
        </div>
      </div>

      {/* ─── HIERARCHY: SUBMODULES & LINEAR MODULE LIST ─────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Curriculum &amp; Modules
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            {submodules.length} {submodules.length === 1 ? "Section" : "Sections"}
          </span>
        </div>

        {submodules.length === 0 ? (
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-10 text-center rounded-xl shadow-2xs">
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No modules available
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                This practice track has no active modules published yet.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {submodules.map((sm, smIdx) => {
              const modules = sm.modules || [];

              return (
                <div
                  key={sm.id}
                  className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs space-y-4"
                >
                  {/* Submodule Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center">
                          {smIdx + 1}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {sm.name || sm.title}
                        </h3>
                      </div>
                      {sm.description && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 pl-8.5">
                          {sm.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 shrink-0 pl-8.5 sm:pl-0">
                      {modules.length} {modules.length === 1 ? "Module" : "Modules"}
                    </span>
                  </div>

                  {/* Linear Modules List */}
                  {modules.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                      No modules available in this section.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {modules.map((m, mIdx) => {
                        const isDone = m.status === "completed" || m.isCompleted;
                        const inProg = m.status === "in_progress" || m.isInProgress;

                        return (
                          <div
                            key={m.id}
                            className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-2xs transition-all"
                          >
                            {/* Left: Module Details */}
                            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
                                {mIdx + 1}
                              </div>

                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                    {m.name || m.title}
                                  </h4>
                                  <span
                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                      isDone
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                        : inProg
                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                                    }`}
                                  >
                                    {isDone ? "Completed" : inProg ? "In Progress" : "Not Started"}
                                  </span>
                                </div>

                                {m.description && (
                                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
                                    {m.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                                  <span>{m.durationMinutes > 0 ? `${m.durationMinutes}m` : "Untimed"}</span>
                                  <span>•</span>
                                  <span>{m.totalMarks} Marks</span>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                                    {m.questionCount} {m.questionCount === 1 ? "Question" : "Questions"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Action Button */}
                            <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                              {(isDone || inProg) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleStartModule(m, "review")}
                                  className="h-8.5 px-3.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-100 text-slate-700 dark:text-zinc-300 cursor-pointer transition-all shadow-2xs"
                                >
                                  Review
                                </Button>
                              )}
                              <Button
                                type="button"
                                onClick={() => handleStartModule(m, isDone ? "review" : "practice")}
                                className={`h-8.5 px-4 text-xs font-semibold rounded-lg cursor-pointer transition-all shadow-2xs ${
                                  isDone
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : inProg
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                                }`}
                              >
                                {isDone
                                  ? "Practice Again"
                                  : inProg
                                  ? "Continue Practice"
                                  : "Start Practice"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
