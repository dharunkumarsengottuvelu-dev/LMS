import React from "react";
import { SkeletonPageHeader } from "./skeleton-page";
import { SkeletonStatsGrid } from "./skeleton-stats";
import { SkeletonChartCard } from "./skeleton-chart";
import { SkeletonTable } from "./skeleton-table";
import { cn } from "@/lib/utils";

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 w-full max-w-7xl mx-auto pb-12", className)}>
      {/* Dashboard Top Greeting & Actions */}
      <SkeletonPageHeader
        titleWidth="260px"
        subtitleWidth="420px"
        hasAction={true}
      />

      {/* 4 Core Statistics Metric Cards */}
      <SkeletonStatsGrid count={4} />

      {/* Charts & Analytics Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonChartCard titleWidth="40%" height={260} />
        </div>
        <div className="lg:col-span-1">
          <SkeletonTable rows={4} columns={2} hasHeaderControls={false} hasPagination={false} />
        </div>
      </div>

      {/* Recent Submissions / Students Table */}
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}
