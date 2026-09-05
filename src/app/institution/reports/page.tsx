"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    if (val === null || val === undefined) return "N/A";
    return `${val}%`;
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Academic Performance Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative institutional audits, competency compliance summaries, and exportable grade books.
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          disabled={isLoading || isExporting || records.length === 0}
          size="sm"
          className="text-xs font-semibold shrink-0"
        >
          {isExporting ? "Generating CSV..." : "Export as CSV"}
        </Button>
      </div>

      {/* Filter Strip */}
      <div className="flex items-center gap-3">
        <label htmlFor="batch-filter" className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          Cohort Filter:
        </label>
        <select
          id="batch-filter"
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="h-9 px-3 rounded-md bg-background border border-input text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Assigned Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground font-mono ml-auto">
          {records.length} {records.length === 1 ? "Record" : "Records"}
        </span>
      </div>

      {/* Report Data Preview Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-accent/40 rounded-lg border border-border animate-pulse" />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-sm font-semibold text-destructive">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={() => fetchReport(selectedBatchId)}>
            Retry
          </Button>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center space-y-2">
          <p className="text-sm font-bold text-foreground">No performance data available</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            There are no student evaluation records available for the selected cohort filter in the database.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4 text-center">Learning</th>
                  <th className="py-3 px-4 text-center">Skill Lab</th>
                  <th className="py-3 px-4 text-center">Code Lab</th>
                  <th className="py-3 px-4 text-center">Assess</th>
                  <th className="py-3 px-4 text-center">Overall</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.studentId} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {r.employeeId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {r.studentName}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {r.batchCode}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {renderMetric(r.learning)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {renderMetric(r.skillLab)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {renderMetric(r.codeLab)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {renderMetric(r.assess)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {renderMetric(r.overall)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-border bg-muted text-muted-foreground">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
