"use client";
import { BarChart3, Download } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Executive System Reports"
        description="Export CSV/PDF audit logs, compliance records, and learning transcripts"
        actions={<Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Download className="h-4 w-4" /> Export System Report</Button>}
      />
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Downloadable executive reports and compliance logs.</CardContent></Card>
    </div>
  );
}
