"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Plus, Search, ShieldAlert, ShieldCheck, Clock, Users,
  Award, Eye, Trash2, Play, ArrowLeft, Sparkles, Lock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface ScheduledTest {
  id: string;
  title: string;
  batch: string;
  duration: number; // in mins
  totalQuestions: number;
  maxMarks: number;
  status: "live" | "scheduled" | "completed";
  submissionsCount: number;
  totalEnrolled: number;
  proctoringFlags: string[];
}

const initialTests: ScheduledTest[] = [
  {
    id: "t1",
    title: "Mid-Term Proctored Evaluation",
    batch: "Batch 2026-A",
    duration: 60,
    totalQuestions: 5,
    maxMarks: 100,
    status: "live",
    submissionsCount: 48,
    totalEnrolled: 50,
    proctoringFlags: ["12 Camera Rules Face Monitoring", "Tab Switch Security", "Window Blur Detection", "Copy-Paste Lock"],
  },
  {
    id: "t2",
    title: "React 19 & Next.js 16 Coding Assessment",
    batch: "Batch 2026-B",
    duration: 90,
    totalQuestions: 10,
    maxMarks: 100,
    status: "scheduled",
    submissionsCount: 0,
    totalEnrolled: 45,
    proctoringFlags: ["Face Monitoring", "Fullscreen Lock", "Judge0 Execution"],
  },
  {
    id: "t3",
    title: "PostgreSQL & Supabase Architecture Exam",
    batch: "Batch 2026-A",
    duration: 45,
    totalQuestions: 15,
    maxMarks: 75,
    status: "completed",
    submissionsCount: 50,
    totalEnrolled: 50,
    proctoringFlags: ["Webcam Tracking", "Tab Switch Lock"],
  },
];

export function ProctoredTestHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [tests, setTests] = useState<ScheduledTest[]>(initialTests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // View State: "list" | "create"
  const [viewState, setViewState] = useState<"list" | "create">("list");

  // Form State for Exam Configurator
  const [newTitle, setNewTitle] = useState("");
  const [newBatch, setNewBatch] = useState("Batch 2026-A");
  const [newDuration, setNewDuration] = useState(60);
  const [newTotalQuestions, setNewTotalQuestions] = useState(5);
  const [newMaxMarks, setNewMaxMarks] = useState(100);
  const [newStatus, setNewStatus] = useState<"live" | "scheduled">("scheduled");

  const filtered = tests.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleScheduleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newExam: ScheduledTest = {
      id: `t_${Date.now()}`,
      title: newTitle,
      batch: newBatch,
      duration: newDuration,
      totalQuestions: newTotalQuestions,
      maxMarks: newMaxMarks,
      status: newStatus,
      submissionsCount: 0,
      totalEnrolled: 50,
      proctoringFlags: [
        "12 Camera Rules Face Monitoring",
        "Tab Switch Security",
        "Window Blur Detection",
        "Copy-Paste Lock",
      ],
    };

    setTests((prev) => [newExam, ...prev]);
    setViewState("list");
    setNewTitle("");
    toast({
      title: "Proctored Exam Scheduled",
      description: `"${newTitle}" scheduled for ${newBatch}.`,
    });
  };

  const handleDeleteTest = (id: string, title: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: "Exam Cancelled",
      description: `${title} removed from schedule.`,
      variant: "destructive",
    });
  };

  // FULL PAGE EXAM CREATION VIEW
  if (viewState === "create") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <Button
            onClick={() => setViewState("list")}
            variant="outline"
            size="sm"
            className="h-9 font-bold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Assessment Directory
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              Configure New Proctored Examination
            </h1>
            <p className="text-xs text-[#6B7280]">Set up proctoring security rules, duration, and question allocation</p>
          </div>
        </div>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleScheduleTest} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Title</label>
              <Input
                placeholder="e.g. React 19 & Next.js 16 Proctored Evaluation"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assigned Cohort Batch</label>
                <Select value={newBatch} onValueChange={(val) => setNewBatch(val || "Batch 2026-A")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Batch 2026-A">Batch 2026-A</SelectItem>
                    <SelectItem value="Batch 2026-B">Batch 2026-B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Initial Launch Status</label>
                <Select value={newStatus} onValueChange={(val) => setNewStatus((val as any) || "scheduled")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled (Starts at set time)</SelectItem>
                    <SelectItem value="live">Live Now (Immediate student access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration (Minutes)</label>
                <Input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Maximum Marks</label>
                <Input
                  type="number"
                  value={newMaxMarks}
                  onChange={(e) => setNewMaxMarks(Number(e.target.value))}
                  required
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
                <Sparkles className="h-4 w-4" /> Schedule Exam Now
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {role === "admin" ? "Proctored Examination & Assessment Manager" : "Assessment & Test Creator"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Schedule live proctored tests, configure 12 camera security rules, and inspect cohort submissions
          </p>
        </div>

        <Button
          onClick={() => setViewState("create")}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20"
        >
          <Plus className="h-4 w-4" /> Schedule New Proctored Exam
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search exam title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger className="h-[44px] text-xs w-[180px] bg-[#F9FAFB] dark:bg-[#09090B]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="live">Live Now</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Exams Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Assessment Title</th>
                <th className="p-4">Assigned Cohort</th>
                <th className="p-4">Duration & Marks</th>
                <th className="p-4">Proctoring Security</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                  <td className="p-4 pl-6 space-y-0.5">
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{t.title}</p>
                    <p className="text-[11px] text-[#6B7280]">{t.submissionsCount} of {t.totalEnrolled} Submissions Received</p>
                  </td>

                  <td className="p-4">
                    <Badge variant="outline" className="text-xs font-bold border-[#2563EB]/30 text-[#2563EB]">
                      {t.batch}
                    </Badge>
                  </td>

                  <td className="p-4 text-xs font-medium text-[#6B7280]">
                    <span>{t.duration} mins • {t.totalQuestions} Questions ({t.maxMarks} Marks)</span>
                  </td>

                  <td className="p-4">
                    <Badge className="bg-[#9333EA] text-white text-[10px] font-bold gap-1">
                      <ShieldCheck className="h-3 w-3" /> {t.proctoringFlags.length} Security Controls
                    </Badge>
                  </td>

                  <td className="p-4">
                    <Badge
                      className={`text-[10px] font-bold uppercase ${
                        t.status === "live"
                          ? "bg-[#16A34A] text-white"
                          : t.status === "scheduled"
                          ? "bg-[#2563EB] text-white"
                          : "bg-[#6B7280] text-white"
                      }`}
                    >
                      {t.status}
                    </Badge>
                  </td>

                  <td className="p-4 pr-6 text-right space-x-2">
                    <Link href={`/student/tests/${t.id}`}>
                      <Button size="sm" className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1">
                        <Play className="h-3.5 w-3.5" /> Inspect Live Test
                      </Button>
                    </Link>

                    <Button
                      onClick={() => handleDeleteTest(t.id, t.title)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#DC2626]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
