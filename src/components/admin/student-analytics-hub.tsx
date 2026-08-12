"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLMSStore, StudentUserRecord } from "@/lib/store/lms-store";
import {
  Users, Search, Plus, UserCheck, Shield, Trash2, Edit, Eye, Filter,
  Award, AlertTriangle, CheckCircle2, FileText, Code2, Clock, ShieldAlert,
  GraduationCap, ArrowUpRight, BarChart3, Lock, ShieldCheck, ArrowLeft, Sparkles, FolderKanban,
  Upload, Download, FileSpreadsheet, FileUp, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layouts/page-header";

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
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    return storeStudents.length > 0 ? (storeStudents as unknown as StudentRecord[]) : [];
  });

  useEffect(() => {
    if (storeStudents && storeStudents.length > 0) {
      setStudents(storeStudents as unknown as StudentRecord[]);
    }
  }, [storeStudents]);

  const syncStudentsToStore = (newStds: StudentRecord[]) => {
    setStudents(newStds);
    updateStudents(newStds as unknown as StudentUserRecord[]);
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
      "Batch Name,College Name,Target Tech Track,Start Date,End Date,Joining Session,Lead Trainer\n" +
      "ABC College ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ Java Development ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ Batch 01,ABC College,Core Java & Data Structures,2026-08-01,2026-12-31,Morning Session (09:00 AM),Dr. Aris Thorne\n" +
      "PSG Tech ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ React ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ Batch 02,PSG College of Technology,Fullstack Enterprise React/Next.js,2026-09-01,2027-01-31,Afternoon Session (02:00 PM),Dr. Aris Thorne\n";
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
        title: `âœ… ${csvParsedBatches.length} Batches Created!`,
        description: `Successfully imported & activated ${csvParsedBatches.length} cohort batches from CSV.`,
      });
      setIsCreateBatchOpen(false);
      setCsvParsedBatches([]);
      setCsvFileName("");
      return;
    }

    if (!newBatchTitle.trim()) {
      toast({ title: "Batch Name Required", description: "Please enter a name for the new batch.", variant: "destructive" });
      return;
    }
    const trimmed = newBatchTitle.trim();
    addBatch({
      batchName: trimmed,
      collegeName: newBatchCollege || "ABC College",
      course: newBatchTrack || "Fullstack Enterprise React/Next.js",
      startDate: newBatchStartDate,
      endDate: newBatchEndDate,
      joiningTime: newBatchSession,
      trainer: newBatchTrainer || "Dr. Aris Thorne",
      status: "active",
    });
    toast({
      title: `âœ… Batch Created!`,
      description: `"${trimmed}" is now active and ready for student assignments.`,
    });
    setIsCreateBatchOpen(false);
    setNewBatchTitle("");
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


  const handleToggleStatus = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const nextStatus = s.status === "active" ? "suspended" : "active";
          toast({
            title: "Student Status Updated",
            description: `${s.name} status changed to ${nextStatus.toUpperCase()}`,
          });
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
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
    setNewStudentPassword("EduNexus@2026");
    toast({
      title: "Student Enrolled Successfully",
      description: `${newStudentName} (${newRecord.employeeId}) enrolled with temp password: ${newStudentPassword}`,
    });
  };

  // FULL PAGE ENROLLMENT VIEW
  if (viewState === "enroll") {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
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
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <PageHeader
          title={`${selectedStudent.name} Performance & Security Sheet`}
          description={`${selectedStudent.email} • ${selectedStudent.batch}`}
          backAction={{ label: "Back to Directory", onClick: () => setViewState("list") }}
          actions={
            <div className="flex flex-col items-end gap-1">
              <Badge className={`text-xs font-bold capitalize px-3 py-1 ${selectedStudent.status === "active" ? "bg-[#16A34A] text-white" : "bg-[#DC2626] text-white"}`}>
                Account: {selectedStudent.status}
              </Badge>
              {selectedStudent.systemInfo && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2.5 w-2.5">
                    {selectedStudent.systemInfo.status === "Online" && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${selectedStudent.systemInfo.status === "Online" ? "bg-[#16A34A]" : selectedStudent.systemInfo.status === "Idle" ? "bg-[#F59E0B]" : "bg-[#6B7280]"}`}></span>
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-semibold">
                    {selectedStudent.systemInfo.status} • {selectedStudent.systemInfo.os} • {selectedStudent.systemInfo.ipAddress}
                  </span>
                </div>
              )}
            </div>
          }
        />

        <Card className="p-6 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-4">
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
                  <span className="font-mono text-[#2563EB] font-semibold">{selectedStudent.employeeId}</span> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ {selectedStudent.designation}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-semibold text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                {selectedStudent.department}
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold text-[#9333EA] border-[#9333EA]/30 bg-[#9333EA]/5">
                {selectedStudent.batch}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Competency Skills & Enterprise Certifications</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedStudent.skills.map((skill) => (
                <Badge key={skill} className="bg-[#F9FAFB] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA] border border-[#E5E7EB] dark:border-[#27272A] text-[10px]">
                  {skill}
                </Badge>
              ))}
              {selectedStudent.certificationsEarned.map((cert) => (
                <Badge key={cert} className="bg-[#16A34A] text-white text-[10px]">
                  <Award className="h-2.5 w-2.5 mr-1" /> {cert}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-6 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-center space-y-1">
            <span className="text-xs text-[#6B7280]">Overall Test Average</span>
            <p className="text-3xl font-bold text-[#2563EB]">{selectedStudent.avgScore}%</p>
          </Card>
          <Card className="p-6 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-center space-y-1">
            <span className="text-xs text-[#6B7280]">MCQ Choice Accuracy</span>
            <p className="text-3xl font-bold text-[#16A34A]">{selectedStudent.mcqAccuracy}%</p>
          </Card>
          <Card className="p-6 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-center space-y-1">
            <span className="text-xs text-[#6B7280]">Coding Challenge Rate</span>
            <p className="text-3xl font-bold text-[#9333EA]">{selectedStudent.codingAccuracy}%</p>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="w-full space-y-4">
          <TabsList className="bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] p-1 rounded-xl w-full flex overflow-x-auto justify-start">
            <TabsTrigger value="daily" className="text-xs font-bold px-4 py-2">
              Day-wise Progress
            </TabsTrigger>
            <TabsTrigger value="practices" className="text-xs font-bold px-4 py-2">
              Practice Labs ({selectedStudent.practicesSubmitted?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="tests" className="text-xs font-bold px-4 py-2">
              Evaluations ({selectedStudent.testsTaken?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="proctoring" className="text-xs font-bold px-4 py-2">
              Proctoring Security Logs ({selectedStudent.proctoringLogs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs font-bold px-4 py-2">
              Activity Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-4">
            {!selectedStudent.activityLogs || selectedStudent.activityLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">No activity logs found.</div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#E5E7EB] dark:before:via-[#27272A] before:to-transparent">
                {selectedStudent.activityLogs.map((log) => (
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

          <TabsContent value="daily" className="space-y-3">
            {!selectedStudent.dailyProgress || selectedStudent.dailyProgress.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">No daily progress recorded yet.</div>
            ) : (
              <div className="space-y-4">
                {selectedStudent.dailyProgress.map((day) => (
                  <Card key={day.dayNumber} className="p-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-xs">
                    <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3 mb-3">
                      <div>
                        <Badge variant="outline" className="text-[10px] bg-[#2563EB]/5 text-[#2563EB] border-[#2563EB]/20 mb-1">
                          Day {day.dayNumber}
                        </Badge>
                        <h4 className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{day.topicTitle}</h4>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-[10px] ${day.status === "Completed" ? "bg-[#16A34A] text-white" : "bg-[#F59E0B] text-white"}`}>
                          {day.status}
                        </Badge>
                        <p className="text-[10px] text-[#6B7280] mt-1">{day.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="block text-[10px] text-[#6B7280] font-semibold">Time Spent</span>
                        <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{day.durationSpent}</span>
                      </div>
                      {day.quizScore !== undefined && (
                        <div>
                          <span className="block text-[10px] text-[#6B7280] font-semibold">Quiz Score</span>
                          <span className="font-bold text-[#16A34A]">{day.quizScore}%</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="practices" className="space-y-3">
            {!selectedStudent.practicesSubmitted || selectedStudent.practicesSubmitted.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">No practice submissions.</div>
            ) : (
              selectedStudent.practicesSubmitted.map((p) => (
                <Card key={p.practiceId} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] overflow-hidden text-xs">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Code2 className="h-4 w-4 text-[#9333EA]" />
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{p.title}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[#6B7280]">
                        <span>Day {p.dayNumber} ({p.date})</span>
                        {p.type === "coding" && <span>Test Cases: {p.testCasesPassed}</span>}
                      </div>
                    </div>
                    <div className="text-right mt-2 sm:mt-0 flex items-center justify-end gap-3">
                      <div>
                        <span className="font-bold text-base text-[#16A34A]">{p.score}% Score</span>
                      </div>
                      
                      {p.submittedCode && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 text-[10px] px-2 font-bold gap-1"
                          onClick={() => togglePractice(p.practiceId)}
                        >
                          <Eye className="h-3 w-3" /> {expandedPractices.includes(p.practiceId) ? "Hide Answers" : "Review Answers"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {expandedPractices.includes(p.practiceId) && p.submittedCode && (
                    <div className="p-4 space-y-4">
                      <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Code Submission</p>
                      <div className="bg-[#111827] text-white p-3 rounded-md overflow-x-auto">
                        <pre className="text-[11px] font-mono whitespace-pre-wrap">{p.submittedCode}</pre>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        {p.feedback ? (
                          <div className="text-[11px] text-[#9333EA] bg-[#9333EA]/5 p-2 rounded-md flex-1">
                            <strong>Trainer Feedback:</strong> {p.feedback}
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#6B7280] italic flex-1">No feedback provided yet.</div>
                        )}

                        {portalRole === "trainer" || portalRole === "admin" ? (
                          <Dialog>
                            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-7 text-[10px] px-2 font-bold gap-1 ml-3 text-[#9333EA] hover:text-[#7E22CE] hover:bg-[#9333EA]/10">
                              <Edit className="h-3 w-3" /> Evaluate
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Evaluate Practice</DialogTitle>
                                <DialogDescription>Review the submitted code and update score/feedback.</DialogDescription>
                              </DialogHeader>
                              <div className="py-2 space-y-4">
                                <div>
                                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] mb-2 block">Score (%)</label>
                                  <Input type="number" max="100" min="0" defaultValue={p.score} />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] mb-2 block">Trainer Feedback</label>
                                  <textarea 
                                    className="w-full text-xs p-3 rounded-md border border-[#E5E7EB] dark:border-[#27272A] bg-transparent focus:outline-none focus:ring-1 focus:ring-[#9333EA]" 
                                    rows={3} 
                                    defaultValue={p.feedback || ""}
                                    placeholder="Add feedback for the practice lab..."
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose render={<Button variant="outline">Cancel</Button>} />
                                <DialogClose render={<Button className="bg-[#9333EA] hover:bg-[#7E22CE] text-white" onClick={() => {
                                  toast({ title: "Evaluation Saved", description: "Practice lab evaluation updated." });
                                }}>Save Evaluation</Button>} />
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        ) : null}
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tests" className="space-y-4">
            {!selectedStudent.testsTaken || selectedStudent.testsTaken.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">No evaluations completed.</div>
            ) : (
              selectedStudent.testsTaken.map((t) => (
                <Card key={t.testId} className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]">
                    <div>
                      <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-sm">{t.testTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] bg-white dark:bg-[#18181B] text-[#6B7280]">{t.category}</Badge>
                        <span className="text-[10px] text-[#6B7280]">Completed: {t.completedAt}</span>
                      </div>
                    </div>
                    <div className="text-right mt-2 sm:mt-0 flex items-center justify-end gap-3">
                      <div>
                        <span className="font-bold text-base text-[#16A34A]">{t.score}%</span>
                        <p className="text-[10px] text-[#DC2626]">{t.violations} Violations</p>
                      </div>
                      
                      {t.answers && t.answers.length > 0 && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 text-[10px] px-2 font-bold gap-1"
                          onClick={() => toggleTest(t.testId)}
                        >
                          <Eye className="h-3 w-3" /> {expandedTests.includes(t.testId) ? "Hide Answers" : "Review Answers"}
                        </Button>
                      )}

                      {portalRole === "admin" && (
                        <Dialog>
                          <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 text-[10px] px-2 font-bold gap-1 border-[#E5E7EB] dark:border-[#27272A]">
                            <Edit className="h-3 w-3" /> Edit Score
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Score for {t.testTitle}</DialogTitle>
                              <DialogDescription>Enter the new score manually below.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <label htmlFor={`score-${t.testId}`} className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] mb-2 block">New Score (%)</label>
                              <Input type="number" max="100" min="0" defaultValue={t.score} id={`score-${t.testId}`} />
                            </div>
                            <DialogFooter className="flex items-center gap-2">
                              <DialogClose render={<Button variant="outline">Cancel</Button>} />
                              <DialogClose render={<Button onClick={() => {
                                const val = (document.getElementById(`score-${t.testId}`) as HTMLInputElement)?.value;
                                if (val) handleUpdateScore(t.testId, Number(val));
                              }} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">Save Changes</Button>} />
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {expandedTests.includes(t.testId) && t.answers && t.answers.length > 0 && (
                    <div className="p-4 space-y-4">
                      <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Submission Review</p>
                      {t.answers.map((ans, idx) => (
                        <div key={ans.questionId} className="text-xs border border-[#E5E7EB] dark:border-[#27272A] rounded-lg p-3 space-y-2 relative group">
                          <div className="flex items-start justify-between gap-4">
                            <p className="font-semibold text-[#111827] dark:text-[#FAFAFA]">Q{idx + 1}. {ans.questionText}</p>
                            <Badge className={ans.isCorrect ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"} variant="secondary">
                              {ans.marksObtained}/{ans.maxMarks}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                            <div className="bg-[#F9FAFB] dark:bg-[#09090B] p-2 rounded-md">
                              <span className="block text-[10px] font-bold text-[#6B7280] mb-1">Student's Answer</span>
                              <p className="text-[#111827] dark:text-[#FAFAFA]">{ans.studentAnswer}</p>
                            </div>
                            <div className="bg-[#16A34A]/5 p-2 rounded-md border border-[#16A34A]/10">
                              <span className="block text-[10px] font-bold text-[#16A34A] mb-1">Correct Answer</span>
                              <p className="text-[#111827] dark:text-[#FAFAFA]">{ans.correctAnswer}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            {ans.feedback ? (
                              <div className="text-[11px] text-[#2563EB] bg-[#2563EB]/5 p-2 rounded-md flex-1">
                                <strong>Evaluator Feedback:</strong> {ans.feedback}
                              </div>
                            ) : (
                              <div className="text-[11px] text-[#6B7280] italic flex-1">No feedback provided yet.</div>
                            )}

                            {portalRole === "admin" && (
                              <Dialog>
                                <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-7 text-[10px] px-2 font-bold gap-1 ml-3 text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#2563EB]/10">
                                  <Edit className="h-3 w-3" /> Evaluate
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Evaluate Answer</DialogTitle>
                                    <DialogDescription>Review the student's answer and update marks/feedback.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-2 space-y-4">
                                    <div className="bg-[#F9FAFB] dark:bg-[#09090B] p-3 rounded-md text-xs">
                                      <span className="block text-[10px] font-bold text-[#6B7280] mb-1">Student's Answer</span>
                                      <p className="text-[#111827] dark:text-[#FAFAFA]">{ans.studentAnswer}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] mb-2 block">Marks Obtained (Max: {ans.maxMarks})</label>
                                        <Input type="number" max={ans.maxMarks} min="0" defaultValue={ans.marksObtained} />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] mb-2 block">Evaluator Feedback</label>
                                      <textarea 
                                        className="w-full text-xs p-3 rounded-md border border-[#E5E7EB] dark:border-[#27272A] bg-transparent focus:outline-none focus:ring-1 focus:ring-[#2563EB]" 
                                        rows={3} 
                                        defaultValue={ans.feedback || ""}
                                        placeholder="Add feedback for the student..."
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                                    <DialogClose render={<Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" onClick={() => {
                                      toast({ title: "Evaluation Saved", description: "The answer feedback and marks have been updated." });
                                    }}>Save Evaluation</Button>} />
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="proctoring" className="space-y-3">
            {!selectedStudent.proctoringLogs || selectedStudent.proctoringLogs.length === 0 ? (
              <div className="p-6 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-2xl text-center space-y-1">
                <CheckCircle2 className="h-6 w-6 text-[#16A34A] mx-auto" />
                <p className="text-xs font-bold text-[#16A34A]">100% Clean Security Record</p>
                <p className="text-[11px] text-[#6B7280]">No tab switching, window blur, or gaze violations logged.</p>
              </div>
            ) : (
              selectedStudent.proctoringLogs.map((log) => (
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
        </Tabs>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Batch Name</label>
                    <Input placeholder="e.g. ABC College – Java – Batch 01" value={newBatchTitle} onChange={(e) => setNewBatchTitle(e.target.value)} required className="h-[42px] text-xs font-medium rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">College / Institution</label>
                    <Input placeholder="e.g. PSG Tech" value={newBatchCollege} onChange={(e) => setNewBatchCollege(e.target.value)} required className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Course Track</label>
                    <Select value={newBatchTrack} onValueChange={(val: string | null) => val && setNewBatchTrack(val)}>
                      <SelectTrigger className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"><SelectValue placeholder="Select Track" /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#18181B]">
                        {storeCourses && storeCourses.length > 0 ? (
                          storeCourses.map((course) => (
                            <SelectItem key={course.id} value={course.title}>{course.title}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No tracks available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Lead Trainer</label>
                    <Input placeholder="e.g. Dr. Aris Thorne" value={newBatchTrainer} onChange={(e) => setNewBatchTrainer(e.target.value)} className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Start Date</label>
                    <Input type="date" value={newBatchStartDate} onChange={(e) => setNewBatchStartDate(e.target.value)} className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">End Date</label>
                    <Input type="date" value={newBatchEndDate} onChange={(e) => setNewBatchEndDate(e.target.value)} className="h-[42px] text-xs bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Joining Session</label>
                    <Select value={newBatchSession} onValueChange={(val: string | null) => val && setNewBatchSession(val)}>
                      <SelectTrigger className="h-[42px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Morning Session (09:00 AM)">Morning (09:00 AM)</SelectItem>
                        <SelectItem value="Afternoon Session (02:00 PM)">Afternoon (02:00 PM)</SelectItem>
                        <SelectItem value="Evening Session (05:00 PM)">Evening (05:00 PM)</SelectItem>
                        <SelectItem value="Full-Day Bootcamp (09:00 AM - 05:00 PM)">Full-Day Bootcamp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-5 items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-[#16A34A]" /> Upload Batches CSV</h4>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">Columns: Batch Name, College, Track, Start, End, Session, Trainer</p>
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
                      <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30 text-xs font-bold px-3 py-1">✓ {csvParsedBatches.length} Batches Detected</Badge>
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
                      <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30 text-xs font-bold px-3 py-1">✓ {csvParsedStudents.length} Students Parsed</Badge>
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
            <div className="w-8 h-8 rounded-lg bg-[#9333EA]/10 text-[#9333EA] flex items-center justify-center">
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
                        <p className="text-[11px] text-[#6B7280] truncate">{std.email} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ <span className="font-medium text-[#111827] dark:text-[#FAFAFA]">{std.designation}</span></p>
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
