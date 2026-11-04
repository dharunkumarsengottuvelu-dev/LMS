import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "SensiLearn | %s",
    default: "SensiLearn | Code Playground",
  },
};

export default function IDELayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1e1e1e]">{children}</div>
  );
}
