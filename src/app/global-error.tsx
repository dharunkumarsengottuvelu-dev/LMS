"use client";

import { useEffect } from "react";
import { normalizeError } from "@/lib/utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const safeError = normalizeError(error);

  useEffect(() => {
    console.error("Global Error Boundary caught error:", safeError);
  }, [safeError]);

  return (
    <html lang="en">
      <body className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="max-w-md w-full bg-card p-6 rounded-2xl border border-border shadow-lg text-center space-y-4">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">System Runtime Error</h2>
          <p className="text-sm text-muted-foreground">{safeError.message}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
