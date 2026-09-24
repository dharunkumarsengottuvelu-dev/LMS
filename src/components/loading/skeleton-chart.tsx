import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export function SkeletonChartCard({
  titleWidth = "35%",
  height = 260,
  className,
}: {
  titleWidth?: string;
  height?: number;
  className?: string;
}) {
  const barHeights = [40, 65, 30, 85, 55, 95, 70];

  return (
    <Card className={cn("border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs", className)}>
      <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton width={titleWidth} height="1.125rem" rounded="sm" />
          <Skeleton width="25%" height="0.75rem" rounded="sm" />
        </div>
        <Skeleton width="90px" height="1.75rem" rounded="md" />
      </CardHeader>
      <CardContent className="p-5 pt-3">
        <div
          className="w-full flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 border-b border-slate-100 dark:border-zinc-800"
          style={{ height: `${height}px` }}
        >
          {barHeights.map((pct, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <Skeleton
                width="100%"
                height={`${pct}%`}
                rounded="md"
                className="opacity-75"
              />
              <Skeleton width="70%" height="0.75rem" rounded="sm" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
