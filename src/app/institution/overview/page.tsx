"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OverviewData {
  totalBatches: number;
  totalStudents: number;
  averagePerformance: number | null;
  activeLearnerRate: number | null;
  batches: {
    id: string;
    name: string;
    code: string;
    trainerName: string;
    startDate: string;
    studentCount: number;
    status: string;
  }[];
}

interface InstitutionProfile {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  college: string;
  isPlatformAdmin: boolean;
}

export default function InstitutionOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [institution, setInstitution] = useState<InstitutionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [overviewRes, meRes] = await Promise.all([
        fetch("/api/institution/overview"),
        fetch("/api/institution/me"),
      ]);

      if (!overviewRes.ok || !meRes.ok) {
        throw new Error("Unable to load performance data. Please try again.");
      }

      const ov = await overviewRes.json();
      const me = await meRes.json();

      setData(ov.overview || null);
      setInstitution(me.institution || null);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to load performance data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (isLoading) {
    return (
      <div className="space-y-6 pt-4">
        <div className="h-8 w-64 bg-accent/60 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-accent/40 rounded-lg border border-border animate-pulse p-4" />
          ))}
        </div>
        <div className="h-72 bg-accent/30 rounded-lg border border-border animate-pulse" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm font-semibold text-destructive">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={fetchOverview}>
          Retry
        </Button>
      </div>
    );
  }

  const batches = data?.batches || [];

  return (
    <div className="space-y-8 pt-2">
      {/* Executive Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {institution?.name || "Institution Performance Portal"}
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-mono font-bold">
              {institution?.code || "CODE"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time academic telemetry, batch progress, and individual learner evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/institution/reports">
            <Button variant="outline" size="sm" className="text-xs font-semibold">
              Generate Reports
            </Button>
          </Link>
          <Link href="/institution/performance">
            <Button size="sm" className="text-xs font-semibold">
              Batch Performance
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Summary Strip (Zero Decorative Icons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Batches */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Assigned Batches
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
              {data?.totalBatches ?? 0}
            </span>
            <span className="text-[11px] text-muted-foreground">Active Units</span>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Enrolled Learners
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
              {data?.totalStudents ?? 0}
            </span>
            <span className="text-[11px] text-muted-foreground">Registered</span>
          </div>
        </div>

        {/* Average Performance */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Overall Average
          </span>
          <div className="flex items-baseline justify-between pt-1">
            {data?.averagePerformance !== null && data?.averagePerformance !== undefined ? (
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
                {data.averagePerformance}%
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground italic">
                No performance data available
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">Composite</span>
          </div>
        </div>

        {/* Active Learner Rate */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Active Rate
          </span>
          <div className="flex items-baseline justify-between pt-1">
            {data?.activeLearnerRate !== null && data?.activeLearnerRate !== undefined ? (
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
                {data.activeLearnerRate}%
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground italic">
                No performance data available
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">Engagement</span>
          </div>
        </div>
      </div>

      {/* Assigned Batches Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider">
            Assigned Batches
          </h2>
          <Link
            href="/institution/batches"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All Batches
          </Link>
        </div>

        {batches.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center space-y-2">
            <p className="text-sm font-bold text-foreground">No batches assigned</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your institution currently does not have any assigned batches in the database. When batches are assigned by LMS administration, they will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Batch Code</th>
                    <th className="py-3 px-4">Batch Name</th>
                    <th className="py-3 px-4">Lead Trainer</th>
                    <th className="py-3 px-4 text-center">Enrolled</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {b.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {b.name}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {b.trainerName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {b.studentCount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            b.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/institution/performance?batchId=${b.id}`}
                          className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                        >
                          View Performance
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
