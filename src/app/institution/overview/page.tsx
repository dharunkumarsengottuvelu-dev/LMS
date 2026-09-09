"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layouts/page-header";
import { getInitials } from "@/lib/utils";

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
        throw new Error("Unable to load performance telemetry. Please try again.");
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
      <div className="space-y-6 pt-2 animate-pulse">
        <div className="h-24 bg-card rounded-2xl border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card rounded-2xl border border-border p-5" />
          ))}
        </div>
        <div className="h-72 bg-card rounded-2xl border border-border" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <Card className="bg-card border-border rounded-2xl p-12 text-center shadow-xs">
        <h3 className="text-sm font-bold text-foreground">Error Loading Overview</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={fetchOverview} className="mt-4 rounded-xl text-xs font-semibold">
          Retry
        </Button>
      </Card>
    );
  }

  const batches = data?.batches || [];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Executive Page Header */}
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <span>{institution?.name || "Institution Performance Portal"}</span>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-mono font-bold">
              {institution?.code || "CODE"}
            </Badge>
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/institution/reports">
              <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-semibold rounded-xl">
                Reports
              </Button>
            </Link>
            <Link href="/institution/performance">
              <Button size="sm" className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs">
                Batch Analytics
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Metric Summary Strip (Clean MNC Enterprise Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Batches */}
        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Batches</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">{data?.totalBatches ?? 0}</span>
            <span className="text-xs text-muted-foreground font-medium">Active academic units</span>
          </div>
        </Card>

        {/* Total Students */}
        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled Learners</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">{data?.totalStudents ?? 0}</span>
            <span className="text-xs text-muted-foreground font-medium">Total registered</span>
          </div>
        </Card>

        {/* Average Performance */}
        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Average</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground font-mono tracking-tight">
              {data?.averagePerformance !== null && data?.averagePerformance !== undefined
                ? `${data.averagePerformance}%`
                : "N/A"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">Composite benchmark</span>
          </div>
        </Card>

        {/* Active Learner Rate */}
        <Card className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engagement Rate</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {data?.activeLearnerRate !== null && data?.activeLearnerRate !== undefined
                ? `${data.activeLearnerRate}%`
                : "—"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">30-day active</span>
          </div>
        </Card>
      </div>

      {/* Cohort Directory Overview Table */}
      <Card className="bg-card border-border rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Active Cohorts Summary</CardTitle>
          </div>
          <Link href="/institution/batches">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
              Manage Batches
            </Button>
          </Link>
        </CardHeader>

        {batches.length === 0 ? (
          <div className="p-12 text-center">
            <h4 className="text-sm font-bold text-foreground">No Batches Assigned</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Your institution does not have any active batches assigned yet. When batches are created by LMS administrators, they will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">Batch Code</th>
                  <th className="py-3 px-4">Cohort Name</th>
                  <th className="py-3 px-4">Trainer</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4 text-center">Students</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[11px] font-bold text-primary">
                      {b.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {b.name}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 rounded-full border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                            {getInitials(b.trainerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{b.trainerName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono">
                      <span>{b.startDate}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                      <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-mono">
                        {b.studentCount}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold"
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link href={`/institution/performance?batchId=${b.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 rounded-md"
                        >
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
