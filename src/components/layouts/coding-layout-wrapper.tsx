"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { StudentTopNav } from "./student-top-nav";

export function CodingLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide top LMS navbar and padding when inside problem solving workspace
  const isProblemWorkspace = Boolean(
    pathname?.startsWith("/coding/problems/") && pathname !== "/coding/problems"
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 antialiased">
      {!isProblemWorkspace && <StudentTopNav />}
      <div className={!isProblemWorkspace ? "pt-[68px] min-h-[calc(100vh-68px)]" : "min-h-screen"}>
        {children}
      </div>
    </div>
  );
}
