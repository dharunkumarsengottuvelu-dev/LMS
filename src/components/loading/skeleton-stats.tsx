import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

export function SkeletonStatsCard({ className }: { className?: string }) {
  return (
    <Card className={cn("border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs", className)}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton width="45%" height="0.875rem" rounded="sm" />
            <Skeleton width="60%" height="2rem" rounded="md" />
          </div>
          <Skeleton width={44} height={44} rounded="xl" className="shrink-0" />
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <Skeleton width="30%" height="0.75rem" rounded="sm" />
          <Skeleton width="20%" height="0.75rem" rounded="sm" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonStatsGrid({ count = 4, className }: SkeletonStatsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  );
}
