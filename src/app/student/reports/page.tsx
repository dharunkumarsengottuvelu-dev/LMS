"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Award,
  ArrowUpRight,
  TrendingUp,
  Download,
  Filter,
  UserCheck,
  Laptop,
  CheckCircle,
  Code2,
  FileText,
  Search,
  Loader2,
  Inbox,
  Dumbbell,
  ClipboardList,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function StudentReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all">("7d");
  const [activeTab, setActiveTab] = useState<"courses" | "practices" | "assessments" | "time">("courses");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic state populated strictly from backend
  const [reportSummary, setReportSummary] = useState<any>({});
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [practicesList, setPracticesList] = useState<any[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [dailyTimeSpent, setDailyTimeSpent] = useState<any[]>([]);
  const [loginActivities, setLoginActivities] = useState<any[]>([]);

  // Fetch 100% dynamic reports from API
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/reports?range=${dateRange}`);
      const data = await res.json();

      if (data.reports) {
        setReportSummary(data.reports.summary || {});
        setCoursesList(data.reports.coursesList || []);
        setPracticesList(data.reports.practicesList || []);
        setAssessmentsList(data.reports.assessmentsList || []);
        setDailyTimeSpent(data.reports.dailyTimeSpent || []);
        setLoginActivities(data.reports.loginActivities || []);
      }
    } catch (err) {
      console.error("Failed to load real reports data", err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Format seconds to "X h Y min Z s"
  const formatTimeSpent = (secs: number) => {
    if (!secs || secs === 0) return "0 h 0 min 0 s";
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours} h ${mins} min ${s} s`;
  };

  // Date range label
  const dateRangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7d":
        return "Last 7 days";
      case "14d":
        return "Last 14 days";
      case "30d":
        return "Last 30 days";
      case "all":
        return "All time";
    }
  }, [dateRange]);

  // Export full CSV report
  const handleExportCsv = () => {
    if (coursesList.length === 0 && practicesList.length === 0 && assessmentsList.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No learning activity records found to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = "Category,Title,Details / Type,Completed Date,Score / Progress,Status\n";
    const courseRows = coursesList.map(
      (c) => `"Course","${c.title}","${c.category}","${c.lastAccessed}","${c.progress}%","${c.status}"`
    );
    const practiceRows = practicesList.map(
      (p) => `"Practice","${p.title}","${p.completedChallenges}/${p.totalChallenges} Solved","Recent","${p.progress}%","${p.status}"`
    );
    const assessRows = assessmentsList.map(
      (a) => `"Assessment","${a.title}","${a.type}","${a.completedDate}","${a.scoreObtained}","${a.evaluation}"`
    );

    const blob = new Blob([headers + [...courseRows, ...practiceRows, ...assessRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Student_Reports_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Report Exported",
      description: "Downloaded student learning records and performance analytics.",
    });
  };

  return (
    <div className="w-full space-y-7 pb-16">
      {/* 1. Header & Custom Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                Reports & Performance Analyses
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] border border-[#2563EB]/20">
              <Calendar className="h-3.5 w-3.5" />
              {dateRangeLabel}
            </span>
            <span className="text-xs text-[#6B7280]">
              Real-time student progress for Courses, Practices, and Proctored Assessments
            </span>
          </div>
        </div>

        {/* Action Controls: Custom Date Filter Dropdown & Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-10 px-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-xs font-bold text-[#2563EB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] flex items-center gap-2 shadow-xs transition-colors">
              <span>{dateRangeLabel}</span>
              <Filter className="h-3.5 w-3.5 text-[#6B7280]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-1.5 rounded-xl shadow-lg">
              <DropdownMenuItem
                onClick={() => setDateRange("7d")}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                  dateRange === "7d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                )}
              >
                <span>Last 7 days</span>
                {dateRange === "7d" && <Check className="h-4 w-4 text-[#2563EB]" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setDateRange("14d")}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                  dateRange === "14d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                )}
              >
                <span>Last 14 days</span>
                {dateRange === "14d" && <Check className="h-4 w-4 text-[#2563EB]" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setDateRange("30d")}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                  dateRange === "30d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                )}
              >
                <span>Last 30 days</span>
                {dateRange === "30d" && <Check className="h-4 w-4 text-[#2563EB]" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setDateRange("all")}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                  dateRange === "all" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                )}
              >
                <span>All time</span>
                {dateRange === "all" && <Check className="h-4 w-4 text-[#2563EB]" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="h-10 text-xs font-bold rounded-xl gap-2 bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA]"
          >
            <Download className="h-4 w-4 text-[#2563EB]" /> Export Report (CSV)
          </Button>
        </div>
      </div>

      {/* 2. Top-Level Tab Switcher: Separate Courses, Practices, Assessments, Time & Logins */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("courses")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
            activeTab === "courses"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Courses ({coursesList.length})
        </button>

        <button
          onClick={() => setActiveTab("practices")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
            activeTab === "practices"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          )}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          Practices ({practicesList.length})
        </button>

        <button
          onClick={() => setActiveTab("assessments")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
            activeTab === "assessments"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          )}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Assessments ({assessmentsList.length})
        </button>

        <button
          onClick={() => setActiveTab("time")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
            activeTab === "time"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Time & Logins
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          <p className="text-sm font-medium">Loading real learning analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-[#6B7280]">Total Courses</span>
              <p className="text-3xl font-extrabold text-[#D97706]">{reportSummary.enrolledCoursesCount || 0}</p>
              <p className="text-[11px] text-[#6B7280]">Assigned batch tracks</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-[#6B7280]">Practice Tracks</span>
              <p className="text-3xl font-extrabold text-[#16A34A]">{reportSummary.practicesCount || 0}</p>
              <p className="text-[11px] text-[#6B7280]">Coding modules</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-[#6B7280]">Assessments</span>
              <p className="text-3xl font-extrabold text-[#2563EB]">{reportSummary.assessmentsCount || 0}</p>
              <p className="text-[11px] text-[#6B7280]">Proctored exams</p>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-[#6B7280]">Time Spent</span>
              <p className="text-2xl font-extrabold text-[#111827] dark:text-[#FAFAFA]">{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</p>
              <p className="text-[11px] text-[#6B7280]">Active evaluation</p>
            </Card>
          </div>

          {/* TAB 1: COURSES */}
          {activeTab === "courses" && (
            <div className="space-y-4">
              {coursesList.length === 0 ? (
                <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                  <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#6B7280]">No assigned courses found for your batch.</p>
                </Card>
              ) : (
                coursesList.map((course) => (
                  <Card key={course.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-[#2563EB]" /> {course.title}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-[#6B7280]">
                          {course.category} • {course.completedModules} of {course.totalModules} modules finished
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-[#0D9488]">{course.progress}% Completed</span>
                        <Badge className={cn("text-[10px] font-bold", course.progress === 100 ? "bg-[#16A34A] text-white" : "bg-[#2563EB]/10 text-[#2563EB]")}>
                          {course.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-3">
                      <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0D9488] rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }} />
                      </div>

                      <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A] pt-1">
                        {(course.modules || []).map((m: any, mIdx: number) => (
                          <div key={m.id || mIdx} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Layers className="h-3.5 w-3.5 text-[#2563EB]" />
                              <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{m.title}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-[#6B7280]">
                                {m.completedAt ? `Completed: ${new Date(m.completedAt).toLocaleDateString()}` : "In progress"}
                              </span>
                              <Badge className={cn("text-[9px] font-bold", m.completed ? "bg-[#16A34A] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                {m.completed ? "Done" : "Pending"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 2: PRACTICES */}
          {activeTab === "practices" && (
            <div className="space-y-4">
              {practicesList.length === 0 ? (
                <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                  <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#6B7280]">No practice tracks assigned yet.</p>
                </Card>
              ) : (
                practicesList.map((track) => (
                  <Card key={track.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-[#16A34A]" /> {track.title}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-[#6B7280]">
                          {track.completedChallenges} of {track.totalChallenges} challenges solved
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-[#16A34A]">{track.progress}% Solved</span>
                        <Badge className={cn("text-[10px] font-bold", track.progress === 100 ? "bg-[#16A34A] text-white" : "bg-[#16A34A]/10 text-[#16A34A]")}>
                          {track.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-2.5">
                      <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden">
                        <div className="h-full bg-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${track.progress}%` }} />
                      </div>

                      <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A] pt-1">
                        {(track.challenges || []).map((ch: any, chIdx: number) => (
                          <div key={ch.id || chIdx} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Code2 className="h-3.5 w-3.5 text-[#16A34A]" />
                              <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{ch.title}</span>
                              <Badge variant="outline" className="text-[9px] font-semibold">{ch.difficulty}</Badge>
                            </div>

                            <div className="flex items-center gap-3">
                              {ch.score !== undefined && (
                                <span className="font-bold text-[#16A34A] text-[11px]">{ch.score}% Score</span>
                              )}
                              <span className="text-[11px] text-[#6B7280]">
                                {ch.completedAt ? `Solved: ${ch.completedAt}` : "Not attempted"}
                              </span>
                              <Badge className={cn("text-[9px] font-bold", ch.completed ? "bg-[#16A34A] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                {ch.completed ? "Solved" : "Pending"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ASSESSMENTS */}
          {activeTab === "assessments" && (
            <div className="space-y-4">
              {assessmentsList.length === 0 ? (
                <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                  <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#6B7280]">No assessments assigned or attempted yet.</p>
                </Card>
              ) : (
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                        <tr>
                          <th className="p-4 pl-6">Assessment Title</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Score Obtained</th>
                          <th className="p-4">Completed Date</th>
                          <th className="p-4">Integrity Flags</th>
                          <th className="p-4 pr-6 text-right">Evaluation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {assessmentsList.map((a) => (
                          <tr key={a.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                            <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                              {a.title}
                            </td>
                            <td className="p-4 text-[#6B7280]">{a.type}</td>
                            <td className="p-4 font-bold text-[#16A34A]">{a.scoreObtained}</td>
                            <td className="p-4 text-[#6B7280]">{a.completedDate}</td>
                            <td className="p-4 text-[#6B7280]">{a.integrityViolations}</td>
                            <td className="p-4 pr-6 text-right">
                              <Badge className={cn("text-[10px] font-bold", a.attempted ? "bg-[#16A34A] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                {a.evaluation}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: TIME & LOGINS */}
          {activeTab === "time" && (
            <div className="space-y-6">
              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">My Time Spent On Site</h4>
                    <p className="text-xs text-[#6B7280]">Total Active Time: <strong>{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</strong></p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">{dateRangeLabel}</Badge>
                </div>

                <div className="h-36 w-full flex items-end justify-between px-2 pt-4">
                  {dailyTimeSpent.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1 max-w-[45px]">
                      <div className="w-full flex items-end justify-center h-24">
                        <div
                          style={{ height: `${Math.max(6, item.height)}%` }}
                          className="w-3.5 sm:w-4 rounded-t-md bg-gradient-to-t from-[#2563EB] to-[#60A5FA]"
                        />
                      </div>
                      <span className="text-[10px] text-[#6B7280] mt-1.5">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
                  <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Student Login History
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                      <tr>
                        <th className="p-4 pl-6">Login Timestamp</th>
                        <th className="p-4">Device / Source</th>
                        <th className="p-4">Session Duration</th>
                        <th className="p-4 pr-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                      {loginActivities.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                          <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-[#2563EB]" /> {log.timestamp}
                          </td>
                          <td className="p-4 text-[#6B7280]">{log.device}</td>
                          <td className="p-4 font-bold text-[#111827] dark:text-[#FAFAFA]">{log.duration}</td>
                          <td className="p-4 pr-6 text-right">
                            <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">{log.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

    </div>
  );
}
