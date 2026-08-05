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
      <Card className="h-full hover:border-[#2563EB]/50 transition-all bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
        <CardContent className="p-6 flex items-center gap-4 h-full">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[28px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                {value}
              </span>
              {badgeText && (
                <Badge className="bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold px-2 py-0.5">
                  {badgeText}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] font-medium">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const mockEnrolledCourses = [
  {
    id: "c1",
    title: "React 19 & Next.js 16 Enterprise App Router",
    category: "Frontend Engineering",
    completedLessons: 14,
    totalLessons: 20,
    progressPercentage: 70,
    nextLesson: "Custom Middleware & Authentication",
  },
  {
    id: "c2",
    title: "Data Structures & Algorithms Problem Solving Track",
    category: "Algorithms & Logic",
    completedLessons: 8,
    totalLessons: 20,
    progressPercentage: 40,
    nextLesson: "Dynamic Programming Memoization",
  },
  {
    id: "c3",
    title: "Fullstack Cloud Architecture & System Design",
    category: "System Engineering",
    completedLessons: 5,
    totalLessons: 20,
    progressPercentage: 25,
    nextLesson: "PostgreSQL Row Level Security Isolation",
  },
];

const mockUpcomingEvents = [
  {
    id: "t1",
    title: "Mid-Term Proctored Evaluation — Batch 2026-A",
    type: "Live Examination",
    duration: "60 Mins",
    time: "Today at 4:00 PM",
    badge: "SEB & Fullscreen Lock",
    href: "/student/tests/t1",
  },
  {
    id: "p1",
    title: "React 19 Server Components Practice Module",
    type: "Practice Track",
    duration: "30 Mins",
    time: "Due in 2 days",
    badge: "MCQ & Coding",
    href: "/student/assessments/tracks/track-1",
  },
];

export function StudentDashboardClient({ data }: { data: StudentDashboardData }) {
  const router = useRouter();
  const { profile, enrollments, tests, notifications, stats } = data;
  const firstName = profile?.first_name ?? "Dharunkumar";

  const displayEnrolledCount = stats.enrolledCourses > 0 ? stats.enrolledCourses : 3;
  const displayCompletedCount = stats.completedCourses > 0 ? stats.completedCourses : 12;
  const displayAssessmentsCount = 3;
  const displayUnreadNotifications = 2;

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-12 w-full">
      {/* 1. Welcome Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] md:text-[36px] font-bold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Welcome back, {firstName}
          </h1>
          <p className="text-[15px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Track your active courses, practice modules, and upcoming proctored evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2" asChild>
            <Link href="/student/my-courses">
              <BookOpen className="h-4 w-4" /> My Courses Catalog
            </Link>
          </Button>
          <Button variant="outline" className="h-[44px] px-5 border-[#E5E7EB] dark:border-[#27272A] font-bold gap-2" asChild>
            <Link href="/student/tests">
              <Calendar className="h-4 w-4 text-[#2563EB]" /> Scheduled Tests
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} value={displayEnrolledCount} label="Enrolled Courses" href="/student/my-courses" badgeText="Active" />
        <StatCard icon={CheckCircle2} value={displayCompletedCount} label="Completed Lessons" href="/student/my-courses" badgeText="100% Verified" />
        <StatCard icon={ClipboardList} value={displayAssessmentsCount} label="Active Practice Modules" href="/student/assessments" badgeText="In Progress" />
        <StatCard icon={Bell} value={displayUnreadNotifications} label="Unread Notifications" href="/student/dashboard" badgeText="New Alerts" />
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Continue Learning (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Continue Learning
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280]">
                  Pick up right where you left off in your ongoing technical tracks
                </CardDescription>
              </div>

              <Button variant="ghost" size="sm" className="text-xs font-bold text-[#2563EB]" asChild>
                <Link href="/student/my-courses">View All ({mockEnrolledCourses.length}) →</Link>
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {mockEnrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#2563EB]/40 transition-all"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                        {course.category}
                      </Badge>
                      <span className="text-xs text-[#6B7280]">
                        Lesson {course.completedLessons}/{course.totalLessons}
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                      {course.title}
                    </h3>

                    <p className="text-xs text-[#6B7280]">
                      Next Topic: <strong className="text-[#111827] dark:text-[#FAFAFA]">{course.nextLesson}</strong>
                    </p>

                    <div className="space-y-1 pt-1 max-w-md">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#6B7280]">Course Progress</span>
                        <span className="font-bold text-[#2563EB]">{course.progressPercentage}%</span>
                      </div>
                      <Progress value={course.progressPercentage} className="h-1.5 bg-[#E5E7EB]" />
                    </div>
                  </div>

                  <Button className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-1.5 shrink-0" asChild>
                    <Link href={`/student/my-courses`}>
                      <Play className="h-3.5 w-3.5" /> Continue
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Upcoming Evaluations & Quick Launch (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Evaluations Card */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#2563EB]/5">
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#2563EB]" /> Upcoming Proctored Evaluations
              </span>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {mockUpcomingEvents.map((evt) => (
                <div key={evt.id} className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#2563EB] text-white text-[9px] font-bold uppercase">
                      {evt.type}
                    </Badge>
                    <span className="text-[10px] font-bold text-[#9333EA]">{evt.badge}</span>
                  </div>

                  <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {evt.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                    <span>{evt.time}</span>
                    <span>{evt.duration}</span>
                  </div>

                  <Button className="w-full h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold gap-1 mt-1" asChild>
                    <Link href={evt.href}>
                      Start Now <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Hub Navigation Card */}
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Student Quick Portals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <Link href="/student/assessments" className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] hover:bg-[#2563EB]/10 transition-all font-semibold text-[#111827] dark:text-[#FAFAFA]">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#2563EB]" /> Practice Modules Hub
                </span>
                <ChevronRight className="h-4 w-4 text-[#6B7280]" />
              </Link>

              <Link href="/student/assignments" className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] hover:bg-[#2563EB]/10 transition-all font-semibold text-[#111827] dark:text-[#FAFAFA]">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#16A34A]" /> Assignments Portal
                </span>
                <ChevronRight className="h-4 w-4 text-[#6B7280]" />
              </Link>

              <Link href="/student/tests" className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] hover:bg-[#2563EB]/10 transition-all font-semibold text-[#111827] dark:text-[#FAFAFA]">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#9333EA]" /> Proctored Tests Hub
                </span>
                <ChevronRight className="h-4 w-4 text-[#6B7280]" />
              </Link>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
