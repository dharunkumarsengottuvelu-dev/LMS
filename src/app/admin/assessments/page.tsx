"use client";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminAssessmentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Assessment Management"
        description="Configure MCQ quizzes, technical tests, and auto-evaluation rules"
        actions={<Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Plus className="h-4 w-4" /> Create Assessment</Button>}
      />
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Active assessment bank and question sets.</CardContent></Card>
    </div>
  );
}
