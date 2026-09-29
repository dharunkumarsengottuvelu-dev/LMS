import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code Playground | FALCON IDE",
  description: "Practice coding in 14+ languages with real-time execution in FALCON",
};

export default function IDELayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1e1e1e]">{children}</div>
  );
}
