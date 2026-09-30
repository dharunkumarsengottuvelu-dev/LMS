"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    const handleFocus = () => fetchTrackDetails();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [trackId]);

  const handleStartModule = (mod: StudentModule) => {
    router.push(`/student/assessments/${mod.id}?trackId=${trackId}`);
  };

  if (loading) {
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
          [ &lt; Back to Practice Tracks ]
        </Button>
        <Card className="text-center py-12 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xs">
          <CardContent className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {errorMsg || "Practice track not found"}
            </h3>
            <Button
              onClick={fetchTrackDetails}
              variant="outline"
              className="h-8 px-4 text-xs font-semibold rounded-lg cursor-pointer"
            >
              [ Try Again ]
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
      {/* ─── TOP TRACK HEADER (PURE TEXT, ZERO ICONS) ───────────────────── */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.push("/student/practices")}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 cursor-pointer"
              >
                [ &lt; Back to Practice Tracks ]
              </button>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
                LEVEL 1: MAIN MODULE
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {track.category || "General"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {track.name || track.title}
            </h1>

            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed">
              {track.description || "Interactive curriculum with structured submodules and practice challenges."}
            </p>

            <div className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
              <span>
                {track.completedModules || 0} of {track.totalModules || 0} Modules Completed ({track.completedQuestions || 0}/{track.totalQuestions || 0} Questions)
              </span>
            </div>
          </div>

          {/* Right: Progress Summary Box */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs min-w-[220px] space-y-2 shrink-0">
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
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 text-center pt-0.5">
              {progressPercent === 100 ? "Completed All Modules" : `${(track.totalModules || 0) - (track.completedModules || 0)} Modules Remaining`}
            </div>
          </div>
        </div>
      </div>

      {/* ─── HIERARCHY: SUBMODULES & MODULES ────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Submodules &amp; Practice Modules ({submodules.length})
          </h2>
        </div>

        {submodules.length === 0 ? (
          <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-10 text-center rounded-xl shadow-2xs">
            <div className="max-w-md mx-auto space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                LEVEL 2: SUBMODULE
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No submodules available.
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                This Main Module has no active submodules published yet.
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
                  className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs space-y-4"
                >
                  {/* Submodule Header (Level 2) */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/40">
                          LEVEL 2: SUBMODULE {smIdx + 1}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {sm.name || sm.title}
                        </h3>
                      </div>
                      {sm.description && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {sm.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      {modules.length} {modules.length === 1 ? "Module" : "Modules"}
                    </span>
                  </div>

                  {/* Level 3: Modules inside this Submodule */}
                  {modules.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-900/50 rounded-lg border border-slate-200/60 dark:border-zinc-800">
                      No modules available.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                      {modules.map((m) => {
                        const isDone = m.status === "completed" || m.isCompleted;
                        const inProg = m.status === "in_progress" || m.isInProgress;

                        return (
                          <div
                            key={m.id}
                            className="p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800/90 bg-slate-50/60 dark:bg-zinc-900/60 flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/40">
                                  LEVEL 3: MODULE
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    isDone
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                      : inProg
                                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                      : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                                  }`}
                                >
                                  {isDone ? "[ COMPLETED ]" : inProg ? "[ IN PROGRESS ]" : "[ NOT STARTED ]"}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                  {m.name || m.title}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 min-h-[32px]">
                                  {m.description || "Practice coding and assessment module."}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400">
                                <span>{m.durationMinutes > 0 ? `${m.durationMinutes}m` : "Untimed"} | {m.totalMarks} Marks</span>
                                <span className="font-semibold">{m.questionCount} Qs</span>
                              </div>
                            </div>

                            <Button
                              type="button"
                              onClick={() => handleStartModule(m)}
                              className={`w-full h-8 text-xs font-bold rounded-lg cursor-pointer shadow-2xs ${
                                isDone
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : inProg
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-slate-900"
                              }`}
                            >
                              {isDone
                                ? "[ Review Submission ]"
                                : inProg
                                ? "[ Continue Practice ]"
                                : "[ Start Practice ]"}
                            </Button>
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
