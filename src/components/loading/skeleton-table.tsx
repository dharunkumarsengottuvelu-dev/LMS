import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "./skeleton";
import { SkeletonAvatar } from "./skeleton-avatar";
import { cn } from "@/lib/utils";

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  hasHeaderControls?: boolean;
  hasPagination?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 5,
  hasHeaderControls = true,
  hasPagination = true,
  className,
}: SkeletonTableProps) {
  return (
    <Card className={cn("border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden", className)}>
      {hasHeaderControls && (
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Skeleton width="280px" height="2.25rem" rounded="md" />
            <div className="flex items-center gap-2.5">
              <Skeleton width="110px" height="2.25rem" rounded="md" />
              <Skeleton width="120px" height="2.25rem" rounded="md" />
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/40">
                {Array.from({ length: columns }).map((_, c) => (
                  <th key={c} className="py-3.5 px-4 font-medium text-xs">
                    <Skeleton width={c === 0 ? "55%" : "70%"} height="0.875rem" rounded="sm" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="hover:bg-slate-50/30 dark:hover:bg-zinc-900/30">
                  {Array.from({ length: columns }).map((_, c) => (
                    <td key={c} className="py-4 px-4 align-middle">
                      {c === 0 ? (
                        <div className="flex items-center gap-3">
                          <SkeletonAvatar size="sm" />
                          <div className="space-y-1.5 flex-1 min-w-[120px]">
                            <Skeleton width="75%" height="0.875rem" rounded="sm" />
                            <Skeleton width="50%" height="0.75rem" rounded="sm" />
                          </div>
                        </div>
                      ) : c === columns - 1 ? (
                        <div className="flex items-center gap-2">
                          <Skeleton width="60px" height="1.75rem" rounded="md" />
                          <Skeleton width="60px" height="1.75rem" rounded="md" />
                        </div>
                      ) : c === 1 ? (
                        <Skeleton width="70%" height="1.25rem" rounded="full" />
                      ) : (
                        <Skeleton width={c % 2 === 0 ? "80%" : "60%"} height="0.875rem" rounded="sm" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasPagination && (
          <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/30 dark:bg-zinc-950/20">
            <Skeleton width="180px" height="0.875rem" rounded="sm" />
            <div className="flex items-center gap-2">
              <Skeleton width="80px" height="2rem" rounded="md" />
              <Skeleton width="80px" height="2rem" rounded="md" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
