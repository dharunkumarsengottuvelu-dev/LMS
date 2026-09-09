"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DashboardAnalyticsPayload } from "@/services/dashboard-analytics.service";

interface DashboardData {
  stats: {
    total_students: number;
    total_trainers: number;
    total_courses: number;
    total_assessments: number;
    total_tests: number;
    total_coding_problems: number;
    active_enrollments: number;
  };
  changes: {
    students: number;
    trainers: number;
    courses: number;
    assessments: number;
  };
  trendData: { day: string; enrollments: number }[];
  recentUsers: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar_url: string | null;
    created_at: string;
  }[];
  activities: {
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    profiles?: { first_name: string; last_name: string; avatar_url: string | null; role: string };
  }[];
  liveAnalytics?: DashboardAnalyticsPayload;
}

const statCards = [
  {
    title: "Total Students",
    tag: "STUDENTS",
    key: "total_students",
    changeKey: "students",
    subtext: "Enrolled candidates across batches",
    href: "/admin/students",
  },
  {
    title: "Total Trainers",
    tag: "FACULTY",
    key: "total_trainers",
    changeKey: "trainers",
    subtext: "Certified training mentors",
    href: "/admin/trainers",
  },
  {
    title: "Published Courses",
    tag: "CURRICULUM",
    key: "total_courses",
    changeKey: "courses",
    subtext: "Active lesson tracks in catalog",
    href: "/admin/courses",
  },
  {
    title: "Active Assessments",
    tag: "EXAMS",
    key: "total_assessments",
    changeKey: "assessments",
    subtext: "Formal technical evaluations",
    href: "/admin/assessments",
  },
];

const PIE_COLORS = ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];

export function AdminDashboardClient({ data }: { data: DashboardData }) {
  const { stats, changes, trendData } = data;

  const [liveAnalytics, setLiveAnalytics] = useState<DashboardAnalyticsPayload | undefined>(data.liveAnalytics);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);
  const [selectedChartMetric, setSelectedChartMetric] = useState<
    "activeStudents" | "codingSubmissions" | "testAttempts" | "lessonsCompleted"
  >("activeStudents");

  const activity = liveAnalytics?.activityOverview;
  const engagement = liveAnalytics?.studentEngagement;

  const handleRefreshAnalytics = async () => {
    setIsRefreshingAnalytics(true);
    try {
      const res = await fetch("/api/admin/dashboard/analytics");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setLiveAnalytics(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to live sync analytics:", err);
    } finally {
      setIsRefreshingAnalytics(false);
    }
  };

  const statDistributionData = [
    { name: "Students", value: stats.total_students },
    { name: "Trainers", value: stats.total_trainers },
    { name: "Courses", value: stats.total_courses },
    { name: "Assessments", value: stats.total_assessments },
  ];

  return (
    <div className="space-y-6 animate-fade-up">

      {/* 2. MNC Statistics Grid (Zero Icons, Pure Typography & Tags) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-up stagger-1">
        {statCards.map((card) => {
          const value = stats[card.key as keyof typeof stats];
          const changeValue = changes[card.changeKey as keyof typeof changes];
          const isPositive = changeValue >= 0;

          return (
            <Link key={card.key} href={card.href} className="block h-full group">
              <Card className="h-full hover:border-primary/50 transition-all duration-200 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between p-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {card.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      {card.tag}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between gap-2">
                    <span className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
                      {value.toLocaleString()}
                    </span>
                    <span
                      className={`inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isPositive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}
                    >
                      {isPositive ? "+" : "-"}{Math.abs(changeValue)}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">{card.subtext}</span>
                  <span className="font-mono text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
                    View →
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 3. Main Content — Analytics & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-up stagger-2">
        {/* Enrollment Trend (2 Columns) */}
        <Card className="lg:col-span-2 shadow-sm border-border bg-card rounded-[var(--radius-xl)] flex flex-col justify-between">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Enrollment Velocity & Trajectory</CardTitle>
              <CardDescription className="text-xs font-medium">Daily learner registrations & cohort allocations over trailing 7 days</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono font-bold tracking-wider uppercase bg-primary/5 text-primary border-primary/20">
              TRAILING 7D
            </Badge>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="enrollments"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#colorEnrollments)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resource Distribution (1 Column) */}
        <Card className="h-full flex flex-col justify-between shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Resource Allocation</CardTitle>
              <CardDescription className="text-xs font-medium">Core database entities across clusters</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono font-bold tracking-wider uppercase bg-muted text-muted-foreground">
              CLUSTER POOL
            </Badge>
          </CardHeader>
          <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statDistributionData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
              {statDistributionData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold ml-auto text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 — LEARNING ACTIVITY OVERVIEW */}
      {/* ========================================================================= */}
      <div className="space-y-4 animate-fade-up stagger-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Learning Activity Overview</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time learning activity across your LMS</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefreshAnalytics}
              disabled={isRefreshingAnalytics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors disabled:opacity-60"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isRefreshingAnalytics ? "bg-primary animate-ping" : "bg-emerald-500"}`} />
              <span>{isRefreshingAnalytics ? "Refreshing..." : "Live Sync"}</span>
            </button>
          </div>
        </div>

        {/* 8 Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {/* 1. Active Students Today */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Students</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">TODAY</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                {activity?.activeStudentsToday ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Unique active learners today
              </p>
            </div>
          </Card>

          {/* 2. Students Online Now */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Online Now</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                {activity?.studentsOnlineNow ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Active in last 3 min (heartbeat)
              </p>
            </div>
          </Card>

          {/* 3. Courses in Progress */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">COURSES</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                {activity?.coursesInProgress ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Courses actively progressed
              </p>
            </div>
          </Card>

          {/* 4. Lessons Completed Today */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lessons Done</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">TODAY</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                {activity?.lessonsCompletedToday ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Modules & lessons completed
              </p>
            </div>
          </Card>

          {/* 5. Practice Sessions */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Practice Sessions</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">LAB</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                {activity?.practiceSessionsToday ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Problem practice runs today
              </p>
            </div>
          </Card>

          {/* 6. Coding Submissions */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Code Submissions</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">JUDGE</span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                  {activity?.codingSubmissionsToday?.total ?? 0}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {activity?.codingSubmissionsToday?.accepted ?? 0} AC
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {activity?.codingSubmissionsToday?.failed ?? 0} failed / wrong answer
              </p>
            </div>
          </Card>

          {/* 7. Test Attempts */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Attempts</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">EXAMS</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                {activity?.testAttemptsToday ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Assessment attempts today
              </p>
            </div>
          </Card>

          {/* 8. Average Study Time */}
          <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Study Time</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">PER LEARNER</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
                {activity?.averageStudyTimeFormatted ?? "0m"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Active study time today
              </p>
            </div>
          </Card>
        </div>

        {/* 7-Day Activity Chart Card */}
        <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
          <CardHeader className="p-6 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">7-Day Learning Activity</CardTitle>
              <CardDescription className="text-xs font-medium">Daily learning activity volume across core LMS dimensions</CardDescription>
            </div>

            {/* Metric selector tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
              {[
                { id: "activeStudents", label: "Active Students" },
                { id: "codingSubmissions", label: "Coding" },
                { id: "testAttempts", label: "Tests" },
                { id: "lessonsCompleted", label: "Lessons" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedChartMetric(tab.id as any)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    selectedChartMetric === tab.id
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={activity?.sevenDayActivity ?? []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                  formatter={(val: any) => [val, selectedChartMetric === "activeStudents" ? "Active Students" : selectedChartMetric === "codingSubmissions" ? "Coding Submissions" : selectedChartMetric === "testAttempts" ? "Test Attempts" : "Lessons Completed"]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.date ? `${label} (${item.date})` : label;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedChartMetric}
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#colorActivity)"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Quick 7-Day Stats Footer */}
            <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
              <span>Trailing 7-day window telemetry</span>
              <div className="flex items-center gap-4">
                <span>Total Active Instances: <strong className="text-foreground">{(activity?.sevenDayActivity || []).reduce((acc, d) => acc + d.activeStudents, 0)}</strong></span>
                <span>Submissions: <strong className="text-foreground">{(activity?.sevenDayActivity || []).reduce((acc, d) => acc + d.codingSubmissions, 0)}</strong></span>
                <span>Tests Attempted: <strong className="text-foreground">{(activity?.sevenDayActivity || []).reduce((acc, d) => acc + d.testAttempts, 0)}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 — STUDENT ENGAGEMENT & PROGRESS */}
      {/* ========================================================================= */}
      <div className="space-y-4 animate-fade-up stagger-3 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Student Engagement & Progress</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Track learner performance, progress and engagement</p>
        </div>

        {/* 3 Core Progress KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Course Completion Rate */}
          <Card className="p-5 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Course Completion</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">CURRICULUM</span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-foreground">
                  {engagement?.courseCompletionRate?.ratePct ?? 0}%
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  ({engagement?.courseCompletionRate?.completedCount ?? 0} / {engagement?.courseCompletionRate?.totalEnrollments ?? 0})
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, engagement?.courseCompletionRate?.ratePct ?? 0)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Enrolled courses successfully completed
              </p>
            </div>
          </Card>

          {/* Assessment Pass Rate */}
          <Card className="p-5 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assessment Pass Rate</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">BENCHMARK</span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-foreground">
                  {engagement?.assessmentPassRate?.ratePct ?? 0}%
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  ({engagement?.assessmentPassRate?.passedCount ?? 0} / {engagement?.assessmentPassRate?.totalAttempts ?? 0})
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, engagement?.assessmentPassRate?.ratePct ?? 0)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Evaluations scoring ≥ 50% cutoff
              </p>
            </div>
          </Card>

          {/* Average Student Progress */}
          <Card className="p-5 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Student Progress</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">COHORT MEAN</span>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold font-mono text-foreground">
                {engagement?.averageStudentProgressPct ?? 0}%
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, engagement?.averageStudentProgressPct ?? 0)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Average progress across active student enrollments
              </p>
            </div>
          </Card>
        </div>

        {/* Two-Column Deep Engagement Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Column 1: Top Performing Students & Students Needing Attention */}
          <div className="space-y-5">
            {/* 1. Top Performing Students */}
            <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
              <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Top Performing Students</CardTitle>
                  <CardDescription className="text-xs">Ranked by actual assessment scores and course progress</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase bg-muted text-muted-foreground">
                  LEADERBOARD
                </Badge>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!engagement?.topStudents || engagement.topStudents.length === 0) ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No student performance data recorded yet
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {engagement.topStudents.map((student) => (
                      <div key={student.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                              student.rank === 1
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : student.rank === 2
                                ? "bg-slate-300/30 text-slate-700 dark:text-slate-300 border border-slate-300/40"
                                : student.rank === 3
                                ? "bg-amber-700/15 text-amber-700 dark:text-amber-500 border border-amber-700/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {student.rank}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{student.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{student.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {student.completedAssessments} assessments
                            </p>
                          </div>
                          <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {student.performanceScore}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Students Needing Attention */}
            <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
              <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-foreground">
                      {engagement?.studentsNeedingAttention?.totalCount ?? 0} Students Need Attention
                    </CardTitle>
                    {(engagement?.studentsNeedingAttention?.totalCount ?? 0) > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                  <CardDescription className="text-xs">Based on inactivity, low course progress, or poor exam scores</CardDescription>
                </div>
                <Link
                  href="/admin/students"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Students →
                </Link>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                {/* 3 Reason Breakdown Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(engagement?.studentsNeedingAttention?.reasons ?? []).map((reason, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-border bg-muted/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground">{reason.label}</span>
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          {reason.count}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{reason.description}</p>
                    </div>
                  ))}
                </div>

                {/* Sample students list needing attention */}
                {(engagement?.studentsNeedingAttention?.sampleStudents && engagement.studentsNeedingAttention.sampleStudents.length > 0) ? (
                  <div className="pt-2 border-t border-border divide-y divide-border">
                    {engagement.studentsNeedingAttention.sampleStudents.slice(0, 3).map((stu, i) => (
                      <div key={i} className="py-2 flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground truncate block">{stu.name}</span>
                          <span className="text-[11px] text-muted-foreground truncate block">{stu.email}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-medium text-destructive border-destructive/20 bg-destructive/5 shrink-0 ml-2">
                          {stu.reason}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    All students are currently meeting baseline engagement criteria
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Key Engagement Insights & 7-Day Progress Trend */}
          <div className="space-y-5">
            {/* 4 Key Engagement Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Most Active Course */}
              <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Most Active Course</span>
                  <p className="text-sm font-bold text-foreground mt-1 line-clamp-1">
                    {engagement?.mostActiveCourse?.title || "No active courses yet"}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{engagement?.mostActiveCourse?.learnerCount ?? 0} Learners</span>
                  <span className="font-semibold text-primary">{engagement?.mostActiveCourse?.avgProgress ?? 0}% Avg</span>
                </div>
              </Card>

              {/* Most Practiced Skill */}
              <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Most Practiced Skill</span>
                  <p className="text-sm font-bold text-foreground mt-1 line-clamp-1">
                    {engagement?.mostPracticedSkill?.hasEnoughData
                      ? engagement.mostPracticedSkill.skill
                      : "Not enough data"}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{engagement?.mostPracticedSkill?.submissionsCount ?? 0} Submissions</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Coding Lab</span>
                </div>
              </Card>

              {/* Most Attempted Assessment */}
              <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Most Attempted Exam</span>
                  <p className="text-sm font-bold text-foreground mt-1 line-clamp-1">
                    {engagement?.mostAttemptedAssessment?.title || "No assessments attempted yet"}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{engagement?.mostAttemptedAssessment?.attemptCount ?? 0} Attempts</span>
                  <span className="font-semibold text-primary">{engagement?.mostAttemptedAssessment?.passRatePct ?? 0}% Pass</span>
                </div>
              </Card>

              {/* Inactive Students */}
              <Card className="p-4 shadow-sm bg-card border-border rounded-[var(--radius-xl)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Inactive Students</span>
                    <span className="text-[10px] font-mono font-bold text-destructive">7+ DAYS</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-foreground mt-1">
                    {engagement?.inactiveStudents?.count ?? 0}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      / {engagement?.inactiveStudents?.totalStudents ?? 0} students
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Zero activity 7+ days</span>
                  <Link href="/admin/students" className="text-primary font-semibold hover:underline">
                    View →
                  </Link>
                </div>
              </Card>
            </div>

            {/* 7-Day Progress Trend Chart */}
            <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">7-Day Progress Trend</CardTitle>
                  <CardDescription className="text-xs">Average student progress and completion velocity</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase bg-muted text-muted-foreground">
                  7D COHORT
                </Badge>
              </CardHeader>
              <CardContent className="p-5 pt-2">
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart
                    data={engagement?.sevenDayProgressTrend ?? []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`${val}%`, "Avg Progress"]}
                    />
                    <Area type="monotone" dataKey="avgProgress" stroke="#10B981" strokeWidth={2} fill="url(#colorProgress)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 6. Footer */}
      <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-muted-foreground animate-fade-up stagger-3">
        <p>© {new Date().getFullYear()} FALCON Learning Technologies. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/support" className="hover:text-foreground">System Support</Link>
        </div>
      </div>
    </div>
  );
}

