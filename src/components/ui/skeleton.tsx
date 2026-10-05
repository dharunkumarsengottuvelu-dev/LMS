import { cn } from "@/lib/utils"

function Skeleton({ className, shimmer, ...props }: React.ComponentProps<"div"> & { shimmer?: boolean }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        shimmer
          ? "skeleton-shimmer rounded-md"
          : "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
