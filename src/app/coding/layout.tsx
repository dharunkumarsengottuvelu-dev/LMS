import type { Metadata } from "next";
import { StudentTopNav } from "@/components/layouts/student-top-nav";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Coding Platform | FALCON LMS",
  description: "Professional LeetCode-style problem solving experience on FALCON LMS",
};

export default function CodingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 antialiased">
      {/* Top LMS Navigation */}
      <StudentTopNav />
      {/* Main Content Area */}
      <div className="pt-[68px] min-h-[calc(100vh-68px)]">
        {children}
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
