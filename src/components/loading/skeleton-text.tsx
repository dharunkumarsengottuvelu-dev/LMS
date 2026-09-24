import React from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineHeight?: string | number;
  lastLineWidth?: string;
}

export function SkeletonText({
  lines = 3,
  className,
  lineHeight = "1rem",
  lastLineWidth = "60%",
}: SkeletonTextProps) {
  const widths = ["100%", "92%", "96%", "88%", "94%"];

  return (
    <div className={cn("space-y-2.5 w-full", className)}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const w = isLast ? lastLineWidth : widths[index % widths.length];
        return (
          <Skeleton
            key={index}
            height={lineHeight}
            width={w}
            rounded="sm"
            className="opacity-90"
          />
        );
      })}
    </div>
  );
}

export function SkeletonTitle({
  className,
  width = "40%",
  size = "md",
}: {
  className?: string;
  width?: string | number;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const heightMap = {
    sm: "1.25rem",
    md: "1.75rem",
    lg: "2.25rem",
    xl: "2.75rem",
  };

  return (
    <Skeleton
      width={width}
      height={heightMap[size]}
      rounded="md"
      className={cn("my-1", className)}
    />
  );
}
