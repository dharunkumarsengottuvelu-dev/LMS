"use client";
import { FileText, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLessonsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Interactive Lessons</h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Video lectures, code walkthroughs, and downloadable attachments</p>
      </div>
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">All lesson contents and media assets.</CardContent></Card>
    </div>
  );
}
