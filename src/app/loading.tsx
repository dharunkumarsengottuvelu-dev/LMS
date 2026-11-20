"use client";

import { SensilearnLoader } from "@/components/brand/sensilearn-loader";

export default function GlobalRouteLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-background select-none p-4">
      <SensilearnLoader variant="inline" size="md" ariaLabel="Loading Sensilearn" />
    </div>
  );
}
