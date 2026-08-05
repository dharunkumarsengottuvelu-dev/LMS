"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen, ClipboardList, Award, Calendar, Bell,
  ChevronRight, Play, Clock, CheckCircle2, AlertCircle,
  Trophy, ArrowRight, Code2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { formatDate, timeAgo } from "@/utils/date";
import type { UserProfile } from "@/types";

interface StudentDashboardData {
  profile: UserProfile | null;
  enrollments: {
    id: string;
    course_id: string;
    progress_percentage: number;
    status: string;
    enrolled_at: string;
    courses: { id: string; title: string; thumbnail_url: string | null; slug: string; difficulty: string } | null;
  }[];
  assessments: { assessment_id: string; assessments: { id: string; title: string; type: string; duration_minutes: number; expires_at: string | null } | null }[];
  tests: { id: string; title: string; type: string; scheduled_at: string; duration_minutes: number; status: string }[];
  assignments: { id: string; status: string; assignments: { id: string; title: string; deadline: string; max_marks: number } | null }[];
  notifications: { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string }[];
  certificates: { id: string; issued_at: string; courses: { title: string } | null }[];
  stats: { enrolledCourses: number; completedCourses: number; certificates: number };
}

function StatCard({ icon: Icon, value, label, href }: {
  icon: React.ElementType; value: number; label: string; href: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full hover:border-[#2563EB]/40 transition-colors">
        <CardContent className="p-6 flex items-center gap-4 h-full">
          <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] dark:bg-[#27272A] flex items-center justify-center text-[#2563EB] shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[28px] font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              {value}
            </span>
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] font-medium">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function StudentDashboardClient({ data }: { data: StudentDashboardData }) {
  const { profile, enrollments, assessments, tests, assignments, notifications, certificates, stats } = data;
  const firstName = profile?.first_name ?? "Student";
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-8">
      {/* 1. Page Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Welcome back, {firstName}
          </h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Track your ongoing courses, complete assessments, and practice coding
          </p>
        </div>

        {/* 2. Primary Actions (44px height buttons) */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-[44px] px-5" asChild>
            <Link href="/student/my-courses">My Courses</Link>
          </Button>
          <Button className="h-[44px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2" asChild>
            <Link href="/ide/playground">
              <Code2 className="h-5 w-5" />
              Code Playground
            </Link>
          </Button>
        </div>
      </div>

      {/* 3. Statistics Grid (Strict 4-Column Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} value={stats.enrolledCourses} label="Enrolled Courses" href="/student/my-courses" />
        <StatCard icon={CheckCircle2} value={stats.completedCourses} label="Completed Courses" href="/student/my-courses" />
        <StatCard icon={Award} value={stats.certificates} label="Certificates Earned" href="/student/certificates" />
        <StatCard icon={Bell} value={unreadNotifications} label="Unread Notifications" href="/student/notifications" />
      </div>

      {/* 4. Main Content — Continue Learning & Upcoming Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[18px]">Continue Learning</CardTitle>
                <CardDescription className="text-[14px]">Pick up where you left off</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
                <Link href="/student/my-courses">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {enrollments.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-[#6B7280] text-sm">You are not enrolled in any courses yet.</p>
                  <Button className="h-[44px] px-5 bg-[#2563EB]" asChild>
                    <Link href="/courses">Browse Catalog</Link>
                  </Button>
                </div>
              ) : (
                enrollments.slice(0, 4).map((enrollment) => {
                  const course = enrollment.courses;
                  if (!course) return null;
                  const progress = enrollment.progress_percentage;
                  return (
                    <Link key={enrollment.id} href={`/student/course/${course.slug}`} className="block">
                      <div className="p-4 rounded-lg border border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/40 transition-colors space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA] truncate">{course.title}</p>
                          <Badge variant="outline" className="text-xs capitalize font-medium shrink-0">
                            {course.difficulty}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-[#6B7280]">
                            <span>Progress</span>
                            <span className="font-medium text-[#111827] dark:text-[#FAFAFA]">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Upcoming Assessments */}
          <Card>
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[18px]">Assigned Assessments</CardTitle>
                <CardDescription className="text-[14px]">Pending tests and coding challenges</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
                <Link href="/student/assessments">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              {assessments.length === 0 ? (
                <p className="text-center text-[#6B7280] text-sm py-6">No pending assessments assigned</p>
              ) : (
                assessments.slice(0, 3).map((item) => {
                  const assessment = item.assessments;
                  if (!assessment) return null;
                  return (
                    <div key={item.assessment_id} className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA] truncate">{assessment.title}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">{assessment.duration_minutes} minutes • {assessment.type}</p>
                      </div>
                      <Button size="sm" className="h-9 px-4 text-xs bg-[#2563EB] shrink-0" asChild>
                        <Link href={`/student/assessments/${assessment.id}`}>Start</Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side Column (1 Column) */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[18px]">Notifications</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
                <Link href="/student/notifications">All</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-center text-[#6B7280] text-sm py-4">No new notifications</p>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="p-3 rounded-lg border border-[#E5E7EB] dark:border-[#27272A] space-y-1">
                    <p className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">{notification.title}</p>
                    <p className="text-xs text-[#6B7280] line-clamp-2">{notification.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Practice Code Box */}
          <Card className="bg-[#2563EB] text-white border-0">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-[18px] font-semibold text-white">Coding Playground</h3>
                <p className="text-xs text-white/80 mt-1">Practice coding challenges in Python, JavaScript, Java, C++, and 10+ languages with Judge0.</p>
              </div>
              <Button variant="secondary" className="w-full h-[44px] bg-white text-[#2563EB] hover:bg-[#F5F5F5]" asChild>
                <Link href="/ide/playground">Open IDE</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Footer */}
      <div className="pt-8 border-t border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
        <p>© {new Date().getFullYear()} EduNexus Enterprise Platform. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-[#111827]">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#111827]">Terms of Service</Link>
          <Link href="/support" className="hover:text-[#111827]">Support</Link>
        </div>
      </div>
    </div>
  );
}
