"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock, AlertCircle, CheckCircle2, ChevronRight, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockAssessments = [
  {
    id: "a1",
    title: "React 19 & Next.js App Router MCQ Evaluation",
    type: "MCQ Test",
    duration: 30,
    totalQuestions: 25,
    totalMarks: 100,
    passingMarks: 70,
    status: "pending",
    dueDate: "2026-08-15",
  },
  {
    id: "a2",
    title: "Data Structures & Complexity Analysis",
    type: "Coding & MCQ",
    duration: 45,
    totalQuestions: 15,
    totalMarks: 100,
    passingMarks: 75,
    status: "pending",
    dueDate: "2026-08-20",
  },
  {
    id: "a3",
    title: "SQL & PostgreSQL Database Design Test",
    type: "MCQ Test",
    duration: 20,
    totalQuestions: 20,
    totalMarks: 80,
    passingMarks: 50,
    status: "completed",
    score: 74,
    passed: true,
  },
];

export default function StudentAssessmentsPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Assessments & Examinations
        </h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
          Complete assigned evaluations, technical quizzes, and view scored results
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAssessments.map((assessment) => (
          <Card key={assessment.id} className="h-full flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
            <CardHeader className="p-6 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-medium">
                  {assessment.type}
                </Badge>
                {assessment.status === "completed" ? (
                  <Badge className="bg-[#16A34A] text-white text-xs font-medium">Passed ({assessment.score}%)</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs font-medium">Pending</Badge>
                )}
              </div>
              <CardTitle className="text-[18px] leading-snug line-clamp-2">
                {assessment.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280] bg-[#F5F5F5] dark:bg-[#27272A] p-3 rounded-lg">
                <div>
                  <span className="block text-[#111827] dark:text-[#FAFAFA] font-semibold">{assessment.duration} mins</span>
                  <span>Duration</span>
                </div>
                <div>
                  <span className="block text-[#111827] dark:text-[#FAFAFA] font-semibold">{assessment.totalQuestions} Questions</span>
                  <span>Format</span>
                </div>
              </div>

              <Button
                className={`w-full h-[44px] gap-2 font-medium text-sm ${
                  assessment.status === "completed"
                    ? "bg-[#F5F5F5] dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA] hover:bg-[#E5E7EB]"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                }`}
                asChild
              >
                <Link href={`/student/assessments/${assessment.id}`}>
                  {assessment.status === "completed" ? (
                    "View Scored Report"
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" /> Start Assessment
                    </>
                  )}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
