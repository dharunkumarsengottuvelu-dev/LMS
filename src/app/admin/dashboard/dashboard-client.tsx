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
    icon: GraduationCap,
    href: "/admin/students",
    change: +12,
  },
  {
    title: "Total Trainers",
    key: "total_trainers",
    icon: Users,
    href: "/admin/trainers",
    change: +2,
  },
  {
    title: "Published Courses",
    key: "total_courses",
    icon: BookOpen,
    href: "/admin/courses",
    change: +5,
  },
  {
    title: "Active Assessments",
    key: "total_assessments",
    icon: ClipboardList,
    href: "/admin/assessments",
    change: +8,
  },
];

const PIE_COLORS = ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];

export function AdminDashboardClient({ data }: { data: DashboardData }) {
  const { stats, trendData, recentUsers, activities } = data;

  const statDistributionData = [
    { name: "Students", value: stats.total_students },
    { name: "Trainers", value: stats.total_trainers },
    { name: "Courses", value: stats.total_courses },
    { name: "Assessments", value: stats.total_assessments },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Page Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            System Dashboard
          </h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Real-time organizational learning metrics and enterprise activity overview
          </p>
        </div>

        {/* 2. Primary Actions (44px height buttons) */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-[44px] px-5" asChild>
            <Link href="/admin/students">Student Hub</Link>
          </Button>
          <Button className="h-[44px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2" asChild>
            <Link href="/admin/users">
              <Users className="h-5 w-5" />
              User Directory
            </Link>
          </Button>
        </div>
      </div>

      {/* 3. Statistics Grid (Strict 4-Column Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const value = stats[card.key as keyof typeof stats];
          const isPositive = card.change > 0;
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href} className="block h-full">
              <Card className="h-full hover:border-[#2563EB]/40 transition-colors">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
                      {card.title}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] dark:bg-[#27272A] flex items-center justify-center text-[#2563EB]">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-[28px] font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                      {value.toLocaleString()}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${isPositive ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {Math.abs(card.change)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 4. Main Content — Analytics & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Trend (2 Columns) */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[18px]">Enrollment Trend</CardTitle>
            <CardDescription className="text-[14px]">Daily course enrollments over the past 7 days</CardDescription>
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
        <Card className="h-full flex flex-col justify-between">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[18px]">Resource Breakdown</CardTitle>
            <CardDescription className="text-[14px]">Total active platform records</CardDescription>
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
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
              {statDistributionData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-[12px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-[#6B7280] dark:text-[#A1A1AA]">{item.name}</span>
                  <span className="font-semibold ml-auto text-[#111827] dark:text-[#FAFAFA]">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Secondary Content — Recent Registrations & System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations Table/List */}
        <Card>
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[18px]">Recent Registrations</CardTitle>
              <CardDescription className="text-[14px]">Newly registered enterprise users</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
              <Link href="/admin/users">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-center text-[#6B7280] text-sm py-6">No recent registrations</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-2 border-b border-[#E5E7EB] dark:border-[#27272A] last:border-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold">
                      {getInitials(`${user.first_name} ${user.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827] dark:text-[#FAFAFA] truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">{timeAgo(user.created_at)}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize font-medium">
                    {user.role}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[18px]">System Activity</CardTitle>
              <CardDescription className="text-[14px]">Audit log of key platform events</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-[#6B7280]" />
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-[#6B7280] text-sm py-6">No audit activities logged</p>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-[#E5E7EB] dark:border-[#27272A] last:border-0">
                  <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111827] dark:text-[#FAFAFA]">
                      <span className="font-semibold">
                        {(activity.profiles as { first_name: string; last_name: string } | undefined)?.first_name}{" "}
                        {(activity.profiles as { first_name: string; last_name: string } | undefined)?.last_name}
                      </span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">{timeAgo(activity.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Footer */}
      <div className="pt-8 border-t border-[#E5E7EB] dark:border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
        <p>© {new Date().getFullYear()} EduNexus Enterprise Platform. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-[#111827]">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#111827]">Terms of Service</Link>
          <Link href="/support" className="hover:text-[#111827]">System Support</Link>
        </div>
      </div>
    </div>
  );
}
