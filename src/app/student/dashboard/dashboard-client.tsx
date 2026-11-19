"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Calendar, Clock, CheckCircle2,
  ArrowRight, Code2, Play, Terminal, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types";
import { isPracticeAssessment } from "@/lib/module-isolation";
import { computeTrackProgress } from "@/lib/practice-progress";
import { computeCourseProgress, useCourseProgressVersion } from "@/lib/course-progress";
import { useStudentNotifications } from "@/lib/notifications";

interface StudentDashboardData {
  profile: UserProfile | null;
  initialCourses?: any[];
  initialTracks?: any[];
  initialCodingProblems?: any[];
  enrollments: any[];
  assessments: any[];
  tests: any[];
  assignments: any[];
  notifications: any[];
  certificates: any[];
  stats: { enrolledCourses: number; completedCourses: number; certificates: number };
}

function StatCard({
  value, label, href, badgeText
}: {
  icon?: React.ElementType; value: number; label: string; href: string; badgeText?: string;
}) {
  return (
    <Link href={href} prefetch={true} className="block h-full group focus-visible:outline-hidden">
      <Card className="h-full min-h-[104px] hover:border-blue-500/50 hover:shadow-xs transition-all duration-200 bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-2xs rounded-xl">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              {value}
            </span>
            {badgeText && (
              <Badge variant="outline" className="bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5 border-blue-200/70 dark:border-blue-800/50 rounded-md shrink-0">
                {badgeText}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-2">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function StudentDashboardClient({ data }: { data: StudentDashboardData }) {
  const router = useRouter();
  const { profile } = data;
  const firstName = profile?.first_name || profile?.full_name?.split(" ")[0] || "Student";
  const { unreadCount: liveUnreadCount } = useStudentNotifications();

  const [storeCourses, setStoreCourses] = useState<any[]>((data as any).initialCourses || (data as any).enrollments || []);
  const [storeTracks, setStoreTracks] = useState<any[]>((data as any).initialTracks || []);
  const [storeAssessments, setStoreAssessments] = useState<any[]>(() => {
    const raw = (data as any).initialAssessments || (data as any).assessments || data.tests || [];
    return Array.isArray(raw) ? raw.filter((t: any) => !isPracticeAssessment(t)) : [];
  });
  const [codingProblems, setCodingProblems] = useState<any[]>((data as any).initialCodingProblems || []);
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set());
  const [liveNowClasses, setLiveNowClasses] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState({ total: 0, live: 0, upcoming: 0 });
  // Safe event-driven progress subscriber
  const progressVersion = useCourseProgressVersion();

  // Dynamic Upcoming & Live Proctored Evaluations (Strict Module Isolation: Only authentic assessments)
  const upcomingEvents = useMemo(() => {
    return storeAssessments
      .filter((test: any) => {
        if (!test) return false;
        if (test.status === "completed" || test.status === "submitted") return false;
        // Never allow practice modules or practice questions into assessments
        if (isPracticeAssessment(test)) return false;
        const desc = String(test.description || "").toLowerCase();
        if (desc.includes("practice module") || desc.includes("practice assessment")) return false;
        return true;
      })
      .map((test: any) => {
        const isLive = test.status === "live" || test.status === "active";
        return {
          id: test.id,
          type: test.type || (test.proctoring?.enabled ? "Proctored Exam" : "Assessment"),
          title: test.title || "Proctored Evaluation",
          time: test.scheduledAt || (test.scheduled_at ? new Date(test.scheduled_at).toLocaleString() : "Available Now"),
          duration: `${test.duration || test.duration_minutes || 60} Mins`,
          badge: isLive ? "LIVE NOW" : "UPCOMING",
          href: `/student/tests/${test.id}`,
          isLive,
        };
      });
  }, [storeAssessments]);

  useEffect(() => {
    let active = true;

    async function loadLiveData() {
      try {
        const [lRes, sRes] = await Promise.all([
          fetch("/api/student/live-classes").catch(() => null),
          fetch("/api/code/submissions").catch(() => null),
        ]);

        if (!active) return;

        if (lRes && lRes.ok) {
          const lData = await lRes.json();
          if (Array.isArray(lData.liveNow)) setLiveNowClasses(lData.liveNow);
          if (lData.stats) setLiveStats(lData.stats);
        }

        if (sRes && sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData.submissions)) {
            const solved = new Set<string>();
            sData.submissions.forEach((s: any) => {
              if (s.status === "accepted") {
                if (s.problem_id) solved.add(s.problem_id);
                if (s.problem_slug) solved.add(s.problem_slug);
              }
            });
            setSolvedProblemIds(solved);
          }
        }
      } catch (err) {
        console.warn("Dashboard live data fetch notice:", err);
      }
    }

    loadLiveData();

    return () => {
      active = false;
    };
  }, []);

  const activeCourses = useMemo(() => {
    return storeCourses.map((c: any) => {
      const courseProgress = computeCourseProgress(c, true);
      return {
        id: c.id,
        title: c.title,
        category: c.category || "Technical Training",
        completedLessons: courseProgress.completedLearningUnits,
        totalLessons: courseProgress.totalLearningUnits,
        progressPercentage: courseProgress.progressPercentage,
        nextLesson: courseProgress.nextLessonToResume?.title || "Module 1 Overview",
        slug: c.slug || c.id,
        type: "course",
        isCompleted: courseProgress.isCompleted,
      };
    });
  }, [storeCourses, progressVersion]);

  // Enrich practice tracks with live dynamic progress and in-progress submodule detection
  const enrichedPracticeTracks = useMemo(() => {
    return storeTracks.map((track: any) => {
      const {
        progressPercentage,
        completedSubModulesCount,
        totalSubModulesCount,
        nextSubModuleToContinue,
        hasActiveSession,
      } = computeTrackProgress(track, true);

      const effectiveTotal = track.totalModules || totalSubModulesCount || 0;
      const effectiveCompleted = track.completedModules ?? completedSubModulesCount ?? 0;
      const effectiveProgress = typeof track.progressPercentage === "number"
        ? Math.max(track.progressPercentage, progressPercentage)
        : progressPercentage;

      const effectiveHasActive =
        hasActiveSession ||
        Boolean(track.hasActiveSession) ||
        (effectiveProgress > 0 && effectiveProgress < 100);

      return {
        id: track.id,
        title: track.title,
        category: track.category || "General",
        type: "practice",
        completedCount: effectiveCompleted,
        totalCount: effectiveTotal,
        progressPercentage: effectiveProgress,
        targetSubModule: nextSubModuleToContinue,
        hasActiveSession: effectiveHasActive,
        isCompleted: effectiveProgress === 100 || (effectiveTotal > 0 && effectiveCompleted === effectiveTotal),
      };
    });
  }, [storeTracks]);

  const allActiveLearning = useMemo(() => {
    return [...enrichedPracticeTracks, ...activeCourses];
  }, [enrichedPracticeTracks, activeCourses]);

  const displayCompletedCount = enrichedPracticeTracks.reduce((acc, t) => acc + t.completedCount, 0);
  const displayUnreadNotifications = liveUnreadCount;

  // Newest Code Lab Challenges sorted by created_at descending
  const latestCodingProblems = useMemo(() => {
    return [...codingProblems]
      .sort((a: any, b: any) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      })
      .slice(0, 4);
  }, [codingProblems]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* 1. Welcome Banner Header - Enterprise MNC Card */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Track your assigned modules, test schedules, and coding practice.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button className="h-9 px-4 gap-1.5 font-semibold text-xs rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-2xs transition-colors" asChild>
              <Link href="/student/practices" prefetch={true}>
                <Code2 className="h-3.5 w-3.5" /> Practice Hub
              </Link>
            </Button>
            <Button variant="outline" className="h-9 px-3.5 gap-1.5 font-semibold text-xs rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-2xs transition-colors" asChild>
              <Link href="/student/tests" prefetch={true}>
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Scheduled Tests
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard value={enrichedPracticeTracks.length} label="Active Practice Tracks" href="/student/practices" badgeText="Assigned" />
        <StatCard value={displayCompletedCount} label="Completed Modules" href="/student/practices" badgeText="Verified" />
        <StatCard value={activeCourses.length} label="Enrolled Courses" href="/student/my-courses" badgeText="Catalog" />
        <StatCard value={displayUnreadNotifications} label="Unread Notifications" href="/student/notifications" badgeText={displayUnreadNotifications > 0 ? "New Alerts" : "Updated"} />
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Continue Learning & Practices (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-zinc-800 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                  Continue Learning & Practice
                </CardTitle>
              </div>

              <Button variant="ghost" size="sm" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 h-8 px-2.5 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-950/30" asChild>
                <Link href="/student/practices">View All Tracks ({enrichedPracticeTracks.length}) →</Link>
              </Button>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3">
              {allActiveLearning.length === 0 ? (
                <div className="py-8 text-center space-y-3 bg-slate-50/50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                  <BookOpen className="h-8 w-8 text-slate-400 dark:text-zinc-500 mx-auto opacity-60" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">No Active Practices or Courses Assigned</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Practice tracks and courses assigned by your Trainer or Admin will appear here automatically.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 text-xs font-semibold rounded-lg" asChild>
                    <Link href="/student/practices">Explore Practice Hub</Link>
                  </Button>
                </div>
              ) : (
                allActiveLearning.map((item: any) => {
                  if (item.type === "practice") {
                    const isInProgress = (item.progressPercentage > 0 && item.progressPercentage < 100) || item.hasActiveSession;
                    const isDone = item.isCompleted;

                    return (
                      <div
                        key={`track-${item.id}`}
                        className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-blue-500/40 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all shadow-2xs group"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-blue-200/70 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 rounded-md">
                              {item.category}
                            </Badge>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 break-words leading-snug">
                            {item.title}
                          </h3>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                            <span>{item.completedCount}/{item.totalCount} {item.totalCount === 1 ? "Module" : "Modules"}</span>
                            <span>•</span>
                            <span className={isDone ? "text-emerald-600 dark:text-emerald-400 font-semibold" : isInProgress ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-700 dark:text-zinc-300 font-semibold"}>
                              {item.progressPercentage}% Completed
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full max-w-md bg-slate-200/70 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                isDone ? "bg-emerald-600" : "bg-[#2563EB]"
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, item.progressPercentage))}%` }}
                            />
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            size="sm"
                            className={cn(
                              "h-8.5 px-3.5 text-xs font-semibold gap-1.5 rounded-lg shadow-2xs transition-colors",
                              isDone
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                            )}
                            asChild
                          >
                            <Link href={`/student/practices/${item.id}`}>
                              <Play className="h-3 w-3 fill-current" />
                              {isDone ? "Review" : isInProgress ? "Continue" : "Start"}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // Render Course
                  return (
                    <div
                      key={`course-${item.id}`}
                      className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-blue-500/40 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all shadow-2xs"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div>
                          <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 rounded-md">
                            {item.category}
                          </Badge>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 break-words leading-snug">
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                          <span>{item.completedLessons} of {item.totalLessons} Lessons</span>
                          <span>•</span>
                          <span className={item.isCompleted ? "text-emerald-600 dark:text-emerald-400 font-semibold" : item.progressPercentage > 0 ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-slate-700 dark:text-zinc-300 font-semibold"}>
                            {item.progressPercentage}% Completed
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full max-w-md bg-slate-200/70 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              item.isCompleted ? "bg-emerald-600" : "bg-[#2563EB]"
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, item.progressPercentage))}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className={cn(
                          "h-8.5 px-3.5 text-xs font-semibold gap-1.5 shrink-0 rounded-lg shadow-2xs transition-colors",
                          item.isCompleted
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                        )}
                        asChild
                      >
                        <Link href={`/student/course/${item.slug}`}>
                          {item.isCompleted ? (
                            <>Review <CheckCircle2 className="h-3 w-3" /></>
                          ) : item.progressPercentage > 0 ? (
                            <>Resume <ArrowRight className="h-3 w-3" /></>
                          ) : (
                            <>Start <Play className="h-3 w-3 fill-current" /></>
                          )}
                        </Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick Learning Hub & Shortcut Modules - Balances Left & Right columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/student/practices" className="group block">
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 hover:border-blue-500/50 shadow-2xs transition-all duration-200 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Practice Hub & Modules</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Solve structured sub-modules, coding questions, and MCQs.</p>
                </div>
              </div>
            </Link>

            <Link href="/coding" className="group block">
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 hover:border-blue-500/50 shadow-2xs transition-all duration-200 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Coding Lab & Challenges</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Open coding workbench, test cases, and algorithmic problems.</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Evaluations & Challenges (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Live Class Alert Card if Live Now */}
          {liveNowClasses.length > 0 && (
            <Card className="bg-emerald-950/20 border-emerald-500/40 shadow-card">
              <CardHeader className="p-4 pb-2 border-b border-emerald-500/20 flex flex-row items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Interactive Class
                </span>
                <Badge className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0">LIVE NOW</Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {liveNowClasses[0].title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {liveNowClasses[0].courseName || "Interactive Session"}
                </p>
                <Button className="w-full h-8 text-xs font-semibold gap-1.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs" asChild>
                  <Link href={`/student/live-classes/${liveNowClasses[0].id}`}>
                    Join Live Class <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Proctored Evaluations Card */}
          <Card className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-zinc-800 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                  Upcoming Proctored Evaluations
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 h-8 px-2.5 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-950/30" asChild>
                <Link href="/student/assessments">All →</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-slate-50/60 dark:bg-zinc-900/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                  <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center mb-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">No upcoming evaluations scheduled.</p>
                  <Button variant="ghost" size="sm" className="mt-2 h-7 px-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400" asChild>
                    <Link href="/student/assessments">
                      View Assessments <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              ) : (
                upcomingEvents.map((evt: any) => (
                  <div key={evt.id} className="p-3.5 bg-slate-50/70 dark:bg-zinc-900/60 rounded-xl border border-slate-200/70 dark:border-zinc-800 space-y-2 shadow-2xs hover:border-blue-500/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge className={cn(
                        "text-[9px] font-bold uppercase",
                        evt.isLive
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      )}>
                        {evt.type}
                      </Badge>
                      <span className={cn(
                        "text-[10px] font-bold",
                        evt.isLive ? "text-emerald-600 dark:text-emerald-400" : "text-[#2563EB]"
                      )}>
                        {evt.badge}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 break-words leading-snug">
                      {evt.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                      <span className="truncate max-w-[150px]">{evt.time}</span>
                      <span className="shrink-0">{evt.duration}</span>
                    </div>

                    <Button className="w-full h-8 text-xs font-semibold gap-1.5 mt-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg shadow-2xs" asChild>
                      <Link href={evt.href}>
                        {evt.isLive ? "Start Evaluation" : "View Assessment"} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Challenges Card */}
          <Card className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-3.5 border-b border-slate-200/80 dark:border-zinc-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
                  Challenges
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-blue-50/70 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/40 rounded-md">
                    New
                  </Badge>
                </CardTitle>
              </div>
              <Link
                href="/coding"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
              >
                All Problems →
              </Link>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2">
              {latestCodingProblems.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50/50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100">No Challenges Available</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Coding problems will appear here once published.</p>
                  <Button className="mt-3 h-7 text-xs rounded-lg font-semibold" variant="outline" asChild>
                    <Link href="/coding">Explore Challenges</Link>
                  </Button>
                </div>
              ) : (
                latestCodingProblems.map((prob: any) => {
                  const isSolved = solvedProblemIds.has(prob.id) || (prob.slug && solvedProblemIds.has(prob.slug));
                  const diffColor =
                    prob.difficulty === "easy"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                      : prob.difficulty === "hard"
                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40";

                  return (
                    <Link
                      key={prob.id}
                      href={`/coding/problems/${prob.slug || prob.id}`}
                      className="group flex items-center justify-between p-2.5 rounded-lg bg-slate-50/60 dark:bg-zinc-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-800/60 transition-all shadow-2xs"
                    >
                      <div className="flex-1 min-w-0 pr-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] font-bold uppercase px-1.5 py-0", diffColor)}
                          >
                            {prob.difficulty || "medium"}
                          </Badge>
                          {prob.category && (
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate max-w-[110px]">
                              {prob.category}
                            </span>
                          )}
                          {isSolved && (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0">
                              Solved
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {prob.title}
                        </h4>
                      </div>

                      <div className="shrink-0 flex items-center">
                        <span className={cn(
                          "text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all",
                          isSolved
                            ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50"
                            : "text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white"
                        )}>
                          {isSolved ? "Review" : "Solve"}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
            {latestCodingProblems.length > 0 && (
              <div className="p-2.5 bg-slate-50/50 dark:bg-zinc-900/40 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-zinc-400 font-medium">
                  Latest in Challenges
                </span>
                <Link
                  href="/coding"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open Challenges
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
