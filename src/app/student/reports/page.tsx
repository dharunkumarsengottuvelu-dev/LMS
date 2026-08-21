"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Check,
  ArrowLeft,
  CalendarDays,
  Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Interactive SVG Area Line Chart Component
function SmoothTimeLineChart({
  data,
  totalTimeLabel,
  dateRangeLabel,
}: {
  data: Array<{
    day: string;
    label: string;
    fullDate?: string;
    minutes: number;
    display: string;
    activities?: {
      assessmentsCount?: number;
      codingCount?: number;
      courseModulesCount?: number;
      assignmentsCount?: number;
      loginsCount?: number;
    };
  }>;
  totalTimeLabel: string;
  dateRangeLabel: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <p className="text-xs text-muted-foreground">No time activity recorded in this period.</p>;
  }

  const width = 800;
  const height = 190;
  const paddingX = 35;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const maxMins = Math.max(...data.map((d) => d.minutes), 60);

  const points = data.map((item, index) => {
    const x = paddingX + (index / Math.max(1, data.length - 1)) * chartWidth;
    const y = height - paddingY - (item.minutes / maxMins) * chartHeight;
    return { x, y, item, index };
  });

  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  if (!firstPt || !lastPt) return null;

  // Generate smooth cubic bezier SVG path
  let pathD = `M ${firstPt.x},${firstPt.y}`;
  if (points.length === 1) {
    pathD = `M ${paddingX},${firstPt.y} L ${width - paddingX},${firstPt.y}`;
  } else {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      if (p0 && p1) {
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        pathD += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p1.x},${p1.y}`;
      }
    }
  }

  const areaD = `${pathD} L ${lastPt.x},${height - paddingY} L ${firstPt.x},${height - paddingY} Z`;
  const activePt = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="w-full space-y-3">
      {/* Chart Top Header & Overall Usage Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#2563EB]" />
            Site Engagement & Active Time Distribution
          </h4>
          <p className="text-xs text-[#6B7280]">
            Overall Site Usage: <strong className="text-[#2563EB] dark:text-[#60A5FA] font-extrabold">{totalTimeLabel}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] text-[#6B7280] italic hidden sm:inline">Hover on the line to see daily tasks & time</span>
          <Badge variant="outline" className="text-[10px] font-bold">{dateRangeLabel}</Badge>
        </div>
      </div>

      {/* SVG Smooth Line Chart Container with Interactive Cursor Card */}
      <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#F0F7FF]/50 dark:from-[#1E3A8A]/10 to-transparent p-3 border border-[#E5E7EB]/60 dark:border-[#27272A]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 sm:h-56 overflow-visible">
          <defs>
            <linearGradient id="studentTimeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="studentTimeStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
          <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="currentColor" strokeOpacity="0.15" />

          {/* Gradient Filled Area */}
          <path d={areaD} fill="url(#studentTimeAreaGrad)" />

          {/* Spline Line */}
          <path d={pathD} fill="none" stroke="url(#studentTimeStrokeGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover Crosshair Vertical Guide */}
          {activePt && (
            <line
              x1={activePt.x}
              y1={paddingY - 5}
              x2={activePt.x}
              y2={height - paddingY}
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="transition-all duration-150"
            />
          )}

          {/* Invisible vertical hover capture bands for effortless mouse tracking */}
          {points.map((pt, i) => {
            const colWidth = chartWidth / Math.max(1, points.length - 1);
            const xLeft = Math.max(0, pt.x - colWidth / 2);
            return (
              <rect
                key={`band-${i}`}
                x={xLeft}
                y={0}
                width={colWidth}
                height={height}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}

          {/* Interactive Data Points */}
          {points.map((pt, i) => (
            <g key={i} className="cursor-pointer pointer-events-none">
              {hoveredIndex === i && (
                <circle cx={pt.x} cy={pt.y} r="10" fill="#2563EB" fillOpacity="0.25" className="animate-ping" />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 6.5 : pt.item.minutes > 0 ? 4.5 : 3}
                fill={hoveredIndex === i ? "#2563EB" : pt.item.minutes > 0 ? "#2563EB" : "#9CA3AF"}
                stroke="#FFFFFF"
                strokeWidth={hoveredIndex === i ? 2.5 : 1.5}
              />
            </g>
          ))}
        </svg>

        {/* Rich Glassmorphic Tooltip Card displaying EXACT activities and site time */}
        {activePt && (
          <div
            className="absolute top-2 z-30 transform -translate-x-1/2 transition-all duration-150 pointer-events-none"
            style={{
              left: `${Math.max(18, Math.min(82, (activePt.x / width) * 100))}%`,
            }}
          >
            <div className="bg-[#0F172A]/95 dark:bg-[#090D16]/95 backdrop-blur-md text-white border border-[#334155] rounded-xl p-3.5 shadow-2xl min-w-[240px] max-w-[320px] text-xs space-y-2.5">
              {/* Date & Time Header */}
              <div className="flex items-center justify-between border-b border-[#334155] pb-2 gap-2">
                <div>
                  <p className="text-[11px] font-bold text-[#94A3B8]">
                    {activePt.item.fullDate || activePt.item.label}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                    <span className="text-sm font-extrabold text-[#60A5FA]">
                      {activePt.item.minutes > 0 ? (activePt.item.display || `${activePt.item.minutes}m`) : "0m"} on site
                    </span>
                  </div>
                </div>
                <Badge
                  className={cn(
                    "text-[9px] font-bold",
                    activePt.item.minutes >= 45
                      ? "bg-[#16A34A] text-white"
                      : activePt.item.minutes > 0
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#334155] text-[#94A3B8]"
                  )}
                >
                  {activePt.item.minutes >= 45 ? "🔥 High Activity" : activePt.item.minutes > 0 ? "⚡ Active" : "💤 Rest Day"}
                </Badge>
              </div>

              {/* What they did on this date */}
              <div className="space-y-1.5 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Candidate Activity on this Day:</p>
                {activePt.item.minutes > 0 ? (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-[#F1F5F9]">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="h-3 w-3 text-[#16A34A]" /> Practice & Coding:
                      </span>
                      <strong className="text-white">
                        {activePt.item.activities?.codingCount ? `${activePt.item.activities.codingCount} problem runs` : "Interactive labs"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[#F1F5F9]">
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3 text-[#D97706]" /> Exams & Assessments:
                      </span>
                      <strong className="text-white">
                        {activePt.item.activities?.assessmentsCount ? `${activePt.item.activities.assessmentsCount} tests taken` : "Evaluations"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[#F1F5F9]">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-[#2563EB]" /> Course Syllabus:
                      </span>
                      <strong className="text-white">
                        {activePt.item.activities?.courseModulesCount ? `${activePt.item.activities.courseModulesCount} lessons finished` : "Lessons progress"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[#F1F5F9]">
                      <span className="flex items-center gap-1.5">
                        <Laptop className="h-3 w-3 text-[#A855F7]" /> Platform Logins:
                      </span>
                      <strong className="text-white">
                        {activePt.item.activities?.loginsCount || 1} active session
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#94A3B8] italic">No candidate learning activity recorded on this day.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* X-axis date labels */}
        <div className="flex justify-between items-center px-4 pt-2 text-[10px] text-[#6B7280] font-semibold overflow-x-auto no-scrollbar">
          {data.map((item, idx) => {
            const showLabel = data.length <= 10 || idx % Math.ceil(data.length / 8) === 0 || idx === data.length - 1;
            return (
              <span
                key={idx}
                className={cn("whitespace-nowrap transition-colors cursor-pointer", hoveredIndex === idx ? "text-[#2563EB] font-bold" : "")}
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                {showLabel ? item.label : ""}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function StudentReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all" | "custom">("7d");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"courses" | "practices" | "assessments" | "time">("courses");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic state populated strictly from backend + local session sync
  const [reportSummary, setReportSummary] = useState<any>({});
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [practicesList, setPracticesList] = useState<any[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [dailyTimeSpent, setDailyTimeSpent] = useState<any[]>([]);
  const [loginActivities, setLoginActivities] = useState<any[]>([]);

  // Synchronize client-side practice state with local session answers (to match Image 2)
  const enrichWithLocalPracticeSessions = (rawPractices: any[]) => {
    if (typeof window === "undefined") return rawPractices;
    return rawPractices.map((track) => {
      let totalTrackQ = 0;
      let totalAnsweredQ = 0;
      let allCompleted = true;

      const challenges = (track.challenges || []).map((ch: any) => {
        let answeredCount = ch.answeredCount || 0;
        let totalQ = ch.totalQuestions || ch.questionCount || 10;
        let isDone = ch.completed || false;
        let startedAt = ch.startedAt || "Not started";
        let completedAt = ch.completedAt || null;

        try {
          const sessionKey = `lms_practice_session_${ch.id}`;
          const session = localStorage.getItem(sessionKey);
          const submittedMarker = localStorage.getItem(`${sessionKey}_submitted`);
          const resultKey = `lms_completed_assessment_${ch.id}`;
          const resStr = localStorage.getItem(resultKey);

          if (session && !submittedMarker) {
            const parsed = JSON.parse(session);
            const answeredKeys = new Set<string>();
            Object.entries(parsed.answers || {}).forEach(([k, v]) => {
              if (v && ((Array.isArray(v) && v.length > 0) || (typeof v === "string" && v.trim().length > 0) || (typeof v === "object" && (v as any).code?.trim().length > 0))) {
                answeredKeys.add(k);
              }
            });
            Object.entries(parsed.codeAnswers || {}).forEach(([k, v]: any) => {
              if (v && v.code && v.code.trim().length > 0) answeredKeys.add(k);
            });
            answeredCount = Math.min(totalQ, answeredKeys.size);
            if (answeredCount > 0) {
              startedAt = startedAt === "Not started" || startedAt === "Not Started" ? "Today" : startedAt;
            }
          }
          if (resStr || submittedMarker === "true") {
            isDone = true;
            answeredCount = totalQ;
            completedAt = completedAt || "Completed";
          }
        } catch {}

        totalTrackQ += totalQ;
        totalAnsweredQ += isDone ? totalQ : answeredCount;
        if (!isDone) allCompleted = false;

        const chProgress = isDone ? 100 : totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
        const status = isDone ? "Completed" : answeredCount > 0 ? `In Progress (${answeredCount}/${totalQ} Qs)` : "Pending";

        return {
          ...ch,
          totalQuestions: totalQ,
          answeredCount,
          progress: chProgress,
          status,
          completed: isDone,
          startedAt,
          completedAt,
          attemptsCount: isDone || answeredCount > 0 ? Math.max(ch.attemptsCount || 0, 1) : 0,
        };
      });

      const trackProgress = totalTrackQ > 0 ? Math.round((totalAnsweredQ / totalTrackQ) * 100) : allCompleted ? 100 : 0;
      const trackStatus = trackProgress === 100 ? "Completed" : trackProgress > 0 ? "In Progress" : "Not Started";

      return {
        ...track,
        progress: trackProgress,
        status: trackStatus,
        completedChallenges: challenges.filter((c: any) => c.completed).length,
        totalTrackQ,
        totalAnsweredQ,
        challenges,
      };
    });
  };

  // Fetch 100% dynamic reports from API
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/student/reports?range=${dateRange}`;
      if (dateRange === "custom" && customFromDate && customToDate) {
        url = `/api/student/reports?from=${customFromDate}&to=${customToDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.reports) {
        setReportSummary(data.reports.summary || {});
        setCoursesList(data.reports.coursesList || []);
        const enrichedPractices = enrichWithLocalPracticeSessions(data.reports.practicesList || []);
        setPracticesList(enrichedPractices);
        setAssessmentsList(data.reports.assessmentsList || []);
        setDailyTimeSpent(data.reports.dailyTimeSpent || []);
        setLoginActivities(data.reports.loginActivities || []);
      }
    } catch (err) {
      console.error("Failed to load real reports data", err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, customFromDate, customToDate]);

  useEffect(() => {
    if (dateRange !== "custom" || (customFromDate && customToDate)) {
      fetchReportData();
    }
  }, [fetchReportData, dateRange]);

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
      case "custom":
        if (customFromDate && customToDate) {
          const f = new Date(customFromDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const t = new Date(customToDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return `${f} - ${t}`;
        }
        return "Custom Range";
    }
  }, [dateRange, customFromDate, customToDate]);

  const handleApplyCustomRange = () => {
    if (!customFromDate || !customToDate) {
      toast({
        title: "Incomplete Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    if (new Date(customFromDate) > new Date(customToDate)) {
      toast({
        title: "Invalid Range",
        description: "Start date cannot be after end date.",
        variant: "destructive",
      });
      return;
    }
    setDateRange("custom");
    setIsCustomModalOpen(false);
    toast({
      title: "Date Filter Applied",
      description: `Showing report data from ${customFromDate} to ${customToDate}.`,
    });
  };

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
      (p) => `"Practice Track","${p.title}","${p.completedChallenges}/${p.totalChallenges} Solved","N/A","${p.progress}%","${p.status}"`
    );
    const assessmentRows = assessmentsList.map(
      (a) => `"Assessment","${a.title}","${a.type}","${a.completedDate}","${a.scoreObtained}","${a.evaluation}"`
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...courseRows, ...practiceRows, ...assessmentRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Learning_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Completed",
      description: "Learning activity and evaluation report exported successfully.",
    });
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Header with Back Button and Date Range Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-10 px-3.5 text-xs font-semibold gap-2 border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-white dark:bg-[#18181B] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
          >
            <ArrowLeft className="h-4 w-4 text-[#2563EB]" />
            Back
          </Button>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-[#FAFAFA] tracking-tight">
              Learning Reports & Performance Analytics
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Live comprehensive report for Courses, Practice Labs, Proctored Assessments, and Platform Time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-10 px-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-xs font-bold text-[#2563EB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] flex items-center gap-2 shadow-xs transition-colors">
              <span>{dateRangeLabel}</span>
              <Filter className="h-3.5 w-3.5 text-[#6B7280]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-1.5 rounded-xl shadow-lg">
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

              <DropdownMenuSeparator className="my-1 bg-[#E5E7EB] dark:bg-[#27272A]" />

              <DropdownMenuItem
                onClick={() => setIsCustomModalOpen(true)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                  dateRange === "custom" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>Custom Date to Date...</span>
                </div>
                {dateRange === "custom" && <Check className="h-4 w-4 text-[#2563EB]" />}
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

      {/* 2. Top-Level Tab Switcher */}
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
          {/* TAB 1: COURSES */}
          {activeTab === "courses" && (
            <div className="space-y-4">
              {coursesList.length === 0 ? (
                <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                  <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#6B7280]">No course enrollments found.</p>
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
                          <div key={m.id || mIdx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2">
                              <Layers className="h-3.5 w-3.5 text-[#2563EB]" />
                              <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{m.title}</span>
                              {m.attemptsCount !== undefined && (
                                <Badge variant="outline" className="text-[9px] font-semibold text-[#6B7280]">
                                  {m.attemptsCount} {m.attemptsCount === 1 ? "attempt" : "attempts"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[11px] text-[#6B7280]">
                                {m.startedAt && m.startedAt !== "Not Started" ? `Started: ${m.startedAt}` : "Not Started"}
                              </span>
                              <span className="text-[11px] text-[#6B7280]">
                                {m.completedAt ? `Completed: ${m.completedAt}` : "Pending"}
                              </span>
                              <Badge className={cn("text-[9px] font-bold", m.completed ? "bg-[#16A34A] text-white" : m.startedAt && m.startedAt !== "Not Started" ? "bg-[#D97706] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                {m.completed ? "Completed" : m.startedAt && m.startedAt !== "Not Started" ? "In Progress" : "Pending"}
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

          {/* TAB 2: PRACTICES (Matching Image 2 Rich Layout) */}
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
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] font-bold bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 text-[#2563EB] border-[#BFDBFE]">
                            {track.category || "Java"}
                          </Badge>
                          <span className="text-[11px] text-[#6B7280]">Assigned By: {track.assignedByName || "Admin"}</span>
                        </div>
                        <CardTitle className="text-base font-extrabold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <Dumbbell className="h-5 w-5 text-[#16A34A]" /> {track.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-[#6B7280] mt-0.5">
                          {track.description || "Practice track for students."}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#6B7280]">Track Completion:</span>
                          <span className="text-sm font-extrabold text-[#16A34A]">{track.progress}%</span>
                          <Badge className={cn("text-[10px] font-bold", track.progress === 100 ? "bg-[#16A34A] text-white" : track.progress > 0 ? "bg-[#D97706] text-white" : "bg-[#16A34A]/10 text-[#16A34A]")}>
                            {track.status}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-[#6B7280]">
                          {track.completedChallenges || 0} of {track.totalChallenges || (track.challenges || []).length} Modules Completed ({track.totalAnsweredQ || 0}/{track.totalTrackQ || 10} Qs Answered)
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      <div className="h-2 w-full bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden">
                        <div className="h-full bg-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${track.progress}%` }} />
                      </div>

                      <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A] pt-1">
                        {(track.challenges || []).map((ch: any, chIdx: number) => (
                          <div key={ch.id || chIdx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] font-bold bg-[#F3F4F6] dark:bg-[#27272A]">
                                  Module {chIdx + 1}
                                </Badge>
                                <Badge className="bg-[#2563EB] text-white text-[9px] font-bold uppercase tracking-wider">
                                  {ch.type === "mcq" ? "MCQ QUIZ" : "CODING EXERCISE"}
                                </Badge>
                                <Badge className={cn("text-[10px] font-bold", ch.completed ? "bg-[#16A34A] text-white" : ch.answeredCount > 0 ? "bg-[#D97706] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                  {ch.completed ? "Completed" : ch.answeredCount > 0 ? `In Progress (${ch.answeredCount}/${ch.totalQuestions || 10} Qs)` : "Not Started"}
                                </Badge>
                              </div>

                              <p className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                                <Code2 className="h-4 w-4 text-[#16A34A]" /> {ch.title}
                              </p>
                              <p className="text-[11px] text-[#6B7280]">
                                {ch.description || "Interactive coding practice module."} • {ch.totalQuestions || 10} Questions (0 MCQs, {ch.totalQuestions || 10} Coding) • 100 Marks
                              </p>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap sm:justify-end">
                              <div className="text-right">
                                <p className="font-extrabold text-sm text-[#2563EB]">{ch.progress || (ch.completed ? 100 : 0)}%</p>
                                <p className="text-[10px] text-[#6B7280]">
                                  {ch.completedAt ? `Completed: ${ch.completedAt}` : ch.startedAt && ch.startedAt !== "Not Started" ? `Started: ${ch.startedAt}` : "Pending"}
                                </p>
                              </div>

                              <Link href={`/student/assessments/${ch.id}?trackId=${track.id}`}>
                                <Button size="sm" className="h-9 px-3 text-xs font-bold gap-1.5 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl shadow-xs">
                                  <Play className="h-3.5 w-3.5 fill-current" /> {ch.completed ? "Review Module" : ch.answeredCount > 0 ? "Continue Module" : "Start Module"}
                                </Button>
                              </Link>
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
                          <th className="p-4">Attempts</th>
                          <th className="p-4">Started Date</th>
                          <th className="p-4">Completed Date</th>
                          <th className="p-4">Score Obtained</th>
                          <th className="p-4">Integrity Flags</th>
                          <th className="p-4 pr-6 text-right">Status / Evaluation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {assessmentsList.map((a) => (
                          <tr key={a.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                            <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                              {a.title}
                            </td>
                            <td className="p-4 text-[#6B7280]">{a.type}</td>
                            <td className="p-4 text-[#6B7280]">
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {a.attemptsCount || (a.attempted ? 1 : 0)} {(a.attemptsCount || (a.attempted ? 1 : 0)) === 1 ? "attempt" : "attempts"}
                              </Badge>
                            </td>
                            <td className="p-4 text-[#6B7280]">{a.startedAt || "Not Started"}</td>
                            <td className="p-4 text-[#6B7280]">{a.completedDate || "Pending"}</td>
                            <td className="p-4 font-bold text-[#16A34A]">{a.scoreObtained}</td>
                            <td className="p-4 text-[#6B7280]">{a.integrityViolations}</td>
                            <td className="p-4 pr-6 text-right">
                              <Badge className={cn("text-[10px] font-bold", a.attempted ? (a.rawScore >= 50 ? "bg-[#16A34A] text-white" : "bg-[#D97706] text-white") : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                {a.evaluation || a.status || "Pending"}
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

          {/* TAB 4: TIME & LOGINS (Interactive SVG Line Chart + Overall Site Usage) */}
          {activeTab === "time" && (
            <div className="space-y-6">
              {/* 1. Interactive SVG Area Line Chart */}
              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden p-6 space-y-4">
                <SmoothTimeLineChart
                  data={dailyTimeSpent}
                  totalTimeLabel={formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}
                  dateRangeLabel={dateRangeLabel}
                />
              </Card>

              {/* 2. Total Site Usage Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[#6B7280]">Total Active Time</span>
                  <p className="text-2xl font-extrabold text-[#2563EB]">{formatTimeSpent(reportSummary.totalTimeSpentSeconds || 0)}</p>
                  <p className="text-[11px] text-[#6B7280]">Overall platform engagement</p>
                </Card>
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[#6B7280]">Course Modules</span>
                  <p className="text-2xl font-extrabold text-[#0D9488]">{coursesList.reduce((acc, c) => acc + (c.completedModules || 0), 0)} Completed</p>
                  <p className="text-[11px] text-[#6B7280]">Video lessons & syllabus</p>
                </Card>
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[#6B7280]">Practice Labs</span>
                  <p className="text-2xl font-extrabold text-[#16A34A]">{practicesList.reduce((acc, p) => acc + (p.completedChallenges || 0), 0)} Solved</p>
                  <p className="text-[11px] text-[#6B7280]">Interactive coding challenges</p>
                </Card>
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[#6B7280]">Evaluations Taken</span>
                  <p className="text-2xl font-extrabold text-[#D97706]">{assessmentsList.filter((a) => a.attempted).length} Finished</p>
                  <p className="text-[11px] text-[#6B7280]">Proctored exams & tests</p>
                </Card>
              </div>

              {/* 3. Login Audit */}
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

      {/* Custom Date to Date Modal Dialog */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#2563EB]" /> Custom Date Range Filter
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Select start date and end date to filter your student learning activities and reports.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">From Date</Label>
              <Input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">To Date</Label>
              <Input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button
              variant="outline"
              onClick={() => setIsCustomModalOpen(false)}
              className="text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyCustomRange}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl"
            >
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
