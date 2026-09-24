import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export function SkeletonMcqQuestion({ className }: { className?: string }) {
  return (
    <Card className={cn("border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs", className)}>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <Skeleton width="120px" height="1.25rem" rounded="sm" />
          <Skeleton width="60px" height="1.25rem" rounded="full" />
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <Skeleton width="90%" height="1.125rem" rounded="sm" />
          <Skeleton width="75%" height="1.125rem" rounded="sm" />
        </div>

        {/* 4 MCQ Options */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-lg border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 bg-slate-50/40 dark:bg-zinc-950/20"
            >
              <Skeleton width={20} height={20} rounded="full" className="shrink-0" />
              <Skeleton width={`${50 + (i % 3) * 15}%`} height="1rem" rounded="sm" />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <Skeleton width="100px" height="2.25rem" rounded="md" />
          <Skeleton width="100px" height="2.25rem" rounded="md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonCodingWorkspace({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4 h-[650px] w-full", className)}>
      {/* Problem Description Panel */}
      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 overflow-hidden">
        <Skeleton width="60%" height="1.5rem" rounded="md" />
        <div className="flex items-center gap-2">
          <Skeleton width="70px" height="1.25rem" rounded="full" />
          <Skeleton width="90px" height="1.25rem" rounded="full" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton width="100%" height="0.875rem" rounded="sm" />
          <Skeleton width="95%" height="0.875rem" rounded="sm" />
          <Skeleton width="88%" height="0.875rem" rounded="sm" />
          <Skeleton width="92%" height="0.875rem" rounded="sm" />
        </div>
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 space-y-2">
          <Skeleton width="40%" height="0.875rem" rounded="sm" />
          <Skeleton width="80%" height="0.875rem" rounded="sm" />
        </div>
      </Card>

      {/* Code Editor Panel */}
      <Card className="border border-slate-200/80 dark:border-zinc-800 bg-[#1E1E1E] p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <Skeleton width="100px" height="1.75rem" rounded="md" className="bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Skeleton width="70px" height="1.75rem" rounded="md" className="bg-zinc-800" />
            <Skeleton width="70px" height="1.75rem" rounded="md" className="bg-zinc-800" />
          </div>
        </div>
        <div className="space-y-3 py-6 flex-1">
          <Skeleton width="45%" height="1rem" rounded="sm" className="bg-zinc-800" />
          <Skeleton width="70%" height="1rem" rounded="sm" className="bg-zinc-800 ml-4" />
          <Skeleton width="60%" height="1rem" rounded="sm" className="bg-zinc-800 ml-8" />
          <Skeleton width="30%" height="1rem" rounded="sm" className="bg-zinc-800 ml-4" />
          <Skeleton width="20%" height="1rem" rounded="sm" className="bg-zinc-800" />
        </div>
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <Skeleton width="90px" height="2rem" rounded="md" className="bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Skeleton width="90px" height="2.25rem" rounded="md" className="bg-zinc-800" />
            <Skeleton width="110px" height="2.25rem" rounded="md" className="bg-zinc-700" />
          </div>
        </div>
      </Card>
    </div>
  );
}
