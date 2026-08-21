"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ClipboardList, Plus, Search, ShieldAlert, ShieldCheck, Clock, Users,
  Award, Eye, Trash2, Play, ArrowLeft, Sparkles, Lock, FileText, CheckSquare, Settings,
  CheckCircle2, AlertCircle, Send, Check, Code2, Edit, Download, Calendar, CalendarDays,
  CalendarRange, X, RotateCcw, Zap, Globe, Timer, Info, Copy, RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";
import { PageHeader } from "@/components/layouts/page-header";
import { VisibilitySelector } from "@/components/admin/visibility-selector";
import { AutoSaveBadge } from "@/components/ui/auto-save-badge";

export interface ScheduledTest {
  id: string;
  title: string;
  batch: string;
  scheduleMode?: "open" | "window" | "scheduled";
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  duration: number;
  totalQuestions: number;
  maxMarks: number;
  status: "live" | "scheduled" | "completed";
  submissionsCount: number;
  totalEnrolled: number;
  proctoringFlags: string[];
  isCommon?: boolean;
  assignedBatches?: string[];
  questions?: TestQuestion[];
  allowedQuestionTypes?: "coding" | "mcq" | "both";
  sections?: string[];
  secWebcam?: boolean;
  secFullscreen?: boolean;
  secTabSwitch?: boolean;
  secCopyPaste?: boolean;
  secMultipleScreens?: boolean;
  secSEB?: boolean;
  secMultipleFaces?: boolean;
  secLookingAway?: boolean;
  secFacePosition?: boolean;
  secAutoSubmit?: boolean;
  maxWarningsLimit?: number;
  hasPassingCriteria?: boolean;
  passingCriteriaType?: "percentage" | "marks";
  passPercentage?: number;
  passingMarks?: number;
}

export interface TestQuestion {
  id: string;
  title: string;
  type: "coding" | "mcq" | "msq" | "both";
  marks: number;
  section: string;
  options?: Array<{ id: number; text: string; isCorrect: boolean }>;
  testCases?: Array<{ id: number; input: string; output: string; isHidden?: boolean }>;
}

const initialTests: ScheduledTest[] = [];

type ViewState = "list" | "wizard" | "exam-dashboard" | "add-question";

import { useLMSStore } from "@/lib/store/lms-store";
import type { Assessment } from "@/types/assessment";

export function ProctoredTestHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const { toast } = useToast();
  const [tests, setTests] = useState<ScheduledTest[]>([]);
  const [allBatches, setAllBatches] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/tests");
        const data = await res.json();
        if (data.tests) {
          setTests(data.tests);
        }
        if (data.batches) {
          setAllBatches(data.batches);
        }
      } catch (err) {
        console.error("Failed to load admin tests", err);
      }
    };
    fetchData();
    setIsMounted(true);
  }, []);

  const [isMounted, setIsMounted] = useState(false);

  const syncTestsToStore = (newTests: ScheduledTest[]) => {
    setTests(newTests);
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedTest, setSelectedTest] = useState<ScheduledTest | null>(null);

  // MNC Scheduling Mode & Form State for Create Wizard
  const [newScheduleMode, setNewScheduleMode] = useState<"open" | "window" | "scheduled">("open");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newTimezone, setNewTimezone] = useState("Asia/Kolkata (IST)");
  const [newDuration, setNewDuration] = useState(60);
  const [newStatus, setNewStatus] = useState<"live" | "scheduled">("live");
  const [secWebcam, setSecWebcam] = useState(true);
  const [secFullscreen, setSecFullscreen] = useState(true);
  const [secTabSwitch, setSecTabSwitch] = useState(true);
  const [secCopyPaste, setSecCopyPaste] = useState(true);
  const [secMultipleScreens, setSecMultipleScreens] = useState(false);
  const [secSEB, setSecSEB] = useState(false);
  const [maxWarningsLimit, setMaxWarningsLimit] = useState(3);
  const [secMultipleFaces, setSecMultipleFaces] = useState(true);
  const [secLookingAway, setSecLookingAway] = useState(true);
  const [secFacePosition, setSecFacePosition] = useState(true);
  const [secAutoSubmit, setSecAutoSubmit] = useState(true);
  const [newAllowedTypes, setNewAllowedTypes] = useState<"coding" | "mcq" | "both">("both");
  const [hasPassingCriteria, setHasPassingCriteria] = useState(true);
  const [passingCriteriaType, setPassingCriteriaType] = useState<"percentage" | "marks">("percentage");
  const [passPercentage, setPassPercentage] = useState(40);
  const [passingMarks, setPassingMarks] = useState(40);

  // Edit Exam Settings Modal State
  const [isEditingExamSettings, setIsEditingExamSettings] = useState(false);
  const [editExamForm, setEditExamForm] = useState<Partial<ScheduledTest>>({});

  // Form State for Add / Edit Question
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [manualQuestionTitle, setManualQuestionTitle] = useState("");
  const [manualQuestionType, setManualQuestionType] = useState("coding");
  const [manualQuestionSection, setManualQuestionSection] = useState("");
  const [customSectionName, setCustomSectionName] = useState("");
  const [manualQuestionMarks, setManualQuestionMarks] = useState(10);
  const [showCodingProblemBuilder, setShowCodingProblemBuilder] = useState(false);
  const [manualTestCases, setManualTestCases] = useState([{ id: 1, input: "", output: "", isHidden: false }]);
  const [manualMCQOptions, setManualMCQOptions] = useState([
    { id: 1, text: "", isCorrect: false },
    { id: 2, text: "", isCorrect: false }
  ]);

  // Assignment Modal State
  const [assigningTest, setAssigningTest] = useState<ScheduledTest | null>(null);
  const [isCommon, setIsCommon] = useState<boolean>(true);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  // Reassign Modal State
  const [reassigningTest, setReassigningTest] = useState<ScheduledTest | null>(null);
  const [reassignIsCommon, setReassignIsCommon] = useState<boolean>(true);
  const [reassignSelectedBatches, setReassignSelectedBatches] = useState<string[]>([]);
  const [reassignResetAttempts, setReassignResetAttempts] = useState<boolean>(true);
  const [isSubmittingReassign, setIsSubmittingReassign] = useState<boolean>(false);
  
  // Section Management State
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // Auto-save test wizard draft
  const [lastSavedExamDraft, setLastSavedExamDraft] = useState<string | null>(null);
  const [isSavedExamDraft, setIsSavedExamDraft] = useState<boolean>(true);

  // Live Candidate Submissions for Selected Assessment
  const [candidateSubmissions, setCandidateSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);

  // Quick Time & Date Helpers
  const getTodayString = (): string => (new Date().toISOString().split("T")[0]) || "";
  const getTomorrowString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return (d.toISOString().split("T")[0]) || "";
  };
  const getNextWeekString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return (d.toISOString().split("T")[0]) || "";
  };

  const calculateAutoEndTime = (startTimeStr: string, durationMins: number): string => {
    if (!startTimeStr) return "";
    try {
      const parts = startTimeStr.split(":");
      if (parts.length < 2) return "";
      const hours = parseInt(parts[0] || "0", 10);
      const mins = parseInt(parts[1] || "0", 10);
      if (isNaN(hours) || isNaN(mins)) return "";
      const date = new Date();
      date.setHours(hours, mins + (durationMins || 60), 0, 0);
      const endH = String(date.getHours()).padStart(2, "0");
      const endM = String(date.getMinutes()).padStart(2, "0");
      return `${endH}:${endM}`;
    } catch {
      return "";
    }
  };

  const handleClearAllSchedule = () => {
    setNewDate("");
    setNewStartDate("");
    setNewEndDate("");
    setNewStartTime("");
    setNewEndTime("");
    setNewScheduleMode("open");
    toast({
      title: "Schedule Cleared",
      description: "Exam is now configured in On-Demand mode (available anytime without date/time limits).",
    });
  };

  // Overall Master Proctoring Toggle in Create Wizard
  const isAllProctoringActive = Boolean(
    secWebcam ||
    secFullscreen ||
    secTabSwitch ||
    secCopyPaste ||
    secMultipleFaces ||
    secLookingAway ||
    secFacePosition ||
    secAutoSubmit ||
    secSEB
  );

  const handleToggleAllProctoring = (enabled: boolean) => {
    setSecWebcam(enabled);
    setSecFullscreen(enabled);
    setSecTabSwitch(enabled);
    setSecCopyPaste(enabled);
    setSecMultipleFaces(enabled);
    setSecLookingAway(enabled);
    setSecFacePosition(enabled);
    setSecAutoSubmit(enabled);
    if (!enabled) setSecSEB(false);
    toast({
      title: enabled ? "AI Proctoring Suite Activated" : "All AI Proctoring Disabled",
      description: enabled
        ? "Facial tracking, anti-tab switch, fullscreen, and clipboard locks are now ON."
        : "Exam is set to open / unrestricted mode (all security rules turned OFF).",
    });
  };

  // Clear any old stale draft on mount so Exam Title starts completely blank with placeholder
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("draft_proctored_test");
    } catch (e) {}
  }, []);

  // Auto-save exam wizard draft
  useEffect(() => {
    if (typeof window === "undefined" || viewState !== "wizard") return;
    if (!newTitle && !newDate && !newStartTime && newScheduleMode === "open") return;
    setIsSavedExamDraft(false);
    const timer = setTimeout(() => {
      try {
        const d = {
          newScheduleMode, newTitle, newDate, newStartDate, newEndDate, newStartTime, newEndTime, newTimezone,
          newDuration, newStatus, newAllowedTypes, secWebcam, secFullscreen, secTabSwitch, secCopyPaste,
          secMultipleScreens, secSEB,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        localStorage.setItem("draft_proctored_test", JSON.stringify(d));
        setIsSavedExamDraft(true);
        setLastSavedExamDraft(d.savedAt);
      } catch (e) {
        console.warn("Failed to auto-save test draft", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newScheduleMode, newTitle, newDate, newStartDate, newEndDate, newStartTime, newEndTime, newTimezone, newDuration, newStatus, newAllowedTypes, secWebcam, secFullscreen, secTabSwitch, secCopyPaste, secMultipleScreens, secSEB, viewState]);

  // Fetch live candidate submissions for selected assessment
  useEffect(() => {
    if (!selectedTest?.id || viewState !== "exam-dashboard") {
      setCandidateSubmissions([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingSubmissions(true);

    fetch(`/api/admin/tests/${selectedTest.id}/submissions`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled) {
          setCandidateSubmissions(data.submissions || []);
          setIsLoadingSubmissions(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load candidate submissions:", err);
        if (!isCancelled) {
          setCandidateSubmissions([]);
          setIsLoadingSubmissions(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedTest?.id, viewState]);

  const filtered = tests.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast({ title: "Title Required", description: "Please enter an exam title.", variant: "destructive" });
      return;
    }

    const proctoringFlags: string[] = [
      ...(secWebcam ? ["AI Facial Tracking Active"] : []),
      ...(secFullscreen ? ["Fullscreen Locked"] : []),
      ...(secTabSwitch ? ["Anti-Tab Switch"] : []),
      ...(secCopyPaste ? ["Clipboard Blocked"] : []),
      ...(secSEB ? ["Safe Exam Browser Enforced"] : []),
    ];

    const newTest: ScheduledTest = {
      id: `test_${Date.now()}`,
      title: newTitle.trim(),
      scheduleMode: newScheduleMode,
      date: newDate || undefined,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
      startTime: newStartTime || undefined,
      endTime: newEndTime || undefined,
      timezone: newTimezone,
      batch: "Common (All Batches)",
      isCommon: true,
      assignedBatches: [],
      duration: newDuration || 60,
      totalQuestions: 0,
      maxMarks: 0,
      status: newStatus,
      submissionsCount: 0,
      totalEnrolled: 0,
      proctoringFlags,
      allowedQuestionTypes: newAllowedTypes,
      sections: ["General Assessment"],
      questions: [],
      secWebcam,
      secFullscreen,
      secTabSwitch,
      secCopyPaste,
      secMultipleScreens,
      secSEB,
      secMultipleFaces,
      secLookingAway,
      secFacePosition,
      secAutoSubmit,
      maxWarningsLimit,
      hasPassingCriteria,
      passingCriteriaType,
      passPercentage: hasPassingCriteria ? (passingCriteriaType === "percentage" ? passPercentage : undefined) : undefined,
      passingMarks: hasPassingCriteria ? (passingCriteriaType === "marks" ? passingMarks : undefined) : undefined,
    };

    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: newTest }),
      });
      const data = await res.json();
      if (data.test?.id) {
        newTest.id = data.test.id;
      }
    } catch (err) {
      console.error("Failed to persist new test", err);
    }

    setTests([newTest, ...tests]);
    setSelectedTest(newTest);
    setViewState("exam-dashboard");
    toast({
      title: "Exam Setup Created",
      description: `"${newTitle}" configured successfully as ${newScheduleMode === "open" ? "On-Demand (Available Anytime)" : newScheduleMode === "window" ? "Flexible Window" : "Scheduled Slot"}.`,
    });
  };

  const openEditExamModal = (test: ScheduledTest) => {
    setSelectedTest(test);
    setEditExamForm({
      ...test,
      scheduleMode: test.scheduleMode || (test.date ? "scheduled" : "open"),
      timezone: test.timezone || "Asia/Kolkata (IST)",
      duration: test.duration || 60,
      status: test.status || "live",
      allowedQuestionTypes: test.allowedQuestionTypes || "both",
      hasPassingCriteria: test.hasPassingCriteria ?? true,
      passingCriteriaType: test.passingCriteriaType || "percentage",
      passPercentage: test.passPercentage ?? 40,
      passingMarks: test.passingMarks ?? 40,
      secWebcam: test.secWebcam ?? true,
      secFullscreen: test.secFullscreen ?? true,
      secTabSwitch: test.secTabSwitch ?? true,
      secCopyPaste: test.secCopyPaste ?? true,
      secMultipleScreens: test.secMultipleScreens ?? false,
      secSEB: test.secSEB ?? false,
      secMultipleFaces: test.secMultipleFaces ?? true,
      secLookingAway: test.secLookingAway ?? true,
      secFacePosition: test.secFacePosition ?? true,
      secAutoSubmit: test.secAutoSubmit ?? true,
      maxWarningsLimit: test.maxWarningsLimit ?? 3,
    });
    setIsEditingExamSettings(true);
  };

  const handleSaveExamSettings = async () => {
    const currentTest = selectedTest || tests.find((t) => t.id === editExamForm.id);
    if (!editExamForm.title?.trim()) {
      toast({ title: "Title Required", description: "Assessment title cannot be empty.", variant: "destructive" });
      return;
    }
    if (!currentTest) {
      toast({ title: "Test Not Found", description: "Could not find the target assessment.", variant: "destructive" });
      return;
    }

    const proctoringFlags: string[] = [
      ...(editExamForm.secWebcam ? ["AI Facial Tracking Active"] : []),
      ...(editExamForm.secFullscreen ? ["Fullscreen Locked"] : []),
      ...(editExamForm.secTabSwitch ? ["Anti-Tab Switch"] : []),
      ...(editExamForm.secCopyPaste ? ["Clipboard Blocked"] : []),
      ...(editExamForm.secSEB ? ["Safe Exam Browser Enforced"] : []),
    ];

    const hasPass = editExamForm.hasPassingCriteria ?? true;
    const passType = editExamForm.passingCriteriaType || "percentage";

    const updatedTest: ScheduledTest = {
      ...currentTest,
      title: editExamForm.title.trim(),
      scheduleMode: editExamForm.scheduleMode || "open",
      date: editExamForm.date || undefined,
      startDate: editExamForm.startDate || undefined,
      endDate: editExamForm.endDate || undefined,
      startTime: editExamForm.startTime || undefined,
      endTime: editExamForm.endTime || undefined,
      timezone: editExamForm.timezone || "Asia/Kolkata (IST)",
      duration: Number(editExamForm.duration) || 60,
      status: editExamForm.status || "live",
      allowedQuestionTypes: editExamForm.allowedQuestionTypes || "both",
      hasPassingCriteria: hasPass,
      passingCriteriaType: passType,
      passPercentage: hasPass ? (passType === "percentage" ? (editExamForm.passPercentage ?? 40) : undefined) : undefined,
      passingMarks: hasPass ? (passType === "marks" ? (editExamForm.passingMarks ?? 40) : undefined) : undefined,
      proctoringFlags,
      secWebcam: editExamForm.secWebcam,
      secFullscreen: editExamForm.secFullscreen,
      secTabSwitch: editExamForm.secTabSwitch,
      secCopyPaste: editExamForm.secCopyPaste,
      secMultipleScreens: editExamForm.secMultipleScreens,
      secSEB: editExamForm.secSEB,
      secMultipleFaces: editExamForm.secMultipleFaces,
      secLookingAway: editExamForm.secLookingAway,
      secFacePosition: editExamForm.secFacePosition,
      secAutoSubmit: editExamForm.secAutoSubmit,
      maxWarningsLimit: editExamForm.maxWarningsLimit,
    };

    try {
      await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: updatedTest }),
      });
    } catch (err) {
      console.error("Failed to save updated exam settings", err);
    }

    setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
    setSelectedTest(updatedTest);
    setIsEditingExamSettings(false);
    toast({
      title: "Exam Settings Updated",
      description: "Schedule, timing, and security rules saved successfully.",
    });
  };

  const openCreateQuestion = (section?: string) => {
    const targetSection = section || selectedTest?.sections?.[0] || "General Assessment";
    setEditingQuestionId(null);
    setManualQuestionTitle("");
    setManualQuestionType(
      selectedTest?.allowedQuestionTypes === "coding"
        ? "coding"
        : selectedTest?.allowedQuestionTypes === "mcq"
        ? "mcq"
        : "mcq"
    );
    setManualQuestionMarks(10);
    setManualQuestionSection(targetSection);
    setCustomSectionName("");
    setManualMCQOptions([
      { id: 1, text: "", isCorrect: false },
      { id: 2, text: "", isCorrect: false },
      { id: 3, text: "", isCorrect: false },
      { id: 4, text: "", isCorrect: false },
    ]);
    setManualTestCases([{ id: 1, input: "", output: "", isHidden: false }]);
    setViewState("add-question");
  };

  const saveCurrentQuestionDraft = (): boolean => {
    if (!selectedTest || !manualQuestionTitle.trim()) return false;

    const finalSection = manualQuestionSection === "custom" ? customSectionName.trim() : manualQuestionSection.trim();
    const sectionName =
      finalSection ||
      (manualQuestionType === "coding"
        ? "Programming Task"
        : manualQuestionType === "both"
        ? "Hybrid Task"
        : "Multiple Choice");

    const currentOptions =
      manualQuestionType === "mcq" || manualQuestionType === "msq" || manualQuestionType === "both"
        ? manualMCQOptions.map((o) => ({ ...o }))
        : undefined;

    const currentTestCases =
      manualQuestionType === "coding" || manualQuestionType === "both"
        ? manualTestCases.map((t) => ({ ...t }))
        : undefined;

    let updatedQuestions: TestQuestion[];

    if (editingQuestionId) {
      updatedQuestions = (selectedTest.questions || []).map((q) =>
        q.id === editingQuestionId
          ? {
              ...q,
              title: manualQuestionTitle.trim(),
              type: manualQuestionType as "coding" | "mcq" | "msq" | "both",
              marks: manualQuestionMarks,
              section: sectionName,
              options: currentOptions,
              testCases: currentTestCases,
            }
          : q
      );
    } else {
      const newQ: TestQuestion = {
        id: `q_${Date.now()}`,
        title: manualQuestionTitle.trim(),
        type: manualQuestionType as "coding" | "mcq" | "msq" | "both",
        marks: manualQuestionMarks,
        section: sectionName,
        options: currentOptions,
        testCases: currentTestCases,
      };
      updatedQuestions = [...(selectedTest.questions || []), newQ];
    }

    const totalMarks = updatedQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);
    const updatedTest = {
      ...selectedTest,
      totalQuestions: updatedQuestions.length,
      maxMarks: totalMarks,
      questions: updatedQuestions,
    };

    fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: updatedTest }),
    }).catch((err) => console.error("Failed to auto-save test question", err));

    setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
    setSelectedTest(updatedTest);
    return true;
  };

  const handleSwitchToQuestion = (targetQ: TestQuestion) => {
    // If current question has unsaved text, auto-save it first
    if (manualQuestionTitle.trim()) {
      saveCurrentQuestionDraft();
    }
    openEditQuestion(targetQ);
  };

  const handleSwitchToNewQuestion = () => {
    if (manualQuestionTitle.trim()) {
      saveCurrentQuestionDraft();
    }
    handleQuickNewQuestion();
  };

  const openEditQuestion = (q: TestQuestion) => {
    setEditingQuestionId(q.id);
    setManualQuestionTitle(q.title || "");
    setManualQuestionType(q.type || "mcq");
    setManualQuestionMarks(q.marks || 10);
    setManualQuestionSection(q.section || "General Assessment");
    setCustomSectionName("");
    if (q.options && q.options.length > 0) {
      setManualMCQOptions(q.options.map((o) => ({ ...o })));
    } else {
      setManualMCQOptions([
        { id: 1, text: "", isCorrect: false },
        { id: 2, text: "", isCorrect: false },
        { id: 3, text: "", isCorrect: false },
        { id: 4, text: "", isCorrect: false },
      ]);
    }
    if (q.testCases && q.testCases.length > 0) {
      setManualTestCases(q.testCases.map((t) => ({ id: t.id, input: t.input, output: t.output, isHidden: Boolean(t.isHidden) })));
    } else {
      setManualTestCases([{ id: 1, input: "", output: "", isHidden: false }]);
    }
    setViewState("add-question");
  };

  const handleDuplicateQuestion = () => {
    if (!manualQuestionTitle.trim()) {
      toast({ title: "Nothing to Duplicate", description: "Please enter a problem statement first.", variant: "destructive" });
      return;
    }
    setEditingQuestionId(null);
    setManualQuestionTitle(`${manualQuestionTitle} (Copy)`);
    toast({
      title: "Question Cloned",
      description: "Created a duplicate draft with all options preserved. You can now edit and save.",
    });
  };

  const handleQuickNewQuestion = () => {
    setEditingQuestionId(null);
    setManualQuestionTitle("");
    setManualQuestionMarks(10);
    setManualMCQOptions([
      { id: 1, text: "", isCorrect: false },
      { id: 2, text: "", isCorrect: false },
      { id: 3, text: "", isCorrect: false },
      { id: 4, text: "", isCorrect: false },
    ]);
    setManualTestCases([{ id: 1, input: "", output: "", isHidden: false }]);
    toast({
      title: "New Question Draft",
      description: "Form reset. Enter statement and options to add another question.",
    });
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!selectedTest) return;
    const deletedQ = selectedTest.questions?.find((q) => q.id === qId);
    const markDiff = deletedQ ? deletedQ.marks : 0;
    const updatedQuestions = (selectedTest.questions || []).filter((q) => q.id !== qId);
    const updatedTest = {
      ...selectedTest,
      totalQuestions: updatedQuestions.length,
      maxMarks: Math.max(0, (selectedTest.maxMarks || 0) - markDiff),
      questions: updatedQuestions,
    };

    fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: updatedTest }),
    }).catch((err) => console.error("Failed to delete question", err));

    setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
    setSelectedTest(updatedTest);
    toast({ title: "Question Deleted", description: "Question removed from test pool.", variant: "destructive" });
  };

  const handleDeleteSection = (sectionName: string) => {
    if (!selectedTest) return;
    const remainingSections = (selectedTest.sections || []).filter((s) => s !== sectionName);
    const remainingQuestions = (selectedTest.questions || []).filter((q) => q.section !== sectionName);
    const updatedTest = {
      ...selectedTest,
      sections: remainingSections,
      totalQuestions: remainingQuestions.length,
      maxMarks: remainingQuestions.reduce((acc, q) => acc + (q.marks || 0), 0),
      questions: remainingQuestions,
    };

    fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: updatedTest }),
    }).catch((err) => console.error("Failed to delete section", err));

    setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
    setSelectedTest(updatedTest);
    toast({ title: "Section Removed", description: `Section "${sectionName}" and its questions were removed.`, variant: "destructive" });
  };

  const handleAddQuestion = (e?: React.FormEvent, continueAdding: boolean = false) => {
    if (e) e.preventDefault();
    const effectiveTitle = manualQuestionTitle.trim() || (manualQuestionType === "coding" ? "Programming Challenge" : "");
    if (!selectedTest || !effectiveTitle) {
      toast({ title: "Statement Required", description: "Please enter a question or problem statement.", variant: "destructive" });
      return;
    }

    const finalSection = manualQuestionSection === "custom" ? customSectionName.trim() : manualQuestionSection.trim();
    const sectionName =
      finalSection ||
      (manualQuestionType === "coding"
        ? "Programming Task"
        : manualQuestionType === "both"
        ? "Hybrid Task"
        : "Multiple Choice");

    const currentOptions =
      manualQuestionType === "mcq" || manualQuestionType === "msq" || manualQuestionType === "both"
        ? manualMCQOptions.map((o) => ({ ...o }))
        : undefined;

    const currentTestCases =
      manualQuestionType === "coding" || manualQuestionType === "both"
        ? manualTestCases.map((t) => ({ ...t }))
        : undefined;

    let updatedQuestions: TestQuestion[];

    if (editingQuestionId) {
      // Edit existing question
      updatedQuestions = (selectedTest.questions || []).map((q) =>
        q.id === editingQuestionId
          ? {
              ...q,
              title: effectiveTitle,
              type: manualQuestionType as "coding" | "mcq" | "msq" | "both",
              marks: manualQuestionMarks,
              section: sectionName,
              options: currentOptions,
              testCases: currentTestCases,
            }
          : q
      );
      toast({ title: "Question Updated", description: "Question statement & options saved successfully." });
    } else {
      // Add new question
      const newQ: TestQuestion = {
        id: `q_${Date.now()}`,
        title: effectiveTitle,
        type: manualQuestionType as "coding" | "mcq" | "msq" | "both",
        marks: manualQuestionMarks,
        section: sectionName,
        options: currentOptions,
        testCases: currentTestCases,
      };
      updatedQuestions = [...(selectedTest.questions || []), newQ];
      toast({
        title: continueAdding ? `Question #${updatedQuestions.length} Saved!` : "Question Saved to Exam",
        description: continueAdding ? "Form cleared for next question." : "Successfully added to the test pool.",
      });
    }

    const totalMarks = updatedQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);

    const updatedTest = {
      ...selectedTest,
      totalQuestions: updatedQuestions.length,
      maxMarks: totalMarks,
      questions: updatedQuestions,
    };

    fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: updatedTest }),
    }).catch((err) => console.error("Failed to update test question", err));

    setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
    setSelectedTest(updatedTest);

    if (continueAdding) {
      // Stay in builder and reset for next question
      setEditingQuestionId(null);
      setManualQuestionTitle("");
      setManualQuestionMarks(10);
      setManualMCQOptions([
        { id: 1, text: "", isCorrect: false },
        { id: 2, text: "", isCorrect: false },
        { id: 3, text: "", isCorrect: false },
        { id: 4, text: "", isCorrect: false },
      ]);
      setManualTestCases([{ id: 1, input: "", output: "", isHidden: false }]);
    } else {
      setViewState("exam-dashboard");
      setEditingQuestionId(null);
      setManualQuestionTitle("");
      setManualQuestionSection("");
      setCustomSectionName("");
    }
  };
  
  const handleAddSection = () => {
    if (!newSectionTitle.trim() || !selectedTest) return;
    
    const currentSections = selectedTest.sections || [];
    if (!currentSections.includes(newSectionTitle.trim())) {
      const updatedTest = { ...selectedTest, sections: [...currentSections, newSectionTitle.trim()] };
      setTests(tests.map(t => t.id === selectedTest.id ? updatedTest : t));
      setSelectedTest(updatedTest);
    }
    
    setNewSectionTitle("");
    setIsAddingSection(false);
    toast({ title: "Section Created", description: `Added section: ${newSectionTitle.trim()}` });
  };

  const downloadAssessmentReportCsv = (test: ScheduledTest) => {
    if (!candidateSubmissions || candidateSubmissions.length === 0) {
      toast({
        title: "No Submissions Recorded",
        description: `No candidates have submitted attempts for "${test.title}" yet.`,
        variant: "destructive",
      });
      return;
    }

    const headers = "Candidate Name,Roll Number,Email,Batch,Submission Status,Marks Obtained,Total Marks,Percentage (%),Result,Proctoring Violations,Integrity Flag,Time Spent,Submitted At\n";
    const rows = candidateSubmissions
      .map(
        (c) =>
          `"${c.name}","${c.rollNo}","${c.email}","${c.batch}","${c.status}",${c.score},${c.totalMarks},${c.percentage},"${c.percentage >= 50 ? 'PASS' : 'FAIL'}",${c.violations},"${c.integrity}","${c.timeSpent}","${c.submittedAt}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Assessment_Report_${test.title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Report Downloaded",
      description: `Exported ${candidateSubmissions.length} live candidate submission records for "${test.title}".`,
    });
  };

  const exportAllTestsCsv = () => {
    if (tests.length === 0) {
      toast({ title: "No Assessments", description: "No assessments found to export.", variant: "destructive" });
      return;
    }
    const headers = "Assessment ID,Title,Status,Duration (Mins),Total Questions,Max Marks,Submissions Count,Total Enrolled,Assigned Batches,Security Flags\n";
    const rows = tests
      .map(
        (t) =>
          `"${t.id}","${t.title}","${t.status}",${t.duration},${t.totalQuestions},${t.maxMarks},${t.submissionsCount},${t.totalEnrolled},"${(t.assignedBatches || []).join("; ") || t.batch}","${(t.proctoringFlags || []).join("; ")}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `All_Assessments_Summary_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Assessments Exported",
      description: "Downloaded overall assessment summary CSV report.",
    });
  };

  const handleDeleteTest = async (id: string, title: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/admin/tests?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete test", err);
    }
    toast({
      title: "Exam Cancelled",
      description: `${title} removed from schedule.`,
      variant: "destructive",
    });
  };

  const openAssignModal = (test: ScheduledTest) => {
    setAssigningTest(test);
    const assigned = test.assignedBatches || [];
    const common = test.isCommon !== undefined ? test.isCommon : assigned.length === 0;
    setIsCommon(common);
    setSelectedBatches(common ? [] : assigned);
  };

  const handleSaveAssignments = async () => {
    if (!assigningTest) return;
    const updatedTest = { 
      ...assigningTest,
      isCommon,
      assignedBatches: isCommon ? [] : selectedBatches,
      batch: isCommon ? "Common (All Batches)" : selectedBatches.join(", ") || "Unassigned",
    };

    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: updatedTest })
      });
      const data = await res.json();
      if (data.test?.id) {
        updatedTest.id = data.test.id;
      }
    } catch (err) {
      console.error("Failed to save assignments", err);
    }

    setTests(prev => prev.map(t => t.id === assigningTest.id ? updatedTest : t));
    if (selectedTest && selectedTest.id === assigningTest.id) {
      setSelectedTest(updatedTest);
    }
    setAssigningTest(null);
    toast({
      title: "Exam Visibility Updated",
      description: `Exam configured as ${isCommon ? "Common (All Students)" : `${selectedBatches.length} batch(es)`}.`,
    });
  };

  const renderAssignmentModal = () => {
    if (!assigningTest || !isMounted || typeof window === "undefined" || typeof document === "undefined") return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        <div 
          className="fixed inset-0 bg-transparent" 
          onClick={() => setAssigningTest(null)} 
        />
        <Card className="relative z-10 w-full max-w-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col my-auto">
          <div className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">Assign Exam Visibility</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Configure access for &quot;{assigningTest.title}&quot;</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#E5E7EB] text-[#6B7280]" onClick={() => setAssigningTest(null)}>
              ✕
            </Button>
          </div>
          
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <VisibilitySelector
              isCommon={isCommon}
              selectedBatches={selectedBatches}
              batches={allBatches.map(b => typeof b === "string" ? { id: b, name: b } : b)}
              onChange={({ isCommon: c, selectedBatches: b }) => {
                setIsCommon(c);
                setSelectedBatches(b);
              }}
            />
          </div>

          <div className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setAssigningTest(null)} className="h-9 text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments} className="h-9 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-md shadow-[#2563EB]/20">
              Save Visibility Configuration
            </Button>
          </div>
        </Card>
      </div>,
      document.body
    );
  };

  const openReassignModal = (test: ScheduledTest) => {
    setReassigningTest(test);
    const assigned = test.assignedBatches || [];
    const common = test.isCommon !== undefined ? test.isCommon : assigned.length === 0;
    setReassignIsCommon(common);
    setReassignSelectedBatches(common ? [] : assigned);
    setReassignResetAttempts(true);
  };

  const handleConfirmReassign = async () => {
    if (!reassigningTest) return;
    setIsSubmittingReassign(true);

    try {
      const res = await fetch("/api/admin/tests/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: reassigningTest.id,
          isCommon: reassignIsCommon,
          assignedBatches: reassignIsCommon ? [] : reassignSelectedBatches,
          resetAttempts: reassignResetAttempts,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reassign test");
      }

      const updatedTest: ScheduledTest = {
        ...reassigningTest,
        status: "live",
        isCommon: reassignIsCommon,
        assignedBatches: reassignIsCommon ? [] : reassignSelectedBatches,
        batch: reassignIsCommon ? "Common (All Batches)" : reassignSelectedBatches.join(", ") || "Specific Batches",
      };

      setTests((prev) => prev.map((t) => (t.id === reassigningTest.id ? updatedTest : t)));
      if (selectedTest && selectedTest.id === reassigningTest.id) {
        setSelectedTest(updatedTest);
      }

      toast({
        title: "Test Reassigned Successfully! 🚀",
        description: `"${reassigningTest.title}" is now reassigned to ${reassignIsCommon ? "All Students" : `${reassignSelectedBatches.length} batch(es)`}. Previous completions reset so students can retake.`,
      });

      setReassigningTest(null);
    } catch (err: any) {
      console.error("Reassign error:", err);
      toast({
        title: "Reassignment Failed",
        description: err.message || "Could not reassign test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  const renderReassignModal = () => {
    if (!reassigningTest || !isMounted || typeof window === "undefined" || typeof document === "undefined") return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        <div
          className="fixed inset-0 bg-transparent"
          onClick={() => !isSubmittingReassign && setReassigningTest(null)}
        />
        <Card className="relative z-10 w-full max-w-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col my-auto">
          {/* Modal Header */}
          <div className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-amber-50/70 dark:bg-amber-950/20 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  Reassign Test & Allow Retakes
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Reassign &quot;{reassigningTest.title}&quot; to all students or specific batches
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-[#E5E7EB] text-[#6B7280]"
              onClick={() => !isSubmittingReassign && setReassigningTest(null)}
            >
              ✕
            </Button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Alert info banner */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" /> What happens when you Reassign?
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                When you reassign this assessment, the test status becomes <strong>LIVE</strong>. Students in the target batches will immediately see the test on their dashboard. If a student previously completed it, they will be permitted to start fresh and take the assessment again.
              </p>
            </div>

            {/* Retake reset toggle */}
            <div className="flex items-center justify-between p-3.5 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Reset Previous Completions (Allow Retake)
                </label>
                <p className="text-[11px] text-[#6B7280]">
                  Permit students who finished this test earlier to take it again afresh.
                </p>
              </div>
              <Switch
                checked={reassignResetAttempts}
                onCheckedChange={setReassignResetAttempts}
              />
            </div>

            {/* Target Cohorts / Batches Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Target Audience & Batches for Reassignment
              </label>
              <VisibilitySelector
                isCommon={reassignIsCommon}
                selectedBatches={reassignSelectedBatches}
                batches={allBatches.map((b) => (typeof b === "string" ? { id: b, name: b } : b))}
                onChange={({ isCommon: c, selectedBatches: b }) => {
                  setReassignIsCommon(c);
                  setReassignSelectedBatches(b);
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setReassigningTest(null)}
              disabled={isSubmittingReassign}
              className="h-9 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReassign}
              disabled={isSubmittingReassign}
              className="h-9 px-5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 gap-1.5"
            >
              {isSubmittingReassign ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Reassigning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" /> Confirm & Reassign Test
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>,
      document.body
    );
  };

  // --- VIEWS ---

  if (viewState === "wizard") {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex-wrap">
          <div className="flex items-center gap-3">
            <Button onClick={() => setViewState("list")} variant="outline" size="sm" className="h-9 font-bold text-xs">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">Create New Proctored Exam</h1>
              <p className="text-xs text-[#6B7280]">Define basics and security rules. You can add questions later.</p>
            </div>
          </div>
          <AutoSaveBadge isSaved={isSavedExamDraft} lastSaved={lastSavedExamDraft} />
        </div>

        <form onSubmit={handleCreateTest} className="space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2563EB]" /> General Details & MNC Scheduling
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Configure basic information and choose an enterprise scheduling strategy.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAllSchedule}
                className="h-8 text-xs font-bold border-dashed text-[#6B7280] hover:text-[#DC2626] hover:border-[#DC2626]/40"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Clear Schedule (Make On-Demand)
              </Button>
            </div>

            <div className="space-y-6">
              {/* Exam Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
                  <span>Exam Title <span className="text-[#DC2626]">*</span></span>
                </label>
                <Input
                  placeholder="Enter assessment title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="h-[48px] text-sm rounded-xl"
                />
              </div>

              {/* Basic Meta Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Assessment Format</label>
                  <Select value={newAllowedTypes} onValueChange={(val) => setNewAllowedTypes((val as any))}>
                    <SelectTrigger className="h-[48px] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice (Quiz / MCQ)</SelectItem>
                      <SelectItem value="both">Mixed Questions (MCQ / MSQ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration (Minutes) <span className="text-[#DC2626]">*</span></label>
                  <Input
                    type="number"
                    min={5}
                    max={600}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    required
                    className="h-[48px] text-sm rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Initial Launch Status</label>
                  <Select value={newStatus} onValueChange={(val) => setNewStatus((val as any))}>
                    <SelectTrigger className="h-[48px] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live Now (Immediate Access)</SelectItem>
                      <SelectItem value="scheduled">Scheduled Draft (Activate on schedule)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Passing Criteria & Qualifying Mark (Toggleable ON / OFF) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-[#2563EB]" /> Passing Criteria & Qualification Threshold
                    </label>
                    <p className="text-[11px] text-[#6B7280]">
                      Set minimum passing requirements for student completion and certificate eligibility.
                    </p>
                  </div>
                  <Switch
                    checked={hasPassingCriteria}
                    onCheckedChange={(checked) => setHasPassingCriteria(checked)}
                  />
                </div>

                {hasPassingCriteria && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Criteria Measurement</label>
                      <Select
                        value={passingCriteriaType}
                        onValueChange={(val: any) => val && setPassingCriteriaType(val)}
                      >
                        <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-[#18181B]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Based (% of Total Marks)</SelectItem>
                          <SelectItem value="marks">Fixed Passing Marks (Absolute Score)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                        {passingCriteriaType === "percentage" ? "Passing Percentage (%)" : "Minimum Passing Marks"}
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={1}
                          max={passingCriteriaType === "percentage" ? 100 : 1000}
                          value={passingCriteriaType === "percentage" ? passPercentage : passingMarks}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (passingCriteriaType === "percentage") {
                              setPassPercentage(val);
                            } else {
                              setPassingMarks(val);
                            }
                          }}
                          className="h-10 text-xs rounded-xl bg-white dark:bg-[#18181B] pr-10"
                          placeholder={passingCriteriaType === "percentage" ? "40" : "40"}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">
                          {passingCriteriaType === "percentage" ? "%" : "Marks"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MNC Enterprise Scheduling Modes */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[#2563EB]" /> Scheduling & Timing Model (Optional & Fully Configurable)
                  </label>
                  <span className="text-[11px] text-[#6B7280] font-mono">Timezone: {newTimezone}</span>
                </div>

                {/* Segmented Mode Selector Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Mode 1: On Demand */}
                  <div
                    onClick={() => {
                      setNewScheduleMode("open");
                      setNewDate("");
                      setNewStartDate("");
                      setNewEndDate("");
                      setNewStartTime("");
                      setNewEndTime("");
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      newScheduleMode === "open"
                        ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 shadow-xs"
                        : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF] bg-[#F9FAFB]/50 dark:bg-[#09090B]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                        <Zap className="h-4 w-4 text-[#2563EB]" /> On-Demand (Anytime)
                      </span>
                      <span className="text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-1.5 leading-relaxed">
                      No date/time lock. Candidates take test whenever ready. Timer runs for {newDuration} mins once launched.
                    </p>
                  </div>

                  {/* Mode 2: Flexible Validity Window */}
                  <div
                    onClick={() => setNewScheduleMode("window")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      newScheduleMode === "window"
                        ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 shadow-xs"
                        : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF] bg-[#F9FAFB]/50 dark:bg-[#09090B]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                        <CalendarRange className="h-4 w-4 text-[#2563EB]" /> Validity Date Window
                      </span>
                      <span className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-full">Window</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-1.5 leading-relaxed">
                      Active between a date range (e.g. 3-day window). Candidates attempt anytime within the window.
                    </p>
                  </div>

                  {/* Mode 3: Strict Slot */}
                  <div
                    onClick={() => {
                      setNewScheduleMode("scheduled");
                      if (!newDate) setNewDate(getTodayString());
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      newScheduleMode === "scheduled"
                        ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 shadow-xs"
                        : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF] bg-[#F9FAFB]/50 dark:bg-[#09090B]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                        <Clock className="h-4 w-4 text-[#2563EB]" /> Synchronized Slot
                      </span>
                      <span className="text-[10px] font-bold text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-full">Strict Slot</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-1.5 leading-relaxed">
                      Specific exam date and synchronized start & end time. Ideal for live campus batch proctored exams.
                    </p>
                  </div>
                </div>

                {/* Conditional Fields based on Selected Scheduling Mode */}
                {newScheduleMode === "open" && (
                  <div className="p-4 rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B]/20 border border-[#86EFAC] dark:border-[#059669]/40 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-[#166534] dark:text-[#86EFAC]">
                        Flexible On-Demand Assessment Active
                      </p>
                      <p className="text-[11px] text-[#15803D] dark:text-[#A7F3D0] mt-0.5">
                        Date and time are not enforced. Candidates can start whenever the assessment is marked Live. Each candidate receives an individual countdown of {newDuration} minutes.
                      </p>
                    </div>
                  </div>
                )}

                {newScheduleMode === "window" && (
                  <div className="p-5 rounded-2xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Validity Range Configuration (All Optional)</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setNewStartDate(getTodayString()); setNewEndDate(getNextWeekString()); }}
                          className="h-7 text-[11px] font-bold text-[#2563EB]"
                        >
                          Set Next 7 Days
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setNewStartDate(""); setNewEndDate(""); setNewStartTime(""); setNewEndTime(""); }}
                          className="h-7 text-[11px] font-bold text-[#DC2626]"
                        >
                          Clear Window
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#4B5563] dark:text-[#D1D5DB]">Start Date (Optional)</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setNewStartDate(getTodayString())} className="text-[10px] text-[#2563EB] hover:underline">Today</button>
                            {newStartDate && (
                              <button type="button" onClick={() => setNewStartDate("")} className="text-[10px] text-[#DC2626] ml-2 hover:underline">Clear</button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className="h-[44px] text-xs rounded-xl pr-9 bg-white dark:bg-[#18181B]"
                          />
                          {newStartDate && (
                            <button
                              type="button"
                              onClick={() => setNewStartDate("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                              title="Clear Start Date"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#4B5563] dark:text-[#D1D5DB]">End / Expiry Date (Optional)</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setNewEndDate(getNextWeekString())} className="text-[10px] text-[#2563EB] hover:underline">+7d</button>
                            {newEndDate && (
                              <button type="button" onClick={() => setNewEndDate("")} className="text-[10px] text-[#DC2626] ml-2 hover:underline">Clear</button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            type="date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            className="h-[44px] text-xs rounded-xl pr-9 bg-white dark:bg-[#18181B]"
                          />
                          {newEndDate && (
                            <button
                              type="button"
                              onClick={() => setNewEndDate("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                              title="Clear End Date"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Daily Open Time */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">Daily Open Time (Optional)</label>
                          {newStartTime ? (
                            <button
                              type="button"
                              onClick={() => setNewStartTime("")}
                              className="text-[11px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-2 py-0.5 rounded-md hover:bg-[#DC2626]/20 transition-all flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Clear Time
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF]">Optional</span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="time"
                            value={newStartTime}
                            onChange={(e) => setNewStartTime(e.target.value)}
                            className="h-[42px] text-xs rounded-xl pr-9 bg-[#F9FAFB] dark:bg-[#09090B]"
                          />
                          {newStartTime && (
                            <button
                              type="button"
                              onClick={() => setNewStartTime("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                              title="Clear Start Time"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {/* Quick Time Presets */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {["09:00", "10:00", "14:00", "16:00", "18:00"].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewStartTime(t)}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                                newStartTime === t
                                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                                  : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#2563EB]"
                              }`}
                            >
                              {t === "09:00" ? "9 AM" : t === "10:00" ? "10 AM" : t === "14:00" ? "2 PM" : t === "16:00" ? "4 PM" : "6 PM"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Daily Close Time */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">Daily Close Time (Optional)</label>
                          {newEndTime ? (
                            <button
                              type="button"
                              onClick={() => setNewEndTime("")}
                              className="text-[11px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-2 py-0.5 rounded-md hover:bg-[#DC2626]/20 transition-all flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Clear Time
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF]">Optional</span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="time"
                            value={newEndTime}
                            onChange={(e) => setNewEndTime(e.target.value)}
                            className="h-[42px] text-xs rounded-xl pr-9 bg-[#F9FAFB] dark:bg-[#09090B]"
                          />
                          {newEndTime && (
                            <button
                              type="button"
                              onClick={() => setNewEndTime("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                              title="Clear Close Time"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {/* Quick Time Presets */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {["12:00", "17:00", "19:00", "21:00", "23:00"].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewEndTime(t)}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                                newEndTime === t
                                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                                  : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#2563EB]"
                              }`}
                            >
                              {t === "12:00" ? "12 PM" : t === "17:00" ? "5 PM" : t === "19:00" ? "7 PM" : t === "21:00" ? "9 PM" : "11 PM"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {newScheduleMode === "scheduled" && (
                  <div className="p-5 rounded-2xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Slot Timing Parameters</span>
                        <p className="text-[11px] text-[#6B7280]">Select date and time, or clear anytime to modify.</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setNewDate(""); setNewStartTime(""); setNewEndTime(""); }}
                        className="h-8 text-xs font-bold text-[#DC2626] bg-[#DC2626]/10 hover:bg-[#DC2626]/20 rounded-lg gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Clear All Times
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Exam Date */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Date</label>
                          {newDate ? (
                            <button type="button" onClick={() => setNewDate("")} className="text-[10px] font-bold text-[#DC2626] hover:underline flex items-center gap-0.5">
                              <X className="h-3 w-3" /> Clear
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => setNewDate(getTodayString())} className="text-[10px] text-[#2563EB] hover:underline">Today</button>
                              <button type="button" onClick={() => setNewDate(getTomorrowString())} className="text-[10px] text-[#2563EB] hover:underline">Tmrw</button>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="h-[42px] text-xs rounded-xl pr-9 bg-[#F9FAFB] dark:bg-[#09090B]"
                          />
                          {newDate && (
                            <button
                              type="button"
                              onClick={() => setNewDate("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                              title="Clear Date"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <button type="button" onClick={() => setNewDate(getTodayString())} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F9FAFB] dark:bg-[#09090B] border text-[#6B7280] hover:text-[#2563EB]">Today</button>
                          <button type="button" onClick={() => setNewDate(getTomorrowString())} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F9FAFB] dark:bg-[#09090B] border text-[#6B7280] hover:text-[#2563EB]">Tomorrow</button>
                          <button type="button" onClick={() => setNewDate(getNextWeekString())} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F9FAFB] dark:bg-[#09090B] border text-[#6B7280] hover:text-[#2563EB]">+7 Days</button>
                        </div>
                      </div>

                      {/* Start Time */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">Start Time</label>
                          {newStartTime ? (
                            <button
                              type="button"
                              onClick={() => setNewStartTime("")}
                              className="text-[10px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-1.5 py-0.5 rounded hover:bg-[#DC2626]/20 transition-all flex items-center gap-0.5"
                            >
                              <X className="h-3 w-3" /> Clear
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF]">Optional</span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="time"
                            value={newStartTime}
                            onChange={(e) => {
                              setNewStartTime(e.target.value);
                              if (e.target.value) {
                                setNewEndTime(calculateAutoEndTime(e.target.value, newDuration));
                              }
                            }}
                            className="h-[42px] text-xs rounded-xl pr-9 bg-[#F9FAFB] dark:bg-[#09090B]"
                          />
                          {newStartTime && (
                            <button
                              type="button"
                              onClick={() => setNewStartTime("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                              title="Clear Start Time"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {["09:00", "10:00", "14:00", "16:00", "18:00"].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setNewStartTime(t);
                                setNewEndTime(calculateAutoEndTime(t, newDuration));
                              }}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                                newStartTime === t
                                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                                  : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#2563EB]"
                              }`}
                            >
                              {t === "09:00" ? "9 AM" : t === "10:00" ? "10 AM" : t === "14:00" ? "2 PM" : t === "16:00" ? "4 PM" : "6 PM"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">End Time</label>
                          <div className="flex items-center gap-1">
                            {newStartTime && (
                              <button
                                type="button"
                                onClick={() => setNewEndTime(calculateAutoEndTime(newStartTime, newDuration))}
                                className="text-[10px] text-[#2563EB] font-bold hover:underline"
                              >
                                Auto +{newDuration}m
                              </button>
                            )}
                            {newEndTime && (
                              <button
                                type="button"
                                onClick={() => setNewEndTime("")}
                                className="text-[10px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-1.5 py-0.5 rounded hover:bg-[#DC2626]/20 transition-all flex items-center gap-0.5"
                              >
                                <X className="h-3 w-3" /> Clear
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            type="time"
                            value={newEndTime}
                            onChange={(e) => setNewEndTime(e.target.value)}
                            className="h-[42px] text-xs rounded-xl pr-9 bg-[#F9FAFB] dark:bg-[#09090B]"
                          />
                          {newEndTime && (
                            <button
                              type="button"
                              onClick={() => setNewEndTime("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                              title="Clear End Time"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {/* End Time Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {["11:00", "12:00", "15:00", "17:00", "19:00"].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewEndTime(t)}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                                newEndTime === t
                                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                                  : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#2563EB]"
                              }`}
                            >
                              {t === "11:00" ? "11 AM" : t === "12:00" ? "12 PM" : t === "15:00" ? "3 PM" : t === "17:00" ? "5 PM" : "7 PM"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Candidate Experience Live Preview Banner */}
                <div className="p-3.5 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] flex items-center gap-2.5 text-xs text-[#6B7280]">
                  <Info className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <span>
                    <strong className="text-[#111827] dark:text-[#FAFAFA]">Candidate Experience: </strong>
                    {newScheduleMode === "open"
                      ? `On-Demand Access • Available anytime • ${newDuration} mins timed from launch`
                      : newScheduleMode === "window"
                      ? `Validity Window • ${newStartDate || "Any Date"} to ${newEndDate || "Open"} • ${newDuration} mins test timer`
                      : `Synchronized Slot • ${newDate || "Select Date"} from ${newStartTime || "Start"} to ${newEndTime || "End"} • ${newDuration} mins`}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">AI Proctoring & Anti-Cheating Policy</h3>
                  <p className="text-[11px] text-[#6B7280]">Live camera facial tracking, tab switch locks, and anti-cheating guardrails.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Overall Master Toggle Switch */}
                <div className="flex items-center gap-2.5 p-2 px-3.5 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                  <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {isAllProctoringActive ? "Proctoring Enabled" : "Proctoring Disabled"}
                  </span>
                  <Switch
                    checked={isAllProctoringActive}
                    onCheckedChange={handleToggleAllProctoring}
                  />
                </div>

                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    isAllProctoringActive
                      ? "text-[#16A34A] border-[#16A34A]/30 bg-[#16A34A]/5"
                      : "text-[#6B7280] border-[#9CA3AF]/30 bg-[#9CA3AF]/5"
                  }`}
                >
                  {isAllProctoringActive ? "Real-Time AI Active" : "Open / Relaxed Mode"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Webcam & Face Detection</p>
                  <p className="text-[11px] text-[#6B7280]">Continuously verify candidate facial presence.</p>
                </div>
                <Switch checked={secWebcam} onCheckedChange={setSecWebcam} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Max Warning Count Limit</p>
                  <p className="text-[11px] text-[#6B7280]">Allowed violations before policy escalation.</p>
                </div>
                <Select value={String(maxWarningsLimit)} onValueChange={(v) => setMaxWarningsLimit(Number(v))}>
                  <SelectTrigger className="w-24 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Alerts</SelectItem>
                    <SelectItem value="3">3 Alerts</SelectItem>
                    <SelectItem value="4">4 Alerts</SelectItem>
                    <SelectItem value="5">5 Alerts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Multiple Faces Alert</p>
                  <p className="text-[11px] text-[#6B7280]">Flag when unauthorized extra persons appear.</p>
                </div>
                <Switch checked={secMultipleFaces} onCheckedChange={setSecMultipleFaces} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Looking Away & Head Pose Tracking</p>
                  <p className="text-[11px] text-[#6B7280]">Monitor sustained eye/head gaze deviations.</p>
                </div>
                <Switch checked={secLookingAway} onCheckedChange={setSecLookingAway} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Face Position & Distance Guard</p>
                  <p className="text-[11px] text-[#6B7280]">Enforce centered, well-lit camera alignment.</p>
                </div>
                <Switch checked={secFacePosition} onCheckedChange={setSecFacePosition} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Auto-Submit on Warning Limit</p>
                  <p className="text-[11px] text-[#6B7280]">Terminate exam when max warnings exceeded.</p>
                </div>
                <Switch checked={secAutoSubmit} onCheckedChange={setSecAutoSubmit} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Fullscreen Lock</p>
                  <p className="text-[11px] text-[#6B7280]">Force full screen mode during test.</p>
                </div>
                <Switch checked={secFullscreen} onCheckedChange={setSecFullscreen} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Tab Switch Security</p>
                  <p className="text-[11px] text-[#6B7280]">Flag tab switching and focus loss.</p>
                </div>
                <Switch checked={secTabSwitch} onCheckedChange={setSecTabSwitch} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold">Copy-Paste Lock</p>
                  <p className="text-[11px] text-[#6B7280]">Disable clipboard operations.</p>
                </div>
                <Switch checked={secCopyPaste} onCheckedChange={setSecCopyPaste} />
              </div>

              <div className="flex justify-between items-center p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <div>
                  <p className="text-sm font-bold text-[#2563EB]">Safe Exam Browser (SEB)</p>
                  <p className="text-[11px] text-[#6B7280]">Force strict OS-level lock down.</p>
                </div>
                <Switch checked={secSEB} onCheckedChange={setSecSEB} />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setViewState("list")} className="h-[48px] px-6 font-bold text-xs rounded-xl">Cancel</Button>
            <Button type="submit" className="h-[48px] px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-md">
              <Sparkles className="h-4 w-4" /> Create Exam Setup
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const renderEditExamSettingsModal = () => {
    if (!isEditingExamSettings || !editExamForm || !isMounted || typeof window === "undefined" || typeof document === "undefined") return null;

    const currentMode = editExamForm.scheduleMode || "open";

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        <div 
          className="fixed inset-0 bg-transparent" 
          onClick={() => setIsEditingExamSettings(false)} 
        />
        <Card className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col my-auto">
          {/* Modal Header */}
          <div className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">Edit Exam Settings & MNC Schedule</h2>
                <p className="text-xs text-[#6B7280]">Update timing window, duration, question types, and security controls.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-[#E5E7EB]"
              onClick={() => setIsEditingExamSettings(false)}
            >
              ✕
            </Button>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Title</label>
              <Input
                value={editExamForm.title || ""}
                onChange={(e) => setEditExamForm({ ...editExamForm, title: e.target.value })}
                className="h-11 text-xs rounded-xl"
                placeholder="Assessment Title"
              />
            </div>

            {/* Duration, Status, Question Types */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Duration (Mins)</label>
                <Input
                  type="number"
                  min={5}
                  max={600}
                  value={editExamForm.duration || 60}
                  onChange={(e) => setEditExamForm({ ...editExamForm, duration: Number(e.target.value) })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Allowed Types</label>
                <Select
                  value={editExamForm.allowedQuestionTypes || "both"}
                  onValueChange={(v: any) => setEditExamForm({ ...editExamForm, allowedQuestionTypes: v })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both Coding & MCQ</SelectItem>
                    <SelectItem value="coding">Coding Only</SelectItem>
                    <SelectItem value="mcq">MCQ Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Status</label>
                <Select
                  value={editExamForm.status || "live"}
                  onValueChange={(v: any) => setEditExamForm({ ...editExamForm, status: v })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live (Active Now)</SelectItem>
                    <SelectItem value="scheduled">Scheduled Draft</SelectItem>
                    <SelectItem value="completed">Completed / Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Passing Criteria & Qualifying Mark (Toggleable ON / OFF) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#2563EB]" /> Passing Criteria & Qualification Threshold
                  </label>
                  <p className="text-[11px] text-[#6B7280]">
                    Set minimum passing requirements for student completion and certificate eligibility.
                  </p>
                </div>
                <Switch
                  checked={editExamForm.hasPassingCriteria ?? true}
                  onCheckedChange={(checked) => setEditExamForm({ ...editExamForm, hasPassingCriteria: checked })}
                />
              </div>

              {(editExamForm.hasPassingCriteria ?? true) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Criteria Measurement</label>
                    <Select
                      value={editExamForm.passingCriteriaType || "percentage"}
                      onValueChange={(val: any) => val && setEditExamForm({ ...editExamForm, passingCriteriaType: val })}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-[#18181B]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage Based (% of Total Marks)</SelectItem>
                        <SelectItem value="marks">Fixed Passing Marks (Absolute Score)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      {(editExamForm.passingCriteriaType || "percentage") === "percentage" ? "Passing Percentage (%)" : "Minimum Passing Marks"}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        max={(editExamForm.passingCriteriaType || "percentage") === "percentage" ? 100 : 1000}
                        value={(editExamForm.passingCriteriaType || "percentage") === "percentage" ? (editExamForm.passPercentage ?? 40) : (editExamForm.passingMarks ?? 40)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if ((editExamForm.passingCriteriaType || "percentage") === "percentage") {
                            setEditExamForm({ ...editExamForm, passPercentage: val });
                          } else {
                            setEditExamForm({ ...editExamForm, passingMarks: val });
                          }
                        }}
                        className="h-10 text-xs rounded-xl bg-white dark:bg-[#18181B] pr-10"
                        placeholder="40"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">
                        {(editExamForm.passingCriteriaType || "percentage") === "percentage" ? "%" : "Marks"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MNC Scheduling Engine */}
            <div className="p-5 rounded-2xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-[#2563EB]" /> Scheduling Model
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditExamForm({
                    ...editExamForm,
                    scheduleMode: "open",
                    date: undefined,
                    startDate: undefined,
                    endDate: undefined,
                    startTime: undefined,
                    endTime: undefined,
                  })}
                  className="h-7 text-[11px] font-bold text-[#DC2626]"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Clear All Schedule
                </Button>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div
                  onClick={() => setEditExamForm({ ...editExamForm, scheduleMode: "open", date: undefined, startDate: undefined, endDate: undefined, startTime: undefined, endTime: undefined })}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    currentMode === "open"
                      ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20"
                      : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-[#2563EB]" /> On-Demand
                    </span>
                    <span className="text-[9px] font-bold text-[#16A34A]">Anytime</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280] mt-1">No date lock. Timer starts when student opens test.</p>
                </div>

                <div
                  onClick={() => setEditExamForm({ ...editExamForm, scheduleMode: "window" })}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    currentMode === "window"
                      ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20"
                      : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <CalendarRange className="h-3.5 w-3.5 text-[#2563EB]" /> Window
                    </span>
                    <span className="text-[9px] font-bold text-[#2563EB]">Range</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280] mt-1">Available between start and end validity date range.</p>
                </div>

                <div
                  onClick={() => setEditExamForm({ ...editExamForm, scheduleMode: "scheduled" })}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    currentMode === "scheduled"
                      ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20"
                      : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#2563EB]" /> Strict Slot
                    </span>
                    <span className="text-[9px] font-bold text-[#7C3AED]">Synchronized</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280] mt-1">Exact exam date and synchronized start/end times.</p>
                </div>
              </div>

              {/* Mode Window Inputs */}
              {currentMode === "window" && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#4B5563]">Start Date (Optional)</label>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setEditExamForm({ ...editExamForm, startDate: getTodayString() })} className="text-[10px] text-[#2563EB] hover:underline">Today</button>
                          {editExamForm.startDate && (
                            <button type="button" onClick={() => setEditExamForm({ ...editExamForm, startDate: "" })} className="text-[10px] text-[#DC2626] hover:underline">Clear</button>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type="date"
                          value={editExamForm.startDate || ""}
                          onChange={(e) => setEditExamForm({ ...editExamForm, startDate: e.target.value })}
                          className="h-9 text-xs rounded-lg pr-8 bg-white dark:bg-[#18181B]"
                        />
                        {editExamForm.startDate && (
                          <button
                            type="button"
                            onClick={() => setEditExamForm({ ...editExamForm, startDate: "" })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#9CA3AF] hover:text-[#DC2626]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#4B5563]">End Date (Optional)</label>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setEditExamForm({ ...editExamForm, endDate: getNextWeekString() })} className="text-[10px] text-[#2563EB] hover:underline">+7d</button>
                          {editExamForm.endDate && (
                            <button type="button" onClick={() => setEditExamForm({ ...editExamForm, endDate: "" })} className="text-[10px] text-[#DC2626] hover:underline">Clear</button>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type="date"
                          value={editExamForm.endDate || ""}
                          onChange={(e) => setEditExamForm({ ...editExamForm, endDate: e.target.value })}
                          className="h-9 text-xs rounded-lg pr-8 bg-white dark:bg-[#18181B]"
                        />
                        {editExamForm.endDate && (
                          <button
                            type="button"
                            onClick={() => setEditExamForm({ ...editExamForm, endDate: "" })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#9CA3AF] hover:text-[#DC2626]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Strict Slot Inputs */}
              {currentMode === "scheduled" && (
                <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Slot Timing Parameters</span>
                    <button
                      type="button"
                      onClick={() => setEditExamForm({ ...editExamForm, date: "", startTime: "", endTime: "" })}
                      className="text-[11px] font-bold text-[#DC2626] bg-[#DC2626]/10 hover:bg-[#DC2626]/20 px-2 py-0.5 rounded transition-all flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Clear All Times
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Exam Date */}
                    <div className="space-y-1 p-2.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Date</label>
                        {editExamForm.date ? (
                          <button type="button" onClick={() => setEditExamForm({ ...editExamForm, date: "" })} className="text-[10px] font-bold text-[#DC2626] hover:underline flex items-center gap-0.5">
                            <X className="h-3 w-3" /> Clear
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setEditExamForm({ ...editExamForm, date: getTodayString() })} className="text-[10px] text-[#2563EB] hover:underline">Today</button>
                            <button type="button" onClick={() => setEditExamForm({ ...editExamForm, date: getTomorrowString() })} className="text-[10px] text-[#2563EB] hover:underline">Tmrw</button>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="date"
                          value={editExamForm.date || ""}
                          onChange={(e) => setEditExamForm({ ...editExamForm, date: e.target.value })}
                          className="h-9 text-xs rounded-lg pr-8 bg-[#F9FAFB] dark:bg-[#09090B]"
                        />
                        {editExamForm.date && (
                          <button
                            type="button"
                            onClick={() => setEditExamForm({ ...editExamForm, date: "" })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#9CA3AF] hover:text-[#DC2626]"
                            title="Clear Date"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        <button type="button" onClick={() => setEditExamForm({ ...editExamForm, date: getTodayString() })} className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#F9FAFB] dark:bg-[#09090B] border text-[#6B7280]">Today</button>
                        <button type="button" onClick={() => setEditExamForm({ ...editExamForm, date: getTomorrowString() })} className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#F9FAFB] dark:bg-[#09090B] border text-[#6B7280]">Tmrw</button>
                      </div>
                    </div>

                    {/* Start Time */}
                    <div className="space-y-1 p-2.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">Start Time</label>
                        {editExamForm.startTime ? (
                          <button
                            type="button"
                            onClick={() => setEditExamForm({ ...editExamForm, startTime: "" })}
                            className="text-[10px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-1 py-0.2 rounded hover:bg-[#DC2626]/20 transition-all flex items-center gap-0.5"
                          >
                            <X className="h-2.5 w-2.5" /> Clear
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF]">Optional</span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="time"
                          value={editExamForm.startTime || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditExamForm({
                              ...editExamForm,
                              startTime: val,
                              endTime: val ? calculateAutoEndTime(val, editExamForm.duration || 60) : editExamForm.endTime,
                            });
                          }}
                          className="h-9 text-xs rounded-lg pr-8 bg-[#F9FAFB] dark:bg-[#09090B]"
                        />
                        {editExamForm.startTime && (
                          <button
                            type="button"
                            onClick={() => setEditExamForm({ ...editExamForm, startTime: "" })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#9CA3AF] hover:text-[#DC2626]"
                            title="Clear Start Time"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {["09:00", "10:00", "14:00", "16:00"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setEditExamForm({
                                ...editExamForm,
                                startTime: t,
                                endTime: calculateAutoEndTime(t, editExamForm.duration || 60),
                              });
                            }}
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border transition-colors ${
                              editExamForm.startTime === t
                                ? "bg-[#2563EB] text-white border-[#2563EB]"
                                : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]"
                            }`}
                          >
                            {t === "09:00" ? "9AM" : t === "10:00" ? "10AM" : t === "14:00" ? "2PM" : "4PM"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* End Time */}
                    <div className="space-y-1 p-2.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">End Time</label>
                        <div className="flex items-center gap-1">
                          {editExamForm.startTime && (
                            <button
                              type="button"
                              onClick={() => setEditExamForm({ ...editExamForm, endTime: calculateAutoEndTime(editExamForm.startTime || "", editExamForm.duration || 60) })}
                              className="text-[10px] text-[#2563EB] font-bold hover:underline"
                            >
                              Auto
                            </button>
                          )}
                          {editExamForm.endTime && (
                            <button
                              type="button"
                              onClick={() => setEditExamForm({ ...editExamForm, endTime: "" })}
                              className="text-[10px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-1 py-0.2 rounded hover:bg-[#DC2626]/20 transition-all flex items-center gap-0.5"
                            >
                              <X className="h-2.5 w-2.5" /> Clear
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type="time"
                          value={editExamForm.endTime || ""}
                          onChange={(e) => setEditExamForm({ ...editExamForm, endTime: e.target.value })}
                          className="h-9 text-xs rounded-lg pr-8 bg-[#F9FAFB] dark:bg-[#09090B]"
                        />
                        {editExamForm.endTime && (
                          <button
                            type="button"
                            onClick={() => setEditExamForm({ ...editExamForm, endTime: "" })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#9CA3AF] hover:text-[#DC2626]"
                            title="Clear End Time"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {["11:00", "12:00", "15:00", "17:00"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditExamForm({ ...editExamForm, endTime: t })}
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border transition-colors ${
                              editExamForm.endTime === t
                                ? "bg-[#2563EB] text-white border-[#2563EB]"
                                : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]"
                            }`}
                          >
                            {t === "11:00" ? "11AM" : t === "12:00" ? "12PM" : t === "15:00" ? "3PM" : "5PM"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Proctoring Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-[#2563EB]" /> AI Proctoring Rules
                </label>
                <div className="flex items-center gap-2 p-1 px-2.5 rounded-lg bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                  <span className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {Boolean(editExamForm.secWebcam || editExamForm.secFullscreen || editExamForm.secTabSwitch || editExamForm.secCopyPaste) ? "Master ON" : "Master OFF"}
                  </span>
                  <Switch
                    checked={Boolean(editExamForm.secWebcam || editExamForm.secFullscreen || editExamForm.secTabSwitch || editExamForm.secCopyPaste)}
                    onCheckedChange={(enabled) => {
                      setEditExamForm({
                        ...editExamForm,
                        secWebcam: enabled,
                        secFullscreen: enabled,
                        secTabSwitch: enabled,
                        secCopyPaste: enabled,
                        secMultipleFaces: enabled,
                        secLookingAway: enabled,
                        secFacePosition: enabled,
                        secAutoSubmit: enabled,
                        secSEB: enabled ? editExamForm.secSEB : false,
                      });
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Webcam & Facial Presence</span>
                  <Switch checked={editExamForm.secWebcam ?? true} onCheckedChange={(v) => setEditExamForm({ ...editExamForm, secWebcam: v })} />
                </div>
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Fullscreen Lockdown</span>
                  <Switch checked={editExamForm.secFullscreen ?? true} onCheckedChange={(v) => setEditExamForm({ ...editExamForm, secFullscreen: v })} />
                </div>
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Tab Switch Security</span>
                  <Switch checked={editExamForm.secTabSwitch ?? true} onCheckedChange={(v) => setEditExamForm({ ...editExamForm, secTabSwitch: v })} />
                </div>
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Clipboard Copy/Paste Lock</span>
                  <Switch checked={editExamForm.secCopyPaste ?? true} onCheckedChange={(v) => setEditExamForm({ ...editExamForm, secCopyPaste: v })} />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsEditingExamSettings(false)}
              className="h-9 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveExamSettings}
              className="h-9 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-md shadow-[#2563EB]/20"
            >
              Save Settings & Schedule
            </Button>
          </div>
        </Card>
      </div>,
      document.body
    );
  };

  if (viewState === "exam-dashboard" && selectedTest) {
    return (
      <div className="space-y-6 w-full">
        <PageHeader
          title={selectedTest.title}
          description={`Exam Dashboard • ${selectedTest.totalQuestions} Questions • ${selectedTest.maxMarks} Marks Total`}
          backAction={{ label: "Back", onClick: () => setViewState("list") }}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 font-bold text-xs bg-white dark:bg-[#18181B]"
                onClick={() => openEditExamModal(selectedTest)}
              >
                <Settings className="h-4 w-4 mr-2 text-[#2563EB]" /> Edit Settings & Schedule
              </Button>
              <Button 
                onClick={() => downloadAssessmentReportCsv(selectedTest)}
                className="h-9 font-bold text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2 shadow-xs"
              >
                <Download className="h-4 w-4" /> Download Candidate Report (CSV)
              </Button>
              <Button variant="outline" className="h-9 font-bold text-xs bg-white dark:bg-[#18181B]" onClick={() => openAssignModal(selectedTest)}>
                <Users className="h-4 w-4 mr-2" /> Assign to Batches
              </Button>
              <Button
                variant="outline"
                className="h-9 font-bold text-xs bg-white dark:bg-[#18181B] border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => openReassignModal(selectedTest)}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Reassign Test
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Assigned Questions & Sections</h3>
            <div className="p-6 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl space-y-6">
              
              {/* Existing Sections */}
              {(selectedTest.sections || []).length === 0 && (!selectedTest.questions || selectedTest.questions.length === 0) ? (
                <div className="p-8 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl text-center bg-[#F9FAFB] dark:bg-[#09090B]">
                  <ClipboardList className="h-8 w-8 text-[#9CA3AF] mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">No sections yet</h4>
                  <p className="text-xs text-[#6B7280] mt-1 mb-4">Start building your exam by adding a section below.</p>
                </div>
              ) : (
                (selectedTest.sections || []).map((section) => {
                  const sectionQuestions = selectedTest.questions?.map((q, idx) => ({ ...q, originalIndex: idx })).filter(q => q.section === section) || [];
                  return (
                    <div key={section} className="mb-6 last:mb-0 p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB]/50 dark:bg-[#09090B]/50 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] uppercase tracking-wider">{section}</h4>
                          <Badge variant="outline" className="text-[10px] font-bold text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                            {sectionQuestions.length} {sectionQuestions.length === 1 ? "Question" : "Questions"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-[11px] font-bold text-[#2563EB] hover:bg-[#2563EB]/10"
                            onClick={() => openCreateQuestion(section)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Question to {section}
                          </Button>
                          {(selectedTest.sections || []).length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] font-bold text-[#DC2626] hover:bg-[#DC2626]/10"
                              onClick={() => handleDeleteSection(section)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Delete Section
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {sectionQuestions.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
                          <p className="text-xs text-[#6B7280]">No questions in this section yet.</p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 h-7 text-xs font-bold text-[#2563EB] border-[#2563EB]/30"
                            onClick={() => openCreateQuestion(section)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add First Question
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Numbered Quick Navigation Bar */}
                          <div className="flex flex-wrap items-center gap-2 pb-2">
                            <span className="text-[11px] font-bold text-[#6B7280] mr-1">Questions:</span>
                            {sectionQuestions.map((q) => (
                              <button 
                                key={q.id} 
                                onClick={() => openEditQuestion(q)}
                                className="w-9 h-9 border border-[#2563EB]/30 bg-white dark:bg-[#18181B] text-[#2563EB] hover:bg-[#2563EB] hover:text-white rounded-lg flex items-center justify-center text-xs font-bold transition-all shadow-xs cursor-pointer group"
                                title={`Question ${q.originalIndex + 1}: ${q.title} (${q.marks} Marks) - Click to Edit`}
                              >
                                {q.originalIndex + 1}
                              </button>
                            ))}
                          </div>

                          {/* Detailed Question Cards */}
                          <div className="space-y-2">
                            {sectionQuestions.map((q) => (
                              <div
                                key={q.id}
                                className="flex items-center justify-between p-3.5 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl shadow-2xs hover:border-[#2563EB]/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-7 h-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-xs font-bold shrink-0">
                                    {q.originalIndex + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] truncate">
                                      {q.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-[#6B7280] border-[#E5E7EB] dark:border-[#27272A]">
                                        {q.type}
                                      </Badge>
                                      <span className="text-[10px] font-bold text-[#2563EB]">
                                        {q.marks} Marks
                                      </span>
                                      {q.options && q.options.length > 0 && (
                                        <span className="text-[10px] text-[#16A34A] font-semibold flex items-center gap-1">
                                          • {q.options.length} Options {q.options.some(o => o.isCorrect) && "✓ Answer Selected"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditQuestion(q)}
                                    className="h-7 px-2.5 text-[11px] font-bold border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-lg"
                                  >
                                    <Edit className="h-3 w-3 mr-1" /> Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="h-7 px-2 text-[11px] font-bold text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Add New Section UI */}
              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                {isAddingSection ? (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Type new section title (e.g. Quantitative Ability)..." 
                        value={newSectionTitle} 
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        className="h-9 text-xs"
                        autoFocus
                      />
                      <Button className="h-9 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D]" onClick={handleAddSection}>
                        Save Section
                      </Button>
                      <Button variant="ghost" className="h-9 text-xs text-[#6B7280]" onClick={() => setIsAddingSection(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-10 border-dashed border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/5 font-bold text-xs"
                    onClick={() => setIsAddingSection(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add New Section
                  </Button>
                )}
              </div>

            </div>
          </div>
          
          <div className="space-y-6">
            {/* Schedule & Availability Details Card */}
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[#2563EB]" /> Schedule & Timing
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      selectedTest.scheduleMode === "open" || (!selectedTest.date && !selectedTest.startDate)
                        ? "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30"
                        : selectedTest.scheduleMode === "window"
                        ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30"
                        : "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/30"
                    }`}
                  >
                    {selectedTest.scheduleMode === "open" || (!selectedTest.date && !selectedTest.startDate)
                      ? "⚡ On-Demand"
                      : selectedTest.scheduleMode === "window"
                      ? "📅 Validity Window"
                      : "🔒 Strict Slot"}
                  </Badge>
                </div>

                <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Test Timer:</span>
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5 text-[#2563EB]" /> {selectedTest.duration} Minutes
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Access Window:</span>
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA] text-right">
                      {selectedTest.scheduleMode === "window" && (selectedTest.startDate || selectedTest.endDate)
                        ? `${selectedTest.startDate || "Any"} to ${selectedTest.endDate || "Open"}`
                        : selectedTest.date
                        ? `${selectedTest.date} ${selectedTest.startTime ? `(${selectedTest.startTime} - ${selectedTest.endTime || "..."})` : ""}`
                        : "Available 24/7 (On-Demand)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#6B7280]">Timezone:</span>
                    <span className="font-mono text-[#6B7280]">{selectedTest.timezone || "Asia/Kolkata (IST)"}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => openEditExamModal(selectedTest)}
                  className="w-full h-9 text-xs font-bold border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5"
                >
                  <Settings className="h-3.5 w-3.5" /> Modify Timing or Clear Schedule
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Candidate Submissions</h3>
                  <Badge variant="outline" className="text-[10px] font-bold text-[#16A34A] border-[#16A34A]/30">
                    Live
                  </Badge>
                </div>
                <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                  <div className="text-3xl font-black text-[#2563EB]">{candidateSubmissions.length}</div>
                  <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mt-1">Candidates Completed / Enrolled: {candidateSubmissions.length} Submitted</div>
                </div>
                <Button 
                  onClick={() => downloadAssessmentReportCsv(selectedTest)}
                  disabled={candidateSubmissions.length === 0}
                  className="w-full h-10 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-xs gap-2 shadow-xs"
                >
                  <Download className="h-4 w-4" /> Download Candidate Report
                </Button>
                <Link href={`/admin/tests/inspect/${selectedTest.id}`} className="block w-full">
                  <Button variant="outline" className="w-full h-10 border-[#E5E7EB] dark:border-[#27272A] font-bold text-xs gap-2">
                    <Play className="h-4 w-4 text-[#2563EB]" /> Live Anti-Cheating Monitor
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">Security & Anti-Cheating</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTest.proctoringFlags.map(flag => (
                    <Badge key={flag} variant="outline" className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 text-[10px] font-bold">
                      <ShieldCheck className="h-3 w-3 mr-1" /> {flag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CANDIDATE ATTENDANCE & PERFORMANCE AUDIT TABLE */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-sm overflow-hidden mt-6">
          <div className="p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Candidate Attendance & Score Report
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                  {candidateSubmissions.length} {candidateSubmissions.length === 1 ? "Record" : "Records"}
                </Badge>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Live record of enrolled candidates who attempted this assessment module with scores and anti-cheating audit.
              </p>
            </div>
            <Button
              onClick={() => downloadAssessmentReportCsv(selectedTest)}
              disabled={candidateSubmissions.length === 0}
              size="sm"
              className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold rounded-xl gap-1.5 shrink-0 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Download Full CSV Report
            </Button>
          </div>

          {isLoadingSubmissions ? (
            <div className="p-12 text-center text-xs text-[#6B7280] flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              Loading live candidate submissions...
            </div>
          ) : candidateSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#18181B]">
              <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">No Candidate Submissions Yet</h4>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1">
                As enrolled students begin and submit their attempts for this test, their live marks, accuracy percentages, and proctoring violation audits will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Candidate</th>
                    <th className="p-3.5">Batch</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Score</th>
                    <th className="p-3.5">Accuracy</th>
                    <th className="p-3.5">Proctoring Flags</th>
                    <th className="p-3.5">Submitted At</th>
                    <th className="p-3.5 pr-5 text-right">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                  {candidateSubmissions.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40 transition-colors">
                      <td className="p-3.5 pl-5">
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">{c.name}</p>
                        <p className="text-[10px] text-[#6B7280] font-mono">{c.rollNo} • {c.email}</p>
                      </td>
                      <td className="p-3.5 font-medium text-[#4B5563] dark:text-[#D1D5DB]">{c.batch}</td>
                      <td className="p-3.5">
                        <Badge
                          className={`text-[9px] font-bold ${
                            c.status === "Submitted"
                              ? "bg-[#16A34A] text-white"
                              : c.status === "Auto-Submitted"
                              ? "bg-[#DC2626] text-white"
                              : "bg-[#6B7280] text-white"
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-bold text-[#111827] dark:text-[#FAFAFA]">
                        {c.score} / {c.totalMarks}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-[#2563EB]">{c.percentage}%</span>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            c.integrity === "Clean"
                              ? "text-[#16A34A] border-[#16A34A]/30 bg-[#16A34A]/5"
                              : c.integrity === "Minor Alerts"
                              ? "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/5"
                              : "text-[#DC2626] border-[#DC2626]/30 bg-[#DC2626]/5"
                          }`}
                        >
                          {c.violations} Alerts ({c.integrity})
                        </Badge>
                      </td>
                      <td className="p-3.5 font-mono text-[#6B7280] text-[11px]">{c.submittedAt}</td>
                      <td className="p-3.5 pr-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadAssessmentReportCsv(selectedTest)}
                          className="h-7 px-2.5 text-[11px] font-bold border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-lg"
                        >
                          <Download className="h-3 w-3 mr-1" /> CSV
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        
        {renderAssignmentModal()}
        {renderReassignModal()}
        {renderEditExamSettingsModal()}
      </div>
    );
  }

  if (viewState === "add-question" && selectedTest) {
    const existingQuestions = selectedTest.questions || [];
    const currentQIndex = editingQuestionId
      ? existingQuestions.findIndex((q) => q.id === editingQuestionId)
      : existingQuestions.length;

    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <PageHeader
          title={editingQuestionId ? `Edit Question #${currentQIndex + 1}` : `Create Question #${existingQuestions.length + 1}`}
          description={
            <>
              {editingQuestionId ? "Modify problem statement, options, or test cases" : "Adding question to"}: <strong className="text-[#111827] dark:text-[#FAFAFA]">{selectedTest.title}</strong> {manualQuestionSection && <span className="font-bold text-[#2563EB] ml-2">• Section: {manualQuestionSection}</span>}
            </>
          }
          backAction={{ label: "Back to Dashboard", onClick: () => {
            setEditingQuestionId(null);
            setViewState("exam-dashboard");
          }}}
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleQuickNewQuestion}
                className="h-9 text-xs font-bold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5"
              >
                <Plus className="h-4 w-4" /> + Add Blank Question
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDuplicateQuestion}
                className="h-9 text-xs font-bold gap-1.5"
                title="Duplicate problem statement & options as a new question draft"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate / Clone
              </Button>
            </div>
          }
        />

        {/* Interactive Question Navigation Chip Bar */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-2xl shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-[#2563EB]" /> Questions in this Assessment ({existingQuestions.length})
            </span>
            <span className="text-[11px] text-[#6B7280]">
              Total Marks Pool: <strong className="text-[#2563EB]">{selectedTest.maxMarks || 0} Marks</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {existingQuestions.map((q, idx) => {
              const isCurrent = editingQuestionId === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleSwitchToQuestion(q)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isCurrent
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                      : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#2563EB] hover:text-[#2563EB]"
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isCurrent ? "bg-white/20 text-white" : "bg-[#E5E7EB] dark:bg-[#27272A] text-[#6B7280]"}`}>
                    {q.marks}m
                  </span>
                </button>
              );
            })}

            {/* Quick + Add New Question Button */}
            <button
              type="button"
              onClick={handleSwitchToNewQuestion}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-2 border-dashed ${
                !editingQuestionId
                  ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 text-[#2563EB] shadow-xs"
                  : "border-[#9CA3AF]/40 text-[#2563EB] hover:bg-[#2563EB]/5 hover:border-[#2563EB]"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Question #{existingQuestions.length + 1}</span>
            </button>
          </div>
        </div>

        <form onSubmit={(e) => handleAddQuestion(e, false)} className="space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-8 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[#2563EB]" /> {editingQuestionId ? `Editing Question #${currentQIndex + 1}` : `Compose Question #${existingQuestions.length + 1}`}
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold text-[#2563EB] border-[#2563EB]/30 bg-[#2563EB]/5">
                  Section: {manualQuestionSection || "General Assessment"}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Select value={manualQuestionType} onValueChange={(val) => val && setManualQuestionType(val as any)}>
                  <SelectTrigger className="h-9 text-xs w-[200px] bg-[#F9FAFB] dark:bg-[#09090B] font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Single Choice (MCQ)</SelectItem>
                    <SelectItem value="msq">Multiple Select (MSQ)</SelectItem>
                    <SelectItem value="coding">Programming Task (Coding)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              {manualQuestionType === "coding" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Marks Allocated for this Coding Question</p>
                      <p className="text-[11px] text-[#6B7280]">Total points awarded to student upon passing test cases.</p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={manualQuestionMarks}
                        onChange={(e) => setManualQuestionMarks(Number(e.target.value))}
                        className="h-9 text-xs font-bold text-center rounded-lg"
                      />
                    </div>
                  </div>

                  <CodingProblemCreator
                    inline
                    hideHeader
                    initialTitle={manualQuestionTitle || ""}
                    initialDescription={manualQuestionTitle}
                    onChange={(problem) => {
                      if (problem.title) {
                        setManualQuestionTitle(problem.title);
                      }
                      const allTC = [...(problem.publicTestCases || []), ...(problem.hiddenTestCases || [])];
                      if (allTC.length > 0) {
                        setManualTestCases(allTC.map((t, index) => ({
                          id: index + 1,
                          input: t.input,
                          output: t.expected_output,
                          isHidden: t.is_hidden
                        })));
                      }
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Question / Problem Statement <span className="text-[#DC2626]">*</span></label>
                      <textarea 
                        className="w-full min-h-[120px] p-4 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] focus:ring-2 focus:ring-[#2563EB] outline-none transition-all resize-y"
                        placeholder="Enter your question statement here (e.g., What is the output of the given expression? or Find the missing number in the sequence)..."
                        value={manualQuestionTitle}
                        onChange={(e) => setManualQuestionTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Marks Allocated</label>
                      <Input type="number" min={1} max={100} value={manualQuestionMarks} onChange={(e) => setManualQuestionMarks(Number(e.target.value))} required className="h-10 text-sm rounded-lg" />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                        {manualQuestionType === "msq" ? "Multiple Select Options" : "Single Choice Options"}
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          onClick={() =>
                            setManualMCQOptions([
                              { id: 1, text: "True", isCorrect: true },
                              { id: 2, text: "False", isCorrect: false },
                            ])
                          }
                          variant="outline"
                          className="h-7 px-2 text-[10px] font-bold"
                        >
                          True/False
                        </Button>
                        <Button
                          type="button"
                          onClick={() =>
                            setManualMCQOptions([
                              { id: 1, text: "", isCorrect: false },
                              { id: 2, text: "", isCorrect: false },
                              { id: 3, text: "", isCorrect: false },
                              { id: 4, text: "", isCorrect: false },
                            ])
                          }
                          variant="outline"
                          className="h-7 px-2 text-[10px] font-bold text-[#DC2626]"
                        >
                          Clear Text
                        </Button>
                        <Button
                          type="button"
                          onClick={() =>
                            setManualMCQOptions([
                              ...manualMCQOptions,
                              { id: Date.now(), text: "", isCorrect: false },
                            ])
                          }
                          variant="outline"
                          className="h-7 px-2.5 text-[10px] font-bold text-[#2563EB] border-[#2563EB]/40"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Option
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {manualMCQOptions.map((opt, idx) => (
                        <div key={opt.id || idx} className={`flex items-center gap-3 p-3 border ${opt.isCorrect ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A8A]/20' : 'border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B]'} rounded-xl group transition-all`}>
                          <div className="flex items-center justify-center w-6 h-6 rounded bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[10px] font-bold text-[#6B7280]">
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <Input 
                            value={opt.text ?? ""} 
                            onChange={(e) => setManualMCQOptions(manualMCQOptions.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o))} 
                            placeholder={`Option ${idx + 1}`} 
                            className="h-9 text-xs flex-1 bg-white dark:bg-[#18181B]" 
                          />
                          <label className="flex items-center gap-2 cursor-pointer ml-2 pr-2">
                            {manualQuestionType === "mcq" ? (
                              <input 
                                type="radio" 
                                name="mcq-correct-answer"
                                checked={Boolean(opt.isCorrect)}
                                onChange={() => setManualMCQOptions(manualMCQOptions.map(o => ({ ...o, isCorrect: o.id === opt.id })))}
                                className="w-4 h-4 text-[#2563EB] cursor-pointer"
                              />
                            ) : (
                              <Switch 
                                checked={Boolean(opt.isCorrect)} 
                                onCheckedChange={(checked) => setManualMCQOptions(manualMCQOptions.map(o => o.id === opt.id ? { ...o, isCorrect: checked } : o))} 
                                className="scale-75" 
                              />
                            )}
                            <span className={`text-[10px] font-bold ${opt.isCorrect ? 'text-[#2563EB]' : 'text-[#6B7280]'}`}>
                              Correct Answer
                            </span>
                          </label>
                          <button type="button" onClick={() => manualMCQOptions.length > 2 && setManualMCQOptions(manualMCQOptions.filter(o => o.id !== opt.id))} className="text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Action Buttons Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-8 border-t border-[#E5E7EB] dark:border-[#27272A] mt-6 gap-3">
              <div className="flex items-center gap-2">
                {editingQuestionId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleDeleteQuestion(editingQuestionId);
                      setEditingQuestionId(null);
                      setViewState("exam-dashboard");
                    }}
                    className="h-10 px-4 border-[#DC2626]/30 text-[#DC2626] hover:bg-[#DC2626]/10 text-xs font-bold rounded-xl gap-2"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Question
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleQuickNewQuestion}
                  className="h-10 px-4 border-dashed text-xs font-bold rounded-xl gap-1.5 text-[#2563EB]"
                >
                  <Plus className="h-4 w-4" /> + Add Blank Question
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingQuestionId(null);
                    setViewState("exam-dashboard");
                  }}
                  className="h-10 px-4 text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>

                {/* SAVE & ADD NEXT QUESTION BUTTON (PRIMARY FEATURE) */}
                <Button
                  type="button"
                  onClick={() => handleAddQuestion(undefined, true)}
                  className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-md shadow-[#2563EB]/20 gap-2"
                >
                  <Plus className="h-4 w-4" /> Save & Add Next Question
                </Button>

                {/* SAVE & FINISH BUTTON */}
                <Button
                  type="submit"
                  className="h-10 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-sm gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> {editingQuestionId ? "Save & Return" : "Save & Finish (Dashboard)"}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <PageHeader
        title={role === "admin" ? "Proctored Examination Manager" : "Assessment & Test Creator"}
        description="Build proctored tests, assign them to batches, and monitor live submissions."
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={exportAllTestsCsv}
              variant="outline"
              className="h-[44px] border-[#E5E7EB] dark:border-[#27272A] font-bold text-xs gap-2 px-4 rounded-xl shadow-xs"
            >
              <Download className="h-4 w-4" /> Export All Summary (CSV)
            </Button>
            <Button onClick={() => setViewState("wizard")} className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20">
              <Plus className="h-4 w-4" /> Create New Exam
            </Button>
          </div>
        }
      />

      {/* Premium MNC Level Filter Controls */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
        
        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { id: "all", label: "All Exams" },
            { id: "live", label: "Live Now" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex-shrink-0 ${
                statusFilter === filter.id
                  ? 'bg-white dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#18181B]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Enhanced Search Input */}
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
          </div>
          <Input 
            placeholder="Search exams by title..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10 h-11 text-xs border-transparent bg-[#F9FAFB] dark:bg-[#09090B] hover:bg-[#F3F4F6] dark:hover:bg-[#18181B] focus:border-[#2563EB] focus:bg-white dark:focus:bg-[#18181B] rounded-xl transition-all shadow-none" 
          />
        </div>
      </div>

      {/* Exams Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Assessment Title</th>
                <th className="p-4">Schedule & Timing</th>
                <th className="p-4">Assigned Batches</th>
                <th className="p-4">Questions & Marks</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60 transition-colors group">
                  <td className="p-4 pl-6 space-y-0.5">
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{t.title}</p>
                    <p className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-[#16A34A]" /> {t.proctoringFlags?.length || 0} Security Rules Active
                    </p>
                  </td>

                  <td className="p-4 space-y-1">
                    <div>
                      {t.scheduleMode === "open" || (!t.date && !t.startDate) ? (
                        <Badge variant="outline" className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30 text-[10px] font-bold">
                          ⚡ On-Demand (Anytime)
                        </Badge>
                      ) : t.scheduleMode === "window" || (t.startDate || t.endDate) ? (
                        <Badge variant="outline" className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 text-[10px] font-bold">
                          📅 {t.startDate || "Any"} - {t.endDate || "Open"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/30 text-[10px] font-bold">
                          ⏰ {t.date} {t.startTime ? `• ${t.startTime}` : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-[#6B7280] flex items-center gap-1">
                      <Timer className="h-3 w-3 text-[#9CA3AF]" /> {t.duration} Mins Duration
                    </p>
                  </td>

                  <td className="p-4">
                    {t.assignedBatches && t.assignedBatches.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.assignedBatches.map(b => (
                          <Badge key={b} variant="outline" className="text-[10px] font-bold border-[#2563EB]/30 text-[#2563EB]">{b}</Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold text-[#16A34A] border-[#16A34A]/30 bg-[#16A34A]/5">
                        Common (All Students)
                      </Badge>
                    )}
                  </td>

                  <td className="p-4 text-xs font-medium text-[#6B7280]">
                    <span>{t.totalQuestions || 0} Qs • {t.maxMarks || 0} Marks</span>
                  </td>

                  <td className="p-4">
                    <Badge className={`text-[10px] font-bold uppercase ${
                      t.status === "live" ? "bg-[#16A34A] text-white" : t.status === "scheduled" ? "bg-[#2563EB] text-white" : "bg-[#6B7280] text-white"
                    }`}>
                      {t.status}
                    </Badge>
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditExamModal(t)}
                        className="h-8 w-8 p-0 text-[#6B7280] hover:text-[#2563EB] hover:bg-[#2563EB]/10 rounded-lg"
                        title="Edit Exam Settings & Schedule"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAssessmentReportCsv(t)}
                        className="h-8 text-[11px] font-bold text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/10 gap-1 rounded-lg"
                        title="Download Candidate Performance CSV"
                      >
                        <Download className="h-3 w-3" /> Report
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReassignModal(t)}
                        className="h-8 text-[11px] font-bold rounded-lg border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1"
                        title="Reassign test & allow retakes for completed candidates"
                      >
                        <RefreshCw className="h-3 w-3" /> Reassign
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignModal(t)} className="h-8 text-[11px] font-bold rounded-lg">
                        Assign
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => { setSelectedTest(t); setViewState("exam-dashboard"); }}
                        className="h-8 text-[11px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-lg shadow-xs"
                      >
                        Manage
                      </Button>
                      <Button onClick={() => handleDeleteTest(t.id, t.title)} variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626] hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Exam">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {renderAssignmentModal()}
      {renderReassignModal()}
      {renderEditExamSettingsModal()}

    </div>
  );
}
