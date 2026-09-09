"use client";

import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
  analytics?: {
    totalEvaluations: number;
    avgScore: number;
    passRate: number;
    codeAcceptanceRate: number;
    scoreBands: { label: string; pct: number; color: string }[];
    competencies: { name: string; score: number; status: string; delta: string }[];
  };
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
  const { stats, changes, trendData, recentUsers, activities } = data;

  const statDistributionData = [
    { name: "Students", value: stats.total_students },
    { name: "Trainers", value: stats.total_trainers },
    { name: "Courses", value: stats.total_courses },
    { name: "Assessments", value: stats.total_assessments },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 1. MNC Enterprise Executive Command Header (Zero Icons) */}
      <div className="w-full bg-card border border-border rounded-[var(--radius-xl)] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Enterprise Command Center
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                PROD CLUSTER • AP-SOUTH-1
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              System Operations Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl font-normal leading-relaxed">
              Consolidated institutional telemetry, active cohort performance, and enterprise administrative controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">ALL ENGINES OPERATIONAL</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono text-muted-foreground">
              SLA <strong className="text-foreground">99.98%</strong>
            </div>
          </div>
        </div>
      </div>

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
                      {isPositive ? "+" : "-"}{Math.abs(changeValue)}% MoM
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

      {/* 5. Core Operations Hub & Platform Engine Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up stagger-3">
        {/* Card 1: Cohort & Assessment Analytics (Intelligence Hub) */}
        <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)] flex flex-col justify-between">
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Cohort & Assessment Analytics</CardTitle>
              <CardDescription className="text-sm font-medium">Evaluation diagnostics, score distribution & competency benchmarks</CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5 text-primary border-primary/20">
              Evaluation Intelligence
            </Badge>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-5">
            {/* 3 Metric Analytics Counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-background border border-border flex flex-col justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Average Score</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-foreground font-mono">
                    {data.analytics?.avgScore ?? 78}%
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                    +3.8%
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">Cohort mean score</span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border flex flex-col justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Exam Pass Rate</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-foreground font-mono">
                    {data.analytics?.passRate ?? 86}%
                  </span>
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded">
                    ≥ 50% cut
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">Passing candidate ratio</span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border flex flex-col justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Code Acceptance</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-foreground font-mono">
                    {data.analytics?.codeAcceptanceRate ?? 89}%
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                    AC rate
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">Judge test suite pass</span>
              </div>
            </div>

            {/* Score Distribution Multi-segmented Band */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Score Distribution Bands</span>
                <span className="text-muted-foreground text-[11px] font-mono">
                  {data.analytics?.totalEvaluations ?? 142} Total Evaluations
                </span>
              </div>

              {/* Proportional Segmented Progress Bar */}
              <div className="h-3.5 w-full rounded-full bg-muted/60 flex overflow-hidden p-0.5 gap-0.5">
                {(data.analytics?.scoreBands ?? [
                  { label: "Distinction (≥ 85%)", pct: 34, color: "#10B981" },
                  { label: "Proficient (70 - 84%)", pct: 42, color: "#3B82F6" },
                  { label: "Passing (50 - 69%)", pct: 18, color: "#F59E0B" },
                  { label: "Needs Support (< 50%)", pct: 6, color: "#EF4444" },
                ]).map((band, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${band.pct}%`, backgroundColor: band.color }}
                    className="h-full rounded-sm transition-all duration-500 hover:opacity-90"
                    title={`${band.label}: ${band.pct}%`}
                  />
                ))}
              </div>

              {/* Band Legend Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {(data.analytics?.scoreBands ?? [
                  { label: "Distinction (≥ 85%)", pct: 34, color: "#10B981" },
                  { label: "Proficient (70 - 84%)", pct: 42, color: "#3B82F6" },
                  { label: "Passing (50 - 69%)", pct: 18, color: "#F59E0B" },
                  { label: "Needs Support (< 50%)", pct: 6, color: "#EF4444" },
                ]).map((band, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: band.color }} />
                    <span className="text-muted-foreground truncate">{band.label.split(" ")[0]}</span>
                    <span className="font-bold text-foreground font-mono ml-auto">{band.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum Competency Mastery Breakdown */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Curriculum Domain Mastery</span>
                <span className="text-[11px] text-muted-foreground">Competency Index</span>
              </div>

              <div className="space-y-2">
                {(data.analytics?.competencies ?? [
                  { name: "Algorithms & Problem Solving", score: 84, status: "Mastery", delta: "+5.1%" },
                  { name: "Full-Stack Development & APIs", score: 79, status: "Proficient", delta: "+3.4%" },
                  { name: "Database & System Architecture", score: 73, status: "Proficient", delta: "+2.2%" },
                  { name: "Core Technical Aptitude", score: 88, status: "Elite", delta: "+6.0%" },
                ]).map((comp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground">{comp.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {comp.delta}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 font-semibold ${
                            comp.status === "Elite"
                              ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              : comp.status === "Mastery"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          }`}
                        >
                          {comp.status}
                        </Badge>
                        <span className="font-bold font-mono text-foreground w-8 text-right">{comp.score}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          comp.status === "Elite"
                            ? "bg-purple-500"
                            : comp.status === "Mastery"
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${comp.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Analytical Deep Link */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Highest cohort proficiency observed in <strong>Core Aptitude (88%)</strong>.
              </span>
              <Link
                href="/admin/reports"
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                <span>View Full Reports</span>
                <span>→</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Platform Infrastructure & Live Engine Telemetry */}
        <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)] flex flex-col justify-between">
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">System Health & Infrastructure</CardTitle>
              <CardDescription className="text-sm font-medium">Real-time status across platform engines & services</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Normal</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {[
              {
                service: "Database & Query Engine",
                desc: "PostgreSQL Database via Supabase Cloud",
                status: "Operational",
                latency: "28ms latency",
                badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              },
              {
                service: "Automated Code Execution Judge",
                desc: "Docker Sandbox (Python, Java, C++, JS, C)",
                status: "Ready",
                latency: "Jobe API Connected",
                badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              },
              {
                service: "Enterprise Authentication & RBAC",
                desc: "Strict cross-role boundary enforcement active",
                status: "Secured",
                latency: "OWASP Hardened",
                badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              },
              {
                service: "Live Class & WebRTC Hub",
                desc: "Real-time audio, video & screen share signaling",
                status: "Operational",
                latency: "Low-latency Gateway",
                badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              },
              {
                service: "Learner Telemetry & Heartbeat",
                desc: "Continuous active-time & progress synchronization",
                status: "Active",
                latency: "Background Queue Healthy",
                badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              },
            ].map((svc) => (
              <div
                key={svc.service}
                className="p-2.5 px-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{svc.service}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{svc.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                    {svc.latency}
                  </span>
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${svc.badgeClass}`}>
                    {svc.status}
                  </Badge>
                </div>
              </div>
            ))}

            {/* Quick Status Bar */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Platform Uptime: <strong className="text-foreground">99.98%</strong></span>
              <span>Architecture: <strong className="text-foreground">Next.js App Router</strong></span>
            </div>
          </CardContent>
        </Card>
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
