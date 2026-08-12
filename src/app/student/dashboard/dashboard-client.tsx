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

function StatCard({ icon: Icon, value, label, href, badgeText }: {
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

const mockEnrolledCourses: any[] = [];

const mockUpcomingEvents: any[] = [];

import { useLMSStore } from "@/lib/store/lms-store";

export function StudentDashboardClient({ data }: { data: StudentDashboardData }) {
  const router = useRouter();
  const { profile } = data;
  const firstName = profile?.first_name ?? "Dharunkumar";

  const { courses: storeCourses, practiceTracks: storeTracks, assessments: storeAssessments } = useLMSStore();

  const activeCourses = storeCourses.map((c) => ({
    id: c.id,
    title: c.title,
    category: (typeof c.category_id === 'string' ? c.category_id : (c.category_id as any)?.name) || "Technical Training",
    completedLessons: 0,
    totalLessons: c.modules?.length || 1,
    progressPercentage: 0,
    nextLesson: c.modules?.[0]?.title || "Module 1 Overview",
    slug: c.slug || c.id,
  }));

  const displayEnrolledCount = activeCourses.length;
  const displayCompletedCount = activeCourses.filter(c => c.progressPercentage === 100).length;
  const displayAssessmentsCount = storeTracks.length;
  const displayUnreadNotifications = 0;

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-12 w-full">
      {/* 1. Welcome Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border animate-fade-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            Track your active courses, practice modules, and upcoming proctored evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button className="h-[44px] px-6 gap-2" asChild>
            <Link href="/student/my-courses">
              <BookOpen className="h-4 w-4" /> My Courses Catalog
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
        <StatCard icon={BookOpen} value={displayEnrolledCount} label="Enrolled Courses" href="/student/my-courses" badgeText="Active" />
        <StatCard icon={CheckCircle2} value={displayCompletedCount} label="Completed Lessons" href="/student/my-courses" badgeText="100% Verified" />
        <StatCard icon={ClipboardList} value={displayAssessmentsCount} label="Active Practice Modules" href="/student/assessments" badgeText="In Progress" />
        <StatCard icon={Bell} value={displayUnreadNotifications} label="Unread Notifications" href="/student/dashboard" badgeText="New Alerts" />
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-up stagger-2">
        
        {/* LEFT COLUMN: Continue Learning (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-card border-border shadow-card">
            <CardHeader className="p-6 pb-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Continue Learning
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1 font-medium">
                  Pick up right where you left off in your ongoing technical tracks
                </CardDescription>
              </div>

              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary" asChild>
                <Link href="/student/my-courses">View All ({activeCourses.length}) →</Link>
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {activeCourses.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <BookOpen className="h-10 w-10 text-primary mx-auto opacity-80" />
                  <p className="text-sm font-semibold text-foreground">No Active Courses Enrolled</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Courses created or assigned in the Admin or Trainer panel will appear here automatically.
                  </p>
                </div>
              ) : (
                activeCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-5 bg-background rounded-[var(--radius-xl)] border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/40 transition-all shadow-sm"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 bg-primary/5">
                          {course.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          Lesson {course.completedLessons}/{course.totalLessons}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {course.title}
                      </h3>

                      <p className="text-xs text-muted-foreground font-medium">
                        Next Topic: <strong className="text-foreground">{course.nextLesson}</strong>
                      </p>

                      <div className="space-y-1.5 pt-1 max-w-md">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">Course Progress</span>
                          <span className="text-primary">{course.progressPercentage}%</span>
                        </div>
                        <Progress value={course.progressPercentage} className="h-1.5 bg-border" />
                      </div>
                    </div>

                    <Button className="h-[40px] px-5 text-xs gap-1.5 shrink-0" asChild>
                      <Link href={`/student/course/${course.slug}`}>
                        Resume <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))
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
              {mockUpcomingEvents.map((evt) => (
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
              ))}
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
              <Link href="/student/assessments" className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-background hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> Practice Modules Hub
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link href="/student/assignments" className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-background hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#16A34A]" /> Assignments Portal
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link href="/student/tests" className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-background hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#9333EA]" /> Proctored Tests Hub
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
