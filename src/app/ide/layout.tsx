import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code Playground | EduNexus IDE",
  description: "Practice coding in 14+ languages with real-time execution powered by Judge0",
};

export default function IDELayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1e1e1e]">{children}</div>
  );
}
