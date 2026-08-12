"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard, BookOpen, Users, ClipboardList, ShieldAlert,
  ArrowUpRight, Award, Clock, CheckCircle2, AlertTriangle, Plus, Eye,
  Filter, Boxes, ChevronRight, FileText, Sparkles, Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLMSStore } from "@/lib/store/lms-store";
import { PageHeader } from "@/components/layouts/page-header";

export default function TrainerDashboardPage() {
  const { batches, students, assessments, assignments } = useLMSStore();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");

  // Selected Batch details
  const selectedBatch = useMemo(() => {
    if (selectedBatchId === "all") return null;
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // Filtered Students based on selected batch
  const filteredStudents = useMemo(() => {
    if (selectedBatchId === "all") return students;
    if (!selectedBatch) return students;
    return students.filter(
      (s) =>
        s.batchId === selectedBatch.id ||
        selectedBatch.studentIds.includes(s.id) ||
        (s.batch && s.batch.toLowerCase().includes(selectedBatch.batchName.toLowerCase()))
    );
  }, [students, selectedBatchId, selectedBatch]);

  // Calculated Metrics
  const activeLearnersCount = filteredStudents.length;

  const activeExamsCount = useMemo(() => {
    return assessments.filter((a) => a.status === "active").length;
  }, [assessments]);

  const cohortAvgScore = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const total = filteredStudents.reduce((acc, s) => acc + (s.avgScore || 0), 0);
    return Math.round(total / filteredStudents.length);
  }, [filteredStudents]);

  const securityAlertsCount = useMemo(() => {
    return filteredStudents.filter((s) => s.status === "flagged" || s.violationCount > 0).length;
  }, [filteredStudents]);

  // Filtered Submissions for selected batch
  const pendingSubmissions = useMemo(() => {
    if (selectedBatchId === "all") return assignments;
    return assignments.filter((a) =>
      filteredStudents.some((s) => s.name.toLowerCase() === a.studentName.toLowerCase())
    );
  }, [assignments, filteredStudents, selectedBatchId]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Top Welcome Banner & Batch Filter Dropdown */}
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Trainer Command Center
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30 font-bold text-xs">
              Live Trainer View
            </Badge>
          </span>
        }
        description="Monitor active batch assessments, review proctoring violation logs, and grade assignments"
        actions={
          <Link href="/trainer/assessments">
            <Button className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 gap-2 rounded-xl shadow-md shadow-[#2563EB]/20">
              <Plus className="h-4 w-4" /> Create Assessment
            </Button>
          </Link>
        }
      />

      {/* Selected Batch Context Banner */}
      {selectedBatch && (
        <Card className="bg-[#2563EB]/5 border border-[#2563EB]/20 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{selectedBatch.batchName}</h3>
                <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold px-2 py-0.5">
                  {selectedBatch.status}
                </Badge>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                College: <strong>{selectedBatch.collegeName}</strong> • Course: <strong>{selectedBatch.course}</strong> • Schedule: <strong>{selectedBatch.joiningTime}</strong>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedBatchId("all")}
            className="h-8 text-xs font-semibold text-[#6B7280] border-[#E5E7EB] self-start md:self-auto rounded-lg"
          >
            Clear Batch Filter
          </Button>
        </Card>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Active Batch Students</span>
            <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#111827] dark:text-[#FAFAFA]">{activeLearnersCount}</span>
            <span className="text-xs text-[#6B7280] font-semibold ml-2">
              {selectedBatch ? `in ${selectedBatch.collegeName}` : "Across all batches"}
            </span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctored Evaluations</span>
            <div className="w-9 h-9 rounded-xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#111827] dark:text-[#FAFAFA]">{activeExamsCount}</span>
            <span className="text-xs text-[#16A34A] font-semibold ml-2">Active Exams</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Batch Average Score</span>
            <div className="w-9 h-9 rounded-xl bg-[#9333EA]/10 text-[#9333EA] flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#9333EA]">{cohortAvgScore}%</span>
            <span className="text-xs text-[#6B7280] font-semibold ml-2">Overall Accuracy</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctoring Security Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#DC2626]">{securityAlertsCount}</span>
            <span className="text-xs text-[#6B7280] font-semibold ml-2">
              {securityAlertsCount === 0 ? "All clear" : "Flagged compliance"}
            </span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Active Evaluations & Batch Learners Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Proctored Tests & Enrolled Learners (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs rounded-2xl">
            <CardHeader className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Enrolled Learners ({filteredStudents.length})
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280] mt-1">
                  Filtered student list for batch monitoring and progress tracking
                </CardDescription>
              </div>
              <Link href="/trainer/students">
                <Button variant="ghost" size="sm" className="text-xs text-[#2563EB] font-bold gap-1 hover:bg-[#2563EB]/10">
                  Full Directory <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-[#6B7280] space-y-2">
                  <Users className="h-8 w-8 mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No learners enrolled in this batch</p>
                  <p className="text-xs">Select a different batch or assign students from the Admin Portal.</p>
                </div>
              ) : (
                filteredStudents.slice(0, 5).map((std) => (
                  <div key={std.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-[#2563EB]/20">
                        <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs">
                          {std.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">{std.name}</p>
                        <p className="text-xs text-[#6B7280]">
                          {std.email} • Batch: <strong className="text-[#2563EB]">{std.batch || "Not Assigned"}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{std.avgScore || 0}% Score</p>
                        <p className="text-[10px] text-[#16A34A] font-semibold">{std.proctoringCompliance}% Compliance</p>
                      </div>
                      <Badge className={`text-[10px] font-bold capitalize ${std.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#DC2626] text-white"}`}>
                        {std.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Proctoring Security Alerts Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs rounded-2xl">
            <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#DC2626]/5 flex flex-row items-center justify-between rounded-t-2xl">
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-[#DC2626]" /> Real-time Security Alerts
              </span>
              <Badge className="bg-[#DC2626] text-white text-[9px] font-bold">
                {securityAlertsCount} Flagged
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {securityAlertsCount === 0 ? (
                <div className="py-8 text-center text-[#6B7280] space-y-2">
                  <ShieldAlert className="h-8 w-8 mx-auto opacity-40 text-[#16A34A]" />
                  <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">All Clear</p>
                  <p className="text-xs text-[#6B7280]">No active proctoring violations recorded for this batch.</p>
                </div>
              ) : (
                filteredStudents
                  .filter((s) => s.status === "flagged" || s.violationCount > 0)
                  .map((s) => (
                    <div key={s.id} className="p-3 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#DC2626]">{s.name}</span>
                        <span className="text-[10px] font-mono text-[#DC2626]">{s.violationCount} Violations</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280]">Tab Switch or Face Absence during exam</p>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
