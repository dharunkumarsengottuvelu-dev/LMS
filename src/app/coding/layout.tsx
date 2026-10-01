import type { Metadata } from "next";
import { CodingLayoutWrapper } from "@/components/layouts/coding-layout-wrapper";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Coding Platform | SensiLearn LMS",
  description: "Professional LeetCode-style problem solving experience on SensiLearn LMS",
};

export default function CodingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CodingLayoutWrapper>
      {children}
      <Toaster position="top-right" richColors />
    </CodingLayoutWrapper>
  );
}
