"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Users,
  Award,
  Eye,
  Trash2,
  Play,
  ArrowLeft,
  Sparkles,
  Lock,
  FileText,
  CheckSquare,
  Settings,
  CheckCircle2,
  AlertCircle,
  Send,
  Check,
  Code2,
  Edit,
  Download,
  Calendar,
  CalendarDays,
  CalendarRange,
  X,
  RotateCcw,
  Zap,
  Globe,
  Timer,
  Info,
  Copy,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  MoreHorizontal,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Pencil,
  FolderPlus,
  Terminal,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BulkUploadCard, BulkUploadModal } from "@/components/admin/bulk-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemCreator } from "@/components/admin/coding-problem-creator";
import { PageHeader } from "@/components/layouts/page-header";
import { VisibilitySelector } from "@/components/admin/visibility-selector";
import { AutoSaveBadge } from "@/components/ui/auto-save-badge";
import { AssessmentQuestionEditor } from "@/components/admin/assessment-question-editor";
import { cn } from "@/lib/utils";

const DEFAULT_STARTER_CODES: Record<string, string> = {
  java: `public class Main {
    public static void main(String[] args) {
        // Write your solution here
    }
}`,
  python: `# Write your solution here
def main():
    pass

if __name__ == "__main__":
    main()`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here
    return 0;
}`,
  javascript: `// Write your solution here
function main() {
}

main();`,
};

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
  difficulty?: "easy" | "medium" | "hard" | string;
  language?: string;
  allowedLanguages?: string[];
  allowed_languages?: string[];
  defaultLanguage?: string;
  default_language?: string;
  templates?: Record<string, string>;
  problemStatement?: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  explanation?: string;
  starterCode?: Record<string, string> | string;
  referenceCode?: Record<string, string> | string;
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
  const [showAssessmentBulkUpload, setShowAssessmentBulkUpload] = useState(false);
  const [bulkUploadTargetSection, setBulkUploadTargetSection] = useState<string | null>(null);

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

  // Bulk Upload State
  const [showBulkUploadAssessments, setShowBulkUploadAssessments] = useState(false);

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
  const [editingSection, setEditingSection] = useState<{ oldName: string; currentName: string } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSectionCollapse = (sectionName: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  // Bulk Selection States for Questions & Tests
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // MNC-Level Delete Confirmation State (Icon-Free Dialog)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);

  const toggleSelectQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const toggleSelectAllQuestionsInSection = (sectionQuestions: { id: string }[]) => {
    const sectionIds = sectionQuestions.map((q) => q.id);
    const allSelected = sectionIds.length > 0 && sectionIds.every((id) => selectedQuestionIds.includes(id));
    if (allSelected) {
      setSelectedQuestionIds((prev) => prev.filter((id) => !sectionIds.includes(id)));
    } else {
      setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...sectionIds])));
    }
  };

  const toggleSelectTest = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const toggleSelectAllTests = (testsList: ScheduledTest[]) => {
    const allIds = testsList.map((t) => t.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedTestIds.includes(id));
    if (allSelected) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(allIds);
    }
  };

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
    const secLower = targetSection.toLowerCase();
    const defaultType =
      secLower.includes("code") || secLower.includes("programming") || secLower.includes("algo")
        ? "coding"
        : secLower.includes("msq") || secLower.includes("multi")
        ? "msq"
        : selectedTest?.allowedQuestionTypes === "coding"
        ? "coding"
        : "mcq";

    setEditingQuestionId(null);
    setManualQuestionTitle("");
    setManualQuestionType(defaultType);
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
    setSelectedQuestionIds((prev) => prev.filter((id) => id !== qId));
    toast({ title: "Question Deleted", description: "Question removed from test pool.", variant: "destructive" });
  };

  const handleBulkDeleteQuestions = (questionIds: string[]) => {
    if (!selectedTest || questionIds.length === 0) return;
    const count = questionIds.length;
    setDeleteConfirmation({
      title: `Delete ${count} Question${count === 1 ? "" : "s"}`,
      description: `Are you sure you want to delete ${count} selected question(s) from "${selectedTest.title}"? Maximum marks will be recalculated automatically.`,
      confirmText: `Delete ${count} Question${count === 1 ? "" : "s"}`,
      onConfirm: async () => {
        const idsSet = new Set(questionIds);
        const remainingQuestions = (selectedTest.questions || []).filter((q) => !idsSet.has(q.id));
        const newMaxMarks = remainingQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);
        const updatedTest = {
          ...selectedTest,
          totalQuestions: remainingQuestions.length,
          maxMarks: newMaxMarks,
          questions: remainingQuestions,
        };

        fetch("/api/admin/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: updatedTest }),
        }).catch((err) => console.error("Failed to bulk delete questions", err));

        setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
        setSelectedTest(updatedTest);
        setSelectedQuestionIds((prev) => prev.filter((id) => !idsSet.has(id)));
        toast({
          title: "Questions Deleted",
          description: `${count} question(s) removed from test pool.`,
          variant: "destructive",
        });
      },
    });
  };

  const handleDeleteSection = (sectionName: string) => {
    if (!selectedTest) return;
    setDeleteConfirmation({
      title: `Delete Section "${sectionName}"`,
      description: `Are you sure you want to delete section "${sectionName}" and all its questions? Test total marks will be recalculated.`,
      confirmText: "Delete Section",
      onConfirm: async () => {
        const targetNorm = sectionName.trim().toLowerCase();
        const remainingSections = (selectedTest.sections || []).filter((s) => s.trim().toLowerCase() !== targetNorm);
        const remainingQuestions = (selectedTest.questions || []).filter((q) => (q.section || "").trim().toLowerCase() !== targetNorm);
        const finalSections = remainingSections;
        const updatedTest = {
          ...selectedTest,
          sections: finalSections,
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
        toast({ title: "Section Deleted", description: `Section "${sectionName}" removed.`, variant: "destructive" });
      },
    });
  };

  const handleCreateNewSection = async () => {
    if (!selectedTest) return;
    const name = newSectionTitle.trim();
    if (!name) {
      toast({ title: "Section Name Required", description: "Please enter or pick a name for the new section.", variant: "destructive" });
      return;
    }

    const currentSections = selectedTest.sections || [];
    if (currentSections.some((s) => s.trim().toLowerCase() === name.toLowerCase())) {
      toast({ title: "Section Exists", description: `A section named "${name}" already exists in this assessment.`, variant: "destructive" });
      return;
    }

    const updatedSections = [...currentSections, name];
    const updatedTest = {
      ...selectedTest,
      sections: updatedSections,
    };

    try {
      await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: updatedTest }),
      });
      setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
      setSelectedTest(updatedTest);
      setIsAddingSection(false);
      setNewSectionTitle("");
      toast({ title: "Section Created", description: `Section "${name}" created successfully. You can now add questions or bulk upload into it.` });
    } catch (err) {
      console.error("Failed to add section", err);
      toast({ title: "Creation Failed", description: "Failed to persist new section.", variant: "destructive" });
    }
  };
  const handleAddSection = handleCreateNewSection;

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
  
  const handleRenameSection = (oldName: string, newName: string) => {
    if (!selectedTest) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingSection(null);
      return;
    }
    const currentSections = selectedTest.sections || [];
    if (currentSections.some((s) => s.toLowerCase() === trimmed.toLowerCase() && s.toLowerCase() !== oldName.toLowerCase())) {
      toast({
        title: "Section Already Exists",
        description: `A section named "${trimmed}" already exists in this assessment.`,
        variant: "destructive",
      });
      return;
    }
    const updatedSections = currentSections.map((s) => (s.trim().toLowerCase() === oldName.trim().toLowerCase() ? trimmed : s));
    const updatedQuestions = (selectedTest.questions || []).map((q) => {
      if ((q.section || "").trim().toLowerCase() === oldName.trim().toLowerCase()) {
        return { ...q, section: trimmed };
      }
      return q;
    });
    const updatedTest = { ...selectedTest, sections: updatedSections, questions: updatedQuestions };
    fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: updatedTest }),
    }).catch((err) => console.error("Failed to rename section", err));
    setTests(tests.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
    setSelectedTest(updatedTest);
    setEditingSection(null);
    toast({ title: "Section Renamed", description: `Renamed "${oldName}" to "${trimmed}".` });
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

  const handleDeleteTest = (id: string, title: string) => {
    setDeleteConfirmation({
      title: "Delete Assessment",
      description: `Are you sure you want to delete assessment "${title}"? This will cancel the exam and remove it from student schedules.`,
      confirmText: "Delete Assessment",
      onConfirm: async () => {
        setTests((prev) => prev.filter((t) => t.id !== id));
        setSelectedTestIds((prev) => prev.filter((tId) => tId !== id));
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
      },
    });
  };

  const handleBulkDeleteTests = (testIds: string[]) => {
    if (testIds.length === 0) return;
    const count = testIds.length;
    setDeleteConfirmation({
      title: `Delete ${count} Assessment${count === 1 ? "" : "s"}`,
      description: `Are you sure you want to permanently delete ${count} selected assessment(s)? This action cannot be undone.`,
      confirmText: `Delete ${count} Assessment${count === 1 ? "" : "s"}`,
      onConfirm: async () => {
        setTests((prev) => prev.filter((t) => !testIds.includes(t.id)));
        setSelectedTestIds([]);
        try {
          await Promise.all(
            testIds.map((id) =>
              fetch(`/api/admin/tests?id=${encodeURIComponent(id)}`, { method: "DELETE" })
            )
          );
        } catch (err) {
          console.error("Failed to bulk delete tests", err);
        }
        toast({
          title: "Assessments Deleted",
          description: `${count} assessment(s) removed from schedule.`,
          variant: "destructive",
        });
      },
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
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-semibold text-[#6B7280]" onClick={() => setAssigningTest(null)}>
              Close
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
        title: "Test Reassigned Successfully!",
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
                  {reassigningTest.assignedBatches && reassigningTest.assignedBatches.length > 0
                    ? "Reassign Assessment & Manage Retakes"
                    : "Assign Assessment Batches"}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Configure batch visibility and retake permissions for &quot;{reassigningTest.title}&quot;
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold text-[#6B7280]"
              onClick={() => !isSubmittingReassign && setReassigningTest(null)}
            >
              Close
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
                <p className="text-xs text-[#6B7280]">Update timing window, question types, status, and security controls.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold text-[#6B7280]"
              onClick={() => setIsEditingExamSettings(false)}
            >
              Close
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

            {/* Status & Question Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Multiple Faces Alert</span>
                  <Switch checked={editExamForm.secMultipleFaces ?? true} onCheckedChange={(v) => setEditExamForm({ ...editExamForm, secMultipleFaces: v })} />
                </div>
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Looking Away Detection</span>
                  <Switch checked={editExamForm.secLookingAway ?? true} onCheckedChange={(v) => setEditExamForm({ ...editExamForm, secLookingAway: v })} />
                </div>
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Auto-Submit on Warning Limit</span>
                  <Switch checked={editExamForm.secAutoSubmit ?? true} onCheckedChange={(v) => setEditExamForm({ ...editExamForm, secAutoSubmit: v })} />
                </div>
                <div className="flex justify-between items-center p-3 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                  <span className="text-xs font-medium">Max Warnings Limit</span>
                  <Select value={String(editExamForm.maxWarningsLimit || 3)} onValueChange={(v) => setEditExamForm({ ...editExamForm, maxWarningsLimit: Number(v) })}>
                    <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
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

  const renderAddSectionModal = () => {
    if (!isAddingSection || !selectedTest) return null;

    const presetTemplates = [
      { name: "Coding Challenges", icon: Code2, desc: "Interactive programming challenges with test cases" },
      { name: "Logical & Technical MSQ", icon: CheckSquare, desc: "Multiple-select questions with several correct answers" },
      { name: "Aptitude & Logical Reasoning", icon: Sparkles, desc: "Single-choice aptitude and logical questions" },
      { name: "Data Structures & Algorithms", icon: Terminal, desc: "Arrays, Trees, Graphs, and Algorithmic problems" },
      { name: "Core Technical MCQs", icon: FileText, desc: "Domain concepts and core programming principles" },
      { name: "Verbal Ability & English", icon: BookOpen, desc: "Comprehension, grammar, and communication" },
    ];

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <Card className="w-full max-w-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Assessment Section
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Organize questions by topic, question format, or difficulty
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsAddingSection(false);
                setNewSectionTitle("");
              }}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                Section Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Coding Challenges, Aptitude, Technical Core..."
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateNewSection();
                  }
                }}
                className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">
                Quick Template Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presetTemplates.map((p) => {
                  const isSelected = newSectionTitle.trim().toLowerCase() === p.name.toLowerCase();
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setNewSectionTitle(p.name)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2",
                        isSelected
                          ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs"
                          : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                      )}
                    >
                      <p.icon className={cn("w-4 h-4 mt-0.5 shrink-0", isSelected ? "text-blue-600" : "text-slate-400")} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-slate-800 dark:text-zinc-200">{p.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 line-clamp-1">{p.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingSection(false);
                setNewSectionTitle("");
              }}
              className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewSection}
              disabled={!newSectionTitle.trim()}
              className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Create Section</span>
            </Button>
          </div>
        </Card>
      </div>,
      document.body
    );
  };

  const renderEditSectionModal = () => {
    if (!editingSection || !selectedTest) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <Card className="w-full max-w-md bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rename Section
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Update section title and all its associated questions
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingSection(null)}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Section Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={editingSection.currentName}
                onChange={(e) => setEditingSection({ ...editingSection, currentName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRenameSection(editingSection.oldName, editingSection.currentName);
                  } else if (e.key === "Escape") {
                    setEditingSection(null);
                  }
                }}
                placeholder="e.g. Multiple Choice Questions, Coding Challenges..."
                autoFocus
                className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30">
            <Button
              variant="outline"
              onClick={() => setEditingSection(null)}
              className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              disabled={!editingSection.currentName.trim()}
              onClick={() => handleRenameSection(editingSection.oldName, editingSection.currentName)}
              className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Save Changes
            </Button>
          </div>
        </Card>
      </div>,
      document.body
    );
  };

  if (viewState === "exam-dashboard" && selectedTest) {
    const totalQuestionsCount = selectedTest.questions?.length || 0;
    const calculatedMaxMarks = (selectedTest.questions || []).reduce((acc, q) => acc + (q.marks || 0), 0) || selectedTest.maxMarks || 0;
    const durationMinutes = selectedTest.duration || 60;
    const assessmentType = (selectedTest as any).type || "Technical Assessment";
    const isLiveOrActive = selectedTest.scheduleMode === "open" || (!selectedTest.date && !selectedTest.startDate);
    const statusLabel = isLiveOrActive ? "Active" : selectedTest.scheduleMode === "window" ? "Scheduled" : "Active";

    const allSections = [...(selectedTest.sections || [])];
    (selectedTest.questions || []).forEach((q) => {
      const qSec = (q.section || "").trim();
      if (qSec && !allSections.some((s) => s.trim().toLowerCase() === qSec.toLowerCase())) {
        allSections.push(qSec);
      }
    });
    const displaySections = allSections;

    return (
      <div className="space-y-6 w-full max-w-[1600px] mx-auto">
        {/* LEVEL 1 — ASSESSMENT HEADER */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Back + Title + Status + Secondary Meta */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewState("list")}
                  className="h-7 px-2 -ml-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 gap-1.5 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  {selectedTest.title}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                    isLiveOrActive
                      ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      : "border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    isLiveOrActive ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
                  )} />
                  {statusLabel}
                </Badge>
              </div>

              {/* Secondary Information Bar */}
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-500 dark:text-zinc-400 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-zinc-500 font-medium">Total Questions:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{totalQuestionsCount}</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-zinc-500 font-medium">Maximum Marks:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{calculatedMaxMarks}</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-zinc-500 font-medium">Duration:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{durationMinutes} min</span>
                </div>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-zinc-500 font-medium">Assessment Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{assessmentType}</span>
                </div>
                {selectedTest.batch && (
                  <>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 dark:text-zinc-500 font-medium">Batch:</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedTest.batch}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Clean Action Hierarchy */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Primary Action */}
              <Button
                className="h-9 px-4 font-semibold text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs gap-1.5 rounded-lg transition-colors cursor-pointer"
                onClick={() => setViewState("add-question")}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Manage Questions</span>
              </Button>

              {/* Secondary Actions */}
              <Button
                variant="outline"
                className="h-9 px-3.5 font-semibold text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors gap-1.5 cursor-pointer"
                onClick={() => {
                  setBulkUploadTargetSection(null);
                  setShowAssessmentBulkUpload(true);
                }}
              >
                <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                <span>Bulk Upload</span>
              </Button>

              <Button
                variant="outline"
                className="h-9 px-3.5 font-semibold text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors gap-1.5 cursor-pointer"
                onClick={() => openEditExamModal(selectedTest)}
              >
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                <span>Settings & Schedule</span>
              </Button>

              <Button
                variant="outline"
                className="h-9 px-3.5 font-semibold text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors gap-1.5 cursor-pointer"
                onClick={() => openAssignModal(selectedTest)}
              >
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span>Assign Batches</span>
              </Button>

              {/* Tertiary / More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="h-9 w-9 flex items-center justify-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors outline-none"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => downloadAssessmentReportCsv(selectedTest)}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 mr-2 text-slate-500" />
                    <span>Download Report (CSV)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openReassignModal(selectedTest)}
                    className="text-xs font-semibold cursor-pointer text-amber-600 dark:text-amber-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    <span>Reassign Test</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT LAYOUT: 70% LEFT / 30% RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: 70% PRIMARY WORKSPACE (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Assigned Questions & Sections
                </h2>
                <Badge variant="outline" className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800">
                  {displaySections.length} {displaySections.length === 1 ? "Section" : "Sections"}
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setNewSectionTitle("");
                  setIsAddingSection(true);
                }}
                className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Section</span>
              </Button>
            </div>

            {/* Global Bulk Delete Toolbar for Questions */}
            {selectedQuestionIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-2.5 shadow-xs transition-all">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                    {selectedQuestionIds.length}
                  </span>
                  <span className="text-xs font-bold text-red-800 dark:text-red-300">
                    {selectedQuestionIds.length === 1 ? "1 question selected" : `${selectedQuestionIds.length} questions selected`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestionIds([])}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 underline cursor-pointer ml-1"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkDeleteQuestions(selectedQuestionIds)}
                    className="h-8 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
                  >
                    <span>Delete Selected ({selectedQuestionIds.length})</span>
                  </Button>
                </div>
              </div>
            )}

            {displaySections.map((section) => {
              const sectionQuestions = (selectedTest.questions || [])
                .map((q, idx) => ({ ...q, originalIndex: idx }))
                .filter((q) => (q.section || "").trim().toLowerCase() === section.trim().toLowerCase());
              const isCollapsed = Boolean(collapsedSections[section]);
              const sectionSelectedIds = sectionQuestions
                .map((q) => q.id)
                .filter((id) => selectedQuestionIds.includes(id));
              const allSectionSelected =
                sectionQuestions.length > 0 && sectionSelectedIds.length === sectionQuestions.length;

              return (
                <div
                  key={section}
                  className="bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs transition-all"
                >
                  {/* Section Header */}
                  <div className="p-4 sm:p-4.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-900/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleSectionCollapse(section)}
                          className="w-7 h-7 rounded-lg border border-slate-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-2xs shrink-0"
                          title={isCollapsed ? "Expand section questions" : "Minimize section"}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-slate-600 dark:text-zinc-300 transition-transform duration-200",
                              isCollapsed ? "-rotate-90" : "rotate-0"
                            )}
                          />
                        </button>
                        <div className="flex items-center gap-1.5 group">
                          <h3
                            onClick={() => toggleSectionCollapse(section)}
                            className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors select-none"
                          >
                            {section}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSection({ oldName: section, currentName: section });
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Edit section name"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30"
                        >
                          {sectionQuestions.length} {sectionQuestions.length === 1 ? "Question" : "Questions"}
                        </Badge>
                        {isCollapsed && (
                          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 italic hidden sm:inline">
                            (Minimized)
                          </span>
                        )}
                      </div>

                      {/* Section Action Controls */}
                      <div className="flex items-center gap-2">
                        {sectionSelectedIds.length > 0 && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-2.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-2xs animate-in fade-in duration-200"
                            onClick={() => handleBulkDeleteQuestions(sectionSelectedIds)}
                            title={`Delete ${sectionSelectedIds.length} selected questions in this section`}
                          >
                            <span>Delete ({sectionSelectedIds.length})</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-semibold border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                          onClick={() => openCreateQuestion(section)}
                        >
                          <Plus className="h-3.5 w-3.5 text-slate-500" />
                          <span>Add Question</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-semibold border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                          onClick={() => {
                            setBulkUploadTargetSection(section);
                            setShowAssessmentBulkUpload(true);
                          }}
                        >
                          <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                          <span>Bulk Upload</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg gap-1 cursor-pointer"
                          onClick={() => toggleSectionCollapse(section)}
                          title={isCollapsed ? "Expand questions list" : "Minimize questions list"}
                        >
                          {isCollapsed ? (
                            <>
                              <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-slate-500" />
                              <span className="hidden sm:inline">Expand</span>
                            </>
                          ) : (
                            <>
                              <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Minimize</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 cursor-pointer"
                          onClick={() => handleDeleteSection(section)}
                          title={`Delete section "${section}"`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>

                    {/* Integrated Compact Question Number Navigation (Only when expanded) */}
                    {!isCollapsed && sectionQuestions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800/60">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mr-1.5">
                          Questions:
                        </span>
                        {sectionQuestions.map((q) => {
                          const isQSelected = selectedQuestionIds.includes(q.id);
                          return (
                            <button
                              key={q.id}
                              onClick={() => openEditQuestion(q)}
                              className={cn(
                                "w-7 h-7 rounded-md border text-xs font-semibold font-mono flex items-center justify-center transition-all cursor-pointer shadow-2xs",
                                isQSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                              )}
                              title={`Question ${q.originalIndex + 1}: ${q.title} (${q.marks} Marks)`}
                            >
                              {q.originalIndex + 1}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section Content: Question List or Empty State (Only when expanded) */}
                  {!isCollapsed && (
                    <>
                      {sectionQuestions.length === 0 ? (
                        <div className="p-7 text-center bg-white dark:bg-[#121214]">
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
                            No questions have been added to this section yet.
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg gap-1.5 cursor-pointer"
                              onClick={() => openCreateQuestion(section)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Question</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg gap-1.5 cursor-pointer"
                              onClick={() => {
                                setBulkUploadTargetSection(section);
                                setShowAssessmentBulkUpload(true);
                              }}
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                              <span>Bulk Upload</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                          {/* MNC-grade Table Header with Select-All Checkbox (Strict 12 Cols: 1 + 6 + 2 + 1 + 2 = 12) */}
                          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-800/80 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider items-center select-none">
                            <div className="col-span-1 flex items-center justify-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={allSectionSelected}
                                onChange={() => toggleSelectAllQuestionsInSection(sectionQuestions)}
                                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                title={allSectionSelected ? "Deselect all questions in this section" : "Select all questions in this section"}
                              />
                              <span className="text-[10px]">#</span>
                            </div>
                            <div className="col-span-6">Question</div>
                            <div className="col-span-2 text-center">Type</div>
                            <div className="col-span-1 text-right">Marks</div>
                            <div className="col-span-2 text-right pr-2">Actions</div>
                          </div>

                          {/* Question Table Rows with Row Checkbox */}
                          {sectionQuestions.map((q) => {
                            const questionNumber = String(q.originalIndex + 1).padStart(2, "0");
                            const isSelected = selectedQuestionIds.includes(q.id);

                            return (
                              <div
                                key={q.id}
                                className={cn(
                                  "grid grid-cols-12 gap-3 px-4 py-2.5 items-center transition-colors group",
                                  isSelected
                                    ? "bg-blue-50/70 dark:bg-blue-950/25 border-l-2 border-blue-600"
                                    : "hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                                )}
                              >
                                {/* Checkbox + # Badge */}
                                <div className="col-span-1 flex items-center justify-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectQuestion(q.id)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                    title={`Select Question ${questionNumber}`}
                                  />
                                  <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 text-slate-700 dark:text-zinc-300 font-mono text-[11px] font-bold flex items-center justify-center">
                                    {questionNumber}
                                  </span>
                                </div>

                                {/* Question Title & Meta */}
                                <div className="col-span-6 min-w-0 pr-2">
                                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {q.title}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                                    {q.type === "coding" ? (
                                      <span>
                                        {q.testCases?.length || 0} Test Cases ({q.testCases?.filter((t) => !t.isHidden).length || 0} Public)
                                      </span>
                                    ) : (
                                      <span>
                                        {q.options?.length || 0} Options {q.options?.some((o) => o.isCorrect) && "• Answer Configured"}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Type Semantic Label */}
                                <div className="col-span-2 flex justify-center">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                                      q.type === "coding"
                                        ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                        : q.type === "msq"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                                        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                    )}
                                  >
                                    {q.type === "coding" ? "Coding" : q.type === "msq" ? "MSQ" : "MCQ"}
                                  </Badge>
                                </div>

                                {/* Marks */}
                                <div className="col-span-1 text-right">
                                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                    {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                                  </span>
                                </div>

                                {/* Actions - MNC Aligned on Right */}
                                <div className="col-span-2 flex items-center justify-end gap-1.5 pr-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 rounded-lg gap-1 transition-all shadow-2xs cursor-pointer"
                                    onClick={() => openEditQuestion(q)}
                                    title="Edit Question"
                                  >
                                    <Pencil className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
                                    <span>Edit</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-red-300 hover:bg-red-50/60 dark:hover:bg-red-950/30 rounded-lg transition-all shadow-2xs cursor-pointer"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    title="Delete Question"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Add New Section UI */}
            <div className="pt-1">
              {isAddingSection ? (
                <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-3 shadow-xs">
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    Create New Section
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type section title (e.g. Quantitative Ability, Verbal Reasoning)..."
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      className="h-9 text-xs"
                      autoFocus
                    />
                    <Button
                      className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                      onClick={handleAddSection}
                    >
                      Save Section
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-9 px-3 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 cursor-pointer"
                      onClick={() => setIsAddingSection(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-10 border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-zinc-800 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  onClick={() => setIsAddingSection(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Section
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT: 30% SUPPORTING INFORMATION SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* 1. ASSESSMENT OVERVIEW */}
            <Card className="bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40">
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                  Assessment Overview
                </h3>
              </div>
              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                  <span className="text-slate-500 dark:text-zinc-400">Status</span>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                  >
                    {statusLabel}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                  <span className="text-slate-500 dark:text-zinc-400">Questions</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100">{totalQuestionsCount}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                  <span className="text-slate-500 dark:text-zinc-400">Maximum Marks</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100">{calculatedMaxMarks}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                  <span className="text-slate-500 dark:text-zinc-400">Duration</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100">{durationMinutes} min</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-zinc-400">Assessment Type</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100">{assessmentType}</span>
                </div>
              </CardContent>
            </Card>

            {/* 2. SCHEDULE & TIMING */}
            <Card className="bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Schedule & Timing</span>
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30"
                >
                  {selectedTest.scheduleMode === "open" || (!selectedTest.date && !selectedTest.startDate)
                    ? "On-Demand"
                    : selectedTest.scheduleMode === "window"
                    ? "Validity Window"
                    : "Strict Slot"}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                    <span className="text-slate-500 dark:text-zinc-400">Duration</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">{durationMinutes} Minutes</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                    <span className="text-slate-500 dark:text-zinc-400">Access</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                      {selectedTest?.scheduleMode === "window" && (selectedTest?.startDate || selectedTest?.endDate)
                        ? `${selectedTest?.startDate || "Any"} to ${selectedTest?.endDate || "Open"}`
                        : selectedTest?.date
                        ? `${selectedTest?.date} ${selectedTest?.startTime ? `(${selectedTest.startTime} - ${selectedTest?.endTime || "..."})` : ""}`
                        : "Available 24/7"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 dark:text-zinc-400">Timezone</span>
                    <span className="font-mono text-slate-600 dark:text-zinc-400 text-[11px]">{selectedTest?.timezone || "Asia/Kolkata"}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditExamModal(selectedTest)}
                  className="w-full h-8 text-xs font-semibold border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg gap-1.5 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  <span>Modify Schedule</span>
                </Button>
              </CardContent>
            </Card>

            {/* 3. CANDIDATE SUBMISSIONS */}
            <Card className="bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                  Candidate Submissions
                </h3>
                <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
                  Live
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500">Completed</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                      {candidateSubmissions.filter(c => c.status === "Submitted" || c.status === "Auto-Submitted").length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500">Submitted</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {candidateSubmissions.length}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => downloadAssessmentReportCsv(selectedTest)}
                    disabled={candidateSubmissions.length === 0}
                    size="sm"
                    className="w-full h-8 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold text-xs gap-1.5 rounded-lg cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Candidate Report</span>
                  </Button>
                  <Link href={`/admin/tests/inspect/${selectedTest.id}`} className="block w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold text-xs gap-1.5 rounded-lg cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 text-blue-600" />
                      <span>Live Anti-Cheating Monitor</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 4. SECURITY & ANTI-CHEATING */}
            <Card className="bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40">
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Security & Anti-Cheating</span>
                </h3>
              </div>
              <CardContent className="p-4">
                {selectedTest.proctoringFlags && selectedTest.proctoringFlags.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTest.proctoringFlags.map((flag) => (
                      <div key={flag} className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium">{flag}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-zinc-400">
                    Standard security measures active (No strict proctoring flags).
                  </div>
                )}
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
            <div className="p-8 text-center">
              <Loading size="sm" text="Loading candidate submissions..." />
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
        {renderAddSectionModal()}
        {renderEditSectionModal()}

        {showAssessmentBulkUpload && selectedTest && (
          <BulkUploadModal
            isOpen={true}
            inline={false}
            onClose={() => {
              setShowAssessmentBulkUpload(false);
              setBulkUploadTargetSection(null);
            }}
            moduleType="assessment_questions"
            moduleTitle={
              bulkUploadTargetSection
                ? `${selectedTest.title} - ${bulkUploadTargetSection}`
                : selectedTest.title
            }
            targetSection={bulkUploadTargetSection}
            onImport={async (importedData) => {
              if (!selectedTest) return;
              const incomingQuestions: TestQuestion[] = [];
              const targetSec = bulkUploadTargetSection ? bulkUploadTargetSection.trim() : null;

              // Helper for normalizing question type
              const normalizeQType = (raw: any, opts?: any[], tcs?: any[], rawItem?: any, sec?: string): "coding" | "mcq" | "msq" | "both" => {
                const clean = String(raw || "").toLowerCase().replace(/[\s_-]+/g, "");
                if (clean === "coding" || clean === "code" || clean === "programming") return "coding";
                if (clean === "msq" || clean === "multipleselect" || clean === "multiselect" || clean === "multiple") return "msq";
                if (clean === "both" || clean === "mixed") return "both";
                if (clean === "mcq" || clean === "multiplechoice" || clean === "singlechoice" || clean === "choice") return "mcq";
                
                // If question has MCQ options, it is an MCQ/MSQ
                if (opts && Array.isArray(opts) && opts.length > 0 && opts.some((o: any) => String(o.text || "").trim() !== "")) {
                  const correctCount = opts.filter((o: any) => Boolean(o.isCorrect)).length;
                  return correctCount > 1 ? "msq" : "mcq";
                }

                // Contextual coding detection: ID prefix, category, test cases with non-empty content
                const validTcs = (tcs || []).filter((tc: any) => String(tc.input || "").trim() !== "" || String(tc.output || tc.expected_output || tc.expectedOutput || "").trim() !== "");
                if (
                  rawItem?.questionCategory === "coding" ||
                  String(rawItem?.id || "").startsWith("cp_") ||
                  validTcs.length > 0
                ) {
                  return "coding";
                }

                return "mcq";
              };

              const mapSingleQuestion = (rawQ: any, fallbackSec: string, index: number): TestQuestion => {
                // Build MCQ/MSQ options if raw row contains option columns
                let structuredOptions = rawQ.options;
                if (!structuredOptions || !Array.isArray(structuredOptions) || structuredOptions.length === 0) {
                  const rawCorrect = String(rawQ.correctOption || rawQ.correct_option || rawQ.correctAnswer || rawQ.correct_answer || rawQ.answer || "A").trim().toUpperCase();
                  const correctParts = rawCorrect.split(/[,;\s]+/).map((s: string) => s.trim());
                  
                  const optA = rawQ.optionA ?? rawQ.option_a ?? rawQ.option1 ?? rawQ.choiceA ?? rawQ.choice_a;
                  const optB = rawQ.optionB ?? rawQ.option_b ?? rawQ.option2 ?? rawQ.choiceB ?? rawQ.choice_b;
                  const optC = rawQ.optionC ?? rawQ.option_c ?? rawQ.option3 ?? rawQ.choiceC ?? rawQ.choice_c;
                  const optD = rawQ.optionD ?? rawQ.option_d ?? rawQ.option4 ?? rawQ.choiceD ?? rawQ.choice_d;

                  if (optA !== undefined || optB !== undefined || optC !== undefined || optD !== undefined) {
                    structuredOptions = [
                      { id: 1, text: String(optA || "").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") || rawCorrect === "A" },
                      { id: 2, text: String(optB || "").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") || rawCorrect === "B" },
                      { id: 3, text: String(optC || "").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") || rawCorrect === "C" },
                      { id: 4, text: String(optD || "").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") || rawCorrect === "D" },
                    ].filter((o: any) => o.text !== "");
                  }
                }

                const rawTcs = rawQ.testCases || rawQ.test_cases || [];
                const validTcs = (rawTcs || []).filter((tc: any) => String(tc.input || "").trim() !== "" || String(tc.output || tc.expected_output || tc.expectedOutput || "").trim() !== "");
                const qType = normalizeQType(rawQ.type || rawQ.questionType, structuredOptions, validTcs, rawQ, rawQ.section);

                // Smart section resolution: Don't force MCQs into a coding section and coding into MCQ section
                let assignedSec = (rawQ.section ? String(rawQ.section).trim() : null);
                if (qType === "coding") {
                  if (!assignedSec || (!assignedSec.toLowerCase().includes("code") && !assignedSec.toLowerCase().includes("programming"))) {
                    assignedSec = "Coding Challenges";
                  }
                } else {
                  if (assignedSec && (assignedSec.toLowerCase().includes("code") || assignedSec.toLowerCase().includes("programming"))) {
                    assignedSec = (targetSec && !targetSec.toLowerCase().includes("code") && !targetSec.toLowerCase().includes("programming"))
                      ? targetSec
                      : (fallbackSec && !fallbackSec.toLowerCase().includes("code") && !fallbackSec.toLowerCase().includes("programming")
                          ? fallbackSec
                          : "Multiple Choice Questions");
                  } else if (!assignedSec) {
                    assignedSec = (targetSec && !targetSec.toLowerCase().includes("code") && !targetSec.toLowerCase().includes("programming"))
                      ? targetSec
                      : (fallbackSec && !fallbackSec.toLowerCase().includes("code") && !fallbackSec.toLowerCase().includes("programming")
                          ? fallbackSec
                          : "Multiple Choice Questions");
                  }
                }

                const marks = Number(rawQ.marks) || (qType === "coding" ? 10 : 2);
                const title = (rawQ.title || rawQ.questionTitle || rawQ.questionText || rawQ.prompt || `Question ${incomingQuestions.length + index + 1}`).trim();
                const problemStatement = (rawQ.problemStatement || rawQ.description || rawQ.prompt || title).trim();

                const formattedTestCases = validTcs.map((tc: any, tcIdx: number) => ({
                  id: tc.id || `tc_${tcIdx + 1}`,
                  input: tc.input || "",
                  output: tc.output || tc.expected_output || tc.expectedOutput || "",
                  expected_output: tc.output || tc.expected_output || tc.expectedOutput || "",
                  isHidden: Boolean(tc.isHidden ?? tc.is_hidden),
                  is_hidden: Boolean(tc.isHidden ?? tc.is_hidden),
                }));

                return {
                  id: rawQ.id || (qType === "coding" ? `cp_bulk_${Date.now()}_${index}` : `q_bulk_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`),
                  title,
                  type: qType,
                  marks,
                  section: assignedSec,
                  difficulty: rawQ.difficulty || "Easy",
                  language: rawQ.language || (qType === "coding" ? (rawQ.defaultLanguage || rawQ.default_language || (rawQ.allowedLanguages && rawQ.allowedLanguages[0]) || "java") : undefined),
                  allowedLanguages: qType === "coding" ? (rawQ.allowedLanguages || rawQ.allowed_languages) : undefined,
                  allowed_languages: qType === "coding" ? (rawQ.allowed_languages || rawQ.allowedLanguages) : undefined,
                  defaultLanguage: qType === "coding" ? (rawQ.defaultLanguage || rawQ.default_language) : undefined,
                  default_language: qType === "coding" ? (rawQ.default_language || rawQ.defaultLanguage) : undefined,
                  templates: qType === "coding" ? rawQ.templates : undefined,
                  problemStatement,
                  description: (rawQ.description || problemStatement).trim(),
                  inputFormat: qType === "coding" ? (rawQ.inputFormat || rawQ.input_format || "").trim() : undefined,
                  outputFormat: qType === "coding" ? (rawQ.outputFormat || rawQ.output_format || "").trim() : undefined,
                  constraints: qType === "coding" ? (rawQ.constraints || "").trim() : undefined,
                  explanation: (rawQ.explanation || "").trim(),
                  starterCode: qType === "coding" ? (rawQ.starterCode || rawQ.starter_code || rawQ.templates || { java: DEFAULT_STARTER_CODES.java || "// Java" }) : undefined,
                  referenceCode: qType === "coding" ? (rawQ.referenceCode || { java: "" }) : undefined,
                  options: qType !== "coding" ? (structuredOptions || []) : undefined,
                  testCases: qType === "coding"
                    ? (formattedTestCases.length > 0
                        ? formattedTestCases
                        : [{ id: "tc_1", input: "1", output: "1", expected_output: "1", isHidden: false, is_hidden: false }])
                    : undefined,
                };
              };

              if (Array.isArray(importedData)) {
                importedData.forEach((item: any, itemIdx: number) => {
                  // Shape 1: Grouped section object { sectionName/title, questions: [...] }
                  if (item.questions && Array.isArray(item.questions)) {
                    const fallbackSec = targetSec || (item.sectionName || item.title || item.section || "General Assessment").trim();
                    item.questions.forEach((q: any, qIdx: number) => {
                      incomingQuestions.push(mapSingleQuestion(q, fallbackSec, itemIdx * 100 + qIdx));
                    });
                  }
                  // Shape 2: Object with sections array { sections: [ { title, questions: [...] } ] }
                  else if (item.sections && Array.isArray(item.sections)) {
                    item.sections.forEach((sec: any, sIdx: number) => {
                      const fallbackSec = targetSec || (sec.title || sec.sectionName || "General Assessment").trim();
                      (sec.questions || []).forEach((q: any, qIdx: number) => {
                        incomingQuestions.push(mapSingleQuestion(q, fallbackSec, sIdx * 100 + qIdx));
                      });
                    });
                  }
                  // Shape 3: Flat question row
                  else if (item.questionTitle || item.title || item.questionText || item.prompt) {
                    const fallbackSec = targetSec || (item.sectionName || item.section || selectedTest.sections?.[0] || "General Assessment").trim();
                    incomingQuestions.push(mapSingleQuestion(item, fallbackSec, itemIdx));
                  }
                });
              }

              if (incomingQuestions.length === 0) {
                toast({
                  title: "No Questions Found",
                  description: "Could not find any valid questions to import from the uploaded file.",
                  variant: "destructive",
                });
                return;
              }

              // Canonicalize sections
              const existingSections = selectedTest.sections && selectedTest.sections.length > 0
                ? [...selectedTest.sections]
                : ["General Assessment"];
              const existingQuestions = selectedTest.questions || [];

              const canonicalSection = (rawSec: string): string => {
                const trimmed = rawSec.trim();
                const matched = existingSections.find((s) => s.trim().toLowerCase() === trimmed.toLowerCase());
                return matched || trimmed;
              };

              // Re-align all questions to match canonical section casing
              incomingQuestions.forEach((q) => {
                q.section = canonicalSection(q.section);
              });

              // Decide final sections list - remove empty placeholder sections if real questions exist
              const usedExistingSections = new Set((selectedTest.questions || []).map((q) => (q.section || "").trim().toLowerCase()));
              let finalSections = existingSections.filter((s) => usedExistingSections.has(s.trim().toLowerCase()));
              const incomingSectionSet = new Set(incomingQuestions.map((q) => q.section));

              incomingSectionSet.forEach((sec) => {
                if (!finalSections.some((s) => s.trim().toLowerCase() === sec.trim().toLowerCase())) {
                  finalSections.push(sec);
                }
              });

              if (finalSections.length === 0) {
                finalSections = Array.from(incomingSectionSet).length > 0 ? Array.from(incomingSectionSet) : ["General Assessment"];
              }

              // Duplicate detection: section + title (case-insensitive)
              const existingKeys = new Set(
                existingQuestions.map((q) => `${(q.section || "").trim().toLowerCase()}:::${(q.title || "").trim().toLowerCase()}`)
              );

              const newQuestionsToAdd: TestQuestion[] = [];
              const skippedDuplicates: TestQuestion[] = [];

              incomingQuestions.forEach((q) => {
                const key = `${(q.section || "").trim().toLowerCase()}:::${(q.title || "").trim().toLowerCase()}`;
                if (existingKeys.has(key)) {
                  skippedDuplicates.push(q);
                } else {
                  existingKeys.add(key);
                  newQuestionsToAdd.push(q);
                }
              });

              if (newQuestionsToAdd.length === 0) {
                toast({
                  title: "All Questions Already Exist",
                  description: `Skipped ${skippedDuplicates.length} duplicate question(s) that already exist in this assessment.`,
                  variant: "destructive",
                });
                setShowAssessmentBulkUpload(false);
                setBulkUploadTargetSection(null);
                return;
              }

              const updatedQuestions = [...existingQuestions, ...newQuestionsToAdd];
              const totalMarks = updatedQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

              const updatedTest: ScheduledTest = {
                ...selectedTest,
                sections: finalSections,
                totalQuestions: updatedQuestions.length,
                maxMarks: totalMarks,
                questions: updatedQuestions,
              };

              try {
                const res = await fetch("/api/admin/tests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ test: updatedTest }),
                });
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(errData.error || "Failed to persist questions to database");
                }
              } catch (err) {
                console.error("Failed to update test with imported questions", err);
              }

              setTests((prev) => prev.map((t) => (t.id === selectedTest.id ? updatedTest : t)));
              setSelectedTest(updatedTest);
              setShowAssessmentBulkUpload(false);
              setBulkUploadTargetSection(null);

              const sectionDisplay = targetSec
                ? `to ${targetSec}`
                : finalSections.length === 1
                ? `to ${finalSections[0]}`
                : `across ${incomingSectionSet.size} section(s)`;

              toast({
                title: "Bulk Upload Completed",
                description: skippedDuplicates.length > 0
                  ? `${newQuestionsToAdd.length} questions added successfully ${sectionDisplay}. (${skippedDuplicates.length} duplicates skipped).`
                  : `${newQuestionsToAdd.length} questions added successfully ${sectionDisplay}. Total questions: ${updatedQuestions.length}.`,
              });
            }}
          />
        )}
      </div>
    );
  }

  if (viewState === "add-question" && selectedTest) {
    return (
      <AssessmentQuestionEditor
        test={selectedTest}
        role={role}
        initialQuestionId={editingQuestionId}
        targetSection={manualQuestionSection}
        onBack={() => {
          setEditingQuestionId(null);
          setViewState("exam-dashboard");
        }}
        onSave={async (updatedTest: ScheduledTest) => {
          try {
            const res = await fetch("/api/admin/tests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ test: updatedTest }),
            });
            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || "Failed to update assessment");
            }
            setTests((prev) => prev.map((t) => (t.id === updatedTest.id ? updatedTest : t)));
            setSelectedTest(updatedTest);
          } catch (err) {
            console.error("Save assessment error:", err);
            throw err;
          }
        }}
      />
    );
  }

  // --- MAIN LIST VIEW ---
  const handleBulkImportAssessments = (importedTests: ScheduledTest[]) => {
    setTests((prev) => [...prev, ...importedTests]);
    setShowBulkUploadAssessments(false);
    toast({
      title: "Assessments Created",
      description: `Successfully imported ${importedTests.length} assessments into the system.`,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <PageHeader
        title={role === "admin" ? "Proctored Examination Manager" : "Assessment & Test Creator"}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setShowBulkUploadAssessments((prev) => !prev)}
              className="h-[44px] gap-2 px-4 rounded-xl border-[#E5E7EB] dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#27272A] text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-sm"
              title="Bulk create assessments via Excel / CSV"
            >
              <UploadCloud className="h-4 w-4 text-[#2563EB]" /> Bulk Upload Assessments
            </Button>
            <Button
              onClick={exportAllTestsCsv}
              variant="outline"
              className="h-[44px] border-[#E5E7EB] dark:border-[#27272A] font-bold text-xs gap-2 px-4 rounded-xl shadow-xs"
            >
              <Download className="h-4 w-4" /> Export All (CSV)
            </Button>
            <Button onClick={() => setViewState("wizard")} className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2 px-5 rounded-xl shrink-0 shadow-md shadow-[#2563EB]/20">
              <Plus className="h-4 w-4" /> Create New Exam
            </Button>
          </div>
        }
      />

      {/* BULK UPLOAD ASSESSMENTS POPUP MODAL */}
      {showBulkUploadAssessments && (
        <BulkUploadModal
          isOpen={true}
          inline={false}
          onClose={() => setShowBulkUploadAssessments(false)}
          moduleType="assessment_track"
          moduleTitle="Assessments & Exams Catalog"
          onImport={handleBulkImportAssessments}
        />
      )}

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

      {/* Bulk Delete Toolbar for Assessments */}
      {selectedTestIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-red-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedTestIds.length}
            </span>
            <span className="text-xs font-bold text-red-800 dark:text-red-300">
              {selectedTestIds.length === 1 ? "1 assessment selected" : `${selectedTestIds.length} assessments selected`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedTestIds([])}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 underline cursor-pointer ml-1"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkDeleteTests(selectedTestIds)}
              className="h-8 px-3.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
            >
              <span>Delete Selected ({selectedTestIds.length})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Exams Table */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((t) => selectedTestIds.includes(t.id))}
                    onChange={() => toggleSelectAllTests(filtered)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                    title={filtered.length > 0 && filtered.every((t) => selectedTestIds.includes(t.id)) ? "Deselect all assessments" : "Select all assessments"}
                  />
                </th>
                <th className="p-4 pl-2">Assessment Title</th>
                <th className="p-4">Schedule & Timing</th>
                <th className="p-4">Assigned Batches</th>
                <th className="p-4">Questions & Marks</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((t) => {
                const isSelected = selectedTestIds.includes(t.id);
                return (
                <tr
                  key={t.id}
                  className={cn(
                    "transition-colors group",
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/25 border-l-2 border-blue-600"
                      : "hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/60"
                  )}
                >
                  <td className="p-4 pl-5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectTest(t.id)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      title={`Select ${t.title}`}
                    />
                  </td>
                  <td className="p-4 pl-2 space-y-0.5">
                    <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{t.title}</p>
                    <p className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-[#16A34A]" /> {t.proctoringFlags?.length || 0} Security Rules Active
                    </p>
                  </td>

                  <td className="p-4 space-y-1">
                    <div>
                      {t.scheduleMode === "open" || (!t.date && !t.startDate) ? (
                        <Badge variant="outline" className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30 text-[10px] font-bold">
                          On-Demand (Anytime)
                        </Badge>
                      ) : t.scheduleMode === "window" || (t.startDate || t.endDate) ? (
                        <Badge variant="outline" className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 text-[10px] font-bold">
                          {t.startDate || "Any"} - {t.endDate || "Open"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/30 text-[10px] font-bold">
                          {t.date} {t.startTime ? `• ${t.startTime}` : ""}
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
                        className="h-8 text-[11px] font-bold rounded-lg border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-zinc-800 gap-1.5 shadow-2xs cursor-pointer transition-all"
                        title="Assign or reassign batches and manage candidate retakes"
                      >
                        <RefreshCw className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span>{t.assignedBatches && t.assignedBatches.length > 0 ? "Reassign" : "Assign"}</span>
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => { setSelectedTest(t); setViewState("exam-dashboard"); }}
                        className="h-8 text-[11px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-lg shadow-xs"
                      >
                        Manage
                      </Button>
                      <Button onClick={() => handleDeleteTest(t.id, t.title)} variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-semibold text-[#DC2626] hover:bg-red-500/10 rounded-lg transition-colors">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {renderAssignmentModal()}
      {renderReassignModal()}
      {renderEditExamSettingsModal()}
      {renderAddSectionModal()}
      {renderEditSectionModal()}

      {/* MNC-Level Enterprise Delete Confirmation Dialog (Pure Text, No Icons) */}
      <Dialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => {
          if (!open && !isDeletingConfirm) setDeleteConfirmation(null);
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/50">
                Critical Action
              </span>
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {deleteConfirmation?.title}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              {deleteConfirmation?.description}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingConfirm}
              onClick={() => setDeleteConfirmation(null)}
              className="h-8.5 px-4 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeletingConfirm}
              onClick={async () => {
                if (!deleteConfirmation) return;
                setIsDeletingConfirm(true);
                try {
                  await deleteConfirmation.onConfirm();
                } finally {
                  setIsDeletingConfirm(false);
                  setDeleteConfirmation(null);
                }
              }}
              className="h-8.5 px-4 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs transition-all"
            >
              {isDeletingConfirm ? "Deleting..." : deleteConfirmation?.confirmText || "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
