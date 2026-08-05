"use client";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TrainerAssignmentsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Assignment Review</h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Grade student project submissions and provide feedback</p>
      </div>
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Trainer assignment review queue.</CardContent></Card>
    </div>
  );
}
