"use client";

import { usePathname } from "next/navigation";
import { StudentTopNav } from "./student-top-nav";

export function StudentLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isInsideTestRunner = pathname?.startsWith("/student/tests/") && pathname !== "/student/tests";
  const isInsidePracticeRunner = pathname?.startsWith("/student/assessments/") && pathname !== "/student/assessments";
  const isRunner = isInsideTestRunner || isInsidePracticeRunner;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {!isRunner && <StudentTopNav />}
      <main className={`min-h-screen ${!isRunner ? "pt-[72px]" : "pt-0"}`}>
        <div key={pathname} className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 md:py-8 animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
