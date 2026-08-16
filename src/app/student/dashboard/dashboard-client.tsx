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
    <Link href={href} className="block h-full">
      <Card className="h-full hover:border-border transition-all bg-card border border-border shadow-sm group">
        <CardContent className="p-6 flex items-center gap-4 h-full">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105 duration-200">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {value}
              </span>
              {badgeText && (
                <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-0.5 border-primary/20">
                  {badgeText}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


import { useState, useEffect } from "react";
import { useLMSStore } from "@/lib/store/lms-store";

export function StudentDashboardClient({ data }: { data: StudentDashboardData }) {
  const upcomingEvents: any[] = [];
  const router = useRouter();
  const { profile } = data;
  const firstName = profile?.first_name ?? "Dharunkumar";

  const [storeCourses, setStoreCourses] = useState<any[]>([]);
  const [storeTracks, setStoreTracks] = useState<any[]>([]);
  const [storeAssessments, setStoreAssessments] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, pRes, aRes] = await Promise.all([
          fetch("/api/student/courses"),
          fetch("/api/student/practices"),
          fetch("/api/student/tests")
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.courses) setStoreCourses(cData.courses);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.tracks) setStoreTracks(pData.tracks);
        }
        if (aRes.ok) {
          const aData = await aRes.json();
          if (aData.tests) setStoreAssessments(aData.tests);
        }
      } catch (err) {
        console.error("Dashboard data load error", err);
      }
    }
    loadData();
  }, []);

  const activeCourses = storeCourses.map((c: any) => ({
    id: c.id,
    title: c.title,
    category: c.category || "Technical Training",
    completedLessons: 0,
    totalLessons: c.totalLessons || (c.modules?.length || 1),
    progressPercentage: c.progress || 0,
    nextLesson: c.modules?.[0]?.title || "Module 1 Overview",
    slug: c.slug || c.id,
    type: "course",
  }));

  // Enrich practice tracks with live dynamic progress and in-progress submodule detection
  const enrichedPracticeTracks = storeTracks.map((track: any) => {
    const subModules = track.subModules || track.sub_modules || [];
    let completedCount = 0;
    let nextSubModuleToContinue: any = null;
    let hasActiveSession = false;

    subModules.forEach((sm: any, idx: number) => {
      let isDone = sm.status === "completed";
      let isInProgress = false;

      if (typeof window !== "undefined") {
        if (localStorage.getItem(`lms_completed_assessment_${sm.id}`)) {
          isDone = true;
        }
        const session = localStorage.getItem(`lms_practice_session_${sm.id}`);
        if (session) {
          try {
            const parsed = JSON.parse(session);
            if (
              (parsed.answers && Object.keys(parsed.answers).length > 0) ||
              (parsed.codeAnswers && Object.keys(parsed.codeAnswers).length > 0)
            ) {
              isInProgress = true;
              hasActiveSession = true;
            }
          } catch {}
        }
      }

      if (isDone) {
        completedCount++;
      } else if (!nextSubModuleToContinue) {
        nextSubModuleToContinue = { ...sm, subModuleIndex: idx + 1, isInProgress };
      }
    });

    const totalCount = subModules.length || 1;
    const progressPercentage = Math.round((completedCount / totalCount) * 100);
    const targetSubModule = nextSubModuleToContinue || subModules[0];

    return {
      id: track.id,
      title: track.title,
      category: track.category || "Practice Track",
      type: "practice",
      completedCount,
      totalCount,
      progressPercentage,
      targetSubModule,
      hasActiveSession,
      isCompleted: progressPercentage === 100 && totalCount > 0,
    };
  });

  const allActiveLearning = [...enrichedPracticeTracks, ...activeCourses];
  const displayEnrolledCount = activeCourses.length + enrichedPracticeTracks.length;
  const displayCompletedCount = enrichedPracticeTracks.reduce((acc, t) => acc + t.completedCount, 0);
  const displayAssessmentsCount = enrichedPracticeTracks.length;
  const displayUnreadNotifications = 0;

  return (
    <div className="space-y-8 w-full pb-12">
      {/* 1. Welcome Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border animate-fade-up">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.15] tracking-tight text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 font-normal">
            Track your active courses, practice modules, and ongoing technical learning tracks.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button className="h-[44px] px-6 gap-2" asChild>
            <Link href="/student/practices">
              <Code2 className="h-4 w-4" /> Practice Hub
            </Link>
          </Button>
          <Button variant="outline" className="h-[44px] px-5 gap-2" asChild>
            <Link href="/student/tests">
              <Calendar className="h-4 w-4 text-primary" /> Scheduled Tests
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up stagger-1">
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
                        className="p-4 bg-background rounded-2xl border border-border flex items-center justify-between gap-4 hover:border-primary/40 transition-all shadow-xs group"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div>
                            <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-border text-muted-foreground bg-muted/40">
                              {item.category}
                            </Badge>
                          </div>

                          <h3 className="text-sm md:text-base font-bold text-foreground truncate">
                            {item.title}
                          </h3>

                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground pt-0.5">
                            <span>{item.completedCount}/{item.totalCount} Modules</span>
                            <span>•</span>
                            <span className={isDone ? "text-[#16A34A] font-bold" : isInProgress ? "text-[#F59E0B] font-bold" : "text-foreground font-semibold"}>
                              {item.progressPercentage}% Completed
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                          <Button
                            size="sm"
                            className={`h-9 px-4 text-xs font-bold gap-1.5 rounded-xl shadow-xs ${
                              isDone
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : isInProgress
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                            }`}
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
                      className="p-4 bg-background rounded-2xl border border-border flex items-center justify-between gap-4 hover:border-primary/40 transition-all shadow-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div>
                          <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 border-border text-muted-foreground bg-muted/40">
                            {item.category}
                          </Badge>
                        </div>

                        <h3 className="text-sm md:text-base font-bold text-foreground truncate">
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground pt-0.5">
                          <span>Course</span>
                          <span>•</span>
                          <span className="text-primary font-bold">{item.progressPercentage}% Progress</span>
                        </div>
                      </div>

                      <Button size="sm" className="h-9 px-4 text-xs font-bold gap-1.5 shrink-0 rounded-xl" asChild>
                        <Link href={`/student/course/${item.slug}`}>
                          Resume <ArrowRight className="h-3 w-3" />
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
                <div className="flex flex-col items-center justify-center p-6 text-center bg-background rounded-[var(--radius-xl)] border border-border border-dashed">
                  <Clock className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-xs text-muted-foreground">No upcoming evaluations scheduled.</p>
                </div>
              ) : (
                upcomingEvents.map((evt) => (
                  <div key={evt.id} className="p-3.5 bg-background rounded-[var(--radius-lg)] border border-border space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary text-primary-foreground text-[9px] font-bold uppercase">
                        {evt.type}
                      </Badge>
                      <span className="text-[10px] font-bold text-[#9333EA]">{evt.badge}</span>
                    </div>

                    <h4 className="text-xs font-semibold text-foreground">
                      {evt.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                      <span>{evt.time}</span>
                      <span>{evt.duration}</span>
                    </div>

                    <Button className="w-full h-8 text-xs font-semibold gap-1 mt-1" asChild>
                      <Link href={evt.href}>
                        Start Now <ArrowRight className="h-3.5 w-3.5" />
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
