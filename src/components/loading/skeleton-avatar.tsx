import React from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export interface SkeletonAvatarProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  shape?: "circle" | "rounded" | "square";
  className?: string;
}

export function SkeletonAvatar({
  size = "md",
  shape = "circle",
  className,
}: SkeletonAvatarProps) {
  const sizePx =
    typeof size === "number"
      ? size
      : {
          xs: 24,
          sm: 32,
          md: 40,
          lg: 48,
          xl: 64,
        }[size];

  const roundedVariant =
    shape === "circle" ? "full" : shape === "rounded" ? "lg" : "none";

  return (
    <Skeleton
      width={sizePx}
      height={sizePx}
      rounded={roundedVariant}
      className={cn("shrink-0", className)}
    />
  );
}
