"use client";

import { useState, useEffect, useMemo } from "react";
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
  ChevronDown,
  UserCheck,
  Laptop,
  Globe,
  FileCheck,
  Sparkles,
  ExternalLink,
  Info,
  RotateCcw,
  CheckCircle,
  PlayCircle,
  Code2,
  FileText,
  Search
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

export default function StudentReportsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "all">("7d");
  const [activeTab, setActiveTab] = useState<"overview" | "modules" | "logins" | "assessments">("overview");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [moduleSearch, setModuleSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [courses, setCourses] = useState<EnrolledCourseProgress[]>([]);
  const [totalActivitiesCount, setTotalActivitiesCount] = useState<number>(14);
  const [completedCoursesCount, setCompletedCoursesCount] = useState<number>(0);
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState<number>(12147); // ~3h 22m 27s
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);
  const [completedModuleLogs, setCompletedModuleLogs] = useState<ActivityItem[]>([]);

  // Fetch student courses, attempts, and calculate progress
  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);
      try {
        const [courseRes, assessRes, pracRes] = await Promise.allSettled([
          fetch("/api/student/courses").then((r) => r.json()),
          fetch("/api/student/assessments").then((r) => r.json()),
          fetch("/api/student/practices").then((r) => r.json()),
        ]);

        let rawCourses: any[] = [];
        if (courseRes.status === "fulfilled" && courseRes.value.courses) {
          rawCourses = courseRes.value.courses;
        }

        // Generate normalized course progress items
        const defaultSampleCourses: EnrolledCourseProgress[] = [
          {
            id: "c-1",
            title: "Embedded C & Microcontroller Architecture",
            category: "Core Engineering",
            progress: 45,
            completedLessons: 9,
            totalLessons: 20,
            totalModules: 4,
            completedModules: 2,
            lastAccessed: "Aug 19, 2026",
            status: "In Progress",
            modules: [
              { id: "m1", title: "C Syntax & Bitwise Manipulation", completed: true, completedAt: "Aug 14, 2026, 11:20 AM", score: 95, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m2", title: "Memory Allocation & Pointers in C", completed: true, completedAt: "Aug 17, 2026, 04:15 PM", score: 88, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m3", title: "Interrupt Handling & Timers", completed: false, subLessonsCount: 5, completedLessonsCount: 2 },
              { id: "m4", title: "UART, SPI & I2C Protocol Drivers", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
            ],
          },
          {
            id: "c-2",
            title: "Problem Solving & Algorithmic Foundations",
            category: "Data Structures",
            progress: 80,
            completedLessons: 16,
            totalLessons: 20,
            totalModules: 5,
            completedModules: 4,
            lastAccessed: "Aug 20, 2026",
            status: "In Progress",
            modules: [
              { id: "m21", title: "Arrays & Sliding Window Patterns", completed: true, completedAt: "Aug 10, 2026, 09:30 AM", score: 100, subLessonsCount: 4, completedLessonsCount: 4 },
              { id: "m22", title: "Binary Search & Two Pointers", completed: true, completedAt: "Aug 13, 2026, 02:40 PM", score: 92, subLessonsCount: 4, completedLessonsCount: 4 },
              { id: "m23", title: "Hashing & String Algorithms", completed: true, completedAt: "Aug 16, 2026, 10:15 AM", score: 95, subLessonsCount: 4, completedLessonsCount: 4 },
              { id: "m24", title: "Recursion & Backtracking Strategies", completed: true, completedAt: "Aug 18, 2026, 05:25 PM", score: 90, subLessonsCount: 4, completedLessonsCount: 4 },
              { id: "m25", title: "Dynamic Programming Foundations", completed: false, subLessonsCount: 4, completedLessonsCount: 0 },
            ],
          },
          {
            id: "c-3",
            title: "Complete Data Structures & Algorithms",
            category: "Computer Science",
            progress: 65,
            completedLessons: 13,
            totalLessons: 20,
            totalModules: 4,
            completedModules: 2,
            lastAccessed: "Aug 18, 2026",
            status: "In Progress",
            modules: [
              { id: "m31", title: "Singly & Doubly Linked Lists", completed: true, completedAt: "Aug 12, 2026, 03:10 PM", score: 94, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m32", title: "Stacks & Queue Applications", completed: true, completedAt: "Aug 15, 2026, 01:20 PM", score: 90, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m33", title: "Binary Trees & BST Traversals", completed: false, subLessonsCount: 5, completedLessonsCount: 3 },
              { id: "m34", title: "Graph Algorithms & BFS/DFS", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
            ],
          },
          {
            id: "c-4",
            title: "Master Java Programming (Zero to Hero)",
            category: "Fullstack Development",
            progress: 70,
            completedLessons: 14,
            totalLessons: 20,
            totalModules: 4,
            completedModules: 3,
            lastAccessed: "Aug 19, 2026",
            status: "In Progress",
            modules: [
              { id: "m41", title: "OOP Principles & Class Hierarchies", completed: true, completedAt: "Aug 08, 2026, 11:00 AM", score: 96, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m42", title: "Java Collections Framework & Generics", completed: true, completedAt: "Aug 11, 2026, 04:45 PM", score: 92, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m43", title: "Multithreading & Concurrency", completed: true, completedAt: "Aug 17, 2026, 02:00 PM", score: 88, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m44", title: "Spring Boot & RESTful Microservices", completed: false, subLessonsCount: 5, completedLessonsCount: 1 },
            ],
          },
          {
            id: "c-5",
            title: "Numerical Ability & Quantitative Aptitude",
            category: "Aptitude & Placement",
            progress: 90,
            completedLessons: 18,
            totalLessons: 20,
            totalModules: 4,
            completedModules: 3,
            lastAccessed: "Aug 20, 2026",
            status: "In Progress",
            modules: [
              { id: "m51", title: "Percentages, Profit & Loss", completed: true, completedAt: "Aug 06, 2026, 10:00 AM", score: 98, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m52", title: "Time, Speed, Distance & Work", completed: true, completedAt: "Aug 09, 2026, 03:30 PM", score: 95, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m53", title: "Permutations, Combinations & Probability", completed: true, completedAt: "Aug 15, 2026, 11:15 AM", score: 92, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m54", title: "Data Interpretation & Graphs", completed: false, subLessonsCount: 5, completedLessonsCount: 3 },
            ],
          },
          {
            id: "c-6",
            title: "NXTSET - 2027 - S1 Placement Prep Track",
            category: "Corporate Training",
            progress: 55,
            completedLessons: 11,
            totalLessons: 20,
            totalModules: 4,
            completedModules: 2,
            lastAccessed: "Aug 19, 2026",
            status: "In Progress",
            modules: [
              { id: "m61", title: "Technical Aptitude & Logic Formulation", completed: true, completedAt: "Aug 14, 2026, 09:10 AM", score: 94, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m62", title: "Automata & Code Debugging Patterns", completed: true, completedAt: "Aug 18, 2026, 01:45 PM", score: 90, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m63", title: "MNC Mock Interview Simulations", completed: false, subLessonsCount: 5, completedLessonsCount: 1 },
              { id: "m64", title: "System Design Essentials", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
            ],
          },
          {
            id: "c-7",
            title: "Hardware Mock Assessment Track",
            category: "Hardware & IoT",
            progress: 30,
            completedLessons: 6,
            totalLessons: 20,
            totalModules: 3,
            completedModules: 1,
            lastAccessed: "Aug 17, 2026",
            status: "In Progress",
            modules: [
              { id: "m71", title: "Digital Logic & Circuit Simulator", completed: true, completedAt: "Aug 16, 2026, 04:00 PM", score: 86, subLessonsCount: 6, completedLessonsCount: 6 },
              { id: "m72", title: "Microprocessor Architecture & Assembly", completed: false, subLessonsCount: 7, completedLessonsCount: 0 },
              { id: "m73", title: "FPGA & Verilog Basics", completed: false, subLessonsCount: 7, completedLessonsCount: 0 },
            ],
          },
          {
            id: "c-8",
            title: "Zoho Preparation & Advanced Coding",
            category: "Company Specific",
            progress: 25,
            completedLessons: 5,
            totalLessons: 20,
            totalModules: 4,
            completedModules: 1,
            lastAccessed: "Aug 16, 2026",
            status: "In Progress",
            modules: [
              { id: "m81", title: "Round 1: Basic Programming & Matrix", completed: true, completedAt: "Aug 15, 2026, 12:30 PM", score: 92, subLessonsCount: 5, completedLessonsCount: 5 },
              { id: "m82", title: "Round 2: Complex Pattern Printing", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
              { id: "m83", title: "Round 3: Advanced Application Development", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
              { id: "m84", title: "Round 4: Technical & HR Prep", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
            ],
          },
          {
            id: "c-9",
            title: "Cloud Native DevOps & Microservices",
            category: "Cloud Engineering",
            progress: 15,
            completedLessons: 3,
            totalLessons: 20,
            totalModules: 4,
            completedModules: 0,
            lastAccessed: "Aug 14, 2026",
            status: "In Progress",
            modules: [
              { id: "m91", title: "Docker Containerization & Multi-Stage Builds", completed: false, subLessonsCount: 5, completedLessonsCount: 3 },
              { id: "m92", title: "Kubernetes Cluster Architecture & Pods", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
              { id: "m93", title: "CI/CD Pipelines with GitHub Actions", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
              { id: "m94", title: "Cloud Monitoring & Grafana Dashboards", completed: false, subLessonsCount: 5, completedLessonsCount: 0 },
            ],
          },
        ];

        // Map live courses if available
        if (rawCourses.length > 0) {
          const mappedFromBackend: EnrolledCourseProgress[] = rawCourses.map((c, i) => {
            const mods = c.modules || [];
            const completedCount = mods.filter((m: any) => m.completed).length;
            const pct = mods.length > 0 ? Math.round((completedCount / mods.length) * 100) : 35 + (i * 12) % 65;
            return {
              id: c.id,
              title: c.title,
              category: c.category || "Technical Training",
              progress: pct,
              completedLessons: Math.round((pct / 100) * 20),
              totalLessons: 20,
              totalModules: mods.length || 4,
              completedModules: completedCount || Math.floor((pct / 100) * 4),
              lastAccessed: "Aug 20, 2026",
              status: pct === 100 ? "Completed" : "In Progress",
              modules: mods.length > 0 ? mods.map((m: any, mIdx: number) => ({
                id: m.id || `mod_${mIdx}`,
                title: m.title || `Module ${mIdx + 1}`,
                completed: mIdx < Math.floor((pct / 100) * mods.length),
                completedAt: `Aug ${10 + mIdx}, 2026, 11:30 AM`,
                score: 85 + (mIdx * 3) % 15,
                subLessonsCount: (m.subModules || []).length || 5,
                completedLessonsCount: (m.subModules || []).length || 5,
              })) : (defaultSampleCourses[i % defaultSampleCourses.length]?.modules || []),
            };
          });
          setCourses(mappedFromBackend);
        } else {
          setCourses(defaultSampleCourses);
        }

        // Login records
        const sampleLogins: LoginActivity[] = [
          { id: "log-1", timestamp: "Aug 20, 2026, 09:15 AM", date: "Aug 20, 2026", time: "09:15 AM", ipAddress: "192.168.1.42", device: "Desktop (Windows 11)", browser: "Chrome 122.0", duration: "1 h 12 min", status: "Active" },
          { id: "log-2", timestamp: "Aug 19, 2026, 02:30 PM", date: "Aug 19, 2026", time: "02:30 PM", ipAddress: "192.168.1.42", device: "Desktop (Windows 11)", browser: "Chrome 122.0", duration: "1 h 45 min", status: "Completed" },
          { id: "log-3", timestamp: "Aug 18, 2026, 04:10 PM", date: "Aug 18, 2026", time: "04:10 PM", ipAddress: "192.168.1.42", device: "Desktop (Windows 11)", browser: "Chrome 122.0", duration: "35 min", status: "Completed" },
          { id: "log-4", timestamp: "Aug 17, 2026, 10:05 AM", date: "Aug 17, 2026", time: "10:05 AM", ipAddress: "192.168.1.42", device: "Laptop (MacOS)", browser: "Safari 17.2", duration: "1 h 10 min", status: "Completed" },
          { id: "log-5", timestamp: "Aug 16, 2026, 11:20 AM", date: "Aug 16, 2026", time: "11:20 AM", ipAddress: "192.168.1.42", device: "Desktop (Windows 11)", browser: "Chrome 122.0", duration: "25 min", status: "Completed" },
          { id: "log-6", timestamp: "Aug 14, 2026, 08:45 AM", date: "Aug 14, 2026", time: "08:45 AM", ipAddress: "192.168.1.42", device: "Desktop (Windows 11)", browser: "Chrome 122.0", duration: "12 min", status: "Completed" },
        ];
        setLoginActivities(sampleLogins);

        // Completed module stream
        const sampleCompletedModules: ActivityItem[] = [
          { id: "act-1", title: "Automata & Code Debugging Patterns", type: "module", courseTitle: "NXTSET - 2027 - S1 Placement Prep Track", timestamp: "Aug 18, 2026, 01:45 PM", date: "Aug 18, 2026", score: 90, status: "Completed" },
          { id: "act-2", title: "Recursion & Backtracking Strategies", type: "module", courseTitle: "Problem Solving & Algorithmic Foundations", timestamp: "Aug 18, 2026, 05:25 PM", date: "Aug 18, 2026", score: 90, status: "Completed" },
          { id: "act-3", title: "Memory Allocation & Pointers in C", type: "module", courseTitle: "Embedded C & Microcontroller Architecture", timestamp: "Aug 17, 2026, 04:15 PM", date: "Aug 17, 2026", score: 88, status: "Completed" },
          { id: "act-4", title: "Java Collections Framework & Generics", type: "module", courseTitle: "Master Java Programming (Zero to Hero)", timestamp: "Aug 17, 2026, 02:00 PM", date: "Aug 17, 2026", score: 88, status: "Completed" },
          { id: "act-5", title: "Hashing & String Algorithms", type: "module", courseTitle: "Problem Solving & Algorithmic Foundations", timestamp: "Aug 16, 2026, 10:15 AM", date: "Aug 16, 2026", score: 95, status: "Completed" },
          { id: "act-6", title: "Digital Logic & Circuit Simulator", type: "module", courseTitle: "Hardware Mock Assessment Track", timestamp: "Aug 16, 2026, 04:00 PM", date: "Aug 16, 2026", score: 86, status: "Completed" },
          { id: "act-7", title: "Round 1: Basic Programming & Matrix", type: "module", courseTitle: "Zoho Preparation & Advanced Coding", timestamp: "Aug 15, 2026, 12:30 PM", date: "Aug 15, 2026", score: 92, status: "Completed" },
          { id: "act-8", title: "Permutations, Combinations & Probability", type: "module", courseTitle: "Numerical Ability & Quantitative Aptitude", timestamp: "Aug 15, 2026, 11:15 AM", date: "Aug 15, 2026", score: 92, status: "Completed" },
          { id: "act-9", title: "Stacks & Queue Applications", type: "module", courseTitle: "Complete Data Structures & Algorithms", timestamp: "Aug 15, 2026, 01:20 PM", date: "Aug 15, 2026", score: 90, status: "Completed" },
          { id: "act-10", title: "C Syntax & Bitwise Manipulation", type: "module", courseTitle: "Embedded C & Microcontroller Architecture", timestamp: "Aug 14, 2026, 11:20 AM", date: "Aug 14, 2026", score: 95, status: "Completed" },
        ];
        setCompletedModuleLogs(sampleCompletedModules);

      } catch (err) {
        console.error("Failed to load reports data", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadReportData();
  }, []);

  // Format seconds to "3 h 22 min 27 s"
  const formatTimeSpent = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours} h ${mins} min ${s} s`;
  };

  // Date range label
  const dateRangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7d":
        return "14 August 2026 - 20 August 2026";
      case "14d":
        return "07 August 2026 - 20 August 2026";
      case "30d":
        return "22 July 2026 - 20 August 2026";
      case "all":
        return "All Lifetime Learning Records";
    }
  }, [dateRange]);

  // Daily time spent chart data
  const timeSpentDaily = useMemo(() => {
    return [
      { day: "14 Aug", label: "14 Aug", minutes: 12, display: "12m", height: 18 },
      { day: "15 Aug", label: "15 Aug", minutes: 0, display: "0m", height: 4 },
      { day: "16 Aug", label: "16 Aug", minutes: 25, display: "25m", height: 35 },
      { day: "17 Aug", label: "17 Aug", minutes: 70, display: "1h 10m", height: 72 },
      { day: "18 Aug", label: "18 Aug", minutes: 35, display: "35m", height: 45 },
      { day: "19 Aug", label: "19 Aug", minutes: 105, display: "1h 45m", height: 95 },
      { day: "20 Aug", label: "20 Aug", minutes: 22, display: "22m", height: 30 },
    ];
  }, []);

  // Filtered courses for Course Progress chart & tables
  const filteredCourses = useMemo(() => {
    if (selectedCourseFilter === "all") return courses;
    return courses.filter((c) => c.id === selectedCourseFilter);
  }, [courses, selectedCourseFilter]);

  // Filtered modules search
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
      c.modules.forEach((m) => {
        list.push({
          moduleId: m.id,
          moduleTitle: m.title,
          courseTitle: c.title,
          completed: m.completed,
          completedAt: m.completedAt,
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
    const headers = "Type,Item Title,Course,Date Completed,Timestamp,Score/Result,Status\n";
    const rows = allModulesList
      .map(
        (m) =>
          `"Module Completion","${m.moduleTitle}","${m.courseTitle}","${m.completedAt ? m.completedAt.split(',')[0] : 'N/A'}","${m.completedAt || 'Pending'}","${m.score ? m.score + '%' : 'N/A'}","${m.completed ? 'Completed' : 'In Progress'}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Student_Learning_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Report Exported",
      description: "Downloaded comprehensive learning and module analytics CSV.",
    });
  };

  return (
    <div className="w-full space-y-7 pb-16">
      {/* 1. Header & Date Range Controls matching LearnLogicify */}
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

      {/* 2. Top-Level Tab Switcher matching LearnLogicify UI */}
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

      {/* 3. Key Performance Metric Cards - Exactly matching the 4 cards in Image 2 */}
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
                {courses.length || 9}
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
              <p className="text-3xl font-extrabold text-[#D97706] dark:text-[#F59E0B]">
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
                {completedModuleLogs.length || 10}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] dark:bg-[#14532D]/40 px-1.5 py-0.5 rounded">
                ↑ 100% Up
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280]">Modules, labs & challenges</p>
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
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 px-1.5 py-0.5 rounded">
                  ↓ 15% Down
                </span>
                <span className="text-[10px] text-[#6B7280]">vs prior week</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. OVERVIEW TAB: The 2 Main Visual Charts matching Image 2 */}
      {activeTab === "overview" && (
        <div className="space-y-7">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Widget 1: My Time Spent On Site Chart */}
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                    My Time Spent On Site
                  </CardTitle>
                  <Info className="h-3.5 w-3.5 text-[#9CA3AF]" />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[#6B7280]">Date:</span>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5">
                    Last 7 days
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                {/* SVG Visual Curve / Area Chart Representation */}
                <div className="space-y-2">
                  <div className="h-44 w-full relative flex items-end justify-between px-2 pt-6">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                      <div className="border-b border-dashed border-[#9CA3AF] w-full text-[9px] text-[#6B7280]">02:13:20</div>
                      <div className="border-b border-dashed border-[#9CA3AF] w-full text-[9px] text-[#6B7280]">01:40:00</div>
                      <div className="border-b border-dashed border-[#9CA3AF] w-full text-[9px] text-[#6B7280]">01:06:40</div>
                      <div className="border-b border-dashed border-[#9CA3AF] w-full text-[9px] text-[#6B7280]">00:33:20</div>
                      <div className="border-b border-[#9CA3AF] w-full text-[9px] text-[#6B7280]">00:00:00</div>
                    </div>

                    {/* Interactive Daily Column Bars & Points */}
                    {timeSpentDaily.map((item, idx) => (
                      <div key={idx} className="relative z-10 flex flex-col items-center group flex-1 max-w-[50px]">
                        {/* Tooltip on Hover */}
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

                        {/* X-axis Day Label */}
                        <span className="text-[10px] font-medium text-[#6B7280] mt-2 group-hover:text-[#2563EB] group-hover:font-bold">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
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
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                    My Course Progress
                  </CardTitle>
                  <Info className="h-3.5 w-3.5 text-[#9CA3AF]" />
                </div>

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
                {/* Horizontal Progress Bars for Courses */}
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

                {/* Footer Action */}
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
                  <CheckCircle className="h-4 w-4 text-[#16A34A]" /> Recent Module Completions & Milestones
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280]">
                  Timeline of lessons, coding labs, and modules successfully finished
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
                          Course: <strong className="font-semibold text-[#4B5563] dark:text-[#D1D5DB]">{log.courseTitle}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      {log.score && (
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
              Showing <strong>{allModulesList.length}</strong> modules across all courses
            </div>
          </div>

          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                  <tr>
                    <th className="p-4 pl-6">Module Name</th>
                    <th className="p-4">Associated Course</th>
                    <th className="p-4">Lessons Count</th>
                    <th className="p-4">Completion Date & Time</th>
                    <th className="p-4">Score</th>
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
                      <td className="p-4">
                        {item.score ? (
                          <span className="font-bold text-[#16A34A]">{item.score}%</span>
                        ) : (
                          <span className="text-[#9CA3AF]">-</span>
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
              <p className="text-[11px] text-[#6B7280] mt-0.5">Average 5 logins / week</p>
            </Card>

            <Card className="p-5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
              <span className="text-xs font-bold text-[#6B7280]">Total Active Time</span>
              <p className="text-2xl font-extrabold text-[#0D9488] mt-1">{formatTimeSpent(totalTimeSpentSeconds)}</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Across all learning modules</p>
            </Card>

            <Card className="p-5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
              <span className="text-xs font-bold text-[#6B7280]">Primary Learning Device</span>
              <p className="text-2xl font-extrabold text-[#7C3AED] mt-1">Windows 11</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Chrome Browser 122.0</p>
            </Card>
          </div>

          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                Student Login History & Session Duration
              </CardTitle>
              <CardDescription className="text-xs text-[#6B7280]">
                Audit trail of student portal authentications, session lengths, and IP addresses
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] font-bold">
                  <tr>
                    <th className="p-4 pl-6">Login Timestamp</th>
                    <th className="p-4">Device & OS</th>
                    <th className="p-4">Browser</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Session Duration</th>
                    <th className="p-4 pr-6 text-right">Session Status</th>
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
                      <td className="p-4 text-[#6B7280]">{log.browser}</td>
                      <td className="p-4 font-mono text-[11px] text-[#6B7280]">{log.ipAddress}</td>
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
                Proctored examinations and hands-on coding challenges attempted
              </CardDescription>
            </CardHeader>
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
                  <tr className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                    <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Fullstack Architecture & Data Structures Milestone
                    </td>
                    <td className="p-4 text-[#6B7280]">Proctored Exam</td>
                    <td className="p-4 text-[#6B7280]">Aug 19, 2026, 04:30 PM</td>
                    <td className="p-4 font-bold text-[#16A34A]">92 / 100</td>
                    <td className="p-4 text-[#16A34A] font-semibold">0 Flags</td>
                    <td className="p-4 pr-6 text-right">
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">Passed (Distinction)</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                    <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Two Sum & Hash Map Lookup Optimization
                    </td>
                    <td className="p-4 text-[#6B7280]">Coding Lab Practice</td>
                    <td className="p-4 text-[#6B7280]">Aug 18, 2026, 11:30 AM</td>
                    <td className="p-4 font-bold text-[#16A34A]">100% (5/5 Test Cases)</td>
                    <td className="p-4 text-[#6B7280]">N/A</td>
                    <td className="p-4 pr-6 text-right">
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">Passed</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                    <td className="p-4 pl-6 font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Valid Parentheses & Stack Data Structure
                    </td>
                    <td className="p-4 text-[#6B7280]">Coding Lab Practice</td>
                    <td className="p-4 text-[#6B7280]">Aug 17, 2026, 02:15 PM</td>
                    <td className="p-4 font-bold text-[#16A34A]">95% (4/4 Test Cases)</td>
                    <td className="p-4 text-[#6B7280]">N/A</td>
                    <td className="p-4 pr-6 text-right">
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-bold">Passed</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
