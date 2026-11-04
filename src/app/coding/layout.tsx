import type { Metadata } from "next";
import { CodingLayoutWrapper } from "@/components/layouts/coding-layout-wrapper";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    template: "SensiLearn | %s",
    default: "SensiLearn | Coding",
  },
  description: "Problem solving experience on SensiLearn",
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
