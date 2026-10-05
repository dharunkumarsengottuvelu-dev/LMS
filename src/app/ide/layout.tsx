import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "SensilLearn | %s",
    default: "SensilLearn | Code Playground",
  },
};

export default function IDELayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1e1e1e]">{children}</div>
  );
}
