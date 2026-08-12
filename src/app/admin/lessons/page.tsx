"use client";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLessonsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Interactive Lessons"
        description="Video lectures, code walkthroughs, and downloadable attachments"
      />
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">All lesson contents and media assets.</CardContent></Card>
    </div>
  );
}
