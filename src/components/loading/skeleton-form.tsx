import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export function SkeletonFormField({ isTextarea = false }: { isTextarea?: boolean }) {
  return (
    <div className="space-y-1.5 w-full">
      <Skeleton width="25%" height="0.875rem" rounded="sm" />
      <Skeleton width="100%" height={isTextarea ? "5.5rem" : "2.5rem"} rounded="md" />
    </div>
  );
}

export function SkeletonForm({
  fields = 4,
  columns = 2,
  className,
}: {
  fields?: number;
  columns?: 1 | 2;
  className?: string;
}) {
  const colClass = columns === 2 ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4";

  return (
    <Card className={cn("border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs", className)}>
      <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-zinc-800 space-y-1.5">
        <Skeleton width="30%" height="1.25rem" rounded="md" />
        <Skeleton width="50%" height="0.875rem" rounded="sm" />
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className={colClass}>
          {Array.from({ length: fields }).map((_, i) => (
            <SkeletonFormField key={i} />
          ))}
        </div>
        <SkeletonFormField isTextarea />
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-3">
          <Skeleton width="80px" height="2.25rem" rounded="md" />
          <Skeleton width="110px" height="2.25rem" rounded="md" />
        </div>
      </CardContent>
    </Card>
  );
}
