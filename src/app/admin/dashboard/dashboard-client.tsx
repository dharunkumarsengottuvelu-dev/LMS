"use client";

import { motion } from "framer-motion";
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  Calendar, Code2, TrendingUp, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { timeAgo } from "@/utils/date";
import { PageHeader } from "@/components/layouts/page-header";

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
}

const statCards = [
  {
    title: "Total Students",
    key: "total_students",
    changeKey: "students",
    icon: GraduationCap,
    href: "/admin/students",
  },
  {
    title: "Total Trainers",
    key: "total_trainers",
    changeKey: "trainers",
    icon: Users,
    href: "/admin/trainers",
  },
  {
    title: "Published Courses",
    key: "total_courses",
    changeKey: "courses",
    icon: BookOpen,
    href: "/admin/courses",
  },
  {
    title: "Active Assessments",
    key: "total_assessments",
    changeKey: "assessments",
    icon: ClipboardList,
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
    <div className="space-y-8 animate-fade-up">
      {/* 1. Page Title & Description */}
      <PageHeader
        title="System Dashboard"
        description="Real-time organizational learning metrics and enterprise activity overview"
        actions={
          <>
            <Button variant="outline" className="h-[44px] px-5" asChild>
              <Link href="/admin/students">Student Hub</Link>
            </Button>
            <Button className="h-[44px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2" asChild>
              <Link href="/admin/users">
                <Users className="h-5 w-5" />
                User Directory
              </Link>
            </Button>
          </>
        }
      />

      {/* 3. Statistics Grid (Strict 4-Column Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up stagger-1">
        {statCards.map((card) => {
          const value = stats[card.key as keyof typeof stats];
          const changeValue = changes[card.changeKey as keyof typeof changes];
          const isPositive = changeValue >= 0;
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href} className="block h-full">
              <Card className="h-full hover:border-primary/40 transition-colors shadow-sm bg-card border-border rounded-[var(--radius-xl)]">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-[28px] font-bold tracking-tight text-foreground">
                      {value.toLocaleString()}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-600 dark:text-green-500" : "text-destructive"}`}>
                      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {Math.abs(changeValue)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 4. Main Content — Analytics & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up stagger-2">
        {/* Enrollment Trend (2 Columns) */}
        <Card className="lg:col-span-2 shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg">Enrollment Trend</CardTitle>
            <CardDescription className="text-sm font-medium">Daily course enrollments over the past 7 days</CardDescription>
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
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg">Resource Breakdown</CardTitle>
            <CardDescription className="text-sm font-medium">Total active platform records</CardDescription>
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

      {/* 5. Secondary Content — Recent Registrations & System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up stagger-3">
        {/* Recent Registrations Table/List */}
        <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Registrations</CardTitle>
              <CardDescription className="text-sm font-medium">Newly registered enterprise users</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
              <Link href="/admin/users">View all</Link>

            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">No recent registrations</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(`${user.first_name} ${user.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">{timeAgo(user.created_at)}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize font-bold bg-secondary text-secondary-foreground">
                    {user.role}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="shadow-sm border-border bg-card rounded-[var(--radius-xl)]">
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">System Activity</CardTitle>
              <CardDescription className="text-sm font-medium">Audit log of key platform events</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">No audit activities logged</p>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">
                      <span className="font-bold">
                        {(activity.profiles as { first_name: string; last_name: string } | undefined)?.first_name}{" "}
                        {(activity.profiles as { first_name: string; last_name: string } | undefined)?.last_name}
                      </span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{timeAgo(activity.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Footer */}
      <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-muted-foreground animate-fade-up stagger-3">
        <p>© {new Date().getFullYear()} EduNexus Enterprise Platform. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/support" className="hover:text-foreground">System Support</Link>
        </div>
      </div>
    </div>
  );
}
