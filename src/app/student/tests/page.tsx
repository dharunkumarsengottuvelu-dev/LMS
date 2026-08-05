"use client";

import { Calendar, Clock, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockTests = [
  {
    id: "t1",
    title: "Mid-Term Proctored Evaluation — Batch 2026-A",
    type: "Scheduled Examination",
    scheduledAt: "2026-08-10 10:00 AM",
    duration: 60,
    status: "Upcoming",
  },
  {
    id: "t2",
    title: "Final Technical Readiness Assessment",
    type: "Mock Interview Test",
    scheduledAt: "2026-08-25 02:00 PM",
    duration: 90,
    status: "Scheduled",
  },
];

export default function StudentTestsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Scheduled Tests
        </h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
          View live scheduled cohort tests and proctored examinations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockTests.map((test) => (
          <Card key={test.id} className="hover:border-[#2563EB]/40 transition-colors">
            <CardHeader className="p-6 pb-4 space-y-2">
              <Badge variant="outline" className="w-fit text-xs font-medium">{test.type}</Badge>
              <CardTitle className="text-[18px]">{test.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="space-y-1 text-xs text-[#6B7280]">
                <p>Scheduled: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.scheduledAt}</span></p>
                <p>Duration: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{test.duration} minutes</span></p>
              </div>
              <Button className="w-full h-[44px] bg-[#2563EB] text-white">Enter Exam Lobby</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
