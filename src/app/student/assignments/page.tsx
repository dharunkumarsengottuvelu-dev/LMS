"use client";

import { FileText, Upload, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockAssignments = [
  {
    id: "as1",
    title: "Build a Fullstack SaaS Dashboard in Next.js",
    course: "Fullstack Web Development",
    deadline: "2026-08-12",
    maxMarks: 100,
    status: "Pending",
  },
  {
    id: "as2",
    title: "Design PostgreSQL Schema with RLS Policies",
    course: "Database Architecture",
    deadline: "2026-08-01",
    maxMarks: 50,
    status: "Submitted",
    score: 48,
  },
];

export default function StudentAssignmentsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Assignments
        </h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
          Submit practical projects, code repositories, and documentation assignments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockAssignments.map((item) => (
          <Card key={item.id} className="hover:border-[#2563EB]/40 transition-colors">
            <CardHeader className="p-6 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">{item.course}</Badge>
                {item.status === "Submitted" ? (
                  <Badge className="bg-[#16A34A] text-white text-xs">Submitted ({item.score}/{item.maxMarks})</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Due: {item.deadline}</Badge>
                )}
              </div>
              <CardTitle className="text-[18px]">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Button className="w-full h-[44px] bg-[#2563EB] text-white gap-2">
                <Upload className="h-4 w-4" /> Submit Assignment Solution
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
