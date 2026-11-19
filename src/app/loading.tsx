"use client";

import { useEffect, useState } from "react";
import { SensilearnLoader } from "@/components/brand/sensilearn-loader";

export default function GlobalRouteLoading() {
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-background select-none p-4">
      <SensilearnLoader variant="inline" size="md" ariaLabel="Loading Sensilearn" />
      {isDelayed && (
        <div className="mt-6 flex flex-col items-center gap-2 animate-in fade-in-0 duration-300">
          <p className="text-xs text-slate-400">Taking longer than usual?</p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/api/auth/clear-cookies";
              }
            }}
            className="text-xs text-blue-600 font-semibold hover:underline bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-full border border-blue-200 dark:border-blue-900 transition-all cursor-pointer"
          >
            Click here to refresh session
          </button>
        </div>
      )}
    </div>
  );
}
