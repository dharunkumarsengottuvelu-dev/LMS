"use client";

import { usePathname } from "next/navigation";
import { StudentTopNav } from "./student-top-nav";

export function StudentLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isInsideTestRunner = pathname?.startsWith("/student/tests/") && pathname !== "/student/tests";
  const isInsideAssessmentRunner = pathname?.startsWith("/student/assessments/") && pathname !== "/student/assessments";
  const isInsidePracticeCoding = pathname?.startsWith("/student/practices/coding/");
  const isInsideCoding = pathname?.startsWith("/student/coding");
  const isRunner = isInsideTestRunner || isInsideAssessmentRunner || isInsidePracticeCoding || isInsideCoding;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background transition-colors duration-300">
      {!isRunner && <StudentTopNav />}
      <main className={`min-h-screen min-h-[100dvh] ${!isRunner ? "pt-[72px]" : "pt-0"}`}>
        {isRunner ? (
          <div key={pathname} className="animate-fade-up h-screen h-[100dvh]">
            {children}
          </div>
        ) : (
          <div key={pathname} className="lms-page-container py-4 md:py-8 animate-fade-up">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
