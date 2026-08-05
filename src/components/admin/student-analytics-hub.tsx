"use client";

import React, { useState } from "react";
import {
  Users, Search, Plus, UserCheck, Shield, Trash2, Edit, Eye, Filter,
  Award, AlertTriangle, CheckCircle2, FileText, Code2, Clock, ShieldAlert,
  GraduationCap, ArrowUpRight, BarChart3, Lock, ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  batch: string;
  role: "student" | "trainer" | "admin";
  status: "active" | "suspended" | "flagged";
  avgScore: number;
  mcqAccuracy: number;
  codingAccuracy: number;
  proctoringCompliance: number;
  violationCount: number;
  joinedDate: string;
  testsTaken: {
    testId: string;
    testTitle: string;
    score: number;
    completedAt: string;
    violations: number;
  }[];
  proctoringLogs: {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    browser: string;
  }[];
}

const mockStudentsList: StudentRecord[] = [
  {
    id: "std_101",
    name: "Dharunkumar Sengottuvelu",
    email: "dharunkumarsengottuvelu@gmail.com",
    batch: "Batch 2026-A",
    role: "student",
    status: "active",
    avgScore: 92,
    mcqAccuracy: 95,
    codingAccuracy: 89,
    proctoringCompliance: 100,
    violationCount: 0,
    joinedDate: "2026-08-01",
    testsTaken: [
      { testId: "t1", testTitle: "Mid-Term Proctored Evaluation", score: 92, completedAt: "2026-08-05 14:30", violations: 0 },
      { testId: "t2", testTitle: "React 19 & Next.js 16 Assessment", score: 95, completedAt: "2026-08-03 11:15", violations: 0 },
      { testId: "t3", testTitle: "PostgreSQL & Supabase Architecture", score: 89, completedAt: "2026-08-02 16:45", violations: 0 },
    ],
    proctoringLogs: [],
  },
  {
    id: "std_102",
    name: "Alex Rivera",
    email: "alex.rivera@techcorp.com",
    batch: "Batch 2026-A",
    role: "student",
    status: "active",
    avgScore: 84,
    mcqAccuracy: 88,
    codingAccuracy: 80,
    proctoringCompliance: 95,
    violationCount: 1,
    joinedDate: "2026-07-15",
    testsTaken: [
      { testId: "t1", testTitle: "Mid-Term Proctored Evaluation", score: 84, completedAt: "2026-08-05 15:10", violations: 1 },
      { testId: "t2", testTitle: "React 19 & Next.js 16 Assessment", score: 84, completedAt: "2026-08-03 10:20", violations: 0 },
    ],
    proctoringLogs: [
      { id: "log_1", type: "WINDOW_SWITCH", message: "Browser window lost focus or was minimized", timestamp: "2026-08-05 15:14:02", browser: "Chrome 126.0 (Windows 11)" },
    ],
  },
  {
    id: "std_103",
    name: "Sarah Chen",
    email: "sarah.chen@techcorp.com",
    batch: "Batch 2026-B",
    role: "student",
    status: "active",
    avgScore: 96,
    mcqAccuracy: 98,
    codingAccuracy: 94,
    proctoringCompliance: 100,
    violationCount: 0,
    joinedDate: "2026-07-20",
    testsTaken: [
      { testId: "t1", testTitle: "Mid-Term Proctored Evaluation", score: 96, completedAt: "2026-08-05 12:00", violations: 0 },
    ],
    proctoringLogs: [],
  },
  {
    id: "std_104",
    name: "Michael Chang",
    email: "m.chang@enterprise.com",
    batch: "Batch 2026-B",
    role: "student",
    status: "flagged",
    avgScore: 68,
    mcqAccuracy: 70,
    codingAccuracy: 65,
    proctoringCompliance: 65,
    violationCount: 3,
    joinedDate: "2026-08-04",
    testsTaken: [
      { testId: "t1", testTitle: "Mid-Term Proctored Evaluation", score: 68, completedAt: "2026-08-05 16:20", violations: 3 },
    ],
    proctoringLogs: [
      { id: "log_2", type: "TAB_SWITCH", message: "Forbidden tab switch detected", timestamp: "2026-08-05 16:22:15", browser: "Edge 126.0 (Windows 11)" },
      { id: "log_3", type: "LOOKING_AWAY", message: "Gaze warning: Head turned away from screen", timestamp: "2026-08-05 16:25:30", browser: "Edge 126.0 (Windows 11)" },
      { id: "log_4", type: "FULLSCREEN_EXIT", message: "Fullscreen mode exited", timestamp: "2026-08-05 16:28:10", browser: "Edge 126.0 (Windows 11)" },
    ],
  },
];

interface HubProps {
  portalRole?: "admin" | "trainer";
}

export function StudentAnalyticsHub({ portalRole = "admin" }: HubProps) {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRecord[]>(mockStudentsList);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Student Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // New Student Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentBatch, setNewStudentBatch] = useState("Batch 2026-A");

  // Filter Logic
  const filteredStudents = students.filter((std) => {
    const matchesSearch =
      std.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      std.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBatch = batchFilter === "all" || std.batch === batchFilter;
    const matchesStatus = statusFilter === "all" || std.status === statusFilter;
    return matchesSearch && matchesBatch && matchesStatus;
  });

  const handleOpenAnalytics = (student: StudentRecord) => {
    setSelectedStudent(student);
    setIsAnalyticsModalOpen(true);
  };

  const handleToggleStatus = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const nextStatus = s.status === "active" ? "suspended" : "active";
          toast({
            title: "Student Status Updated",
            description: `${s.name} status changed to ${nextStatus.toUpperCase()}`,
          });
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail) return;

    const newRecord: StudentRecord = {
      id: `std_${Date.now()}`,
      name: newStudentName,
      email: newStudentEmail,
      batch: newStudentBatch,
      role: "student",
      status: "active",
      avgScore: 0,
      mcqAccuracy: 0,
      codingAccuracy: 0,
      proctoringCompliance: 100,
      violationCount: 0,
      joinedDate: new Date().toISOString().split("T")[0] || "2026-08-05",
      testsTaken: [],
      proctoringLogs: [],
    };

    setStudents((prev) => [newRecord, ...prev]);
    setIsEnrollModalOpen(false);
    setNewStudentName("");
    setNewStudentEmail("");
    toast({
      title: "Student Enrolled Successfully",
      description: `${newStudentName} enrolled in ${newStudentBatch}.`,
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Metrics Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            {portalRole === "admin" ? "Enterprise Student Performance & Proctoring Hub" : "Cohort Performance & Proctoring Analytics"}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Real-time individual performance metrics, proctoring security logs, MCQ/Coding accuracy, and cohort management
          </p>
        </div>

        <Button
          onClick={() => setIsEnrollModalOpen(true)}
          className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0"
        >
          <Plus className="h-4 w-4" /> Enroll New Student
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Total Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">{students.length}</span>
            <span className="text-xs text-[#16A34A] font-semibold ml-2">100% Active Cohort</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Average Test Score</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">88.5%</span>
            <span className="text-xs text-[#16A34A] font-semibold ml-2">+4.2% vs last week</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctoring Compliance</span>
            <div className="w-8 h-8 rounded-lg bg-[#9333EA]/10 text-[#9333EA] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">96.8%</span>
            <span className="text-xs text-[#16A34A] font-semibold ml-2">High Trust Rating</span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctoring Flagged Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              {students.filter((s) => s.status === "flagged").length}
            </span>
            <span className="text-xs text-[#DC2626] font-semibold ml-2">Requires Review</span>
          </div>
        </Card>
      </div>

      {/* Interactive Controls & Filters */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search student name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={batchFilter} onValueChange={(val) => setBatchFilter(val || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="Batch 2026-A">Batch 2026-A</SelectItem>
                <SelectItem value="Batch 2026-B">Batch 2026-B</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[150px] bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Student Performance Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Student Details</th>
                <th className="p-4">Assigned Cohort</th>
                <th className="p-4">Average Score</th>
                <th className="p-4">Proctoring Status</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 pr-6 text-right">Individual Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filteredStudents.map((std) => (
                <tr key={std.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-[#E5E7EB] dark:border-[#27272A]">
                      <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs">
                        {std.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{std.name}</p>
                      <p className="text-[11px] text-[#6B7280]">{std.email}</p>
                    </div>
                  </td>

                  <td className="p-4">
                    <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                      {std.batch}
                    </Badge>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#111827] dark:text-[#FAFAFA]">{std.avgScore}%</span>
                      <div className="w-20 bg-[#E5E7EB] dark:bg-[#27272A] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${std.avgScore}%` }} />
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    {std.violationCount === 0 ? (
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-bold gap-1">
                        <ShieldCheck className="h-3 w-3" /> Clean Record (0 Logs)
                      </Badge>
                    ) : std.violationCount < 3 ? (
                      <Badge className="bg-[#F59E0B] text-white text-[10px] font-bold gap-1">
                        <AlertTriangle className="h-3 w-3" /> {std.violationCount} Warnings Logged
                      </Badge>
                    ) : (
                      <Badge className="bg-[#DC2626] text-white text-[10px] font-bold gap-1">
                        <ShieldAlert className="h-3 w-3" /> Flagged ({std.violationCount} Violations)
                      </Badge>
                    )}
                  </td>

                  <td className="p-4">
                    <Badge
                      className={`text-[10px] font-bold capitalize ${
                        std.status === "active"
                          ? "bg-[#16A34A] text-white"
                          : std.status === "flagged"
                          ? "bg-[#DC2626] text-white"
                          : "bg-[#6B7280] text-white"
                      }`}
                    >
                      {std.status}
                    </Badge>
                  </td>

                  <td className="p-4 pr-6 text-right space-x-2">
                    <Button
                      onClick={() => handleOpenAnalytics(std)}
                      size="sm"
                      className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1 px-3"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Performance
                    </Button>
                    <Button
                      onClick={() => handleToggleStatus(std.id)}
                      variant="outline"
                      size="sm"
                      className={`h-8 text-xs font-bold ${
                        std.status === "active" ? "text-[#DC2626] border-[#DC2626]" : "text-[#16A34A] border-[#16A34A]"
                      }`}
                    >
                      {std.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* INDIVIDUAL STUDENT PERFORMANCE ANALYTICS MODAL */}
      <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-6 rounded-2xl shadow-2xl">
          {selectedStudent && (
            <>
              <DialogHeader className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-[#2563EB]">
                    <AvatarFallback className="bg-[#2563EB] text-white font-bold text-base">
                      {selectedStudent.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">
                      {selectedStudent.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#6B7280]">
                      {selectedStudent.email} • {selectedStudent.batch} • Joined: {selectedStudent.joinedDate}
                    </DialogDescription>
                  </div>
                </div>

                <Badge
                  className={`text-xs font-bold capitalize px-3 py-1 ${
                    selectedStudent.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#DC2626] text-white"
                  }`}
                >
                  {selectedStudent.status}
                </Badge>
              </DialogHeader>

              {/* Performance Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-center space-y-1">
                  <span className="text-xs text-[#6B7280]">Overall Average Score</span>
                  <p className="text-2xl font-bold text-[#2563EB]">{selectedStudent.avgScore}%</p>
                </div>
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-center space-y-1">
                  <span className="text-xs text-[#6B7280]">MCQ Choice Accuracy</span>
                  <p className="text-2xl font-bold text-[#16A34A]">{selectedStudent.mcqAccuracy}%</p>
                </div>
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-center space-y-1">
                  <span className="text-xs text-[#6B7280]">Coding Problem Rate</span>
                  <p className="text-2xl font-bold text-[#9333EA]">{selectedStudent.codingAccuracy}%</p>
                </div>
              </div>

              {/* Tabs for Test History vs Proctoring Security Logs */}
              <Tabs defaultValue="tests" className="w-full space-y-4">
                <TabsList className="bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] p-1 rounded-xl">
                  <TabsTrigger value="tests" className="text-xs font-bold px-4 py-2">
                    Evaluations & Tests ({selectedStudent.testsTaken.length})
                  </TabsTrigger>
                  <TabsTrigger value="proctoring" className="text-xs font-bold px-4 py-2">
                    Proctoring Security Logs ({selectedStudent.proctoringLogs.length})
                  </TabsTrigger>
                </TabsList>

                {/* Test Evaluation History */}
                <TabsContent value="tests" className="space-y-3">
                  {selectedStudent.testsTaken.length === 0 ? (
                    <p className="text-xs text-[#6B7280] text-center py-6">No evaluation tests completed yet.</p>
                  ) : (
                    selectedStudent.testsTaken.map((t) => (
                      <div
                        key={t.testId}
                        className="p-4 bg-white dark:bg-[#18181B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{t.testTitle}</p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">Completed: {t.completedAt}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="font-bold text-sm text-[#16A34A]">{t.score}% Score</span>
                            <p className="text-[10px] text-[#6B7280]">{t.violations} Violations</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Proctoring Security Violation Logs */}
                <TabsContent value="proctoring" className="space-y-3">
                  {selectedStudent.proctoringLogs.length === 0 ? (
                    <div className="p-6 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl text-center space-y-1">
                      <CheckCircle2 className="h-6 w-6 text-[#16A34A] mx-auto" />
                      <p className="text-xs font-bold text-[#16A34A]">100% Clean Security Record</p>
                      <p className="text-[11px] text-[#6B7280]">No tab switching, window blur, or camera gaze violations recorded.</p>
                    </div>
                  ) : (
                    selectedStudent.proctoringLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#DC2626] text-white text-[9px] font-bold uppercase">{log.type}</Badge>
                            <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{log.message}</span>
                          </div>
                          <p className="text-[10px] text-[#6B7280]">Browser: {log.browser}</p>
                        </div>
                        <span className="font-mono text-[10px] text-[#6B7280]">{log.timestamp}</span>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          <DialogFooter className="pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button variant="outline" onClick={() => setIsAnalyticsModalOpen(false)} className="w-full font-bold">
              Close Analytics Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ENROLL NEW STUDENT MODAL */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-4 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Enroll New Learner</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Create a student profile and assign them to an active training cohort.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnrollStudent} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Student Full Name</label>
              <Input
                placeholder="e.g. Dharunkumar S"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                required
                className="h-[44px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Email Address (Any Domain)</label>
              <Input
                type="email"
                placeholder="e.g. dharunkumar@gmail.com"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                required
                className="h-[44px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assigned Cohort Batch</label>
              <Select value={newStudentBatch} onValueChange={(val) => setNewStudentBatch(val || "Batch 2026-A")}>
                <SelectTrigger className="h-[44px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Batch 2026-A">Batch 2026-A</SelectItem>
                  <SelectItem value="Batch 2026-B">Batch 2026-B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold">
                Enroll Student Now
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
