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
  Inbox
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EnrolledCourseProgress {
  id: string;
  title: string;
  category: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  totalModules: number;
  completedModules: number;
  lastAccessed: string;
  status: "Completed" | "In Progress" | "Not Started";
  modules: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string;
    score?: number;
    subLessonsCount: number;
    completedLessonsCount: number;
  }>;
}

interface LoginActivity {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  ipAddress: string;
  device: string;
  browser: string;
  duration: string;
  status: "Active" | "Completed";
}

interface ActivityItem {
  id: string;
  title: string;
  type: "module" | "practice" | "assessment" | "login";
  courseTitle?: string;
  timestamp: string;
  date: string;
  score?: number;
  status: string;
}

interface AssessmentLogItem {
  id: string;
  assessmentTitle: string;
  type: string;
  completedDate: string;
  date: string;
  scoreObtained: string;
  rawScore?: number;
  violations: string;
  evaluation: string;
  status: string;
}

export default function StudentReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all">("7d");
  const [activeTab, setActiveTab] = useState<"overview" | "modules" | "logins" | "assessments">("overview");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [moduleSearch, setModuleSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic state populated strictly from backend
  const [totalCoursesEnrolled, setTotalCoursesEnrolled] = useState<number>(0);
  const [completedCoursesCount, setCompletedCoursesCount] = useState<number>(0);
  const [activitiesCompletedCount, setActivitiesCompletedCount] = useState<number>(0);
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState<number>(0);
  const [courses, setCourses] = useState<EnrolledCourseProgress[]>([]);
  const [dailyTimeSpent, setDailyTimeSpent] = useState<Array<{ day: string; label: string; minutes: number; display: string; height: number }>>([]);
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);
  const [completedModuleLogs, setCompletedModuleLogs] = useState<ActivityItem[]>([]);
  const [assessmentLogs, setAssessmentLogs] = useState<AssessmentLogItem[]>([]);

  // Fetch 100% dynamic reports from API
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/reports?range=${dateRange}`);
      const data = await res.json();

      if (data.reports) {
        setTotalCoursesEnrolled(data.reports.totalCoursesEnrolled || 0);
        setCompletedCoursesCount(data.reports.completedCoursesCount || 0);
        setActivitiesCompletedCount(data.reports.activitiesCompletedCount || 0);
        setTotalTimeSpentSeconds(data.reports.totalTimeSpentSeconds || 0);
        setCourses(data.reports.courses || []);
        setDailyTimeSpent(data.reports.dailyTimeSpent || []);
        setLoginActivities(data.reports.loginActivities || []);
        setCompletedModuleLogs(data.reports.completedModuleLogs || []);
        setAssessmentLogs(data.reports.assessmentLogs || []);
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
    const today = new Date();
    const formatDate = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
    
    switch (dateRange) {
      case "7d": {
        const start = new Date(today.getTime() - 6 * 86400000);
        return `${formatDate(start)} - ${formatDate(today)}`;
      }
      case "14d": {
        const start = new Date(today.getTime() - 13 * 86400000);
        return `${formatDate(start)} - ${formatDate(today)}`;
      }
      case "30d": {
        const start = new Date(today.getTime() - 29 * 86400000);
        return `${formatDate(start)} - ${formatDate(today)}`;
      }
      case "all":
        return "All Lifetime Learning Records";
    }
  }, [dateRange]);

  // Filtered courses for Course Progress
  const filteredCourses = useMemo(() => {
    if (selectedCourseFilter === "all") return courses;
    return courses.filter((c) => c.id === selectedCourseFilter);
  }, [courses, selectedCourseFilter]);

  // Filtered modules search across enrolled courses
  const allModulesList = useMemo(() => {
    const list: Array<{
      moduleId: string;
      moduleTitle: string;
      courseTitle: string;
      completed: boolean;
      completedAt?: string;
      score?: number;
      lessonsCount: number;
    }> = [];

    courses.forEach((c) => {
      (c.modules || []).forEach((m) => {
        list.push({
          moduleId: m.id,
          moduleTitle: m.title,
          courseTitle: c.title,
          completed: m.completed,
          completedAt: m.completedAt ? new Date(m.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
          score: m.score,
          lessonsCount: m.subLessonsCount,
        });
      });
    });

    if (!moduleSearch.trim()) return list;
    const q = moduleSearch.toLowerCase();
    return list.filter(
      (m) =>
        m.moduleTitle.toLowerCase().includes(q) ||
        m.courseTitle.toLowerCase().includes(q)
    );
  }, [courses, moduleSearch]);

  // Export full CSV report
  const handleExportCsv = () => {
    if (allModulesList.length === 0 && assessmentLogs.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No learning activity records found to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = "Category,Title,Course / Details,Completed Date,Score / Result,Status\n";
    const moduleRows = allModulesList.map(
      (m) => `"Module","${m.moduleTitle}","${m.courseTitle}","${m.completedAt || 'Pending'}","${m.score ? m.score + '%' : 'N/A'}","${m.completed ? 'Completed' : 'In Progress'}"`
    );
    const assessRows = assessmentLogs.map(
      (a) => `"Assessment","${a.assessmentTitle}","${a.type}","${a.completedDate}","${a.scoreObtained}","${a.evaluation}"`
    );

    const blob = new Blob([headers + [...moduleRows, ...assessRows].join("\n")], { type: "text/csv;charset=utf-8;" });
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
      {/* 1. Header & Date Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                Reports Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] border border-[#2563EB]/20">
              <Calendar className="h-3.5 w-3.5" />
              {dateRangeLabel}
            </span>
            <span className="text-xs text-[#6B7280]">
              Real-time student engagement & module completion analytics
            </span>
          </div>
        </div>

        {/* Action Controls: Date Range Dropdown & CSV Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-2 py-1 shadow-xs">
            <span className="text-[11px] font-semibold text-[#6B7280] pl-1">Date:</span>
            <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
              <SelectTrigger className="h-8 text-xs font-bold border-0 bg-transparent shadow-none focus:ring-0 w-[125px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="14d">Last 14 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="h-10 text-xs font-bold rounded-xl gap-2 bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA]"
          >
            <Download className="h-4 w-4 text-[#2563EB]" /> Export Report (CSV)
          </Button>
        </div>
      </div>

      {/* 2. Top-Level Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "overview"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
            activeTab === "modules"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Course & Module Progress
        </button>
        <button
          onClick={() => setActiveTab("logins")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
            activeTab === "logins"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          )}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Login & Time History
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
          <Award className="h-3.5 w-3.5" />
          Assessments & Practices
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          <p className="text-sm font-medium">Loading real learning analytics...</p>
        </div>
      ) : (
        <>
          {/* 3. 4 Key Performance Metric Cards - Dynamic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: TOTAL COURSES ENROLLED */}
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Total Courses Enrolled
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] flex items-center justify-center">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#D97706] dark:text-[#F59E0B]">
                    {totalCoursesEnrolled}
                  </p>
                  <p className="text-[11px] text-[#6B7280] mt-1">Active assigned curriculum</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: COURSE COMPLETED */}
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Course Completed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] dark:bg-[#064E3B]/30 text-[#16A34A] flex items-center justify-center">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#16A34A]">
                    {completedCoursesCount}
                  </p>
                  <p className="text-[11px] text-[#6B7280] mt-1">100% finished courses</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: ACTIVITIES COMPLETED */}
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Activities Completed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] dark:bg-[#4C1D95]/30 text-[#7C3AED] flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <p className="text-3xl font-extrabold text-[#16A34A]">
                    {activitiesCompletedCount}
                  </p>
                  {activitiesCompletedCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] dark:bg-[#14532D]/40 px-1.5 py-0.5 rounded">
                      ↑ 100% Up
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280]">Evaluated attempts & submissions</p>
              </CardContent>
            </Card>

            {/* Card 4: TIME SPENT ON SITE */}
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Time Spent On Site
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] dark:bg-[#78350F]/30 text-[#D97706] flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl sm:text-[22px] font-extrabold text-[#111827] dark:text-[#FAFAFA] tracking-tight">
                    {formatTimeSpent(totalTimeSpentSeconds)}
                  </p>
                  <p className="text-[10px] text-[#6B7280]">Active evaluation and learning time</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 4. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-7">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Widget 1: My Time Spent On Site Chart */}
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                  <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                      My Time Spent On Site
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5">
                      {dateRange === "all" ? "All Time" : `Last ${dateRange}`}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                    {dailyTimeSpent.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#6B7280]">
                        No activity recorded in this period.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-44 w-full relative flex items-end justify-between px-2 pt-6">
                          {dailyTimeSpent.map((item, idx) => (
                            <div key={idx} className="relative z-10 flex flex-col items-center group flex-1 max-w-[50px]">
                              {/* Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#111827] text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none shadow-lg whitespace-nowrap z-20">
                                {item.day}: {item.display}
                              </div>

                              {/* Bar Pillar */}
                              <div className="w-full flex items-end justify-center h-32">
                                <div
                                  style={{ height: `${Math.max(6, item.height)}%` }}
                                  className={cn(
                                    "w-3.5 sm:w-5 rounded-t-md transition-all duration-500 group-hover:w-6",
                                    item.minutes > 60
                                      ? "bg-gradient-to-t from-[#2563EB] to-[#60A5FA]"
                                      : item.minutes > 0
                                      ? "bg-gradient-to-t from-[#0D9488] to-[#2DD4BF]"
                                      : "bg-[#E5E7EB] dark:bg-[#27272A]"
                                  )}
                                />
                              </div>

                              <span className="text-[10px] font-medium text-[#6B7280] mt-2 group-hover:text-[#2563EB] group-hover:font-bold">
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                      <Button
                        onClick={() => setActiveTab("logins")}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold text-[#D97706] border-[#D97706]/30 hover:bg-[#D97706]/10 rounded-lg gap-1"
                      >
                        View details
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Widget 2: My Course Progress Bar Chart */}
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                  <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                      My Course Progress
                    </CardTitle>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-[#6B7280]">Course:</span>
                      <Select value={selectedCourseFilter} onValueChange={(val: any) => setSelectedCourseFilter(val || "all")}>
                        <SelectTrigger className="h-7 text-[11px] font-bold border-[#E5E7EB] dark:border-[#27272A] w-[130px] rounded-lg">
                          <SelectValue placeholder="All courses" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="all">All courses</SelectItem>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.title.length > 20 ? c.title.slice(0, 20) + "..." : c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    {filteredCourses.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#6B7280]">
                        No assigned courses found for your batch.
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                        {filteredCourses.slice(0, 6).map((course, idx) => (
                          <div key={course.id || idx} className="space-y-1 group">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#111827] dark:text-[#FAFAFA] truncate max-w-[220px] sm:max-w-[280px]">
                                {course.title}
                              </span>
                              <span className="font-bold text-[#0D9488] shrink-0">
                                {course.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-[#E5E7EB] dark:bg-[#27272A] h-2.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${course.progress}%` }}
                                className={cn(
                                  "h-full rounded-full transition-all duration-700",
                                  course.progress >= 80
                                    ? "bg-[#16A34A]"
                                    : course.progress >= 50
                                    ? "bg-[#0D9488]"
                                    : "bg-[#2563EB]"
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end pt-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
                      <Button
                        onClick={() => setActiveTab("modules")}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold text-[#D97706] border-[#D97706]/30 hover:bg-[#D97706]/10 rounded-lg gap-1"
                      >
                        View details
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* Recent Completed Modules Activity Stream */}
              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-[#16A34A]" /> Completed Modules & Activity Milestones
                    </CardTitle>
                    <CardDescription className="text-xs text-[#6B7280]">
                      Real-time log of lessons and assessments finished by you
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setActiveTab("modules")}
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold text-[#2563EB] hover:underline gap-1"
                  >
                    View all modules <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {completedModuleLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-6 w-6 text-[#9CA3AF]" />
                      <p>No completed modules or submissions logged yet.</p>
                      <Link href="/student/my-courses" className="text-[11px] text-[#2563EB] font-bold hover:underline">
                        Start learning courses →
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                      {completedModuleLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] transition-colors">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#16A34A] flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] truncate">
                                {log.title}
                              </h4>
                              <p className="text-[11px] text-[#6B7280] truncate">
                                Curriculum: <strong className="font-semibold text-[#4B5563] dark:text-[#D1D5DB]">{log.courseTitle}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 text-right">
                            {log.score !== undefined && (
                              <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-0 text-[10px] font-bold">
                                {log.score}% Score
                              </Badge>
                            )}
                            <div className="text-[11px] text-[#6B7280]">
                              <Clock className="h-3 w-3 inline mr-1 text-[#9CA3AF]" />
                              {log.timestamp}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 5. COURSE & MODULE PROGRESS TAB */}
          {activeTab === "modules" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
                <div className="relative flex-1 max-w-md">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    placeholder="Search modules or courses..."
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    className="h-10 pl-9 text-xs rounded-xl"
                  />
                </div>
                <div className="text-xs text-[#6B7280] font-medium">
                  Showing <strong>{allModulesList.length}</strong> modules across enrolled courses
                </div>
              </div>

              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                {allModulesList.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-[#9CA3AF]" />
                    <p>No modules found for your enrolled curriculum.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                        <tr>
                          <th className="p-4 pl-6">Module Name</th>
                          <th className="p-4">Associated Course</th>
                          <th className="p-4">Lessons Count</th>
                          <th className="p-4">Completion Date & Time</th>
                          <th className="p-4 pr-6 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {allModulesList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                            <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-[#2563EB] shrink-0" />
                                <span>{item.moduleTitle}</span>
                              </div>
                            </td>
                            <td className="p-4 text-[#6B7280]">
                              <span className="font-semibold text-[#374151] dark:text-[#D1D5DB]">{item.courseTitle}</span>
                            </td>
                            <td className="p-4 text-[#6B7280]">
                              {item.lessonsCount} Sub-Lessons
                            </td>
                            <td className="p-4 text-[#6B7280]">
                              {item.completedAt ? (
                                <span className="font-medium text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-[#16A34A]" /> {item.completedAt}
                                </span>
                              ) : (
                                <span className="text-[#9CA3AF] italic">Not completed yet</span>
                              )}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <Badge
                                className={cn(
                                  "text-[10px] font-bold capitalize",
                                  item.completed
                                    ? "bg-[#16A34A] text-white"
                                    : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]"
                                )}
                              >
                                {item.completed ? "Completed" : "In Progress"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* 6. LOGIN & TIME HISTORY TAB */}
          {activeTab === "logins" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                  <span className="text-xs font-bold text-[#6B7280]">Total Logins Recorded</span>
                  <p className="text-2xl font-extrabold text-[#2563EB] mt-1">{loginActivities.length} Sessions</p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Authenticated student sessions</p>
                </Card>

                <Card className="p-5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                  <span className="text-xs font-bold text-[#6B7280]">Total Active Time</span>
                  <p className="text-2xl font-extrabold text-[#0D9488] mt-1">{formatTimeSpent(totalTimeSpentSeconds)}</p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Across all learning modules</p>
                </Card>

                <Card className="p-5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                  <span className="text-xs font-bold text-[#6B7280]">Session Status</span>
                  <p className="text-2xl font-extrabold text-[#16A34A] mt-1">Authenticated</p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Active Student Portal</p>
                </Card>
              </div>

              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
                  <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Student Login History & Session Records
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6B7280]">
                    Audit trail of student portal authentications and timestamps
                  </CardDescription>
                </CardHeader>
                {loginActivities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#6B7280]">
                    No login records available.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                        <tr>
                          <th className="p-4 pl-6">Login Timestamp</th>
                          <th className="p-4">Device & Access</th>
                          <th className="p-4">Duration</th>
                          <th className="p-4 pr-6 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {loginActivities.map((log) => (
                          <tr key={log.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                            <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#2563EB]" />
                                <span>{log.timestamp}</span>
                              </div>
                            </td>
                            <td className="p-4 text-[#6B7280]">
                              <span className="font-semibold text-[#374151] dark:text-[#D1D5DB] flex items-center gap-1.5">
                                <Laptop className="h-3.5 w-3.5 text-[#6B7280]" /> {log.device}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-[#111827] dark:text-[#FAFAFA]">{log.duration}</td>
                            <td className="p-4 pr-6 text-right">
                              <Badge
                                className={cn(
                                  "text-[10px] font-bold",
                                  log.status === "Active" ? "bg-[#16A34A] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]"
                                )}
                              >
                                {log.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* 7. ASSESSMENTS & PRACTICES TAB */}
          {activeTab === "assessments" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
                  <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Assessment Scores & Coding Submissions
                  </CardTitle>
                  <CardDescription className="text-xs text-[#6B7280]">
                    Evaluations and practical submissions completed by you
                  </CardDescription>
                </CardHeader>
                {assessmentLogs.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-[#9CA3AF]" />
                    <p>No assessment attempts or practice test submissions recorded yet.</p>
                    <Link href="/student/assessments" className="text-[11px] text-[#2563EB] font-bold hover:underline">
                      View available assessments →
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                        <tr>
                          <th className="p-4 pl-6">Assessment Title</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Completed Date</th>
                          <th className="p-4">Score Obtained</th>
                          <th className="p-4">Integrity Violations</th>
                          <th className="p-4 pr-6 text-right">Evaluation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {assessmentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                            <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                              {log.assessmentTitle}
                            </td>
                            <td className="p-4 text-[#6B7280]">{log.type}</td>
                            <td className="p-4 text-[#6B7280]">{log.completedDate}</td>
                            <td className="p-4 font-bold text-[#16A34A]">{log.scoreObtained}</td>
                            <td className="p-4 text-[#6B7280]">{log.violations}</td>
                            <td className="p-4 pr-6 text-right">
                              <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">{log.evaluation}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

    </div>
  );
}
