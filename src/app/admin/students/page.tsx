"use client";
import { GraduationCap, Search, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminStudentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Students Directory</h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Manage active corporate learners, batch enrollments, and progress metrics</p>
        </div>
        <Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Plus className="h-4 w-4" /> Enroll Student</Button>
      </div>
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Displaying all registered enterprise student accounts and cohort assignments.</CardContent></Card>
    </div>
  );
}
