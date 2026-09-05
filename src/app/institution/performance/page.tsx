"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

  // Student Detail Drawer State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailedStudent, setDetailedStudent] = useState<StudentDetailedView | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 1. Fetch assigned batches on mount
  useEffect(() => {
    async function loadBatches() {
      setIsLoadingBatches(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/institution/batches");
        if (!res.ok) throw new Error("Unable to fetch batches");
        const data = await res.json();
        const batchList: BatchMeta[] = (data.batches || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          studentCount: b.studentCount,
        }));
        setBatches(batchList);

        if (batchList.length > 0) {
          if (initialBatchId && batchList.some((b) => b.id === initialBatchId)) {
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

  // 2. Fetch batch performance whenever selectedBatchId or searchQuery changes
  const fetchPerformance = useCallback(async (batchId: string, search: string) => {
    if (!batchId) return;
    setIsLoadingPerformance(true);
    setErrorMsg(null);
    try {
      const url = `/api/institution/batches/${batchId}/performance?search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Unable to load performance data");
      }
      const data = await res.json();
      setStudents(data.students || []);
      setCurrentBatch(data.batch || null);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to load performance data. Please try again.");
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
        throw new Error(err.error || "Unable to load student details");
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
      return <span className="text-muted-foreground font-medium">Data not available</span>;
    }
    return <span className="font-mono font-bold">{val}%</span>;
  };

  if (isLoadingBatches) {
    return (
      <div className="space-y-6 pt-4">
        <div className="h-8 w-64 bg-accent/60 rounded animate-pulse" />
        <div className="h-10 w-80 bg-accent/40 rounded animate-pulse" />
        <div className="h-64 bg-accent/30 rounded-lg border border-border animate-pulse" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-base font-bold text-foreground">No batches assigned</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          There are no batches allocated to your institution in the database. Please request LMS administrators to assign cohort batches.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
          Batch Performance Telemetry
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Authoritative academic scores across learning tracks, skill labs, coding assessments, and overall competencies.
        </p>
      </div>

      {/* Controls Strip: Batch Selector & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Batch Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="batch-select" className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Batch:
          </label>
          <select
            id="batch-select"
            value={selectedBatchId}
            onChange={(e) => handleBatchChange(e.target.value)}
            className="h-9 px-3 rounded-md bg-background border border-input text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name} ({b.studentCount} students)
              </option>
            ))}
          </select>
        </div>

        {/* Real Backend Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by Student ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs h-9"
          />
        </div>
      </div>

      {/* Performance Content */}
      {isLoadingPerformance ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-accent/40 rounded-lg border border-border animate-pulse" />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-sm font-semibold text-destructive">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={() => fetchPerformance(selectedBatchId, searchQuery)}>
            Retry
          </Button>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center space-y-2">
          <p className="text-sm font-bold text-foreground">
            {searchQuery ? "No matching students found" : "No students found"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "No students match your query in this batch."
              : "There are currently no students registered in this batch in the database."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Learning</th>
                  <th className="py-3 px-4 text-center">Skill Lab</th>
                  <th className="py-3 px-4 text-center">Code Lab</th>
                  <th className="py-3 px-4 text-center">Assess</th>
                  <th className="py-3 px-4 text-center">Overall</th>
                  <th className="py-3 px-4 text-center">Progress</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr
                    key={s.studentId}
                    className="hover:bg-accent/40 transition-colors cursor-pointer"
                    onClick={() => fetchStudentDetails(s.studentId)}
                  >
                    {/* Student ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {s.employeeId}
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="space-y-0.5">
                        <p>{s.studentName}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">{s.email}</p>
                      </div>
                    </td>

                    {/* Learning */}
                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.learning)}
                    </td>

                    {/* Skill Lab */}
                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.skillLab)}
                    </td>

                    {/* Code Lab */}
                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.codeLab)}
                    </td>

                    {/* Assess */}
                    <td className="py-3.5 px-4 text-center">
                      {renderMetric(s.assess)}
                    </td>

                    {/* Overall */}
                    <td className="py-3.5 px-4 text-center font-bold">
                      {renderMetric(s.overall)}
                    </td>

                    {/* Progress */}
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
                        <span className="text-muted-foreground">Data not available</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(
                          s.status
                        )}`}
                      >
                        {s.status}
                      </span>
                    </td>

                    {/* Details Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchStudentDetails(s.studentId);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Student Performance Detail Drawer */}
      <Sheet open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-l border-border p-6 overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-border space-y-1">
            <SheetTitle className="text-base font-bold text-foreground tracking-tight">
              Individual Performance Dossier
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Official evaluation metrics, attendance records, and assessment telemetry.
            </p>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">Loading performance data from database...</p>
            </div>
          ) : detailError ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-sm font-semibold text-destructive">{detailError}</p>
              <Button variant="outline" size="sm" onClick={() => selectedStudentId && fetchStudentDetails(selectedStudentId)}>
                Retry
              </Button>
            </div>
          ) : detailedStudent ? (
            <div className="space-y-6 pt-5 text-xs">
              {/* Identity Header */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">{detailedStudent.studentName}</h3>
                    <p className="text-muted-foreground">{detailedStudent.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(
                      detailedStudent.overallStatus
                    )}`}
                  >
                    {detailedStudent.overallStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Student ID: </span>
                    <span className="font-mono font-bold text-foreground">{detailedStudent.employeeId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Batch: </span>
                    <span className="font-semibold text-foreground">{detailedStudent.batchName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Joining Date: </span>
                    <span className="font-mono text-foreground">{detailedStudent.joinedDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account: </span>
                    <span className="font-bold text-foreground uppercase">{detailedStudent.accountStatus}</span>
                  </div>
                </div>
              </div>

              {/* Core Competencies Matrix */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Authoritative Performance Scores
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Overall */}
                  <div className="bg-card border border-border rounded-md p-3 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Overall</span>
                    <p className="text-lg font-black tracking-tight text-foreground font-mono">
                      {detailedStudent.overall !== null ? `${detailedStudent.overall}%` : "Data not available"}
                    </p>
                  </div>

                  {/* Learning */}
                  <div className="bg-card border border-border rounded-md p-3 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Learning</span>
                    <p className="text-lg font-black tracking-tight text-foreground font-mono">
                      {detailedStudent.learning !== null ? `${detailedStudent.learning}%` : "Data not available"}
                    </p>
                  </div>

                  {/* Skill Lab */}
                  <div className="bg-card border border-border rounded-md p-3 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Skill Lab</span>
                    <p className="text-lg font-black tracking-tight text-foreground font-mono">
                      {detailedStudent.skillLab !== null ? `${detailedStudent.skillLab}%` : "Data not available"}
                    </p>
                  </div>

                  {/* Code Lab */}
                  <div className="bg-card border border-border rounded-md p-3 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Code Lab</span>
                    <p className="text-lg font-black tracking-tight text-foreground font-mono">
                      {detailedStudent.codeLab !== null ? `${detailedStudent.codeLab}%` : "Data not available"}
                    </p>
                  </div>

                  {/* Assess */}
                  <div className="bg-card border border-border rounded-md p-3 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Assess</span>
                    <p className="text-lg font-black tracking-tight text-foreground font-mono">
                      {detailedStudent.assess !== null ? `${detailedStudent.assess}%` : "Data not available"}
                    </p>
                  </div>

                  {/* Attendance */}
                  <div className="bg-card border border-border rounded-md p-3 space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Attendance</span>
                    <p className="text-lg font-black tracking-tight text-foreground font-mono">
                      {detailedStudent.attendance.rate !== null ? `${detailedStudent.attendance.rate}%` : "Data not available"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Engagement & Activity Telemetry */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Activity Telemetry
                </h4>
                <div className="bg-card border border-border rounded-lg p-3 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Active Learning Time: </span>
                    <span className="font-bold text-foreground font-mono">
                      {detailedStudent.activity.activeTimeFormatted || "0m"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Telemetry Event: </span>
                    <span className="font-mono text-foreground">{detailedStudent.activity.lastActivity}</span>
                  </div>
                </div>
              </div>

              {/* Course Enrollments */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Enrolled Learning Tracks ({detailedStudent.courses.length})
                </h4>
                {detailedStudent.courses.length === 0 ? (
                  <p className="text-muted-foreground italic py-2">Data not available</p>
                ) : (
                  <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                    {detailedStudent.courses.map((c) => (
                      <div key={c.id} className="p-3 flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">{c.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold">{c.progress}%</span>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">({c.status})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Assessments */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Assessment Submissions ({detailedStudent.recentAssessments.length})
                </h4>
                {detailedStudent.recentAssessments.length === 0 ? (
                  <p className="text-muted-foreground italic py-2">Data not available</p>
                ) : (
                  <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                    {detailedStudent.recentAssessments.map((a) => (
                      <div key={a.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">{a.submittedAt}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold">{a.percentage}%</p>
                          <p className="text-[10px] text-muted-foreground">
                            {a.score} / {a.totalMarks} marks
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Coding */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Code Lab Submissions ({detailedStudent.recentCoding.length})
                </h4>
                {detailedStudent.recentCoding.length === 0 ? (
                  <p className="text-muted-foreground italic py-2">Data not available</p>
                ) : (
                  <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                    {detailedStudent.recentCoding.map((cs) => (
                      <div key={cs.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground font-mono">{cs.problemId}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {cs.language} · {cs.submittedAt}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              cs.status === "accepted" || cs.status === "passed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {cs.status}
                          </span>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {cs.passedTestCases}/{cs.totalTestCases} cases
                          </p>
                        </div>
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
