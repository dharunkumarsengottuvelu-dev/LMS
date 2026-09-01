"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, ClipboardList, Award, Calendar, Bell,
  ChevronRight, Play, Clock, CheckCircle2, AlertCircle,
  Trophy, ArrowRight, Code2, ShieldCheck, MonitorCheck, FileText, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types";

interface StudentDashboardData {
  profile: UserProfile | null;
  enrollments: any[];
  assessments: any[];
  tests: any[];
  assignments: any[];
  notifications: any[];
  certificates: any[];
  stats: { enrolledCourses: number; completedCourses: number; certificates: number };
}

function StatCard({
  icon: Icon, value, label, href, badgeText
}: {
  icon: React.ElementType; value: number; label: string; href: string; badgeText?: string;
}) {
  return (
    <Link href={href} prefetch={true} className="block h-full">
      <Card className="h-full hover:border-blue-500/40 transition-all bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-2xs rounded-xl group">
        <CardContent className="p-4 flex items-center gap-3.5 h-full">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-hover:scale-105 duration-200">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                {value}
              </span>
              {badgeText && (
                <Badge variant="outline" className="bg-blue-50/70 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0 border-blue-200/70 dark:border-blue-800/40 rounded-md">
                  {badgeText}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


import { useState, useEffect, useMemo } from "react";
import { useLMSStore } from "@/lib/store/lms-store";
import { computeTrackProgress } from "@/lib/practice-progress";
import { computeCourseProgress, useCourseProgressVersion } from "@/lib/course-progress";

export function StudentDashboardClient({ data }: { data: StudentDashboardData }) {
  const router = useRouter();
  const { profile } = data;
  const firstName = profile?.first_name || profile?.full_name?.split(" ")[0] || "Student";

  const [storeCourses, setStoreCourses] = useState<any[]>((data as any).initialCourses || (data as any).enrollments || []);
  const [storeTracks, setStoreTracks] = useState<any[]>((data as any).initialTracks || []);
  const [storeAssessments, setStoreAssessments] = useState<any[]>((data as any).initialAssessments || (data as any).assessments || data.tests || []);
  const [isMounted, setIsMounted] = useState(false);

  // Safe event-driven progress subscriber
  const progressVersion = useCourseProgressVersion();

  // Dynamic Upcoming & Live Proctored Evaluations
  const upcomingEvents = useMemo(() => {
    return storeAssessments
      .filter((test: any) => test.status !== "completed" && test.status !== "submitted")
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
    setIsMounted(true);
    async function loadData() {
      try {
        const [cRes, pRes, aRes] = await Promise.all([
          fetch("/api/student/courses"),
          fetch("/api/student/practices"),
          fetch("/api/student/tests")
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.courses && cData.courses.length > 0) setStoreCourses(cData.courses);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.tracks && pData.tracks.length > 0) setStoreTracks(pData.tracks);
        }
        if (aRes.ok) {
          const aData = await aRes.json();
          if (aData.tests && aData.tests.length > 0) setStoreAssessments(aData.tests);
        }
      } catch (err) {
        console.error("Dashboard data load error", err);
      }
    }
    loadData();
  }, []);

  const activeCourses = useMemo(() => {
    return storeCourses.map((c: any) => {
      const courseProgress = computeCourseProgress(c, isMounted);
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
  }, [storeCourses, isMounted, progressVersion]);

  // Enrich practice tracks with live dynamic progress and in-progress submodule detection
  const enrichedPracticeTracks = storeTracks.map((track: any) => {
    const {
      progressPercentage,
      completedSubModulesCount,
      totalSubModulesCount,
      nextSubModuleToContinue,
      hasActiveSession,
    } = computeTrackProgress(track, isMounted);

    return {
      id: track.id,
      title: track.title,
      category: track.category || "Practice Track",
      type: "practice",
      completedCount: completedSubModulesCount,
      totalCount: totalSubModulesCount,
      progressPercentage,
      targetSubModule: nextSubModuleToContinue,
      hasActiveSession,
      isCompleted: progressPercentage === 100 && totalSubModulesCount > 0,
    };
  });

  const allActiveLearning = [...enrichedPracticeTracks, ...activeCourses];
  const displayEnrolledCount = activeCourses.length + enrichedPracticeTracks.length;
  const displayCompletedCount = enrichedPracticeTracks.reduce((acc, t) => acc + t.completedCount, 0);
  const displayAssessmentsCount = enrichedPracticeTracks.length;
  const displayUnreadNotifications = 0;

  return (
    <div className="space-y-6 w-full pb-12">
      {/* 1. Welcome Banner Header - Compact Enterprise MNC Card */}
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-2xl leading-relaxed font-normal line-clamp-1">
              Track your active courses, practice modules, and ongoing technical learning tracks.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button className="h-8.5 px-4 gap-1.5 font-semibold text-xs rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-2xs" asChild>
              <Link href="/student/practices" prefetch={true}>
                <Code2 className="h-3.5 w-3.5" /> Practice Hub
              </Link>
            </Button>
            <Button variant="outline" className="h-8.5 px-3.5 gap-1.5 font-semibold text-xs rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-2xs" asChild>
              <Link href="/student/tests" prefetch={true}>
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Scheduled Tests
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up stagger-1">
        <StatCard icon={Code2} value={enrichedPracticeTracks.length} label="Active Practice Tracks" href="/student/practices" badgeText="Assigned" />
        <StatCard icon={CheckCircle2} value={displayCompletedCount} label="Completed Modules" href="/student/practices" badgeText="Verified" />
        <StatCard icon={BookOpen} value={activeCourses.length} label="Enrolled Courses" href="/student/my-courses" badgeText="Catalog" />
        <StatCard icon={Bell} value={displayUnreadNotifications} label="Unread Notifications" href="/student/dashboard" badgeText="New Alerts" />
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-up stagger-2">
        
        {/* LEFT COLUMN: Continue Learning & Practices (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-card border-border shadow-card">
            <CardHeader className="p-6 pb-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Continue Learning & Practice
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1 font-medium">
                  Pick up right where you left off in your ongoing technical tracks and coding exercises
                </CardDescription>
              </div>

              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary" asChild>
                <Link href="/student/practices">View All Tracks ({enrichedPracticeTracks.length}) →</Link>
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {allActiveLearning.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <Code2 className="h-10 w-10 text-primary mx-auto opacity-80" />
                  <p className="text-sm font-semibold text-foreground">No Active Practices or Courses Assigned</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Practice tracks and courses assigned by your Trainer or Admin will appear here automatically.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
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
                        className="p-3 sm:p-3.5 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-blue-500/40 transition-all shadow-2xs group"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-blue-200/70 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 rounded-md">
                              {item.category}
                            </Badge>
                          </div>

                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {item.title}
                          </h3>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                            <span>{item.completedCount}/{item.totalCount} {item.totalCount === 1 ? "Module" : "Modules"}</span>
                            <span>•</span>
                            <span className={isDone ? "text-emerald-600 font-semibold" : isInProgress ? "text-amber-600 font-semibold" : "text-slate-700 dark:text-zinc-300 font-semibold"}>
                              {item.progressPercentage}% Completed
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            size="sm"
                            className={`h-8 px-3.5 text-xs font-semibold gap-1 rounded-lg shadow-2xs ${
                              isDone
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : isInProgress
                                ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                            }`}
                            asChild
                          >
                            <Link href={`/student/practices/${item.id}`}>
                              <Play className="h-2.5 w-2.5 fill-current" />
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
                      className="p-3 sm:p-3.5 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-blue-500/40 transition-all shadow-2xs"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div>
                          <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/60 rounded-md">
                            {item.category}
                          </Badge>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                          <span>{item.completedLessons} of {item.totalLessons} Lessons</span>
                          <span>•</span>
                          <span className={item.isCompleted ? "text-emerald-600 font-semibold" : item.progressPercentage > 0 ? "text-blue-600 font-semibold" : "text-slate-700 dark:text-zinc-300 font-semibold"}>
                            {item.progressPercentage}% Completed
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className={`h-8 px-3.5 text-xs font-semibold gap-1 shrink-0 rounded-lg shadow-2xs ${
                          item.isCompleted
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                        }`}
                        asChild
                      >
                        <Link href={`/student/course/${item.slug}`}>
                          {item.isCompleted ? (
                            <>Review <CheckCircle2 className="h-3 w-3" /></>
                          ) : item.progressPercentage > 0 ? (
                            <>Resume <ArrowRight className="h-3 w-3" /></>
                          ) : (
                            <>Start <Play className="h-2.5 w-2.5 fill-current" /></>
                          )}
                        </Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Upcoming Evaluations & Quick Launch (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Evaluations Card */}
          <Card className="bg-card border-border shadow-card">
            <CardHeader className="p-4 border-b border-border bg-primary/5 rounded-t-[calc(var(--radius-xl)-1px)]">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#2563EB]" /> Upcoming Proctored Evaluations
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center bg-background rounded-xl border border-border border-dashed">
                  <Clock className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-xs text-muted-foreground">No upcoming evaluations scheduled.</p>
                </div>
              ) : (
                upcomingEvents.map((evt: any) => (
                  <div key={evt.id} className="p-3.5 bg-background rounded-xl border border-border space-y-2 shadow-2xs hover:border-blue-500/40 transition-colors">
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

                    <h4 className="text-xs font-bold text-foreground line-clamp-1">
                      {evt.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
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

          {/* Quick Hub Navigation Card */}
          <Card className="bg-card border-border shadow-card">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-xs font-bold text-foreground">
                Student Quick Portals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <Link href="/student/practices" className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-background hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" /> Practice Tracks Hub
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link href="/student/assessments" className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-background hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#2563EB]" /> Scheduled Assessments
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link href="/student/assignments" className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-background hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#16A34A]" /> Submissions Portal
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
