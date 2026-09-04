"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  Users,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/tests");
        if (!res.ok) throw new Error("Failed to load assessments");
        const data = await res.json();
        const tests: any[] = data.tests || [];

        const mapped = tests.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.allowedQuestionTypes === "coding" ? "Coding Test" : t.allowedQuestionTypes === "mcq" ? "MCQ Assessment" : "Proctored Exam",
          totalCandidates: t.totalEnrolled || t.submissionsCount || 0,
          attemptedCount: t.submissionsCount || 0,
          avgScore: "N/A",
          passRate: "N/A",
          lastAttemptDate: t.date || (t.startDate ? `${t.startDate} - ${t.endDate || ""}` : "On-Demand"),
          status: t.status === "live" ? "Active" : "Scheduled",
        }));

        setReports(mapped);
      } catch (err) {
        console.warn("Failed to load admin reports:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  const downloadSpecificAssessmentCsv = async (report: any) => {
    try {
      const res = await fetch(`/api/admin/tests/${report.id}/submissions`);
      const data = await res.json();
      const subs: any[] = data.submissions || [];

      if (subs.length === 0) {
        toast({
          title: "No Candidate Submissions",
          description: `No students have submitted attempts for "${report.title}" yet.`,
          variant: "destructive",
        });
        return;
      }

      const headers = "Candidate Name,Roll Number,Email,Batch,Submission Status,Marks Obtained,Total Marks,Percentage (%),Result,Proctoring Violations,Integrity Flag,Time Spent,Submitted At\n";
      const rows = subs
        .map(
          (c) =>
            `"${c.name || "Student"}","${c.rollNo || "N/A"}","${c.email || "N/A"}","${c.batch || "Common"}","${c.status || "Submitted"}",${c.score || 0},${c.totalMarks || 100},${c.percentage || 0},"${c.percentage >= 50 ? "PASS" : "FAIL"}",${c.violationsCount || 0},"${c.violationsCount > 2 ? "High Risk" : c.violationsCount > 0 ? "Minor Alerts" : "Clean"}","${c.timeSpent || "N/A"}","${c.submittedAt || "N/A"}"`
        )
        .join("\n");

      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, "_")}_Candidate_Report_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Report Downloaded",
        description: `Exported ${subs.length} candidate results for "${report.title}".`,
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Could not download submission report.",
        variant: "destructive",
      });
    }
  };

  const downloadAllAssessmentsSummaryCsv = () => {
    if (reports.length === 0) {
      toast({
        title: "No Data",
        description: "No assessments found to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = "Report ID,Assessment Title,Category,Total Enrolled,Total Attempted,Last Date,Status\n";
    const rows = reports
      .map(
        (r) =>
          `"${r.id}","${r.title}","${r.category}",${r.totalCandidates},${r.attemptedCount},"${r.lastAttemptDate}","${r.status}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Executive_Assessments_Summary_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Executive Report Downloaded",
      description: "Overall assessment analytics summary CSV exported successfully.",
    });
  };

  const filteredReports = reports.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAttempts = reports.reduce((acc, r) => acc + (r.attemptedCount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Assessment & System Reports"
        actions={
          <Button
            onClick={downloadAllAssessmentsSummaryCsv}
            className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shadow-md shadow-[#2563EB]/20"
          >
            <Download className="h-4 w-4" /> Export All Summary (CSV)
          </Button>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Assessments</p>
          <p className="text-2xl font-black text-[#111827] dark:text-[#FAFAFA] mt-1">{reports.length} Modules</p>
          <p className="text-[11px] text-[#16A34A] font-semibold mt-1">Live from Database</p>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Attempts</p>
          <p className="text-2xl font-black text-[#2563EB] mt-1">{totalAttempts} Submissions</p>
          <p className="text-[11px] text-[#6B7280] mt-1">Verified Student Attempts</p>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Database Status</p>
          <p className="text-2xl font-black text-[#16A34A] mt-1">Active</p>
          <p className="text-[11px] text-[#16A34A] font-semibold mt-1">Real-Time Sync</p>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Report Format</p>
          <p className="text-2xl font-black text-[#111827] dark:text-[#FAFAFA] mt-1">CSV / Excel</p>
          <p className="text-[11px] text-[#6B7280] mt-1">Includes Anti-Cheating Data</p>
        </Card>
      </div>

      {/* Assessment Reports Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
              Assessment Performance Reports
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280]">
              Download detailed candidate attendance, scores, and evaluation audit for each assessment module.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
              <Input
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Assessment Module</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Candidates Attended</th>
                  <th className="p-4">Avg Score</th>
                  <th className="p-4">Pass Rate</th>
                  <th className="p-4">Last Date</th>
                  <th className="p-4 pr-6 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                {filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{r.title}</p>
                      <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">{r.id}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-[10px] font-semibold border-[#E5E7EB] dark:border-[#27272A]">
                        {r.category}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{r.attemptedCount}</span>
                      <span className="text-[#6B7280]"> / {r.totalCandidates} ({Math.round((r.attemptedCount / r.totalCandidates) * 100)}%)</span>
                    </td>
                    <td className="p-4 font-bold text-[#2563EB]">{r.avgScore}</td>
                    <td className="p-4">
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">
                        {r.passRate}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-[#6B7280]">{r.lastAttemptDate}</td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        size="sm"
                        onClick={() => downloadSpecificAssessmentCsv(r)}
                        className="h-8 px-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl gap-1.5 shadow-xs"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Report (CSV)
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
