import type { Metadata } from "next";
import { CodingLayoutWrapper } from "@/components/layouts/coding-layout-wrapper";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Coding",
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
      <Toaster position="bottom-right" richColors closeButton duration={3500} />
    </CodingLayoutWrapper>
  );
}
