"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { normalizeError } from "@/lib/utils";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const safeError = normalizeError(error);

  useEffect(() => {
    console.error("App Root Error Boundary caught error:", safeError);
  }, [safeError]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {safeError.message || "An unexpected error occurred while loading this page."}
      </p>
      <Button onClick={() => reset()} variant="default" className="bg-[#2563EB] hover:bg-[#1D4ED8]">
        Try again
      </Button>
    </div>
  );
}
