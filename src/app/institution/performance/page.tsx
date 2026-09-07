"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Layers,
  ChevronRight,
  UserCheck,
  Clock,
  BookOpen,
  Code2,
  FileCheck2,
  CheckCircle2,
  XCircle,
  BarChart2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/layouts/page-header";
import { getInitials } from "@/lib/utils";

interface BatchMeta {
  id: string;
  name: string;
  code: string;
  studentCount: number;
}

interface StudentPerformanceRow {
  studentId: string;
  employeeId: string;
  studentName: string;
  email: string;
  learning: number | null;
  skillLab: number | null;
  codeLab: number | null;
  assess: number | null;
  overall: number | null;
  progress: number | null;
  status: "Excellent" | "Good" | "Average" | "Needs Attention" | "Inactive";
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

export default function InstitutionPerformancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batchId");

  const [batches, setBatches] = useState<BatchMeta[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId || "");
  const [students, setStudents] = useState<StudentPerformanceRow[]>([]);
  const [currentBatch, setCurrentBatch] = useState<BatchMeta | null>(null);

  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Student details slide-over sheet
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailedStudent, setDetailedStudent] = useState<StudentDetailedView | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 1. Fetch available batches
  useEffect(() => {
    async function loadBatches() {
      setIsLoadingBatches(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/institution/batches");
        if (!res.ok) throw new Error("Unable to load assigned batches");
        const d = await res.json();
        const batchList = (d.batches || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          studentCount: b.studentCount,
        }));
        setBatches(batchList);

        if (batchList.length > 0) {
          if (initialBatchId && batchList.some((b: any) => b.id === initialBatchId)) {
            setSelectedBatchId(initialBatchId);
          } else {
            setSelectedBatchId(batchList[0]?.id || "");
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load batches");
      } finally {
        setIsLoadingBatches(false);
      }
    }
    loadBatches();
  }, [initialBatchId]);

  // 2. Fetch batch performance
  const fetchPerformance = useCallback(async (batchId: string, search: string) => {
    if (!batchId) return;
    setIsLoadingPerformance(true);
    setErrorMsg(null);
    try {
      const url = `/api/institution/batches/${batchId}/performance?search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Unable to load performance telemetry");
      }
      const data = await res.json();
      setStudents(data.students || []);
      setCurrentBatch(data.batch || null);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to load performance telemetry. Please try again.");
    } finally {
      setIsLoadingPerformance(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchPerformance(selectedBatchId, searchQuery);
    }
  }, [selectedBatchId, searchQuery, fetchPerformance]);

  // 3. Fetch detailed student record
  const fetchStudentDetails = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsLoadingDetails(true);
    setDetailError(null);
    setDetailedStudent(null);
    try {
      const res = await fetch(`/api/institution/students/${studentId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Unable to load student dossier");
      }
      const data = await res.json();
      setDetailedStudent(data.student || null);
    } catch (err: any) {
      setDetailError(err.message || "Unable to load student details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleBatchChange = (newBatchId: string) => {
    setSelectedBatchId(newBatchId);
    router.replace(`/institution/performance?batchId=${newBatchId}`, { scroll: false });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Excellent":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Good":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Average":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Needs Attention":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const renderMetric = (val: number | null) => {
    if (val === null || val === undefined) {
      return <span className="text-muted-foreground/60 italic font-mono text-[11px]">—</span>;
    }
    return <span className="font-mono font-bold">{val}%</span>;
  };

  // Aggregates for selected batch
  const batchAvg = useMemo(() => {
    const scores = students.map((s) => s.overall).filter((s): s is number => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [students]);

  const topScore = useMemo(() => {
    const scores = students.map((s) => s.overall).filter((s): s is number => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    return Math.max(...scores);
  }, [students]);

  const needsAttentionCount = useMemo(() => {
    return students.filter((s) => s.status === "Needs Attention").length;
  }, [students]);

  if (isLoadingBatches) {
    return (
      <div className="space-y-6 pt-2 animate-pulse">
        <div className="h-24 bg-card rounded-2xl border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card rounded-2xl border border-border" />
          ))}
        </div>
        <div className="h-72 bg-card rounded-2xl border border-border" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="space-y-8 animate-fade-up">
        <PageHeader
          title="Batch Performance Telemetry"
          description="Authoritative academic scores across learning tracks, skill labs, coding assessments, and overall competencies."
        />
        <Card className="bg-card border-border rounded-2xl p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Layers className="h-6 w-6 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Batches Assigned</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5 leading-relaxed">
            There are no cohorts allocated to your institution in the database yet. Once platform administrators assign batches to your institution, cohort analytics and individual student dossiers will populate here automatically.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <PageHeader
        title="Batch Performance Telemetry"
        description="Authoritative academic scores across learning tracks, skill labs, coding assessments, and overall competencies."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPerformance(selectedBatchId, searchQuery)}
            disabled={isLoadingPerformance}
            className="h-9 px-3.5 gap-2 text-xs font-semibold rounded-xl border-border hover:bg-accent"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoadingPerformance ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Cohort KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-card border-border rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cohort Learners</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mt-1 font-mono">{students.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled students</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cohort Average</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mt-1 font-mono">
                {batchAvg !== null ? `${batchAvg}%` : "—"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Composite benchmark</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Score</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-primary mt-1 font-mono">
                {topScore !== null ? `${topScore}%` : "—"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cohort high performer</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Needs Attention</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                {needsAttentionCount}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Below passing threshold</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Strip: Batch Selector & Search Bar */}
      <Card className="bg-card border-border rounded-2xl shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Batch Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
              Active Cohort:
            </span>
            <div className="w-72">
              <Select value={selectedBatchId} onValueChange={(val) => val && handleBatchChange(val)}>
                <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-border bg-background">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border rounded-xl">
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} — {b.name} ({b.studentCount} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID or student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-10 rounded-xl bg-background border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Content */}
      {isLoadingPerformance ? (
        <Card className="bg-card border-border rounded-2xl p-6 shadow-xs">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-accent/40 rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        </Card>
      ) : errorMsg ? (
        <Card className="bg-card border-border rounded-2xl p-12 text-center shadow-xs">
          <h3 className="text-sm font-bold text-foreground">Error Loading Performance Data</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{errorMsg}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPerformance(selectedBatchId, searchQuery)}
            className="mt-4 rounded-xl text-xs"
          >
            Retry
          </Button>
        </Card>
      ) : students.length === 0 ? (
        <Card className="bg-card border-border rounded-2xl p-16 text-center shadow-xs">
          <h3 className="text-sm font-bold text-foreground">
            {searchQuery ? "No Matching Students Found" : "No Registered Students"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery
              ? "No students in this cohort matched your search query."
              : "There are currently no students registered in this batch."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              Clear Search
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Student ID</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4 text-center">Learning</th>
                  <th className="py-3.5 px-4 text-center">Skill Lab</th>
                  <th className="py-3.5 px-4 text-center">Code Lab</th>
                  <th className="py-3.5 px-4 text-center">Assess</th>
                  <th className="py-3.5 px-4 text-center">Overall</th>
                  <th className="py-3.5 px-4 text-center">Progress</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr
                    key={s.studentId}
                    className="hover:bg-accent/40 transition-colors cursor-pointer"
                    onClick={() => fetchStudentDetails(s.studentId)}
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-foreground">
                      {s.employeeId}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 rounded-full border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {getInitials(s.studentName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{s.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.learning)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.skillLab)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.codeLab)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.assess)}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold">
                      {renderMetric(s.overall)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {s.progress !== null ? (
                        <div className="w-20 mx-auto space-y-1">
                          <span className="font-mono text-[11px] font-semibold">{s.progress}%</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, s.progress))}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(
                          s.status
                        )}`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchStudentDetails(s.studentId);
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/20 gap-1"
                      >
                        Inspect
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Individual Student Dossier Slide-Over Sheet */}
      <Sheet open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-l border-border p-6 overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-border space-y-1">
            <SheetTitle className="text-base font-bold text-foreground tracking-tight">
              Learner Performance Dossier
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Official evaluation metrics, attendance records, and assessment telemetry.
            </p>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">Loading learner telemetry...</p>
            </div>
          ) : detailError ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-sm font-semibold text-destructive">{detailError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedStudentId && fetchStudentDetails(selectedStudentId)}
                className="rounded-xl text-xs"
              >
                Retry
              </Button>
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
                        ID: {detailedStudent.employeeId} • Batch: {detailedStudent.batchName}
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
                    {renderMetric(detailedStudent.learning)}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-xl p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Skill Lab</span>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    {renderMetric(detailedStudent.skillLab)}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-xl p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Code Lab</span>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    {renderMetric(detailedStudent.codeLab)}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-xl p-3 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Assess</span>
                  <p className="text-lg font-bold text-foreground mt-1 font-mono">
                    {renderMetric(detailedStudent.assess)}
                  </p>
                </div>
              </div>

              {/* Attendance & Engagement */}
              <Card className="bg-background border-border rounded-xl p-4 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Attendance & Activity Telemetry
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
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> Course Curricula Progress
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
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-primary" /> Recent Formal Assessments
                </span>
                {detailedStudent.recentAssessments.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px]">No assessment submissions found.</p>
                ) : (
                  <div className="space-y-2">
                    {detailedStudent.recentAssessments.map((a) => (
                      <div key={a.id} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-xs">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">{a.submittedAt}</p>
                        </div>
                        <Badge variant="secondary" className="font-mono font-bold text-xs">
                          {a.score}/{a.totalMarks} ({a.percentage}%)
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
