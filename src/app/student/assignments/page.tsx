"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentAssignmentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/live-classes");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <span className="loading-dot bg-blue-600" />
          <span className="loading-dot bg-blue-600" />
          <span className="loading-dot bg-blue-600" />
        </div>
        <p className="text-xs text-slate-500">Redirecting to Live Classes...</p>
      </div>
    </div>
  );
}
