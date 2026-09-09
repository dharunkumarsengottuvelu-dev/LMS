"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layouts/page-header";

interface BatchItem {
  id: string;
  name: string;
  code: string;
}

interface ReportRecord {
  studentId: string;
  employeeId: string;
  studentName: string;
  email: string;
  batchCode: string;
  batchName: string;
  learning: number | null;
  skillLab: number | null;
  codeLab: number | null;
  assess: number | null;
  overall: number | null;
  progress: number | null;
  status: string;
  accountStatus: string;
  lastActivity: string;
}

export default function InstitutionReportsPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [institutionName, setInstitutionName] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch batches list
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch("/api/institution/batches");
        if (res.ok) {
          const d = await res.json();
          setBatches(d.batches || []);
        }
      } catch (err) {
        console.error("Failed to load batches:", err);
      }
    }
    loadBatches();
  }, []);

  // Fetch report data
  const fetchReport = useCallback(async (batchId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = `/api/institution/reports?batchId=${batchId}&format=json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Unable to generate report data. Please try again.");
      }
      const data = await res.json();
      setRecords(data.records || []);
      setInstitutionName(data.institution || "Partner Institution");
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to generate report data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedBatchId);
  }, [selectedBatchId, fetchReport]);

  const handleExportCsv = () => {
    setIsExporting(true);
    const downloadUrl = `/api/institution/reports?batchId=${selectedBatchId}&format=csv`;
    window.location.href = downloadUrl;
    setTimeout(() => setIsExporting(false), 1500);
  };

  const renderMetric = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return `${val}%`;
  };

  // Metrics
  const avgOverall = useMemo(() => {
    const scores = records.map((r) => r.overall).filter((s): s is number => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [records]);

  const passCount = useMemo(() => {
    return records.filter((r) => (r.overall || 0) >= 60).length;
  }, [records]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <PageHeader
        title="Academic Performance Reports"
        actions={
          <Button
            onClick={handleExportCsv}
            disabled={isLoading || isExporting || records.length === 0}
            size="sm"
            className="h-10 px-5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all"
          >
            {isExporting ? "Generating..." : "Export as CSV"}
          </Button>
        }
      />

      {/* 4 Summary Cards (Clean MNC Enterprise Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Records</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">{records.length}</span>
            <span className="text-xs text-muted-foreground font-medium">Audited students</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cohort Benchmark</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">
              {avgOverall !== null ? `${avgOverall}%` : "—"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">Overall average</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passing Rate</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {records.length > 0 ? `${Math.round((passCount / records.length) * 100)}%` : "—"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{passCount} students above 60%</span>
          </div>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Cohorts</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">
              {selectedBatchId === "all" ? batches.length : 1}
            </span>
            <span className="text-xs text-muted-foreground font-medium">Selected scope</span>
          </div>
        </Card>
      </div>

      {/* Cohort Selector Card */}
      <Card className="bg-card border border-border rounded-2xl shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
              Filter By Cohort:
            </span>
            <div className="w-72">
              <Select value={selectedBatchId} onValueChange={(val) => setSelectedBatchId(val || "all")}>
                <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-border bg-background">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border rounded-xl">
                  <SelectItem value="all">All Assigned Batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Badge variant="outline" className="self-start sm:self-auto font-mono text-xs text-muted-foreground px-3 py-1">
            {records.length} {records.length === 1 ? "Record" : "Records"}
          </Badge>
        </CardContent>
      </Card>

      {/* Report Data Preview Table */}
      {isLoading ? (
        <Card className="bg-card border border-border rounded-2xl p-6 shadow-xs">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-accent/40 rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        </Card>
      ) : errorMsg ? (
        <Card className="bg-card border border-border rounded-2xl p-12 text-center shadow-xs">
          <h3 className="text-sm font-bold text-foreground">Failed to Generate Report</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{errorMsg}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReport(selectedBatchId)}
            className="mt-4 rounded-xl text-xs font-semibold"
          >
            Retry
          </Button>
        </Card>
      ) : records.length === 0 ? (
        <Card className="bg-card border border-border rounded-2xl p-16 text-center shadow-xs">
          <h3 className="text-base font-bold text-foreground">No Performance Records Available</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1.5">
            There are no student evaluation records available for the selected cohort filter.
          </p>
        </Card>
      ) : (
        <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Student ID</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Cohort</th>
                  <th className="py-3.5 px-4 text-center">Learning</th>
                  <th className="py-3.5 px-4 text-center">Skill Lab</th>
                  <th className="py-3.5 px-4 text-center">Code Lab</th>
                  <th className="py-3.5 px-4 text-center">Assess</th>
                  <th className="py-3.5 px-4 text-center">Overall</th>
                  <th className="py-3.5 px-4 text-center">Progress</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.studentId} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-foreground">
                      {r.employeeId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-foreground">{r.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{r.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="font-mono text-[10px] bg-muted/50 text-muted-foreground">
                        {r.batchCode}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{renderMetric(r.learning)}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{renderMetric(r.skillLab)}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{renderMetric(r.codeLab)}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{renderMetric(r.assess)}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                      {renderMetric(r.overall)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{renderMetric(r.progress)}</td>
                    <td className="py-3.5 px-5 text-right">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          r.status === "Excellent"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : r.status === "Good"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            : r.status === "Average"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
