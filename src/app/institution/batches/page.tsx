"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/layouts/page-header";
import { getInitials } from "@/lib/utils";

interface BatchItem {
  id: string;
  name: string;
  code: string;
  trainerName: string;
  startDate: string;
  studentCount: number;
  status: string;
  course?: string;
  collegeName?: string;
}

interface StudentPerformanceRow {
  studentId: string;
  employeeId: string;
  studentName: string;
  email: string;
  status: string;
  overall: number | null;
  learning: number | null;
  skillLab: number | null;
  codeLab: number | null;
  assess: number | null;
  progress: number | null;
  attendanceRate: number | null;
  activeTimeFormatted: string;
  accountStatus: string;
  lastActivity: string;
}

interface StudentDetailedView {
  studentId: string;
  employeeId: string;
  studentName: string;
  email: string;
  batchId: string;
  batchName: string;
  joinedDate: string;
  accountStatus: string;
  overall: number | null;
  overallStatus: "Excellent" | "Good" | "Average" | "Needs Attention" | "Inactive";
  learning: number | null;
  skillLab: number | null;
  codeLab: number | null;
  assess: number | null;
  attendance: {
    attendedCount: number;
    totalClasses: number;
    rate: number | null;
  };
  activity: {
    activeTimeSeconds: number;
    activeTimeFormatted: string;
    lastActivity: string;
  };
  courses: {
    id: string;
    title: string;
    progress: number;
    status: string;
  }[];
  recentAssessments: {
    id: string;
    title: string;
    score: number;
    totalMarks: number;
    percentage: number;
    submittedAt: string;
  }[];
  recentCoding: {
    id: string;
    problemId: string;
    language: string;
    status: string;
    passedTestCases: number;
    totalTestCases: number;
    submittedAt: string;
  }[];
}

export default function InstitutionBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State: View Batch Students
  const [viewingBatch, setViewingBatch] = useState<BatchItem | null>(null);
  const [batchStudents, setBatchStudents] = useState<StudentPerformanceRow[]>([]);
  const [isLoadingBatchStudents, setIsLoadingBatchStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Slide-over Sheet: Individual Student Deep-Dive
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailedStudent, setDetailedStudent] = useState<StudentDetailedView | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // 1. Fetch assigned batches
  const fetchBatches = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/institution/batches");
      if (!res.ok) {
        throw new Error("Unable to load assigned batches");
      }
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (err: any) {
      console.error("Institution Batches API Error:", err);
      setErrorMsg(err.message || "Failed to load assigned batches");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // 2. Fetch students inside batch for the modal roster
  const handleOpenViewingBatch = async (batch: BatchItem) => {
    setViewingBatch(batch);
    setStudentSearch("");
    setIsLoadingBatchStudents(true);
    try {
      const res = await fetch(`/api/institution/batches/${batch.id}/performance`);
      if (res.ok) {
        const data = await res.json();
        setBatchStudents(data.students || []);
      } else {
        setBatchStudents([]);
      }
    } catch {
      setBatchStudents([]);
    } finally {
      setIsLoadingBatchStudents(false);
    }
  };

  // 3. Inspect individual student details
  const handleInspectStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/institution/students/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedStudent(data.student || null);
      } else {
        setDetailedStudent(null);
      }
    } catch {
      setDetailedStudent(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // 4. Computed stats & filters
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => (b.status || "active").toLowerCase() === "active").length;
  const totalStudents = batches.reduce((acc, b) => acc + (b.studentCount || 0), 0);
  const uniqueTrainers = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.trainerName && b.trainerName !== "Unassigned") set.add(b.trainerName);
    });
    return set.size;
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchSearch =
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        b.trainerName.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (b.status || "active").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [batches, search, statusFilter]);

  const filteredBatchStudents = useMemo(() => {
    if (!studentSearch) return batchStudents;
    const q = studentSearch.toLowerCase();
    return batchStudents.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q)
    );
  }, [batchStudents, studentSearch]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Excellent":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Good":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "Average":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Needs Attention":
      case "Inactive":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Page Header */}
      <PageHeader
        title="Assigned Batches"
        actions={
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBatches}
              disabled={isLoading}
              className="h-[40px] px-4 text-xs font-semibold rounded-xl border-border hover:bg-accent"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        }
      />

      {/* 2. Key Metrics Overview Cards (Clean MNC Corporate Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Batches</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">{totalBatches}</span>
            <span className="text-xs text-muted-foreground font-medium">Assigned</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Cohorts</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{activeBatches}</span>
            <span className="text-xs text-muted-foreground font-medium">In Session</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled Learners</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">{totalStudents}</span>
            <span className="text-xs text-muted-foreground font-medium">Students</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Trainers</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono tracking-tight">{uniqueTrainers}</span>
            <span className="text-xs text-muted-foreground font-medium">Educators</span>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filters Bar */}
      <Card className="bg-card border border-border p-4 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-96">
            <Input
              placeholder="Search by cohort name, code, trainer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[44px] text-sm bg-background border-border rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-[44px] text-xs font-medium w-[140px] rounded-xl bg-background">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="h-[44px] text-xs font-semibold text-destructive hover:bg-destructive/10 px-3 rounded-xl"
              >
                Reset Filters
              </Button>
            )}
            <Badge variant="outline" className="hidden sm:inline-flex bg-muted/50 text-muted-foreground font-mono text-[11px] px-2.5 py-1">
              {filteredBatches.length} {filteredBatches.length === 1 ? "Cohort" : "Cohorts"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 4. Main Batch Layout (Grid Cards or Table) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-accent/40 rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      ) : errorMsg ? (
        <Card className="bg-card border border-border p-12 text-center rounded-2xl shadow-xs">
          <h3 className="text-sm font-bold text-foreground">Failed to Load Batches</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={fetchBatches} className="mt-4 rounded-xl text-xs font-semibold">
            Try Again
          </Button>
        </Card>
      ) : filteredBatches.length === 0 ? (
        <Card className="bg-card border border-border p-12 text-center rounded-2xl shadow-xs">
          <h3 className="text-base font-bold text-foreground">
            {batches.length === 0 ? "No Batches Assigned Yet" : "No Matching Cohorts Found"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5 leading-relaxed">
            {batches.length === 0
              ? "Your institution does not have any assigned cohorts in the system yet. Batches created by LMS administrators tagged to your institution will automatically appear here."
              : "No cohorts matched your current search filters. Try adjusting your query or resetting status filters."}
          </p>
          {batches.length === 0 ? (
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBatches}
                className="rounded-xl text-xs font-semibold h-10 px-4"
              >
                Check For Updates
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 rounded-xl text-xs font-semibold h-10 px-4"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        /* ================= COMPACT TABLE VIEW ================= */
        <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Cohort / Code</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Trainer</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4 text-center">Enrolled</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBatches.map((b) => {
                  const isActive = (b.status || "active").toLowerCase() === "active";
                  return (
                    <tr key={b.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                            {b.name}
                          </p>
                          <Badge variant="outline" className="font-mono text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5">
                            {b.code}
                          </Badge>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-[10px]"
                              : "bg-muted text-muted-foreground border-border text-[10px]"
                          }
                        >
                          {isActive ? "Active Cohort" : b.status}
                        </Badge>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 rounded-full border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {getInitials(b.trainerName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{b.trainerName}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-muted-foreground">
                        {b.startDate}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Badge variant="secondary" className="font-mono font-bold text-xs px-2.5 py-0.5">
                          {b.studentCount}
                        </Badge>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenViewingBatch(b)}
                            className="h-8 text-xs font-semibold rounded-lg"
                          >
                            Students
                          </Button>
                          <Link href={`/institution/performance?batchId=${b.id}`}>
                            <Button
                              size="sm"
                              className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                            >
                              Analytics
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW ENROLLED STUDENTS IN COHORT (Exact Admin/Trainer Feature) */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
        <DialogContent className="max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {viewingBatch ? `Enrolled Students — ${viewingBatch.name}` : "Enrolled Students"}
            </DialogTitle>
          </DialogHeader>

          {/* Search Box */}
          <div>
            <Input
              placeholder="Search by student name, email, or ID..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="h-[44px] text-xs bg-background rounded-xl border-border"
            />
          </div>

          {/* Student Roster List */}
          {isLoadingBatchStudents ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-accent/40 rounded-xl border border-border animate-pulse" />
              ))}
            </div>
          ) : filteredBatchStudents.length === 0 ? (
            <div className="p-10 text-center bg-background border border-dashed border-border rounded-2xl space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {studentSearch ? "No matching students found" : "No Students Enrolled in this Cohort"}
              </p>
              <p className="text-xs text-muted-foreground">
                {studentSearch ? "Try adjusting your search query." : "Learners allocated to this batch will automatically appear here."}
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto border border-border rounded-2xl divide-y divide-border">
              {filteredBatchStudents.map((std) => (
                <div
                  key={std.studentId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {getInitials(std.studentName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{std.studentName}</p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(
                            std.status
                          )}`}
                        >
                          {std.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{std.email}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        ID: {std.employeeId} • Overall: {std.overall !== null ? `${std.overall}%` : "—"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInspectStudent(std.studentId)}
                    className="h-8 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl border-primary/20 self-start sm:self-auto"
                  >
                    Inspect Dossier
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-mono">
              Total: {filteredBatchStudents.length} {filteredBatchStudents.length === 1 ? "Learner" : "Learners"}
            </span>
            <Button
              variant="outline"
              onClick={() => setViewingBatch(null)}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SLIDE-OVER DOSSIER SHEET (Individual Learner Evaluation) */}
      {/* ========================================================================= */}
      <Sheet open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-l border-border p-6 overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-border space-y-1">
            <SheetTitle className="text-base font-bold text-foreground tracking-tight">
              Learner Performance Dossier
            </SheetTitle>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">Loading learner telemetry...</p>
            </div>
          ) : detailedStudent ? (
            <div className="space-y-6 pt-5 text-xs">
              {/* Profile Card */}
              <Card className="bg-background border-border rounded-xl p-4 shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(detailedStudent.studentName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{detailedStudent.studentName}</h4>
                      <p className="text-muted-foreground text-[11px]">{detailedStudent.email}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5 font-mono">
                        ID: {detailedStudent.employeeId} • Cohort: {detailedStudent.batchName}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`font-semibold text-[10px] ${getStatusBadgeClass(detailedStudent.overallStatus)}`}
                  >
                    {detailedStudent.overallStatus}
                  </Badge>
                </div>
              </Card>

              {/* 4 Core Competency Scores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-background border border-border rounded-xl p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Learning</span>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    {detailedStudent.learning !== null ? `${detailedStudent.learning}%` : "—"}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-xl p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Skill Lab</span>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    {detailedStudent.skillLab !== null ? `${detailedStudent.skillLab}%` : "—"}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-xl p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Code Lab</span>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    {detailedStudent.codeLab !== null ? `${detailedStudent.codeLab}%` : "—"}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-xl p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Assess</span>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    {detailedStudent.assess !== null ? `${detailedStudent.assess}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Attendance & Engagement */}
              <Card className="bg-background border-border rounded-xl p-4 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Attendance & Activity Telemetry
                </span>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-muted-foreground text-[11px]">Live Class Attendance</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {detailedStudent.attendance.rate !== null ? `${detailedStudent.attendance.rate}%` : "—"}{" "}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({detailedStudent.attendance.attendedCount}/{detailedStudent.attendance.totalClasses} sessions)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[11px]">Active Portal Time</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {detailedStudent.activity.activeTimeFormatted || "—"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Enrolled Courses */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Course Curricula Progress
                </span>
                {detailedStudent.courses.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px]">No enrolled courses found.</p>
                ) : (
                  <div className="space-y-2">
                    {detailedStudent.courses.map((c) => (
                      <div key={c.id} className="bg-background border border-border rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground text-xs">{c.title}</p>
                          <span className="font-mono font-bold text-[11px] text-primary">{c.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Assessments */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Recent Formal Assessments
                </span>
                {!detailedStudent.recentAssessments || detailedStudent.recentAssessments.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px]">No assessment submissions found.</p>
                ) : (
                  <div className="space-y-2">
                    {detailedStudent.recentAssessments.map((a) => (
                      <div key={a.id} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-xs">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">{a.submittedAt || "Submitted"}</p>
                        </div>
                        <Badge variant="secondary" className="font-mono font-bold text-xs">
                          {a.score ?? 0}/{a.totalMarks ?? 100} ({a.percentage ?? 0}%)
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
