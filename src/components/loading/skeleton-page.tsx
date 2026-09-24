import React from "react";
import { Skeleton } from "./skeleton";
import { SkeletonTable } from "./skeleton-table";
import { SkeletonCourseGrid } from "./skeleton-course-card";
import { cn } from "@/lib/utils";

export interface SkeletonPageProps {
  type?: "table" | "grid" | "form";
  titleWidth?: string;
  subtitleWidth?: string;
  className?: string;
}

export function SkeletonPageHeader({
  titleWidth = "220px",
  subtitleWidth = "360px",
  hasAction = true,
}: {
  titleWidth?: string;
  subtitleWidth?: string;
  hasAction?: boolean;
}) {
  return (
    <div className="w-full bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton width={titleWidth} height="1.75rem" rounded="md" />
        <Skeleton width={subtitleWidth} height="0.875rem" rounded="sm" />
      </div>
      {hasAction && (
        <div className="flex items-center gap-2.5 shrink-0">
          <Skeleton width="100px" height="2.25rem" rounded="lg" />
          <Skeleton width="120px" height="2.25rem" rounded="lg" />
        </div>
      )}
    </div>
  );
}

export function SkeletonPage({
  type = "table",
  titleWidth,
  subtitleWidth,
  className,
}: SkeletonPageProps) {
  return (
    <div className={cn("space-y-6 w-full max-w-7xl mx-auto pb-12", className)}>
      <SkeletonPageHeader titleWidth={titleWidth} subtitleWidth={subtitleWidth} />

      {type === "table" ? (
        <SkeletonTable rows={7} columns={5} />
      ) : type === "grid" ? (
        <SkeletonCourseGrid count={6} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonTable rows={4} columns={3} />
          </div>
          <div>
            <SkeletonTable rows={3} columns={2} />
          </div>
        </div>
      )}
    </div>
  );
}
