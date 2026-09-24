import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "./skeleton";
import { SkeletonAvatar } from "./skeleton-avatar";
import { cn } from "@/lib/utils";

export function SkeletonCourseCard({ className }: { className?: string }) {
  return (
    <Card className={cn("border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden flex flex-col justify-between", className)}>
      <div>
        {/* Course Image Banner */}
        <div className="w-full aspect-video bg-slate-100 dark:bg-zinc-800 relative">
          <Skeleton width="100%" height="100%" rounded="none" />
          <div className="absolute top-3 left-3">
            <Skeleton width="80px" height="1.25rem" rounded="full" />
          </div>
        </div>

        <CardContent className="p-5 space-y-3">
          <Skeleton width="75%" height="1.25rem" rounded="md" />
          <div className="space-y-1.5">
            <Skeleton width="100%" height="0.875rem" rounded="sm" />
            <Skeleton width="85%" height="0.875rem" rounded="sm" />
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <SkeletonAvatar size="xs" />
              <Skeleton width="90px" height="0.75rem" rounded="sm" />
            </div>
            <Skeleton width="60px" height="0.75rem" rounded="sm" />
          </div>
        </CardContent>
      </div>

      <div className="p-5 pt-0 border-t border-slate-100 dark:border-zinc-800/80 mt-3 pt-3 flex items-center justify-between">
        <Skeleton width="40%" height="0.75rem" rounded="sm" />
        <Skeleton width="85px" height="2rem" rounded="lg" />
      </div>
    </Card>
  );
}

export function SkeletonCourseGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCourseCard key={i} />
      ))}
    </div>
  );
}
