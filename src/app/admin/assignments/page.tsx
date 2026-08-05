"use client";
import { FileText, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminAssignmentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Assignment Review</h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Review student submissions, provide feedback, and grade projects</p>
        </div>
        <Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Plus className="h-4 w-4" /> Create Assignment</Button>
      </div>
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Submitted assignment repos and manual grading queue.</CardContent></Card>
    </div>
  );
}
