"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard, BookOpen, Users, ClipboardList, ShieldAlert,
  ArrowUpRight, Award, Clock, CheckCircle2, AlertTriangle, Plus, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TrainerDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Trainer Command Center
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Monitor active cohort assessments, review proctoring violation logs, and grade assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/trainer/students">
            <Button variant="outline" className="h-[44px] border-[#2563EB] text-[#2563EB] font-bold text-xs gap-2">
              <Users className="h-4 w-4" /> View Cohort Directory
            </Button>
          </Link>
          <Link href="/trainer/assessments">
            <Button className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-2">
              <Plus className="h-4 w-4" /> Create Assessment
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Active Cohort Students</span>
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">128 Learners</span>
            <span className="text-xs text-[#16A34A] font-semibold ml-2">Batch 2026-A & B</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctored Evaluations</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">12 Exams</span>
            <span className="text-xs text-[#16A34A] font-semibold ml-2">3 Active Today</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Cohort Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-[#9333EA]/10 text-[#9333EA] flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">87.4%</span>
            <span className="text-xs text-[#16A34A] font-semibold ml-2">+3.8% performance</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctoring Security Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">1 Alert</span>
            <span className="text-xs text-[#DC2626] font-semibold ml-2">Review Required</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Active Evaluations & Recent Proctoring Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Proctored Tests List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Active Proctored Assessments
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280]">
                  Live exams with real-time face monitoring and tab switch tracking
                </CardDescription>
              </div>
              <Link href="/trainer/students">
                <Button variant="ghost" size="sm" className="text-xs text-[#2563EB] font-bold gap-1">
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">Mid-Term Proctored Evaluation</span>
                    <Badge className="bg-[#16A34A] text-white text-[9px] font-bold">LIVE NOW</Badge>
                  </div>
                  <p className="text-xs text-[#6B7280]">Batch 2026-A • 5 Questions (100 Marks) • Duration: 60 mins</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#16A34A]">48/50 Submitted</span>
                  <Link href="/student/tests/t1">
                    <Button size="sm" className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1 px-3">
                      <Eye className="h-3.5 w-3.5" /> Inspect Live Test
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">React 19 & Next.js 16 Coding Assessment</span>
                    <Badge variant="outline" className="text-[9px] border-[#2563EB]/30 text-[#2563EB]">SCHEDULED</Badge>
                  </div>
                  <p className="text-xs text-[#6B7280]">Batch 2026-B • 10 Questions • Starts Tomorrow 10:00 AM</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-[#2563EB] text-[#2563EB]">
                  Manage Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Proctoring Violations Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#DC2626]/5 flex flex-row items-center justify-between">
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-[#DC2626]" /> Real-time Proctoring Alerts
              </span>
              <Badge className="bg-[#DC2626] text-white text-[9px] font-bold">1 Flagged</Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-[#DC2626]">
                  <span>Michael Chang</span>
                  <span className="text-[9px] font-mono">16:28 PM</span>
                </div>
                <p className="text-[11px] text-[#111827] dark:text-[#FAFAFA]">3 Security Warnings Logged (Tab Switch + Gaze Warning)</p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-[#6B7280]">
                  <span>Mid-Term Evaluation</span>
                  <span className="font-bold text-[#DC2626]">Flagged For Review</span>
                </div>
              </div>

              <div className="p-3 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-[#16A34A]">
                  <span>Alex Rivera</span>
                  <span className="text-[9px] font-mono">15:14 PM</span>
                </div>
                <p className="text-[11px] text-[#111827] dark:text-[#FAFAFA]">1 Window Blur Warning (Resolved)</p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-[#6B7280]">
                  <span>Mid-Term Evaluation</span>
                  <span className="font-bold text-[#16A34A]">Completed (84%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
