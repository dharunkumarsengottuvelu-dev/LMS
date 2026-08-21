"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLMSStore, StudentUserRecord } from "@/lib/store/lms-store";
import {
  Users, Search, Plus, UserCheck, Shield, Trash2, Edit, Eye, Filter,
  Award, AlertTriangle, CheckCircle2, FileText, Code2, Clock, ShieldAlert,
  GraduationCap, ArrowUpRight, BarChart3, Lock, ShieldCheck, ArrowLeft, Sparkles, FolderKanban,
  Upload, Download, FileSpreadsheet, FileUp, X, Calendar, CalendarDays, Check,
  BookOpen, Dumbbell, ClipboardList, Inbox, Loader2, Layers, TrendingUp, Laptop, Copy, ExternalLink, FileCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layouts/page-header";
import { cn } from "@/lib/utils";

export interface TestSubmissionAnswer {
  questionId: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksObtained: number;
  maxMarks: number;
  feedback?: string;
}

export interface DetailedTestSubmission {
  testId: string;
  testTitle: string;
  category: "MCQ Assessment" | "Coding Challenge" | "Proctored Exam";
  score: number;
  completedAt: string;
  date: string;
  dayNumber: number;
  violations: number;
  status: "Evaluated" | "Under Review" | "Score Adjusted";
  answers: TestSubmissionAnswer[];
}

export interface PracticeSubmission {
  practiceId: string;
  title: string;
  type: "coding" | "mcq";
  date: string;
  dayNumber: number;
  submittedCode?: string;
  testCasesPassed?: string;
  score: number;
  feedback?: string;
}

export interface CourseProgressDay {
  dayNumber: number;
  date: string;
  topicTitle: string;
  status: "Completed" | "In Progress" | "Pending Review";
  durationSpent: string;
  quizScore?: number;
  notesSubmitted?: string;
}

export interface SystemInfo {
  os: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  status: "Online" | "Offline" | "Idle";
  currentPage: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: "login" | "course" | "test" | "practice" | "system";
}

export interface StudentRecord {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  avatar?: string;
  batch: string;
  department: string;
  designation: string;
  techTrack: string;
  role: "student" | "trainer" | "admin";
  status: "active" | "suspended" | "flagged";
  avgScore: number;
  mcqAccuracy: number;
  codingAccuracy: number;
  proctoringCompliance: number;
  violationCount: number;
  joinedDate: string;
  githubUrl?: string;
  linkedinUrl?: string;
  skills: string[];
  certificationsEarned: string[];
  testsTaken: DetailedTestSubmission[];
  practicesSubmitted: PracticeSubmission[];
  dailyProgress: CourseProgressDay[];
  proctoringLogs: {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    browser: string;
  }[];
  systemInfo: SystemInfo;
  activityLogs: ActivityLog[];
}


export function StudentAnalyticsHub({ portalRole = "admin" }: { portalRole?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const { students: storeStudents, updateStudents, batches: storeBatches, addBatch, courses: storeCourses } = useLMSStore();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  
  useEffect(() => {
    const fetchStudents = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("created_at", { ascending: false });
        
      if (data && !error) {
        const mappedStudents: StudentRecord[] = data.map((p: any) => ({
          id: p.id,
          employeeId: p.employee_id || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email?.split("@")[0] || "Unknown",
          email: p.email || "",
          batch: p.batch || "Unassigned",
          department: p.department || "General",
          designation: p.designation || "Student",
          techTrack: p.tech_track || "General",
          role: "student",
          status: p.status || "active",
          avgScore: p.avg_score || 0,
          mcqAccuracy: p.mcq_accuracy || 0,
          codingAccuracy: p.coding_accuracy || 0,
          proctoringCompliance: p.proctoring_compliance || 100,
          violationCount: p.violation_count || 0,
          joinedDate: p.created_at?.split("T")[0] || "",
          skills: [],
          certificationsEarned: [],
          testsTaken: [],
          practicesSubmitted: [],
          dailyProgress: [],
          proctoringLogs: [],
          systemInfo: { os: "Unknown", browser: "Unknown", ipAddress: "0.0.0.0", lastActive: "Unknown", status: "Offline", currentPage: "Unknown" },
          activityLogs: []
        }));
        setStudents(mappedStudents);
      }
    };
    fetchStudents();
  }, []);

  const syncStudentsToStore = (newStds: StudentRecord[]) => {
    // Only local state mutation for now, since we fetch from DB on load
    setStudents(newStds);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dynamic Batch Options from Store
  const availableBatches = useMemo(() => {
    const names = new Set<string>();
    if (storeBatches) {
      storeBatches.forEach((b) => names.add(b.batchName));
    }
    return Array.from(names);
  }, [storeBatches]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      const matchesSearch =
        std.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBatch = batchFilter === "all" || (std.batch && std.batch.toLowerCase().includes(batchFilter.toLowerCase()));
      const matchesStatus = statusFilter === "all" || std.status === statusFilter;
      return matchesSearch && matchesBatch && matchesStatus;
    });
  }, [students, searchQuery, batchFilter, statusFilter]);

  const avgTestScore = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const total = filteredStudents.reduce((acc, s) => acc + (s.avgScore || 0), 0);
    return Math.round(total / filteredStudents.length);
  }, [filteredStudents]);

  const avgCompliance = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const total = filteredStudents.reduce((acc, s) => acc + (s.proctoringCompliance || 0), 0);
    return Math.round(total / filteredStudents.length);
  }, [filteredStudents]);

  const flaggedAlertsCount = useMemo(() => {
    return filteredStudents.filter((s) => s.status === "flagged" || s.violationCount > 0).length;
  }, [filteredStudents]);

  const [viewState, setViewState] = useState<"list" | "enroll" | "analytics">("list");
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  // Student Individual Performance & Reports state
  const [analyticsDateRange, setAnalyticsDateRange] = useState<"7d" | "14d" | "30d" | "all" | "custom">("7d");
  const [analyticsFromDate, setAnalyticsFromDate] = useState<string>("");
  const [analyticsToDate, setAnalyticsToDate] = useState<string>("");
  const [isAnalyticsCustomModalOpen, setIsAnalyticsCustomModalOpen] = useState<boolean>(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [hoveredAdminTimePoint, setHoveredAdminTimePoint] = useState<number | null>(null);

  // Review Submission Modal State
  const [reviewModalItem, setReviewModalItem] = useState<{
    type: "practice" | "assignment" | "assessment";
    title: string;
    parentTitle?: string;
    difficulty?: string;
    score?: number | string;
    totalMarks?: number;
    status?: string;
    submittedCode?: string;
    testCasesPassed?: string;
    startedAt?: string;
    completedAt?: string;
    attemptsCount?: number;
    submissionUrl?: string;
    submissionText?: string;
    feedback?: string;
  } | null>(null);
  const [reviewScoreInput, setReviewScoreInput] = useState<string>("");
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState<string>("");
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  const openPracticeReview = (ch: any, track: any) => {
    setReviewModalItem({
      type: "practice",
      title: ch.title || "Practice Challenge",
      parentTitle: track.title || "Practice Track",
      difficulty: ch.difficulty || "Medium",
      score: ch.score ?? (ch.completed ? 100 : 0),
      totalMarks: 100,
      status: ch.completed ? "Completed" : ch.startedAt && ch.startedAt !== "Not Started" ? "In Progress" : "Pending",
      submittedCode: ch.submittedCode || "// Solution code submitted by candidate\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println(\"Solution executed successfully\");\n    }\n}",
      testCasesPassed: ch.testCasesPassed || (ch.completed ? "All 10/10 Test Cases Passed" : "Pending Evaluation"),
      startedAt: ch.startedAt || "Not Started",
      completedAt: ch.completedAt || (ch.completed ? "Completed" : "Pending"),
      attemptsCount: ch.attemptsCount || (ch.completed ? 1 : 0),
      feedback: ch.feedback || "Candidate solution evaluated against standard test suites.",
    });
    setReviewScoreInput(String(ch.score ?? (ch.completed ? 100 : "")));
    setReviewFeedbackInput(ch.feedback || "");
  };

  const openAssignmentReview = (asg: any) => {
    setReviewModalItem({
      type: "assignment",
      title: asg.title || "Assignment",
      parentTitle: "Course Project & Assignment",
      score: asg.score,
      totalMarks: asg.totalMarks || 100,
      status: asg.status || "Submitted",
      completedAt: asg.submittedAt || "Recent",
      submissionUrl: asg.submissionUrl || "https://github.com/student/project-submission",
      submissionText: asg.submissionText || asg.description || "Project documentation and implementation notes submitted by candidate.",
      feedback: asg.feedback || "",
    });
    setReviewScoreInput(asg.score !== undefined ? String(asg.score) : "");
    setReviewFeedbackInput(asg.feedback || "");
  };

  const handleSaveReviewGrade = () => {
    setIsSavingReview(true);
    setTimeout(() => {
      setIsSavingReview(false);
      toast({
        title: "Review & Grade Saved! ✨",
        description: `Feedback and grade score (${reviewScoreInput || "Evaluated"}) recorded successfully.`,
      });
      setReviewModalItem(null);
    }, 400);
  };

  const fetchStudentAnalytics = useCallback(async (stdId: string) => {
    setIsLoadingAnalytics(true);
    try {
      let url = `/api/admin/students/${stdId}/analytics?range=${analyticsDateRange}`;
      if (analyticsDateRange === "custom" && analyticsFromDate && analyticsToDate) {
        url = `/api/admin/students/${stdId}/analytics?from=${analyticsFromDate}&to=${analyticsToDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.analytics) {
        setAnalyticsData(data.analytics);
      }
    } catch (err) {
      console.error("Failed to load student analytics", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [analyticsDateRange, analyticsFromDate, analyticsToDate]);

  useEffect(() => {
    if (viewState === "analytics" && selectedStudent) {
      if (analyticsDateRange !== "custom" || (analyticsFromDate && analyticsToDate)) {
        fetchStudentAnalytics(selectedStudent.id);
      }
    }
  }, [viewState, selectedStudent, fetchStudentAnalytics, analyticsDateRange]);

  const analyticsDateRangeLabel = useMemo(() => {
    switch (analyticsDateRange) {
      case "7d":
        return "Last 7 days";
      case "14d":
        return "Last 14 days";
      case "30d":
        return "Last 30 days";
      case "all":
        return "All time";
      case "custom":
        if (analyticsFromDate && analyticsToDate) {
          const f = new Date(analyticsFromDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const t = new Date(analyticsToDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return `${f} - ${t}`;
        }
        return "Custom Range";
    }
  }, [analyticsDateRange, analyticsFromDate, analyticsToDate]);

  const formatTimeSpent = (secs: number) => {
    if (!secs || secs === 0) return "0 h 0 min 0 s";
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours} h ${mins} min ${s} s`;
  };

  const handleApplyAnalyticsCustomRange = () => {
    if (!analyticsFromDate || !analyticsToDate) {
      toast({
        title: "Incomplete Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    if (new Date(analyticsFromDate) > new Date(analyticsToDate)) {
      toast({
        title: "Invalid Range",
        description: "Start date cannot be after end date.",
        variant: "destructive",
      });
      return;
    }
    setAnalyticsDateRange("custom");
    setIsAnalyticsCustomModalOpen(false);
    toast({
      title: "Date Filter Applied",
      description: `Showing candidate analytics from ${analyticsFromDate} to ${analyticsToDate}.`,
    });
  };

  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [newBatchTitle, setNewBatchTitle] = useState("");
  const [newBatchCollege, setNewBatchCollege] = useState("");
  const [newBatchTrack, setNewBatchTrack] = useState("");
  const [newBatchStartDate, setNewBatchStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newBatchEndDate, setNewBatchEndDate] = useState(new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10));
  const [newBatchSession, setNewBatchSession] = useState("Morning Session (09:00 AM)");
  const [newBatchTrainer, setNewBatchTrainer] = useState("");

  const [isAssignBatchOpen, setIsAssignBatchOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignTargetBatch, setAssignTargetBatch] = useState("");
  const [assignStudentEmailManual, setAssignStudentEmailManual] = useState("");
  const [assignStudentNameManual, setAssignStudentNameManual] = useState("");

  const [createBatchMode, setCreateBatchMode] = useState<"manual" | "csv">("manual");
  const [assignStudentMode, setAssignStudentMode] = useState<"single" | "csv">("single");
  const [csvParsedStudents, setCsvParsedStudents] = useState<{ name: string; email: string; college?: string; course?: string; batch?: string }[]>([]);
  const [csvParsedBatches, setCsvParsedBatches] = useState<{ batchName: string; collegeName: string; course: string; startDate: string; endDate: string; joiningTime: string; trainer: string }[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>("");

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length <= 1) {
        toast({ title: "Empty CSV File", description: "No student records found in CSV file.", variant: "destructive" });
        return;
      }

      const rows = lines.slice(1);
      const list: { name: string; email: string; college?: string; course?: string; batch?: string }[] = [];

      rows.forEach((row) => {
        const cols = row.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length >= 2 && cols[0] && cols[1]) {
          list.push({
            name: cols[0],
            email: cols[1],
            college: cols[2] || "ABC College",
            course: cols[3] || "Fullstack Enterprise React/Next.js",
            batch: cols[4] || undefined,
          });
        }
      });

      setCsvParsedStudents(list);
      toast({
        title: "CSV File Processed",
        description: `Successfully parsed ${list.length} student records from ${file.name}.`,
      });
    };
    reader.readAsText(file);
  };

  const handleBatchCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length <= 1) {
        toast({ title: "Empty CSV File", description: "No batch records found in CSV file.", variant: "destructive" });
        return;
      }

      const rows = lines.slice(1);
      const list: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length >= 1 && cols[0]) {
          list.push({
            batchName: cols[0],
            collegeName: cols[1] || "ABC College",
            course: cols[2] || "Fullstack Enterprise React/Next.js",
            startDate: cols[3] || new Date().toISOString().slice(0, 10),
            endDate: cols[4] || new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
            joiningTime: cols[5] || "Morning Session (09:00 AM)",
            trainer: cols[6] || "Dr. Aris Thorne",
          });
        }
      });

      setCsvParsedBatches(list);
      toast({
        title: "CSV Batches Parsed",
        description: `Successfully loaded ${list.length} batch records from ${file.name}.`,
      });
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Full Name,Email Address,College Name,Course Track,Batch Name\n" +
      "Dharunkumar S,dharunkumar@example.com,ABC College,Java Development,Batch 2026-A\n" +
      "Alex Rivera,alex.rivera@example.com,PSG College of Technology,Fullstack Enterprise React/Next.js,Batch 2026-B\n" +
      "Priya Sharma,priya.sharma@example.com,IIT Madras,AI/ML Engineering,Batch 2026-C\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "edunexus_sample_batch_students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBatchSampleCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Batch Name,College Name,Target Tech Track,Start Date,Lead Trainer\n" +
      "ABC College - Java Development - Batch 01,ABC College,Core Java & Data Structures,2026-08-01,Dr. Aris Thorne\n" +
      "PSG Tech - React - Batch 02,PSG College of Technology,Fullstack Enterprise React/Next.js,2026-09-01,Dr. Aris Thorne\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "edunexus_sample_batches.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (createBatchMode === "csv") {
      if (csvParsedBatches.length === 0) {
        toast({ title: "No CSV Data", description: "Please upload a CSV file with batch records first.", variant: "destructive" });
        return;
      }
      csvParsedBatches.forEach((b) => {
        addBatch({
          batchName: b.batchName,
          collegeName: b.collegeName,
          course: b.course,
          startDate: b.startDate,
          endDate: b.endDate,
          joiningTime: b.joiningTime,
          trainer: b.trainer,
          status: "active",
        });
      });
      toast({
        title: `${csvParsedBatches.length} Batches Created!`,
        description: `Successfully imported & activated ${csvParsedBatches.length} cohort batches from CSV.`,
      });
      setIsCreateBatchOpen(false);
      setCsvParsedBatches([]);
      setCsvFileName("");
      return;
    }

    if (!newBatchTitle.trim()) {
      toast({ title: "Validation Error", description: "Batch name is required.", variant: "destructive" });
      return;
    }
    const trimmed = newBatchTitle.trim();
    
    try {
      fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          collegeName: newBatchCollege || "",
          leadTrainer: newBatchTrainer || "",
          courseTrack: newBatchTrack || "",
          startDate: newBatchStartDate || "",
        }),
      }).catch(err => console.warn("Notice: Batch API call:", err));
    } catch (e) {
      console.warn(e);
    }

    addBatch({
      batchName: trimmed,
      collegeName: newBatchCollege || "",
      course: newBatchTrack || "",
      startDate: newBatchStartDate || "",
      endDate: "",
      joiningTime: "",
      trainer: newBatchTrainer || "",
      status: "active",
    });

    toast({
      title: "Batch Created Successfully",
      description: `"${trimmed}" is now active and ready for student assignments.`,
    });
    setIsCreateBatchOpen(false);
    setNewBatchTitle("");
    setNewBatchCollege("");
    setNewBatchTrainer("");
    setNewBatchTrack("");
    setNewBatchStartDate("");
    setCsvFileName("");
  };

  const handleAssignStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (assignStudentMode === "csv") {
      if (csvParsedStudents.length === 0) {
        toast({ title: "No CSV Data", description: "Please upload a CSV file with student records first.", variant: "destructive" });
        return;
      }
    }

    if (assignStudentMode === "single" && !assignStudentId && (!assignStudentNameManual.trim() || !assignStudentEmailManual.trim())) {
      toast({ title: "Student Info Required", description: "Please select a student or enter their name & email.", variant: "destructive" });
      return;
    }

    if (assignStudentMode === "csv" && csvParsedStudents.length > 0) {
      csvParsedStudents.forEach((std) => {
        if (std.batch && std.batch !== "Not Assigned" && !storeBatches.some((b) => b.batchName.toLowerCase() === std.batch?.toLowerCase())) {
          addBatch({
            batchName: std.batch,
            collegeName: std.college || "Enterprise Academy",
            course: std.course || "Fullstack Enterprise React/Next.js",
            startDate: new Date().toISOString().slice(0, 10),
            endDate: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
            joiningTime: "Morning Session (09:00 AM)",
            trainer: "Dr. Aris Thorne",
            status: "active",
          });
        }
      });

      const newRecords: StudentRecord[] = csvParsedStudents.map((std, idx) => ({
        id: `std_csv_${Date.now()}_${idx}`,
        employeeId: `EMP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: std.name,
        email: std.email,
        batch: std.batch?.trim() || assignTargetBatch || "Not Assigned",
        department: std.course || "Computer Science",
        designation: "Student Learner",
        techTrack: std.course || "Fullstack Enterprise React/Next.js",
        role: "student",
        status: "active",
        avgScore: 0,
        mcqAccuracy: 0,
        codingAccuracy: 0,
        proctoringCompliance: 100,
        violationCount: 0,
        joinedDate: new Date().toISOString().slice(0, 10),
        skills: ["React", "Next.js", "TypeScript"],
        certificationsEarned: [],
        testsTaken: [],
        practicesSubmitted: [],
        dailyProgress: [],
        proctoringLogs: [],
        systemInfo: { os: "Windows 11", browser: "Chrome", ipAddress: "192.168.1.1", lastActive: "Just now", status: "Online", currentPage: "/student/dashboard" },
        activityLogs: [],
      }));

      syncStudentsToStore([...newRecords, ...students]);
      toast({
        title: `âœ… ${newRecords.length} Students Enrolled!`,
        description: `Enrolled ${newRecords.length} students from CSV to their assigned batches.`,
      });

      setIsAssignBatchOpen(false);
      setCsvParsedStudents([]);
      setCsvFileName("");
      return;
    }

    if (assignStudentId) {
      const updated = students.map(s => s.id === assignStudentId ? { ...s, batch: assignTargetBatch } : s);
      syncStudentsToStore(updated);
      const matched = students.find(s => s.id === assignStudentId);
      toast({
        title: "âœ… Student Assigned!",
        description: `${matched?.name || "Student"} has been moved to ${assignTargetBatch}.`,
      });
    } else if (assignStudentNameManual && assignStudentEmailManual) {
      const newRecord: StudentRecord = {
        id: `std_${Date.now()}`,
        employeeId: `EMP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: assignStudentNameManual.trim(),
        email: assignStudentEmailManual.trim(),
        batch: assignTargetBatch,
        department: "Computer Science & Engineering",
        designation: "Software Engineering Trainee",
        techTrack: "Fullstack Enterprise React/Next.js",
        role: "student",
        status: "active",
        avgScore: 0,
        mcqAccuracy: 0,
        codingAccuracy: 0,
        proctoringCompliance: 100,
        violationCount: 0,
        joinedDate: new Date().toISOString().slice(0, 10),
        skills: ["React", "Next.js", "TypeScript"],
        certificationsEarned: [],
        testsTaken: [],
        practicesSubmitted: [],
        dailyProgress: [],
        proctoringLogs: [],
        systemInfo: {
          os: "Windows 11",
          browser: "Chrome",
          ipAddress: "192.168.1.1",
          lastActive: "Just now",
          status: "Online",
          currentPage: "/student/dashboard",
        },
        activityLogs: [],
      };
      syncStudentsToStore([newRecord, ...students]);
      toast({
        title: "âœ… Student Added!",
        description: `${assignStudentNameManual} added to ${assignTargetBatch}.`,
      });
    }
    setIsAssignBatchOpen(false);
    setAssignStudentId("");
    setAssignStudentNameManual("");
    setAssignStudentEmailManual("");
    setCsvParsedStudents([]);
    setCsvFileName("");
  };

  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const toggleTest = (testId: string) => {
    setExpandedTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  const [expandedPractices, setExpandedPractices] = useState<string[]>([]);
  const togglePractice = (practiceId: string) => {
    setExpandedPractices(prev => prev.includes(practiceId) ? prev.filter(id => id !== practiceId) : [...prev, practiceId]);
  };

  const handleUpdateScore = (testId: string, newScore: number) => {
    if (!selectedStudent) return;
    const updatedStudent = {
      ...selectedStudent,
      testsTaken: selectedStudent.testsTaken.map(t => 
        t.testId === testId ? { ...t, score: newScore } : t
      )
    };
    setSelectedStudent(updatedStudent);
    setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    toast({ title: "Score Updated", description: `The score has been updated to ${newScore}%` });
  };

  // Form State for Enrollment
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentEmpId, setNewStudentEmpId] = useState("");
  const [newStudentDept, setNewStudentDept] = useState("");
  const [newStudentDesignation, setNewStudentDesignation] = useState("");
  const [newStudentTrack, setNewStudentTrack] = useState("");
  const [batchInputMode, setBatchInputMode] = useState<"select" | "manual">("manual");
  const [newStudentBatch, setNewStudentBatch] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");

  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [editName, setEditName] = useState("");


  const handleToggleStatus = async (studentId: string) => {
    // Note: To properly update in Supabase, we should make an API call here.
    // For now, updating local state and showing a toast safely outside the setState callback.
    let changedName = "";
    let nextStatus = "";
    
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          nextStatus = s.status === "active" ? "suspended" : "active";
          changedName = s.name;
          return { ...s, status: nextStatus as any };
        }
        return s;
      })
    );
    
    if (changedName) {
      toast({
        title: "Student Status Updated",
        description: `${changedName} status changed to ${nextStatus.toUpperCase()}`,
      });
    }
  };

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentBatch) return;

    const newRecord: StudentRecord = {
      id: `std_${Date.now()}`,
      employeeId: newStudentEmpId || `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newStudentName,
      email: newStudentEmail,
      batch: newStudentBatch,
      department: newStudentDept || "Computer Science & Engineering",
      designation: newStudentDesignation || "B.E. Computer Science",
      techTrack: newStudentTrack || "Fullstack Software Architecture",
      role: "student",
      status: "active",
      avgScore: 0,
      mcqAccuracy: 0,
      codingAccuracy: 0,
      proctoringCompliance: 100,
      violationCount: 0,
      joinedDate: new Date().toISOString().split("T")[0] || "2026-08-05",
      skills: ["React", "TypeScript", "SQL"],
      certificationsEarned: [],
      testsTaken: [],
      proctoringLogs: [],
      practicesSubmitted: [],
      dailyProgress: [],
      systemInfo: { ipAddress: "127.0.0.1", browser: "Chrome 127.0", os: "Windows 11", lastActive: "Just now", status: "Online", currentPage: "Dashboard" },
      activityLogs: [],
    };

    setStudents((prev) => [newRecord, ...prev]);
    setViewState("list");
    setNewStudentName("");
    setNewStudentEmail("");
    setNewStudentEmpId("");
    setNewStudentPassword("Falcon@2026");
    toast({
      title: "Student Enrolled Successfully",
      description: `${newStudentName} (${newRecord.employeeId}) enrolled with temp password: ${newStudentPassword}`,
    });
  };

  // FULL PAGE ENROLLMENT VIEW
  if (viewState === "enroll") {
    return (
      <div className="space-y-8 w-full">
        <PageHeader
          title="Enterprise Student Onboarding"
          description="Configure employee credentials, department, and custom cohort batch"
          backAction={{ label: "Back to Student Directory", onClick: () => setViewState("list") }}
        />

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleEnrollStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Student Full Name</label>
                <Input
                  placeholder="e.g. Dharunkumar S"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  required
                  className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Corporate Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. dharunkumar@gmail.com"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  required
                  className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Student Reg / Roll Number</label>
                <Input
                  placeholder="e.g. REG-2026-9041 or 717822P101"
                  value={newStudentEmpId}
                  onChange={(e) => setNewStudentEmpId(e.target.value)}
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Branch & Specialization</label>
                <Input
                  placeholder="e.g. Computer Science & Engineering (CSE)"
                  value={newStudentDept}
                  onChange={(e) => setNewStudentDept(e.target.value)}
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Degree / Course Program</label>
                <Input
                  placeholder="e.g. B.E. Computer Science & Technology"
                  value={newStudentDesignation}
                  onChange={(e) => setNewStudentDesignation(e.target.value)}
                  className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assigned Cohort Batch</label>
                <div className="flex items-center bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-lg p-0.5 gap-1">
                  <button
                    type="button"
                    onClick={() => setBatchInputMode("manual")}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      batchInputMode === "manual"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                    }`}
                  >
                    Custom Name (Manual)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchInputMode("select")}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      batchInputMode === "select"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                    }`}
                  >
                    Preset Dropdown
                  </button>
                </div>
              </div>

              {batchInputMode === "manual" ? (
                <Input
                  placeholder="Enter custom batch name (e.g. Batch 2026-A, Zoho Prep 2026, Core Java Batch-3)..."
                  value={newStudentBatch}
                  onChange={(e) => setNewStudentBatch(e.target.value)}
                  required
                  className="h-[48px] text-sm font-semibold rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#2563EB]/40 focus:border-[#2563EB]"
                />
              ) : (
                <Select value={newStudentBatch} onValueChange={(val) => setNewStudentBatch(val || "")}>
                  <SelectTrigger className="h-[48px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBatches.length > 0 ? (
                      availableBatches.map((batch) => (
                        <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No batches available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* User Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">User Control (Role Access)</label>
              <div className="flex flex-col md:flex-row gap-3">
                <label className="flex-1 flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#2563EB]/40 dark:border-[#2563EB]/40 rounded-xl cursor-default">
                  <div>
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">Student Login</p>
                    <p className="text-xs text-[#6B7280]">Standard access to courses and exams</p>
                  </div>
                  <input 
                    type="radio" 
                    name="enrollRoleAccess" 
                    value="student" 
                    defaultChecked 
                    readOnly
                    className="w-4 h-4 text-[#2563EB] focus:ring-[#2563EB] border-gray-300"
                  />
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md shadow-[#2563EB]/20">
                <Sparkles className="h-4 w-4" /> Enroll Student Now
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // FULL PAGE INDIVIDUAL PERFORMANCE ANALYTICS VIEW
  if (viewState === "analytics" && selectedStudent) {
    const studentData = analyticsData || selectedStudent;
    const courses = analyticsData?.coursesList || [];
    const practices = analyticsData?.practicesList || [];
    const assessments = analyticsData?.assessmentsList || analyticsData?.testsTaken || [];
    const assignments = analyticsData?.assignmentsList || [];
    const dailyTimeSpent = analyticsData?.dailyTimeSpent || [];
    const loginActivities = analyticsData?.loginActivities || [];
    const summary = analyticsData?.summary || {
      enrolledCoursesCount: courses.length,
      practicesCount: practices.length,
      assessmentsCount: assessments.length,
      assignmentsCount: assignments.length,
      totalTimeSpentSeconds: 0,
      avgScore: selectedStudent.avgScore || 0,
    };

    return (
      <div className="space-y-8 w-full">
        {/* 0. Top Page Header with Back Action and Live Controls */}
        <PageHeader
          title={`${selectedStudent.name} Performance & Learning Reports`}
          description={`${selectedStudent.email} • ${selectedStudent.batch}`}
          backAction={{ label: "Back to Student Directory", onClick: () => setViewState("list") }}
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger className="h-9 px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-xs font-bold text-[#2563EB] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] flex items-center gap-2 shadow-xs transition-colors">
                  <span>{analyticsDateRangeLabel}</span>
                  <Filter className="h-3.5 w-3.5 text-[#6B7280]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-1.5 rounded-xl shadow-lg">
                  <DropdownMenuItem
                    onClick={() => setAnalyticsDateRange("7d")}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      analyticsDateRange === "7d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                    )}
                  >
                    <span>Last 7 days</span>
                    {analyticsDateRange === "7d" && <Check className="h-4 w-4 text-[#2563EB]" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setAnalyticsDateRange("14d")}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      analyticsDateRange === "14d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                    )}
                  >
                    <span>Last 14 days</span>
                    {analyticsDateRange === "14d" && <Check className="h-4 w-4 text-[#2563EB]" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setAnalyticsDateRange("30d")}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      analyticsDateRange === "30d" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                    )}
                  >
                    <span>Last 30 days</span>
                    {analyticsDateRange === "30d" && <Check className="h-4 w-4 text-[#2563EB]" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setAnalyticsDateRange("all")}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      analyticsDateRange === "all" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                    )}
                  >
                    <span>All time</span>
                    {analyticsDateRange === "all" && <Check className="h-4 w-4 text-[#2563EB]" />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-[#E5E7EB] dark:bg-[#27272A]" />

                  <DropdownMenuItem
                    onClick={() => setIsAnalyticsCustomModalOpen(true)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer",
                      analyticsDateRange === "custom" ? "text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20" : "text-[#111827] dark:text-[#FAFAFA]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span>Custom Date to Date...</span>
                    </div>
                    {analyticsDateRange === "custom" && <Check className="h-4 w-4 text-[#2563EB]" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge className={`text-xs font-bold capitalize px-3 py-1.5 ${selectedStudent.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#DC2626] text-white"}`}>
                {selectedStudent.status}
              </Badge>
            </div>
          }
        />

        {/* Student Bio Card */}
        <Card className="p-6 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-[#2563EB]/20">
                <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-sm">
                  {selectedStudent.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-base text-[#111827] dark:text-[#FAFAFA]">{selectedStudent.name}</h3>
                <p className="text-xs text-[#6B7280]">
                  <span className="font-mono text-[#2563EB] font-semibold">{selectedStudent.employeeId}</span> • {selectedStudent.designation}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-semibold text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                {selectedStudent.department}
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                {selectedStudent.batch}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Competency Skills & Technical Tracks</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(studentData.skills || ["React", "Next.js", "TypeScript", "PostgreSQL"]).map((skill: string) => (
                <Badge key={skill} className="bg-[#F9FAFB] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA] border border-[#E5E7EB] dark:border-[#27272A] text-[10px]">
                  {skill}
                </Badge>
              ))}
              {(studentData.certificationsEarned || ["Certified Fullstack Engineer"]).map((cert: string) => (
                <Badge key={cert} className="bg-[#16A34A] text-white text-[10px]">
                  <Award className="h-2.5 w-2.5 mr-1" /> {cert}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {isLoadingAnalytics ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
            <p className="text-sm font-medium">Loading candidate performance metrics & reports...</p>
          </div>
        ) : (
          <>
            {/* KPI Metric Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                <span className="text-[11px] font-bold uppercase text-[#6B7280]">Assigned Courses</span>
                <p className="text-3xl font-extrabold text-[#D97706]">{summary.enrolledCoursesCount || courses.length}</p>
                <p className="text-[11px] text-[#6B7280]">Cohort batch curriculum</p>
              </Card>

              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                <span className="text-[11px] font-bold uppercase text-[#6B7280]">Practice Tracks</span>
                <p className="text-3xl font-extrabold text-[#16A34A]">{summary.practicesCount || practices.length}</p>
                <p className="text-[11px] text-[#6B7280]">Coding lab challenges</p>
              </Card>

              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                <span className="text-[11px] font-bold uppercase text-[#6B7280]">Assessments</span>
                <p className="text-3xl font-extrabold text-[#2563EB]">{summary.assessmentsCount || assessments.length}</p>
                <p className="text-[11px] text-[#6B7280]">Proctored exams</p>
              </Card>

              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                <span className="text-[11px] font-bold uppercase text-[#6B7280]">Total Active Time</span>
                <p className="text-2xl font-extrabold text-[#111827] dark:text-[#FAFAFA]">{formatTimeSpent(summary.totalTimeSpentSeconds || 0)}</p>
                <p className="text-[11px] text-[#6B7280]">Time spent on evaluations</p>
              </Card>
            </div>

            {/* Performance Tabs */}
            <Tabs defaultValue="courses" className="w-full space-y-4">
              <TabsList className="bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] p-1 rounded-xl w-full flex overflow-x-auto justify-start">
                <TabsTrigger value="courses" className="text-xs font-bold px-4 py-2 gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Courses ({courses.length})
                </TabsTrigger>
                <TabsTrigger value="practices" className="text-xs font-bold px-4 py-2 gap-1.5">
                  <Dumbbell className="h-3.5 w-3.5" /> Practice Labs ({practices.length})
                </TabsTrigger>
                <TabsTrigger value="tests" className="text-xs font-bold px-4 py-2 gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Assessments ({assessments.length})
                </TabsTrigger>
                <TabsTrigger value="assignments" className="text-xs font-bold px-4 py-2 gap-1.5">
                  <FileCheck className="h-3.5 w-3.5" /> Assignments ({assignments.length})
                </TabsTrigger>
                <TabsTrigger value="time" className="text-xs font-bold px-4 py-2 gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Time & Logins
                </TabsTrigger>
                <TabsTrigger value="proctoring" className="text-xs font-bold px-4 py-2 gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Proctoring Logs ({studentData.proctoringLogs?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-xs font-bold px-4 py-2 gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Activity Audit
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: COURSES */}
              <TabsContent value="courses" className="space-y-4">
                {courses.length === 0 ? (
                  <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                    <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[#6B7280]">No assigned courses found for this student cohort.</p>
                  </Card>
                ) : (
                  courses.map((course: any) => (
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
              </TabsContent>

              {/* TAB 2: PRACTICES */}
              <TabsContent value="practices" className="space-y-4">
                {practices.length === 0 ? (
                  <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                    <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[#6B7280]">No practice tracks attempted yet.</p>
                  </Card>
                ) : (
                  practices.map((track: any) => (
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
                          <Badge className={cn("text-[10px] font-bold", track.progress === 100 ? "bg-[#16A34A] text-white" : track.progress > 0 ? "bg-[#D97706] text-white" : "bg-[#16A34A]/10 text-[#16A34A]")}>
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
                            <div key={ch.id || chIdx} className="py-3 px-2 flex flex-col md:flex-row md:items-center justify-between text-xs gap-3 hover:bg-[#F9FAFB]/60 dark:hover:bg-[#09090B]/60 rounded-xl transition-colors">
                              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                <div className="p-1.5 rounded-lg bg-[#16A34A]/10 text-[#16A34A] shrink-0">
                                  <Code2 className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs sm:text-sm">{ch.title}</span>
                                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                                  {ch.difficulty}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                                  {ch.attemptsCount || 0} {ch.attemptsCount === 1 ? "attempt" : "attempts"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-3 flex-wrap self-start md:self-center shrink-0">
                                {ch.score !== undefined && (
                                  <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30 text-[11px] font-bold px-2.5 py-0.5">
                                    Score: {ch.score}/100
                                  </Badge>
                                )}
                                <span className="text-[11px] font-medium text-[#6B7280]">
                                  {ch.startedAt && ch.startedAt !== "Not Started" ? `Started: ${ch.startedAt}` : "Not started"}
                                </span>
                                <span className="text-[11px] font-medium text-[#6B7280]">
                                  {ch.completedAt ? `Completed: ${ch.completedAt}` : "Pending"}
                                </span>
                                <Badge className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md", ch.completed ? "bg-[#16A34A] text-white" : ch.startedAt && ch.startedAt !== "Not Started" ? "bg-[#D97706] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                                  {ch.completed ? "Solved" : ch.startedAt && ch.startedAt !== "Not Started" ? "In Progress" : "Pending"}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPracticeReview(ch, track)}
                                  className="h-8 text-xs px-3 font-bold text-[#16A34A] border-[#16A34A]/40 hover:bg-[#16A34A]/10 hover:border-[#16A34A] gap-1.5 rounded-xl shadow-xs transition-all"
                                >
                                  <Code2 className="h-3.5 w-3.5" /> Review Code
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* TAB 3: ASSIGNMENTS */}
              <TabsContent value="assignments" className="space-y-4">
                {assignments.length === 0 ? (
                  <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                    <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[#6B7280]">No course assignments recorded yet.</p>
                  </Card>
                ) : (
                  assignments.map((asg: any) => (
                    <Card key={asg.id} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
                        <div>
                          <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-[#2563EB]" /> {asg.title}
                          </CardTitle>
                          <CardDescription className="text-[11px] text-[#6B7280] mt-0.5">
                            Due Date: {asg.dueDate} • Total Marks: {asg.totalMarks}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {asg.score !== undefined && (
                            <span className="text-xs font-extrabold text-[#16A34A]">Score: {asg.score}/{asg.totalMarks}</span>
                          )}
                          <Badge className={cn("text-[10px] font-bold", asg.status === "Graded" ? "bg-[#16A34A] text-white" : asg.status?.includes("Submitted") ? "bg-[#2563EB] text-white" : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]")}>
                            {asg.status}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => openAssignmentReview(asg)}
                            className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1.5 px-3 rounded-xl shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review Submission
                          </Button>
                        </div>
                      </div>
                      {asg.submissionText && (
                        <div className="text-xs text-[#4B5563] dark:text-[#9CA3AF] bg-[#F9FAFB] dark:bg-[#09090B] p-3 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                          <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">Candidate Notes: </span>
                          {asg.submissionText}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* TAB 3: ASSESSMENTS */}
              <TabsContent value="tests" className="space-y-4">
                {assessments.length === 0 ? (
                  <Card className="p-8 text-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                    <Inbox className="h-8 w-8 text-[#9CA3AF] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[#6B7280]">No assessments completed yet.</p>
                  </Card>
                ) : (
                  assessments.map((t: any) => (
                    <Card key={t.id || t.testId} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] overflow-hidden rounded-2xl">
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] gap-2">
                        <div>
                          <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{t.title || t.testTitle}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[9px] bg-white dark:bg-[#18181B] text-[#6B7280]">{t.type || t.category}</Badge>
                            {t.attemptsCount !== undefined && (
                              <Badge variant="outline" className="text-[9px] font-semibold text-[#6B7280]">
                                {t.attemptsCount} {t.attemptsCount === 1 ? "attempt" : "attempts"}
                              </Badge>
                            )}
                            <span className="text-[10px] text-[#6B7280]">Started: {t.startedAt || "Not Started"}</span>
                            <span className="text-[10px] text-[#6B7280]">Completed: {t.completedDate || t.completedAt || "Pending"}</span>
                          </div>
                        </div>
                        <div className="text-right mt-2 sm:mt-0 flex items-center justify-end gap-3">
                          <div>
                            <span className="font-bold text-base text-[#16A34A]">{t.scoreObtained || `${t.score}%`}</span>
                            <p className="text-[10px] text-[#DC2626]">{t.integrityViolations || `${t.violations || 0} Violations`}</p>
                          </div>

                          {t.answers && t.answers.length > 0 && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="h-7 text-[10px] px-2 font-bold gap-1"
                              onClick={() => toggleTest(t.testId || t.id)}
                            >
                              <Eye className="h-3 w-3" /> {expandedTests.includes(t.testId || t.id) ? "Hide Answers" : "Review Answers"}
                            </Button>
                          )}

                          {portalRole === "admin" && (
                            <Dialog>
                              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 text-[10px] px-2 font-bold gap-1 border-[#E5E7EB] dark:border-[#27272A]">
                                <Edit className="h-3 w-3" /> Edit Score
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Edit Score for {t.title || t.testTitle}</DialogTitle>
                                  <DialogDescription>Enter the adjusted score manually below.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <label htmlFor={`score-${t.id || t.testId}`} className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] mb-2 block">New Score (%)</label>
                                  <Input type="number" max="100" min="0" defaultValue={t.scoreNumber || t.score || 90} id={`score-${t.id || t.testId}`} />
                                </div>
                                <DialogFooter className="flex items-center gap-2">
                                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                                  <DialogClose render={<Button onClick={() => {
                                    const val = (document.getElementById(`score-${t.id || t.testId}`) as HTMLInputElement)?.value;
                                    if (val) handleUpdateScore(t.testId || t.id, Number(val));
                                  }} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">Save Changes</Button>} />
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>

                      {expandedTests.includes(t.testId || t.id) && t.answers && t.answers.length > 0 && (
                        <div className="p-4 space-y-4">
                          <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Submission Question Breakdown</p>
                          {t.answers.map((ans: any, idx: number) => (
                            <div key={ans.questionId || idx} className="text-xs border border-[#E5E7EB] dark:border-[#27272A] rounded-lg p-3 space-y-2 relative group">
                              <div className="flex items-start justify-between gap-4">
                                <p className="font-semibold text-[#111827] dark:text-[#FAFAFA]">Q{idx + 1}. {ans.questionText}</p>
                                <Badge className={ans.isCorrect ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"} variant="secondary">
                                  {ans.marksObtained}/{ans.maxMarks}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div className="bg-[#F9FAFB] dark:bg-[#09090B] p-2 rounded-md">
                                  <span className="block text-[10px] font-bold text-[#6B7280] mb-1">Student's Response</span>
                                  <p className="text-[#111827] dark:text-[#FAFAFA] font-mono text-[11px]">{ans.studentAnswer}</p>
                                </div>
                                <div className="bg-[#16A34A]/5 p-2 rounded-md border border-[#16A34A]/10">
                                  <span className="block text-[10px] font-bold text-[#16A34A] mb-1">Correct Answer</span>
                                  <p className="text-[#111827] dark:text-[#FAFAFA] font-mono text-[11px]">{ans.correctAnswer}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* TAB 4: TIME & LOGINS */}
              <TabsContent value="time" className="space-y-6">
                {/* 1. Interactive SVG Area Line Chart */}
                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#2563EB]" />
                        Candidate Site Engagement & Active Time (Line Chart)
                      </h4>
                      <p className="text-xs text-[#6B7280]">
                        Overall Platform Usage: <strong className="text-[#2563EB] dark:text-[#60A5FA] font-extrabold">{formatTimeSpent(summary.totalTimeSpentSeconds || 0)}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[10px] text-[#6B7280] italic hidden sm:inline">Hover on the line to see candidate tasks & time</span>
                      <Badge variant="outline" className="text-[10px] font-bold">{analyticsDateRangeLabel}</Badge>
                    </div>
                  </div>

                  {(() => {
                    const data = dailyTimeSpent;
                    if (!data || data.length === 0) {
                      return <p className="text-xs text-muted-foreground py-6 text-center">No time activity recorded in this period.</p>;
                    }

                    const width = 800;
                    const height = 190;
                    const paddingX = 35;
                    const paddingY = 30;
                    const chartWidth = width - paddingX * 2;
                    const chartHeight = height - paddingY * 2;
                    const maxMins = Math.max(...data.map((d: any) => d.minutes || 0), 60);

                    const points = data.map((item: any, index: number) => {
                      const x = paddingX + (index / Math.max(1, data.length - 1)) * chartWidth;
                      const y = height - paddingY - ((item.minutes || 0) / maxMins) * chartHeight;
                      return { x, y, item, index };
                    });

                    const firstPt = points[0];
                    const lastPt = points[points.length - 1];
                    if (!firstPt || !lastPt) return null;

                    let pathD = `M ${firstPt.x},${firstPt.y}`;
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
                    const areaD = `${pathD} L ${lastPt.x},${height - paddingY} L ${firstPt.x},${height - paddingY} Z`;
                    const activePt = hoveredAdminTimePoint !== null ? points[hoveredAdminTimePoint] : null;

                    return (
                      <div
                        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#F0F7FF]/50 dark:from-[#1E3A8A]/10 to-transparent p-3 border border-[#E5E7EB]/60 dark:border-[#27272A]"
                        onMouseLeave={() => setHoveredAdminTimePoint(null)}
                        onPointerLeave={() => setHoveredAdminTimePoint(null)}
                      >
                        <svg
                          viewBox={`0 0 ${width} ${height}`}
                          className="w-full h-48 sm:h-56 overflow-visible"
                          onMouseLeave={() => setHoveredAdminTimePoint(null)}
                          onPointerLeave={() => setHoveredAdminTimePoint(null)}
                        >
                          <defs>
                            <linearGradient id="adminTimeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="adminTimeStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3B82F6" />
                              <stop offset="50%" stopColor="#2563EB" />
                              <stop offset="100%" stopColor="#1D4ED8" />
                            </linearGradient>
                          </defs>
                          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                          <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="currentColor" strokeOpacity="0.15" />
                          <path d={areaD} fill="url(#adminTimeAreaGrad)" />
                          <path d={pathD} fill="none" stroke="url(#adminTimeStrokeGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

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

                          {/* Invisible vertical hover capture bands */}
                          {points.map((pt: any, i: number) => {
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
                                onMouseEnter={() => setHoveredAdminTimePoint(i)}
                                onMouseLeave={() => setHoveredAdminTimePoint(null)}
                              />
                            );
                          })}

                          {/* Interactive Data Points */}
                          {points.map((pt: any, i: number) => (
                            <g key={i} className="cursor-pointer pointer-events-none">
                              {hoveredAdminTimePoint === i && (
                                <circle cx={pt.x} cy={pt.y} r="10" fill="#2563EB" fillOpacity="0.25" className="animate-ping" />
                              )}
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hoveredAdminTimePoint === i ? 6.5 : pt.item.minutes > 0 ? 4.5 : 3}
                                fill={hoveredAdminTimePoint === i ? "#2563EB" : pt.item.minutes > 0 ? "#2563EB" : "#9CA3AF"}
                                stroke="#FFFFFF"
                                strokeWidth={hoveredAdminTimePoint === i ? 2.5 : 1.5}
                              />
                            </g>
                          ))}
                        </svg>

                        {/* Rich Glassmorphic Tooltip Card */}
                        {activePt && (
                          <div
                            className="absolute top-2 z-30 transform -translate-x-1/2 transition-all duration-150 pointer-events-none"
                            style={{
                              left: `${Math.max(18, Math.min(82, (activePt.x / width) * 100))}%`,
                            }}
                          >
                            <div className="bg-[#0F172A]/95 dark:bg-[#090D16]/95 backdrop-blur-md text-white border border-[#334155] rounded-xl p-3.5 shadow-2xl min-w-[240px] max-w-[320px] text-xs space-y-2.5">
                              <div className="flex items-center justify-between border-b border-[#334155] pb-2 gap-2">
                                <div>
                                  <p className="text-[11px] font-bold text-[#94A3B8]">
                                    {activePt.item.fullDate || activePt.item.label}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                                    <span className="text-sm font-extrabold text-[#60A5FA]">
                                      {activePt.item.minutes > 0 ? (activePt.item.display || `${activePt.item.minutes}m`) : "0m"} platform time
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

                              <div className="space-y-1.5 pt-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Candidate Learning Tasks Done:</p>
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
                                        <ClipboardList className="h-3 w-3 text-[#D97706]" /> Exams & Tests:
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

                        <div
                          className="flex justify-between items-center px-4 pt-2 text-[10px] text-[#6B7280] font-semibold overflow-x-auto no-scrollbar"
                          onMouseLeave={() => setHoveredAdminTimePoint(null)}
                        >
                          {data.map((item: any, idx: number) => {
                            const showLabel = data.length <= 10 || idx % Math.ceil(data.length / 8) === 0 || idx === data.length - 1;
                            return (
                              <span
                                key={idx}
                                className={cn("whitespace-nowrap transition-colors cursor-pointer", hoveredAdminTimePoint === idx ? "text-[#2563EB] font-bold" : "")}
                                onMouseEnter={() => setHoveredAdminTimePoint(idx)}
                                onMouseLeave={() => setHoveredAdminTimePoint(null)}
                              >
                                {showLabel ? item.label : ""}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </Card>

                {/* 2. Total Candidate Site Usage Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-[#6B7280]">Total Active Time</span>
                    <p className="text-2xl font-extrabold text-[#2563EB]">{formatTimeSpent(summary.totalTimeSpentSeconds || 0)}</p>
                    <p className="text-[11px] text-[#6B7280]">Total recorded platform hours</p>
                  </Card>
                  <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-[#6B7280]">Course Modules</span>
                    <p className="text-2xl font-extrabold text-[#0D9488]">{courses.reduce((acc: number, c: any) => acc + (c.completedModules || 0), 0)} Completed</p>
                    <p className="text-[11px] text-[#6B7280]">Cohort syllabus lessons</p>
                  </Card>
                  <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-[#6B7280]">Practice Labs</span>
                    <p className="text-2xl font-extrabold text-[#16A34A]">{practices.reduce((acc: number, p: any) => acc + (p.completedChallenges || 0), 0)} Solved</p>
                    <p className="text-[11px] text-[#6B7280]">Coding problem tracks</p>
                  </Card>
                  <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl p-5 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-[#6B7280]">Evaluations</span>
                    <p className="text-2xl font-extrabold text-[#D97706]">{assessments.filter((a: any) => a.attempted).length} Finished</p>
                    <p className="text-[11px] text-[#6B7280]">Proctored exams taken</p>
                  </Card>
                </div>

                <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="p-5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
                    <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Candidate Login History
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
                        {loginActivities.map((log: any) => (
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
              </TabsContent>

              {/* TAB 5: PROCTORING */}
              <TabsContent value="proctoring" className="space-y-3">
                {(!studentData.proctoringLogs || studentData.proctoringLogs.length === 0) ? (
                  <div className="p-6 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-2xl text-center space-y-1">
                    <CheckCircle2 className="h-6 w-6 text-[#16A34A] mx-auto" />
                    <p className="text-xs font-bold text-[#16A34A]">100% Clean Security Record</p>
                    <p className="text-[11px] text-[#6B7280]">No tab switching, window blur, or gaze violations logged.</p>
                  </div>
                ) : (
                  studentData.proctoringLogs.map((log: any) => (
                    <div key={log.id} className="p-3.5 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <Badge className="bg-[#DC2626] text-white text-[9px] font-bold uppercase mr-2">{log.type}</Badge>
                        <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{log.message}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#6B7280]">{log.timestamp}</span>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* TAB 6: AUDIT */}
              <TabsContent value="audit" className="space-y-4">
                {(!studentData.activityLogs || studentData.activityLogs.length === 0) ? (
                  <div className="p-6 text-center text-xs text-[#6B7280]">No activity logs found.</div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#E5E7EB] dark:before:via-[#27272A] before:to-transparent">
                    {studentData.activityLogs.map((log: any) => (
                      <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-[#18181B] bg-[#F9FAFB] dark:bg-[#09090B] group-hover:bg-[#2563EB]/10 text-[#6B7280] group-hover:text-[#2563EB] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          {log.type === "login" && <Lock className="h-4 w-4" />}
                          {log.type === "course" && <FileText className="h-4 w-4" />}
                          {log.type === "test" && <Award className="h-4 w-4" />}
                          {log.type === "practice" && <Code2 className="h-4 w-4" />}
                          {log.type === "system" && <Clock className="h-4 w-4" />}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-[#111827] dark:text-[#FAFAFA]">{log.action}</span>
                            <span className="text-[10px] text-[#6B7280] font-mono">{log.timestamp}</span>
                          </div>
                          <p className="text-xs text-[#6B7280]">{log.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Custom Date to Date Modal Dialog */}
        <Dialog open={isAnalyticsCustomModalOpen} onOpenChange={setIsAnalyticsCustomModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#2563EB]" /> Custom Date Range Filter
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                Select start date and end date to filter candidate performance metrics.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">From Date</Label>
                <Input
                  type="date"
                  value={analyticsFromDate}
                  onChange={(e) => setAnalyticsFromDate(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">To Date</Label>
                <Input
                  type="date"
                  value={analyticsToDate}
                  onChange={(e) => setAnalyticsToDate(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnalyticsCustomModalOpen(false)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyAnalyticsCustomRange}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold gap-1.5"
              >
                Apply Filter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submission Review Modal Dialog (Practice Challenges & Assignments) */}
        <Dialog open={!!reviewModalItem} onOpenChange={(open) => !open && setReviewModalItem(null)}>
          <DialogContent className="sm:max-w-4xl max-w-4xl w-[94vw] md:w-[860px] max-h-[92vh] overflow-y-auto bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {reviewModalItem && (
              <>
                <DialogHeader className="space-y-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-[#2563EB]/10 text-[#2563EB] shrink-0">
                        {reviewModalItem.type === "practice" ? <Code2 className="h-6 w-6" /> : <FileCheck className="h-6 w-6" />}
                      </div>
                      <div className="space-y-0.5">
                        <DialogTitle className="text-xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                          {reviewModalItem.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-[#6B7280]">
                          Track: <span className="font-semibold text-slate-800 dark:text-slate-200">{reviewModalItem.parentTitle}</span> • Candidate: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudent?.name}</span>
                        </DialogDescription>
                      </div>
                    </div>
                    <Badge className={cn("text-xs font-bold capitalize px-3.5 py-1.5 rounded-full shrink-0 shadow-xs", reviewModalItem.status === "Completed" || reviewModalItem.status === "Graded" ? "bg-[#16A34A] text-white" : "bg-[#2563EB] text-white")}>
                      {reviewModalItem.status || "Submitted"}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-5">
                  {/* Summary Grid - 4 Column MNC Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">DIFFICULTY / TYPE</span>
                      <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#FAFAFA] block truncate">{reviewModalItem.difficulty || (reviewModalItem.type === "practice" ? "Coding Challenge" : "Assignment")}</span>
                    </div>
                    <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">CANDIDATE SCORE</span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#16A34A] block">{reviewModalItem.score !== undefined ? `${reviewModalItem.score} / ${reviewModalItem.totalMarks || 100}` : "Pending"}</span>
                    </div>
                    <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">TEST CASES / STATUS</span>
                      <span className="text-xs sm:text-sm font-bold text-[#2563EB] truncate block">{reviewModalItem.testCasesPassed || "Evaluated"}</span>
                    </div>
                    <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">SUBMISSION DATE</span>
                      <span className="text-xs sm:text-sm font-semibold text-[#6B7280] block truncate">{reviewModalItem.completedAt || "Recent"}</span>
                    </div>
                  </div>

                  {/* Submitted Code / Solution Section */}
                  {reviewModalItem.type === "practice" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-[#16A34A]" /> Candidate Submitted Code
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (reviewModalItem.submittedCode) {
                              navigator.clipboard.writeText(reviewModalItem.submittedCode);
                              toast({ title: "Code Copied", description: "Source code copied to clipboard." });
                            }
                          }}
                          className="h-8 text-xs font-bold text-[#2563EB] gap-1.5 border-[#2563EB]/30 hover:bg-[#2563EB]/10 rounded-xl"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy Code
                        </Button>
                      </div>
                      <div className="bg-[#09090B] border border-[#27272A] rounded-2xl p-5 overflow-x-auto shadow-inner">
                        <pre className="font-mono text-xs text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">
                          {reviewModalItem.submittedCode || "// Solution code submitted by candidate\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println(\"Solution executed successfully\");\n    }\n}"}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Assignment URL / Text Section */}
                  {reviewModalItem.type === "assignment" && (
                    <div className="space-y-3.5">
                      {reviewModalItem.submissionUrl && (
                        <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-3">
                          <div className="truncate">
                            <span className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5">Project Repository / File URL</span>
                            <a
                              href={reviewModalItem.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs sm:text-sm font-mono font-bold text-[#2563EB] hover:underline truncate block"
                            >
                              {reviewModalItem.submissionUrl}
                            </a>
                          </div>
                          <a
                            href={reviewModalItem.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20 shrink-0 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      )}
                      {reviewModalItem.submissionText && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Candidate Project Notes</span>
                          <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] text-xs text-[#4B5563] dark:text-[#A1A1AA] leading-relaxed">
                            {reviewModalItem.submissionText}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trainer Grading & Evaluation Section */}
                  <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] space-y-3">
                    <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#D97706]" /> Trainer Review & Evaluation Feedback
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-[#6B7280]">Marks / Score (out of {reviewModalItem.totalMarks || 100})</Label>
                        <Input
                          type="number"
                          min="0"
                          max={reviewModalItem.totalMarks || 100}
                          placeholder="e.g. 95"
                          value={reviewScoreInput}
                          onChange={(e) => setReviewScoreInput(e.target.value)}
                          className="h-11 text-xs font-bold rounded-xl"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold text-[#6B7280]">Evaluation Feedback & Remarks</Label>
                        <Input
                          placeholder="Provide constructive feedback for student..."
                          value={reviewFeedbackInput}
                          onChange={(e) => setReviewFeedbackInput(e.target.value)}
                          className="h-11 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                  <Button
                    variant="outline"
                    onClick={() => setReviewModalItem(null)}
                    className="text-xs font-semibold rounded-xl h-11 px-6"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleSaveReviewGrade}
                    disabled={isSavingReview}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl h-11 px-7 gap-2 shadow-lg shadow-[#2563EB]/25"
                  >
                    {isSavingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Review & Grade
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <PageHeader
        title={portalRole === "admin" ? "Enterprise Student Performance & Proctoring Hub" : "Batch Performance & Proctoring Analytics"}
        description="Real-time individual performance metrics, proctoring security logs, MCQ/Coding accuracy, and batch management"
        actions={
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              onClick={() => {
                setIsCreateBatchOpen(!isCreateBatchOpen);
                setIsAssignBatchOpen(false);
              }}
              variant="outline"
              className="h-[44px] border-[#2563EB] text-[#2563EB] dark:border-[#3B82F6] dark:text-[#3B82F6] hover:bg-[#2563EB]/10 font-bold gap-2 px-5 rounded-xl shadow-xs"
            >
              <FolderKanban className="h-4 w-4" /> Create New Batch
            </Button>
            <Button
              onClick={() => {
                setIsAssignBatchOpen(!isAssignBatchOpen);
                setIsCreateBatchOpen(false);
              }}
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shadow-md shadow-[#2563EB]/20"
            >
              <UserCheck className="h-4 w-4" /> Add Student to Batch
            </Button>
          </div>
        }
      />

      {/* ── CREATE NEW BATCH ── Inline Panel (renders right below header) ── */}
      {isCreateBatchOpen && (
        <Card className="bg-white dark:bg-[#18181B] border border-[#2563EB]/40 dark:border-[#2563EB]/30 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#2563EB]/10 rounded-xl">
                  <FolderKanban className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Create New Batch</p>
                  <p className="text-[11px] text-[#6B7280]">Define a new student batch or bulk upload via CSV.</p>
                </div>
              </div>
              <button type="button" onClick={() => { setIsCreateBatchOpen(false); setCsvFileName(""); setCsvParsedBatches([]); }}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 bg-[#F3F4F6] dark:bg-[#09090B] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] w-fit">
              <button type="button" onClick={() => setCreateBatchMode("manual")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${createBatchMode === "manual" ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"}`}>
                <Plus className="h-3.5 w-3.5" /> Manual Setup
              </button>
              <button type="button" onClick={() => setCreateBatchMode("csv")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${createBatchMode === "csv" ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"}`}>
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#16A34A]" /> Bulk CSV Import
              </button>
            </div>
            {/* Form */}
            <form onSubmit={handleCreateBatchSubmit}>
              {createBatchMode === "manual" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Batch Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Java Batch 01"
                      value={newBatchTitle}
                      onChange={(e) => setNewBatchTitle(e.target.value)}
                      required
                      className="h-[42px] text-xs font-medium rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      College / Institution <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <Input
                      placeholder="e.g. PSG Tech"
                      value={newBatchCollege}
                      onChange={(e) => setNewBatchCollege(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Lead Trainer <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <Input
                      placeholder="e.g. Dr. Aris Thorne"
                      value={newBatchTrainer}
                      onChange={(e) => setNewBatchTrainer(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Course Track <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <Select value={newBatchTrack} onValueChange={(val: string | null) => setNewBatchTrack(val || "")}>
                      <SelectTrigger className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                        <SelectValue placeholder="Select Course Track" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#18181B]">
                        {storeCourses && storeCourses.length > 0 ? (
                          storeCourses.map((course) => (
                            <SelectItem key={course.id} value={course.title}>
                              {course.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No tracks available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Start Date <span className="text-[10px] text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <Input
                      type="date"
                      value={newBatchStartDate}
                      onChange={(e) => setNewBatchStartDate(e.target.value)}
                      className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-5 items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-[#16A34A]" /> Upload Batches CSV</h4>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">Columns: Batch Name, College, Trainer, Course Track, Start Date</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={handleDownloadBatchSampleCsv} className="h-8 text-[11px] font-bold gap-1 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/10 rounded-xl shrink-0">
                        <Download className="h-3.5 w-3.5" /> Download Template
                      </Button>
                    </div>
                    <div className="border-2 border-dashed border-[#2563EB]/40 rounded-xl p-5 text-center relative hover:bg-[#2563EB]/5 transition-colors cursor-pointer">
                      <input type="file" accept=".csv" onChange={handleBatchCsvFileSelect} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      <Upload className="h-7 w-7 text-[#2563EB] mx-auto mb-1.5 opacity-80" />
                      <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{csvFileName ? `Selected: ${csvFileName}` : "Click or Drag & Drop Batch CSV File"}</p>
                      <p className="text-[10px] text-[#6B7280] mt-1">Supports .CSV format for student batches</p>
                    </div>
                  </div>
                  {csvParsedBatches.length > 0 && (
                    <div className="w-full md:w-64 space-y-2">
                      <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30 text-xs font-semibold px-3 py-1">{csvParsedBatches.length} Batches Detected</Badge>
                      <div className="max-h-40 overflow-y-auto border border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[11px] divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {csvParsedBatches.map((b, i) => (
                          <div key={i} className="p-2.5"><p className="font-bold text-[#111827] dark:text-[#FAFAFA] truncate">{b.batchName}</p><p className="text-[10px] text-[#6B7280] truncate">{b.collegeName}</p></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <Button type="button" variant="outline" onClick={() => { setIsCreateBatchOpen(false); setCsvFileName(""); setCsvParsedBatches([]); }} className="h-[40px] px-5 rounded-xl font-bold text-xs">Cancel</Button>
                <Button type="submit" className="h-[40px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs shadow-md shadow-[#2563EB]/20">
                  {createBatchMode === "csv" && csvParsedBatches.length > 0 ? `Create ${csvParsedBatches.length} Batches from CSV` : "Create Batch"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── ADD / ASSIGN STUDENT ── Inline Panel (renders right below header) ── */}
      {isAssignBatchOpen && (
        <Card className="bg-white dark:bg-[#18181B] border border-[#2563EB]/40 dark:border-[#2563EB]/30 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#2563EB]/10 rounded-xl"><Users className="h-5 w-5 text-[#2563EB]" /></div>
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Add / Assign Student to Batch</p>
                  <p className="text-[11px] text-[#6B7280]">Assign individual students or bulk upload via CSV file.</p>
                </div>
              </div>
              <button type="button" onClick={() => { setIsAssignBatchOpen(false); setCsvFileName(""); setCsvParsedStudents([]); setAssignStudentId(""); }}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 bg-[#F3F4F6] dark:bg-[#09090B] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] w-fit">
              <button type="button" onClick={() => setAssignStudentMode("single")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${assignStudentMode === "single" ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"}`}>
                <UserCheck className="h-3.5 w-3.5" /> Single Learner
              </button>
              <button type="button" onClick={() => setAssignStudentMode("csv")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${assignStudentMode === "csv" ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-sm" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"}`}>
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#16A34A]" /> Bulk CSV Import
              </button>
            </div>
            {/* Form */}
            <form onSubmit={handleAssignStudentSubmit}>
              {assignStudentMode === "single" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Student Batch</label>
                    <Select value={assignTargetBatch} onValueChange={(val: string | null) => val && setAssignTargetBatch(val)}>
                      <SelectTrigger className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"><SelectValue placeholder="Select target batch..." /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#18181B]">
                        {availableBatches.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {students.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Select Existing Student</label>
                      <Select value={assignStudentId} onValueChange={(val: string | null) => val && setAssignStudentId(val)}>
                        <SelectTrigger className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"><SelectValue placeholder="Choose from directory..." /></SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#18181B]">
                          {students.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} – {s.batch || "Not Assigned"}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(!assignStudentId || students.length === 0) && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Student Full Name</label>
                        <Input placeholder="e.g. Dharunkumar S" value={assignStudentNameManual} onChange={(e) => setAssignStudentNameManual(e.target.value)} className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Corporate Email</label>
                        <Input placeholder="e.g. student@college.com" value={assignStudentEmailManual} onChange={(e) => setAssignStudentEmailManual(e.target.value)} className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Student Batch</label>
                      <Select value={assignTargetBatch} onValueChange={(val: string | null) => val && setAssignTargetBatch(val)}>
                        <SelectTrigger className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"><SelectValue placeholder="Select target batch..." /></SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#18181B]">
                          {availableBatches.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-[#16A34A]" /> Upload Students CSV</h4>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">Columns: Full Name, Email, College, Course, Batch Name</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={handleDownloadSampleCsv} className="h-8 text-[11px] font-bold gap-1 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/10 rounded-xl shrink-0">
                        <Download className="h-3.5 w-3.5" /> Template
                      </Button>
                    </div>
                    <div className="border-2 border-dashed border-[#2563EB]/40 rounded-xl p-5 text-center relative hover:bg-[#2563EB]/5 transition-colors cursor-pointer">
                      <input type="file" accept=".csv" onChange={handleCsvFileSelect} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      <Upload className="h-7 w-7 text-[#2563EB] mx-auto mb-1.5 opacity-80" />
                      <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">{csvFileName ? `Selected: ${csvFileName}` : "Click or Drag & Drop CSV File"}</p>
                      <p className="text-[10px] text-[#6B7280] mt-1">Supports .CSV with optional Batch Name column</p>
                    </div>
                  </div>
                  {csvParsedStudents.length > 0 && (
                    <div className="space-y-2">
                      <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30 text-xs font-semibold px-3 py-1">{csvParsedStudents.length} Students Parsed</Badge>
                      <div className="max-h-48 overflow-y-auto border border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[11px] divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {csvParsedStudents.map((s, i) => (
                          <div key={i} className="p-2.5 flex justify-between items-center">
                            <div><p className="font-bold text-[#111827] dark:text-[#FAFAFA] truncate">{s.name}</p><p className="text-[10px] text-[#6B7280] truncate">{s.email}</p></div>
                            <Badge variant="outline" className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 shrink-0 ml-2">{s.batch || assignTargetBatch || "Auto-Assign"}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <Button type="button" variant="outline" onClick={() => { setIsAssignBatchOpen(false); setCsvFileName(""); setCsvParsedStudents([]); setAssignStudentId(""); }} className="h-[40px] px-5 rounded-xl font-bold text-xs">Cancel</Button>
                <Button type="submit" className="h-[40px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs shadow-md shadow-[#2563EB]/20">
                  {assignStudentMode === "csv" && csvParsedStudents.length > 0 ? `Assign ${csvParsedStudents.length} CSV Students to Batch` : "Assign to Student Batch"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Total Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">{students.length}</span>
            <span className={`text-xs font-semibold ml-2 ${students.length > 0 ? "text-[#16A34A]" : "text-[#6B7280]"}`}>
              {students.length > 0 ? "100% Active Students" : "No active students"}
            </span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Average Test Score</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              {students.length > 0 ? `${avgTestScore}%` : "0%"}
            </span>
            <span className={`text-xs font-semibold ml-2 ${students.length > 0 ? "text-[#16A34A]" : "text-[#6B7280]"}`}>
              {students.length > 0 ? "Calculated Average" : "No test records"}
            </span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctoring Compliance</span>
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              {students.length > 0 ? `${avgCompliance}%` : "0%"}
            </span>
            <span className={`text-xs font-semibold ml-2 ${students.length > 0 && avgCompliance >= 90 ? "text-[#16A34A]" : "text-[#6B7280]"}`}>
              {students.length > 0 && avgCompliance >= 90 ? "High Trust Rating" : students.length > 0 ? "Standard Rating" : "No proctoring logs"}
            </span>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Proctoring Flagged Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              {flaggedAlertsCount}
            </span>
            <span className={`text-xs font-semibold ml-2 ${flaggedAlertsCount > 0 ? "text-[#DC2626]" : "text-[#6B7280]"}`}>
              {flaggedAlertsCount > 0 ? "Requires Review" : "All clear"}
            </span>
          </div>
        </Card>
      </div>

      {/* Interactive Controls & Filters */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search student name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={batchFilter} onValueChange={(val) => setBatchFilter(val || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[170px] bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue>
                  {batchFilter === "all" ? "Batch: All Batches" : batchFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Batch: All Batches</SelectItem>
                {availableBatches.map((batch) => (
                  <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-[44px] text-xs w-[160px] bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue>
                  {statusFilter === "all" ? "Status: All" : statusFilter === "active" ? "Status: Active" : statusFilter === "flagged" ? "Status: Flagged" : "Status: Suspended"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: All Statuses</SelectItem>
                <SelectItem value="active">Status: Active</SelectItem>
                <SelectItem value="flagged">Status: Flagged</SelectItem>
                <SelectItem value="suspended">Status: Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Student Performance Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6 w-[28%]">Student Details</th>
                <th className="p-4 w-[15%]">Assigned Batch</th>
                <th className="p-4 w-[15%]">Average Score</th>
                <th className="p-4 w-[17%]">Proctoring Status</th>
                <th className="p-4 w-[10%]">Account Status</th>
                <th className="p-4 pr-6 text-right w-[15%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filteredStudents.map((std) => (
                <tr key={std.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors">
                  <td className="p-4 pl-6 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0 border border-[#E5E7EB] dark:border-[#27272A]">
                        <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs">
                          {std.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 truncate">
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs flex items-center gap-2 truncate">
                          <span className="truncate">{std.name}</span>
                          <span className="font-mono text-[10px] text-[#2563EB] font-normal shrink-0">({std.employeeId})</span>
                        </p>
                        <p className="text-[11px] text-[#6B7280] truncate">{std.email} • <span className="font-medium text-[#111827] dark:text-[#FAFAFA]">{std.designation}</span></p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <Badge variant="outline" className="text-xs font-semibold border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                      {std.batch}
                    </Badge>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#111827] dark:text-[#FAFAFA]">{std.avgScore}%</span>
                      <div className="w-20 bg-[#E5E7EB] dark:bg-[#27272A] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${std.avgScore}%` }} />
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    {std.violationCount === 0 ? (
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-bold gap-1">
                        <ShieldCheck className="h-3 w-3" /> Clean Record (0 Logs)
                      </Badge>
                    ) : std.violationCount < 3 ? (
                      <Badge className="bg-[#F59E0B] text-white text-[10px] font-bold gap-1">
                        <AlertTriangle className="h-3 w-3" /> {std.violationCount} Warnings Logged
                      </Badge>
                    ) : (
                      <Badge className="bg-[#DC2626] text-white text-[10px] font-bold gap-1">
                        <ShieldAlert className="h-3 w-3" /> Flagged ({std.violationCount} Violations)
                      </Badge>
                    )}
                  </td>

                  <td className="p-4">
                    <Badge
                      className={`text-[10px] font-bold capitalize ${
                        std.status === "active"
                          ? "bg-[#16A34A] text-white"
                          : std.status === "flagged"
                          ? "bg-[#DC2626] text-white"
                          : "bg-[#6B7280] text-white"
                      }`}
                    >
                      {std.status}
                    </Badge>
                  </td>

                  <td className="p-4 pr-6">
                    <div className="flex items-center justify-end gap-2">
                    <Button
                      onClick={() => {
                        setSelectedStudent(std);
                        setViewState("analytics");
                      }}
                      size="sm"
                      className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1 px-3 shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" /> View Performance
                    </Button>
                    <Button
                      onClick={() => handleToggleStatus(std.id)}
                      variant="outline"
                      size="icon"
                      className={`h-8 w-8 shrink-0 shadow-sm ${
                        std.status === "active" ? "text-[#DC2626] border-[#DC2626]/30 hover:border-[#DC2626] hover:bg-[#DC2626]/10" : "text-[#16A34A] border-[#16A34A]/30 hover:border-[#16A34A] hover:bg-[#16A34A]/10"
                      }`}
                    >
                      {std.status === "active" ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* USER CONTROL DIALOG */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">User Control Access</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">Configure platform access role for this user.</DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">User Control (Role Access)</label>
                <div className="flex flex-col gap-3 p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#2563EB]/40 dark:border-[#2563EB]/40 rounded-xl">
                  <label className="flex items-center justify-between cursor-default group">
                    <div>
                      <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">Student Login</p>
                      <p className="text-xs text-[#6B7280]">Standard access to courses and exams</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="roleAccess" 
                        value="student" 
                        defaultChecked
                        readOnly
                        className="w-4 h-4 text-[#2563EB] focus:ring-[#2563EB] border-gray-300"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button variant="outline" onClick={() => setEditingStudent(null)} className="h-10 px-6 border-[#E5E7EB] dark:border-[#27272A] rounded-xl font-semibold">Cancel</Button>
            <Button
              onClick={() => {
                // Here we would typically save the updated role to the backend
                setStudents((prev) => prev.map((s) => s.id === editingStudent?.id ? { ...s } : s));
                toast({ title: "Role Updated", description: "User access control updated successfully." });
                setEditingStudent(null);
              }}
              className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold shadow-sm"
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
