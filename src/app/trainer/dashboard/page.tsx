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
    <div className="space-y-8 animate-fade-up">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Trainer Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            Monitor active cohort assessments, review proctoring violation logs, and grade assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/trainer/students">
            <Button variant="outline" className="h-[44px] border-primary text-primary hover:bg-primary/5 font-bold text-xs gap-2">
              <Users className="h-4 w-4" /> View Cohort Directory
            </Button>
          </Link>
          <Link href="/trainer/assessments">
            <Button className="h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2">
              <Plus className="h-4 w-4" /> Create Assessment
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-up stagger-1">
        <Card className="bg-card border border-border p-5 shadow-sm rounded-[var(--radius-xl)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Cohort Students</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground">128 Learners</span>
            <span className="text-xs text-green-600 dark:text-green-500 font-semibold ml-2">Batch 2026-A & B</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 shadow-sm rounded-[var(--radius-xl)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Proctored Evaluations</span>
            <div className="w-8 h-8 rounded-lg bg-green-600/10 text-green-600 flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground">12 Exams</span>
            <span className="text-xs text-green-600 dark:text-green-500 font-semibold ml-2">3 Active Today</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 shadow-sm rounded-[var(--radius-xl)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Cohort Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground">87.4%</span>
            <span className="text-xs text-green-600 dark:text-green-500 font-semibold ml-2">+3.8% performance</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 shadow-sm rounded-[var(--radius-xl)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Proctoring Security Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground">1 Alert</span>
            <span className="text-xs text-destructive font-semibold ml-2">Review Required</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Active Evaluations & Recent Proctoring Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-up stagger-2">
        
        {/* Active Proctored Tests List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-card border border-border shadow-sm rounded-[var(--radius-xl)]">
            <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Active Proctored Assessments
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-medium mt-1">
                  Live exams with real-time face monitoring and tab switch tracking
                </CardDescription>
              </div>
              <Link href="/trainer/students">
                <Button variant="ghost" size="sm" className="text-xs text-primary font-bold gap-1 hover:bg-primary/5">
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">Mid-Term Proctored Evaluation</span>
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-[9px] font-bold">LIVE NOW</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Batch 2026-A • 5 Questions (100 Marks) • Duration: 60 mins</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-green-600 dark:text-green-500">48/50 Submitted</span>
                  <Link href="/student/tests/t1">
                    <Button size="sm" className="h-8 text-xs font-bold gap-1 px-3 rounded-[var(--radius-md)]">
                      <Eye className="h-3.5 w-3.5" /> Inspect Live Test
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">React 19 & Next.js 16 Coding Assessment</span>
                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">SCHEDULED</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Batch 2026-B • 10 Questions • Starts Tomorrow 10:00 AM</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-primary text-primary hover:bg-primary/5 rounded-[var(--radius-md)]">
                  Manage Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Proctoring Violations Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-card border border-border shadow-sm rounded-[var(--radius-xl)]">
            <CardHeader className="p-4 border-b border-border bg-destructive/5 flex flex-row items-center justify-between rounded-t-[calc(var(--radius-xl)-1px)]">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Real-time Proctoring Alerts
              </span>
              <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground text-[9px] font-bold">1 Flagged</Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-destructive">
                  <span>Michael Chang</span>
                  <span className="text-[9px] font-mono">16:28 PM</span>
                </div>
                <p className="text-[11px] text-foreground font-medium">3 Security Warnings Logged (Tab Switch + Gaze Warning)</p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Mid-Term Evaluation</span>
                  <span className="font-bold text-destructive">Flagged For Review</span>
                </div>
              </div>

              <div className="p-3 bg-green-600/5 border border-green-600/20 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-green-600 dark:text-green-500">
                  <span>Alex Rivera</span>
                  <span className="text-[9px] font-mono">15:14 PM</span>
                </div>
                <p className="text-[11px] text-foreground font-medium">1 Window Blur Warning (Resolved)</p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Mid-Term Evaluation</span>
                  <span className="font-bold text-green-600 dark:text-green-500">Completed (84%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
