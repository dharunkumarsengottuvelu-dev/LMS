"use client";
import { LayoutDashboard, BookOpen, Users, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrainerDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">Trainer Workspace</h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">Overview of assigned student cohorts, active courses, and pending submissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2">
          <p className="text-xs text-[#6B7280]">Assigned Courses</p>
          <p className="text-[28px] font-semibold text-[#111827] dark:text-[#FAFAFA]">4</p>
        </Card>
        <Card className="p-6 space-y-2">
          <p className="text-xs text-[#6B7280]">Enrolled Students</p>
          <p className="text-[28px] font-semibold text-[#111827] dark:text-[#FAFAFA]">128</p>
        </Card>
        <Card className="p-6 space-y-2">
          <p className="text-xs text-[#6B7280]">Pending Submissions</p>
          <p className="text-[28px] font-semibold text-[#111827] dark:text-[#FAFAFA]">12</p>
        </Card>
      </div>
    </div>
  );
}
