"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  Send, Code2, ClipboardList, Layers, Play, Check, Award,
  RotateCcw, Sparkles, Terminal, FileCode, CheckCheck, XCircle, AlertCircle,
  HelpCircle, ArrowRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Edit3, Copy, Search, CheckCircle, ExternalLink, ArrowUpRight, ListFilter, CornerDownRight, FileText, AlertTriangle, ArrowLeft, Database, X, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CodeEditor } from "@/components/coding/code-editor";
import { formatSourceCode } from "@/lib/compiler/code-formatter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CodingLanguage, CodingProblem, TestCase, CodingSubmission } from "@/types/coding";

export interface PracticeQuestion {
  id: string;
  type: "single_choice" | "multiple_choice" | "coding" | "mcq";
  section?: "mcq" | "coding" | string;
  sectionTitle?: string;
  sectionIndex?: number;
  title: string;
  text: string;
  marks: number;
  order?: number;
  difficulty?: "easy" | "medium" | "hard" | string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  allowedLanguages?: string[];
  options?: { id: string; text: string; isCorrect?: boolean }[];
  starterCode?: Record<string, string>;
  testCases?: { id?: string; input: string; expected_output?: string; expectedOutput?: string; is_hidden?: boolean }[];
  explanation?: string;
}

import { useRouter } from "next/navigation";

interface PracticeRunnerProps {
  module: {
    id: string;
    title: string;
    type: "mcq" | "coding" | "mixed";
    assignedBy: string;
    durationMinutes: number;
    totalMarks: number;
    passingMarks: number;
    maxAttempts?: number;
    allowResume?: boolean;
    scoreRetentionPolicy?: string;
    allowReviewBeforeSubmit?: boolean;
    languageMode?: "multi" | "single";
    allowedLanguages?: string[];
    defaultLanguage?: string;
    proctoring?: {
      fullscreenLock?: boolean;
      copyPasteRestricted?: boolean;
    };
  };
  questions: PracticeQuestion[];
  extraHeaderContent?: React.ReactNode;
  onBack?: () => void;
  onSubmit: (
    answers: Record<string, any>,
    metadata?: { timeSpentSeconds: number; completedAt: string; timeLeft: number; submissionResults?: Record<string, any> }
  ) => Promise<void>;
  isAssessment?: boolean;
}

export function PracticeRunnerEngine({
  module,
  questions,
  extraHeaderContent,
  onBack,
  onSubmit,
  isAssessment = true,
}: PracticeRunnerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const storageKey = module?.id ? `lms_practice_session_${module.id}` : "lms_practice_session_default";

  const isRetakeMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("retake") === "true";

  // If the session was already submitted or in retake mode, don't restore any state from localStorage
  const isAlreadySubmitted =
    !isRetakeMode &&
    typeof window !== "undefined" &&
    localStorage.getItem(`${storageKey}_submitted`) === "true";

  const shouldRestoreFromStorage = !isRetakeMode && !isAlreadySubmitted && Boolean(module?.id);

  // Unified single index across all questions (MCQ, MSQ, Coding)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    if (shouldRestoreFromStorage && typeof window !== "undefined" && module?.id) {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.currentQuestionIndex === "number") {
            return Math.min(Math.max(0, parsed.currentQuestionIndex), Math.max(0, questions.length - 1));
          }
          if (parsed.activeSection === "coding") {
            const mcqCount = questions.filter(q => q.type !== "coding" && q.section !== "coding").length;
            return Math.min(Math.max(0, questions.length - 1), mcqCount + (parsed.codingIndex || 0));
          }
          if (typeof parsed.mcqIndex === "number") {
            return Math.min(Math.max(0, questions.length - 1), parsed.mcqIndex);
          }
        }
      } catch {}
    }
    return 0;
  });

  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const isCurrentCoding = currentQuestion?.type === "coding";
  const activeSection = isCurrentCoding ? ("coding" as const) : ("mcq" as const);
  const mcqIndex = currentQuestionIndex;
  const codingIndex = currentQuestionIndex;
  const currentSectionQuestions = questions;
  const currentSectionIndex = currentQuestionIndex;

  // Description panel and Palette panel collapsible toggles (same pattern as Coding Practice page)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  // Separate questions by type for backwards-compatibility stats
  const mcqQuestions = useMemo(() => 
    questions.filter(q => q.type === "mcq" || q.type === "single_choice" || q.type === "multiple_choice" || q.section === "mcq"),
    [questions]
  );

  const codingQuestions = useMemo(() => 
    questions.filter(q => q.type === "coding" || q.section === "coding"),
    [questions]
  );

  const hasBothSections = mcqQuestions.length > 0 && codingQuestions.length > 0;

  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    if (shouldRestoreFromStorage && typeof window !== "undefined" && module?.id) {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.answers) return parsed.answers;
        }
      } catch {}
    }
    return {};
  });

  const [codeAnswers, setCodeAnswers] = useState<Record<string, { code: string; language: string }>>(() => {
    if (shouldRestoreFromStorage && typeof window !== "undefined" && module?.id) {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.codeAnswers) return parsed.codeAnswers;
        }
      } catch {}
    }
    return {};
  });

  const [submissionResults, setSubmissionResults] = useState<Record<string, CodingSubmission | null>>(() => {
    if (shouldRestoreFromStorage && typeof window !== "undefined" && module?.id) {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.submissionResults) return parsed.submissionResults;
        }
      } catch {}
    }
    return {};
  });

  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() => {
    if (shouldRestoreFromStorage && typeof window !== "undefined" && module?.id) {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.markedForReview) return new Set(parsed.markedForReview);
        }
      } catch {}
    }
    return new Set();
  });

  const [sessionStartTime] = useState<number>(() => {
    if (shouldRestoreFromStorage && typeof window !== "undefined" && module?.id) {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.sessionStartTime) return parsed.sessionStartTime;
        }
      } catch {}
    }
    return Date.now();
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const defaultSecs = (module?.durationMinutes || 0) * 60;
    if (shouldRestoreFromStorage && typeof window !== "undefined" && module?.id) {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Restore saved time remaining — cap at full duration, min 0
          if (typeof parsed.timeLeft === "number" && parsed.timeLeft > 0) {
            // Adjust for time elapsed since last save (tab was closed/refreshed)
            if (parsed.savedAt) {
              const elapsed = Math.floor((Date.now() - new Date(parsed.savedAt).getTime()) / 1000);
              const adjusted = parsed.timeLeft - elapsed;
              return Math.max(0, Math.min(adjusted, (module?.durationMinutes || 60) * 60));
            }
            return Math.min(parsed.timeLeft, (module?.durationMinutes || 60) * 60);
          }
        }
      } catch {}
    }
    return defaultSecs;
  });
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "mcq" | "coding" | "marked" | "unanswered">("all");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [showProblemStatement, setShowProblemStatement] = useState(true);
  const [showQuestionPalette, setShowQuestionPalette] = useState(true);
  const [mobileTab, setMobileTab] = useState<"problem" | "editor" | "palette">("editor");
  const [showPaletteDrawer, setShowPaletteDrawer] = useState(false);

  const [isFinalSubmitting, setIsFinalSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => isAlreadySubmitted);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const timeLeftRef = React.useRef<number>(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const handleInitiateSubmit = () => {
    // Stop/pause timer immediately when user opens review/submit
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (module?.allowReviewBeforeSubmit !== false) {
      setShowReviewModal(true);
    } else {
      setShowSubmitDialog(true);
    }
  };

  // Restore progress from cloud if switching devices
  useEffect(() => {
    if (isRetakeMode || isSubmitted || isAlreadySubmitted) return;
    const local = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (!local) {
      fetch(`/api/student/drafts?key=${storageKey}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.draft?.data) {
            const saved = data.draft.data;
            if (saved.answers && Object.keys(saved.answers).length > 0) setAnswers(saved.answers);
            if (saved.codeAnswers && Object.keys(saved.codeAnswers).length > 0) setCodeAnswers(saved.codeAnswers);
            if (saved.submissionResults) setSubmissionResults(saved.submissionResults);
            if (saved.markedForReview) setMarkedForReview(new Set(saved.markedForReview));
            if (typeof saved.timeLeft === "number" && saved.timeLeft > 0) setTimeLeft(saved.timeLeft);
            if (typeof saved.currentQuestionIndex === "number") setCurrentQuestionIndex(saved.currentQuestionIndex);
            try {
              localStorage.setItem(storageKey, JSON.stringify(saved));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [storageKey, isSubmitted, isAlreadySubmitted]);

  // Auto-persist all progress to localStorage and cloud database
  useEffect(() => {
    if (typeof window === "undefined" || isSubmitted || isAlreadySubmitted) return;
    const dataToSave = {
      answers,
      codeAnswers,
      submissionResults,
      markedForReview: Array.from(markedForReview),
      currentQuestionIndex,
      activeSection,
      mcqIndex: currentQuestionIndex,
      codingIndex: currentQuestionIndex,
      timeLeft,
      sessionStartTime,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn("Failed to persist practice progress:", e);
    }

    const timer = setTimeout(() => {
      fetch("/api/student/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: storageKey,
          data: dataToSave,
        }),
      }).catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, [answers, codeAnswers, submissionResults, markedForReview, currentQuestionIndex, activeSection, timeLeft, sessionStartTime, storageKey, isSubmitted, isAlreadySubmitted]);

  const handleFinalSubmit = useCallback(async () => {
    if (isFinalSubmitting) return;
    setIsFinalSubmitting(true);

    // 1. Immediately halt and clear the countdown timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const completedAt = new Date().toISOString();
    const finalRemainingTime = timeLeftRef.current;
    
    // Compute elapsed time accurately
    const elapsedFromStart = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 1000));
    const durationMinutes = module?.durationMinutes || 0;
    const timeSpentSeconds = durationMinutes > 0
      ? Math.max(1, (durationMinutes * 60) - finalRemainingTime)
      : elapsedFromStart;

    try {
      await onSubmit(
        { ...answers, ...codeAnswers },
        { timeSpentSeconds, completedAt, timeLeft: finalRemainingTime, submissionResults }
      );
      setIsSubmitted(true);
      setShowSubmitDialog(false);
      setShowReviewModal(false);
    } catch (err) {
      console.error("Final submit error:", err);
      setIsFinalSubmitting(false);
    } finally {
      // Always clear session after submit — prevents refresh from restoring the editor
      try {
        localStorage.removeItem(storageKey);
        // Also set a submitted marker so we can detect this state
        localStorage.setItem(`${storageKey}_submitted`, "true");
        window.dispatchEvent(new Event("storage"));
      } catch {}
    }
  }, [isFinalSubmitting, answers, codeAnswers, onSubmit, storageKey, module?.durationMinutes, sessionStartTime, submissionResults]);

  const isUntimed = !module?.durationMinutes || (module?.durationMinutes ?? 0) <= 0;

  // Countdown Timer — stops immediately when submitted, untimed, completed, or reviewing submission
  useEffect(() => {
    if (isSubmitted || isAlreadySubmitted || isUntimed || showReviewModal || showSubmitDialog) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSubmitted, isAlreadySubmitted, isUntimed, showReviewModal, showSubmitDialog, handleFinalSubmit]);

  // Anti-Cheating: Plagiarism & Clipboard Lock
  useEffect(() => {
    if (!module?.proctoring?.copyPasteRestricted) return;

    const preventClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: "Plagiarism Restriction",
        description: "Copying, cutting, and pasting are disabled for this practice module.",
        variant: "destructive",
      });
    };

    window.addEventListener("copy", preventClipboard);
    window.addEventListener("cut", preventClipboard);
    window.addEventListener("paste", preventClipboard);

    return () => {
      window.removeEventListener("copy", preventClipboard);
      window.removeEventListener("cut", preventClipboard);
      window.removeEventListener("paste", preventClipboard);
    };
  }, [module?.proctoring?.copyPasteRestricted, toast]);

  const handleSingleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  };

  const handleMultipleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) ?? [];
      const isAlreadySelected = current.includes(optionId);
      const updated = isAlreadySelected
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleCodeChange = useCallback((code: string, language: CodingLanguage) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    setCodeAnswers((prev) => ({
      ...prev,
      [qId]: { code, language },
    }));
    setAnswers((prev) => ({
      ...prev,
      [qId]: { code, language },
    }));
  }, [currentQuestion]);

  const handleCodingSubmit = async (code: string, language: CodingLanguage) => {
    if (!currentQuestion) return;
    setIsSubmittingCode(true);

    // 1. Record code answer in state
    setCodeAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { code, language },
    }));
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { code, language },
    }));

    // 2. Submit to /api/code/submit for automated evaluation
    try {
      const res = await fetch("/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: currentQuestion.id,
          language,
          code,
          test_cases: activeCodingProblem.test_cases || []
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Submission failed");
      }

      const submission: CodingSubmission = await res.json();
      setSubmissionResults((prev) => ({
        ...prev,
        [currentQuestion.id]: submission,
      }));

      // Notify Activity Heatmap & listeners that a verified submission was completed
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("student-activity-updated", { detail: submission }));
        } catch (eventErr) {
          console.warn("Event dispatch notice:", eventErr);
        }
      }

      const isAccepted = submission.status === "accepted";
      toast({
        title: isAccepted ? "All Test Cases Passed" : "Submission Evaluated",
        description: `Passed ${submission.passed_test_cases} / ${submission.total_test_cases} test cases (${submission.status.replace("_", " ").toUpperCase()}).`,
        variant: isAccepted ? "default" : "destructive",
      });
    } catch (err: any) {
      console.error("Code submission error:", err);
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit code.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const toggleMarkForReview = (qId: string) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const isMultiSelectQuestion = (q: PracticeQuestion) => {
    if (q.type === "multiple_choice" || (q as any).questionType === "multiple") return true;
    const correctCount = (q.options || []).filter(o => o.isCorrect).length;
    return correctCount > 1;
  };

  const isOptionSelected = (questionId: string, optionId: string) => {
    const ans = answers[questionId];
    if (!ans) return false;
    if (Array.isArray(ans)) return ans.includes(optionId);
    if (typeof ans === "string") return ans === optionId;
    return false;
  };

  const handleAnswerSelect = (question: PracticeQuestion, optionId: string) => {
    const isMulti = isMultiSelectQuestion(question);
    setAnswers((prev) => {
      const existing = prev[question.id];
      if (isMulti) {
        const currentList: string[] = Array.isArray(existing)
          ? existing
          : typeof existing === "string" && existing
          ? [existing]
          : [];
        const isAlreadySelected = currentList.includes(optionId);
        const updatedList = isAlreadySelected
          ? currentList.filter((id) => id !== optionId)
          : [...currentList, optionId];
        return {
          ...prev,
          [question.id]: updatedList,
        };
      } else {
        // Single choice: select this option as a single-element array for clean consistency
        return {
          ...prev,
          [question.id]: [optionId],
        };
      }
    });
  };

  const handleClearAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const isQuestionAnswered = (questionId: string) => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return false;
    if (q.type === "coding") {
      return Boolean(submissionResults[questionId]);
    }
    const ans = answers[questionId];
    if (!ans) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === "string") return ans.trim().length > 0;
    return true;
  };

  const isQuestionAttempted = (questionId: string) => {
    if (isQuestionAnswered(questionId)) return false;
    const q = questions.find((item) => item.id === questionId);
    if (!q) return false;
    if (q.type === "coding") {
      const cqAns = codeAnswers[questionId];
      if (cqAns?.code && cqAns.code.trim().length > 0) return true;
      const rawAns = answers[questionId];
      if (rawAns && typeof rawAns === "object" && rawAns.code && rawAns.code.trim().length > 0) return true;
    }
    return false;
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(q.id)).length;
  const draftCount = questions.filter((q) => isQuestionAttempted(q.id)).length;
  const markedCount = markedForReview.size;
  const totalQuestions = questions.length;
  const notAttemptedCount = Math.max(0, totalQuestions - answeredCount - draftCount);

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleNextClick = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setMobileTab("problem");
    }
  };

  const handlePrevClick = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setMobileTab("problem");
    }
  };

  const handleSelectQuestion = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrentQuestionIndex(idx);
      setShowPaletteDrawer(false);
      setMobileTab(questions[idx]?.type === "coding" ? "editor" : "problem");
    }
  };

  // Group questions by section configured by Admin/Trainer (dynamic, no hardcoded section names)
  const sectionGroups = useMemo(() => {
    const groups: { name: string; questions: { question: PracticeQuestion; globalIndex: number }[] }[] = [];
    const map = new Map<string, { question: PracticeQuestion; globalIndex: number }[]>();

    questions.forEach((q, idx) => {
      let secName = (q.sectionTitle || q.section || "").trim();
      if (q.type === "coding") {
        if (!secName || (!secName.toLowerCase().includes("code") && !secName.toLowerCase().includes("programming"))) {
          secName = "Coding Challenges";
        }
      } else {
        if (secName.toLowerCase().includes("code") || secName.toLowerCase().includes("programming")) {
          secName = "Multiple Choice Questions";
        } else if (!secName) {
          secName = "Multiple Choice Questions";
        }
      }

      if (!map.has(secName)) {
        map.set(secName, []);
        groups.push({ name: secName, questions: map.get(secName)! });
      }
      map.get(secName)!.push({ question: q, globalIndex: idx });
    });

    return groups;
  }, [questions]);

  // Convert current question to CodingProblem for the Jobe CodeEditor
  const activeCodingProblem: CodingProblem = useMemo(() => {
    const now = new Date().toISOString();
    if (!currentQuestion) {
      return {
        id: "coding_default",
        title: "Coding Problem",
        slug: "coding-problem",
        description: "Write code to solve the challenge.",
        difficulty: "easy",
        created_at: now,
        updated_at: now,
        templates: { java: "// Write your code here\n" },
        test_cases: []
      };
    }

    const testCases: TestCase[] = (currentQuestion.testCases || []).map((tc, idx) => ({
      id: tc.id || `tc_${idx}`,
      input: tc.input || "",
      expected_output: tc.expected_output || tc.expectedOutput || "",
      is_hidden: Boolean(tc.is_hidden)
    }));

    const sampleTc = testCases.find(tc => !tc.is_hidden) || testCases[0];

    const effectiveAllowed = (currentQuestion as any).allowedLanguages ||
      (currentQuestion as any).allowed_languages ||
      module?.allowedLanguages ||
      (module?.languageMode === "single" && module?.defaultLanguage ? [module.defaultLanguage] : undefined);

    return {
      id: currentQuestion.id,
      title: currentQuestion.title || "Coding Challenge",
      slug: (currentQuestion.title || "coding-challenge").toLowerCase().replace(/\s+/g, "-"),
      description: currentQuestion.text || "",
      difficulty: (currentQuestion.difficulty as any) || "easy",
      constraints: currentQuestion.constraints,
      input_format: currentQuestion.inputFormat,
      output_format: currentQuestion.outputFormat,
      sample_input: sampleTc?.input || "",
      sample_output: sampleTc?.expected_output || "",
      created_at: now,
      updated_at: now,
      allowed_languages: effectiveAllowed,
      allowedLanguages: effectiveAllowed,
      templates: (() => {
        const rawTemplates = typeof currentQuestion.starterCode === "string"
          ? { java: currentQuestion.starterCode }
          : (currentQuestion.starterCode || (currentQuestion as any).templates || {
              java: "// Write your Java solution here\n",
              python: "# Write your Python solution here\n",
              cpp: "// Write your C++ solution here\n",
              javascript: "// Write your JavaScript solution here\n",
              c: "/* Write your C solution here */\n"
            });
        const allowedList = effectiveAllowed;
        const formatted: Record<string, string> = {};
        for (const [lang, tmpl] of Object.entries(rawTemplates)) {
          if (!allowedList || !Array.isArray(allowedList) || allowedList.length === 0 || allowedList.includes(lang)) {
            formatted[lang] = formatSourceCode(tmpl as string, lang);
          }
        }
        return Object.keys(formatted).length > 0 ? formatted : { java: "// Write your code here\n" };
      })(),
      test_cases: testCases,
      reveal_hidden_testcases: (currentQuestion as any).reveal_hidden_testcases !== false,
      explanation: currentQuestion.explanation || (currentQuestion as any).explanation,
    };
  }, [currentQuestion]);

  const renderProblemStatementContent = (canHide = false) => (
    <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden h-full flex flex-col min-w-0">
      <CardHeader className="p-4 sm:p-5 pb-3.5 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {(currentQuestion?.sectionTitle || currentQuestion?.section) && (
              <Badge variant="outline" className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800">
                {currentQuestion.sectionTitle || currentQuestion.section}
              </Badge>
            )}
            <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
              Problem {codingIndex + 1} of {codingQuestions.length}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full",
              activeCodingProblem.difficulty === "easy" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" :
              activeCodingProblem.difficulty === "hard" ? "border-rose-500/30 text-rose-600 bg-rose-500/10" :
              "border-amber-500/30 text-amber-600 bg-amber-500/10"
            )}>
              {activeCodingProblem.difficulty}
            </Badge>
            {currentQuestion?.marks && (
              <Badge variant="outline" className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border-blue-500/30 text-blue-600 bg-blue-500/10">
                +{currentQuestion.marks} Marks
              </Badge>
            )}
          </div>
          {canHide && (
            <button
              type="button"
              onClick={() => setShowProblemStatement(false)}
              className="h-7 w-7 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all shrink-0"
              title="Hide Problem Panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-2 leading-snug">
          {activeCodingProblem.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4 text-xs leading-relaxed flex-1 overflow-y-auto min-h-0">
        <div className="space-y-2">
          <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">Problem Statement</strong>
          <p className="text-slate-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed text-sm">
            {activeCodingProblem.description}
          </p>
        </div>

        {/* SQL Mode 1: Provided Database Schema & Seed Data Inspector */}
        {activeCodingProblem.schema_sql && (
          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-[#2563EB] font-bold block text-xs flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Provided Database Schema (DDL)
              </strong>
              <Badge variant="outline" className="text-[9px] uppercase font-bold border-blue-300 text-[#2563EB]">
                {activeCodingProblem.sql_engine || "sqlite"}
              </Badge>
            </div>
            <pre className="text-slate-900 dark:text-zinc-100 font-mono text-[11px] p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {activeCodingProblem.schema_sql}
            </pre>
            {activeCodingProblem.seed_sql && (
              <div className="pt-1.5 space-y-1">
                <strong className="text-slate-500 font-bold block text-[11px]">Sample Data (DML):</strong>
                <pre className="text-slate-600 dark:text-zinc-400 font-mono text-[10px] p-2 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {activeCodingProblem.seed_sql}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeCodingProblem.constraints && (
          <div className="p-3.5 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1">
            <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">Constraints:</strong>
            <code className="text-slate-600 dark:text-zinc-400 font-mono text-xs whitespace-pre-line leading-relaxed">{activeCodingProblem.constraints}</code>
          </div>
        )}

        {activeCodingProblem.input_format && (
          <div className="p-3.5 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1">
            <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">Input Format:</strong>
            <p className="text-slate-600 dark:text-zinc-400 whitespace-pre-line text-xs leading-relaxed">{activeCodingProblem.input_format}</p>
          </div>
        )}

        {activeCodingProblem.output_format && (
          <div className="p-3.5 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1">
            <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">Output Format:</strong>
            <p className="text-slate-600 dark:text-zinc-400 whitespace-pre-line text-xs leading-relaxed">{activeCodingProblem.output_format}</p>
          </div>
        )}

        {/* Sample Test Cases Table */}
        {activeCodingProblem.test_cases && activeCodingProblem.test_cases.length > 0 && (
          <div className="space-y-2 pt-1">
            <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">Sample Test Cases:</strong>
            {activeCodingProblem.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
              <div key={tc.id || idx} className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-800 font-mono text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 font-bold shrink-0">Input:</span>
                  <pre className="text-slate-900 dark:text-zinc-100 font-semibold whitespace-pre-wrap">{tc.input}</pre>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                  <span className="text-slate-500 font-bold shrink-0">Expected:</span>
                  <pre className="text-emerald-600 dark:text-emerald-400 font-semibold whitespace-pre-wrap">{tc.expected_output}</pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Explanation / Editorial Section */}
        {(activeCodingProblem.explanation || (currentQuestion as any)?.explanation) && (
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/25 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-1.5 pt-1">
            <strong className="text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Explanation:
            </strong>
            <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-line text-xs leading-relaxed">
              {activeCodingProblem.explanation || (currentQuestion as any)?.explanation}
            </p>
          </div>
        )}

        {/* Topics / Tags */}
        {Boolean((activeCodingProblem as any).tags || (currentQuestion as any).tags || (currentQuestion as any).topics) && (
          <div className="space-y-1.5 pt-1">
            <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">Topics:</strong>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(((activeCodingProblem as any).tags || (currentQuestion as any).tags || (currentQuestion as any).topics || []) as string[]).map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMobileQuestionNavigation = () => {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#18181B] text-slate-900 dark:text-zinc-100">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] flex items-center justify-center shadow-2xs shrink-0">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">Questions</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] border border-blue-200/80 dark:border-blue-800/50 shrink-0">
                {answeredCount}/{totalQuestions}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 cursor-pointer"
            onClick={() => setShowPaletteDrawer(false)}
            aria-label="Close questions navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Categories Body */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {sectionGroups.map((group, gIdx) => {
            const grpAnswered = group.questions.filter((item) => isQuestionAnswered(item.question.id)).length;
            const isCurrentGroup = group.questions.some((item) => item.globalIndex === currentQuestionIndex);

            return (
              <div
                key={group.name || gIdx}
                className={cn(
                  "space-y-2.5 p-3 rounded-xl border transition-colors",
                  isCurrentGroup
                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
                    : "bg-slate-50/70 dark:bg-zinc-900/40 border-slate-200/60 dark:border-zinc-800/60"
                )}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                  <span className="truncate flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", isCurrentGroup ? "bg-blue-600" : "bg-slate-400")} />
                    {group.name}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
                    {grpAnswered}/{group.questions.length} answered
                  </span>
                </div>
              <div className="grid grid-cols-5 gap-2">
                {group.questions.map(({ question: q, globalIndex }) => {
                  const isActive = globalIndex === currentQuestionIndex;
                  const isMarked = markedForReview.has(q.id);
                  const isAnswered = isQuestionAnswered(q.id);
                  const isDraft = isQuestionAttempted(q.id);

                  let btnStyle = "bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-800 hover:border-blue-400";
                  if (isActive) {
                    btnStyle = "bg-[#2563EB] text-white font-bold ring-2 ring-[#2563EB] ring-offset-1 shadow-xs";
                  } else if (isMarked) {
                    btnStyle = "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 font-bold";
                  } else if (isAnswered) {
                    btnStyle = "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-bold";
                  } else if (isDraft) {
                    btnStyle = "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 font-bold";
                  }

                  return (
                    <button
                      key={q.id || globalIndex}
                      type="button"
                      onClick={() => {
                        handleSelectQuestion(globalIndex);
                        setShowPaletteDrawer(false);
                      }}
                      className={cn(
                        "h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center border cursor-pointer active:scale-95",
                        btnStyle
                      )}
                    >
                      {globalIndex + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

          {/* Legend Summary */}
          <div className="p-3.5 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Answered
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{answeredCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In-Progress / Draft
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {questions.filter((q) => isQuestionAttempted(q.id)).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" /> Not Attempted
              </span>
              <span className="font-bold text-slate-700 dark:text-zinc-300">
                {Math.max(0, totalQuestions - answeredCount - questions.filter((q) => isQuestionAttempted(q.id)).length)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Marked for Review
              </span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{markedForReview.size}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-zinc-200">Total Questions</span>
              <span className="font-bold text-slate-900 dark:text-white">{totalQuestions}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleResetAndRetake = () => {
    if (typeof window !== "undefined") {
      try {
        if (module?.id) {
          localStorage.removeItem(`lms_practice_session_${module.id}`);
          localStorage.removeItem(`lms_practice_session_${module.id}_submitted`);
          localStorage.removeItem(`lms_completed_assessment_${module.id}`);
        }
        localStorage.removeItem("lms_proctoring_violations");
        window.dispatchEvent(new Event("storage"));
      } catch {}
    }
    setIsSubmitted(false);
    setAnswers({});
    setCodeAnswers({});
    setSubmissionResults({});
    setMarkedForReview(new Set());
    const duration = (module?.durationMinutes || 0) * 60;
    setTimeLeft(duration);
    timeLeftRef.current = duration;
  };

  if (isSubmitted || isAlreadySubmitted) {
    return (
      <div className="w-full py-8 space-y-6">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-8 text-center max-w-xl mx-auto shadow-sm space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              {isAssessment ? "Assessment Completed" : "Practice Completed"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Your submission has been recorded. Test completion time is finalized.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = isAssessment ? "/student/assessments" : "/student/practices";
                }
              }}
              className="text-xs font-semibold rounded-xl"
            >
              {isAssessment ? "Back to Assessments" : "Back to Practice"}
            </Button>
            <Button
              size="sm"
              onClick={handleResetAndRetake}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold gap-1.5 rounded-xl shadow-md"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Start Fresh / Retake
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No questions available in this {isAssessment ? "assessment" : "practice"} module.
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-100/70 dark:bg-[#09090B]">
      {/* ── 1. TOP HEADER (Matches Coding Practice Page Reference) ── */}
      <header className="h-12 sm:h-14 bg-white dark:bg-[#18181B] border-b border-slate-200/90 dark:border-zinc-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 select-none z-20">
        {/* Left: ← Back to Assessment / #1. Title [Difficulty] */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-full">
          <button
            type="button"
            onClick={onBack || (() => router.push(isAssessment ? "/student/assessments" : "/student/practices"))}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Back to {isAssessment ? "Assessment" : "Practice"}</span>
            <span className="sm:hidden">Back</span>
          </button>

          <span className="text-slate-300 dark:text-zinc-700 font-medium">/</span>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {(currentQuestion?.sectionTitle || currentQuestion?.section) && (
              <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md shrink-0 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 truncate max-w-[140px]">
                {currentQuestion.sectionTitle || currentQuestion.section}
              </span>
            )}

            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[260px] md:max-w-[360px]">
              #{currentQuestionIndex + 1}. {currentQuestion.title}
            </span>

            <span
              className={cn(
                "px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md shrink-0 border",
                currentQuestion?.type === "coding"
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                  : isMultiSelectQuestion(currentQuestion)
                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
              )}
            >
              {currentQuestion?.type === "coding"
                ? "Coding"
                : isMultiSelectQuestion(currentQuestion)
                ? "Multiple Select"
                : "Single Choice"}
            </span>

            {currentQuestion?.difficulty && (
              <span
                className={cn(
                  "hidden md:inline-flex px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md capitalize shrink-0 border",
                  currentQuestion.difficulty === "easy"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : currentQuestion.difficulty === "hard"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {currentQuestion.difficulty === "easy" ? "Easy" : currentQuestion.difficulty === "hard" ? "Hard" : "Medium"}
              </span>
            )}
          </div>
        </div>

        {/* Right: Proctoring Controls + Timer */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {extraHeaderContent}

          {!isUntimed && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs font-bold text-slate-900 dark:text-white shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>{formatTimerDisplay(timeLeft)}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── 2. MOBILE VIEW SWITCHER (< lg) ── */}
      <div className="lg:hidden bg-white dark:bg-[#18181B] border-b border-slate-200/90 dark:border-zinc-800 px-3 py-2 shrink-0">
        <div className="flex items-center justify-between p-1 bg-slate-100/80 dark:bg-zinc-900 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMobileTab("problem")}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileTab === "problem"
                ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-xs font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Question</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("editor")}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileTab === "editor"
                ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-xs font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            {currentQuestion.type === "coding" ? <Code2 className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
            <span>{currentQuestion.type === "coding" ? "Code Editor" : "Answer"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("palette")}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileTab === "palette"
                ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-xs font-bold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Questions ({answeredCount}/{totalQuestions})</span>
          </button>
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE (DESKTOP 3-COLUMN LAYOUT) ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-2.5 sm:p-3 gap-3 min-h-0">
        {/* ── COLUMN 1: LEFT QUESTION CONTENT PANEL ── */}
        <div className={cn(
          "w-full rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#18181B] shadow-2xs flex flex-col overflow-hidden shrink-0",
          "lg:w-[32%] lg:min-w-[300px] lg:max-w-[440px] lg:h-full",
          isDescriptionOpen ? "lg:flex" : "hidden",
          mobileTab !== "problem" && "hidden lg:flex"
        )}>
          {/* Header */}
          <div className="h-10 border-b border-slate-200 dark:border-zinc-800 px-3.5 flex items-center justify-between shrink-0 bg-white dark:bg-[#18181B] select-none">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
              {currentQuestion.type === "coding" ? "Problem Description" : "Question Statement"}
            </span>
            <button
              type="button"
              onClick={() => setIsDescriptionOpen(false)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Hide Details"
              aria-label="Hide Details"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm select-text">
            {/* Question Header */}
            <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                {(currentQuestion.sectionTitle || currentQuestion.section) ? (
                  <>
                    <span className="text-slate-500 font-semibold">{currentQuestion.sectionTitle || currentQuestion.section} • </span>
                    QUESTION {currentQuestionIndex + 1} OF {totalQuestions}
                  </>
                ) : (
                  `QUESTION ${currentQuestionIndex + 1} OF ${totalQuestions}`
                )}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {currentQuestion.title}
              </h1>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                  {currentQuestion.type === "coding"
                    ? "Coding Challenge"
                    : isMultiSelectQuestion(currentQuestion)
                    ? "Multiple Choice (Checkboxes)"
                    : "Single Choice (Radio)"}
                </span>
                {currentQuestion.marks && (
                  <span className="text-xs text-slate-500 font-semibold">
                    +{currentQuestion.marks} Marks
                  </span>
                )}
                {currentQuestion.difficulty && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-md capitalize border",
                      currentQuestion.difficulty === "easy"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : currentQuestion.difficulty === "hard"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>
            </div>

            {/* Description / Statement */}
            <div className="space-y-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {currentQuestion.type === "coding" ? "Problem Statement" : "Question Details"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {currentQuestion.text || currentQuestion.title}
              </p>
            </div>

            {/* If Coding: Examples, Constraints, Input/Output Format */}
            {currentQuestion.type === "coding" && (
              <>
                {/* Sample Test Cases / Examples */}
                {activeCodingProblem.test_cases && activeCodingProblem.test_cases.filter(tc => !tc.is_hidden).length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Examples
                    </h2>
                    {activeCodingProblem.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
                      <div key={tc.id || idx} className="bg-slate-50/80 dark:bg-zinc-900/60 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                          Example {idx + 1}:
                        </span>
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block">Input:</span>
                          <pre className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 font-mono text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap">
                            {tc.input || "(No input)"}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block">Output:</span>
                          <pre className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 font-mono text-xs text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap">
                            {tc.expected_output || "(No output)"}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {activeCodingProblem.constraints && (
                  <div className="space-y-1.5 pt-1">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Constraints</h2>
                    <div className="p-2.5 bg-slate-50/80 dark:bg-zinc-900/60 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 font-mono whitespace-pre-line leading-relaxed">
                      {activeCodingProblem.constraints}
                    </div>
                  </div>
                )}

                {/* Input Format & Output Format Cards */}
                {(activeCodingProblem.input_format || activeCodingProblem.output_format) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {activeCodingProblem.input_format && (
                      <div className="p-3 bg-slate-50/80 dark:bg-zinc-900/60 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white block">Input Format</span>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{activeCodingProblem.input_format}</p>
                      </div>
                    )}
                    {activeCodingProblem.output_format && (
                      <div className="p-3 bg-slate-50/80 dark:bg-zinc-900/60 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white block">Output Format</span>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">{activeCodingProblem.output_format}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Explanation if present */}
            {currentQuestion.explanation && (
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/25 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-1.5">
                <strong className="text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Explanation
                </strong>
                <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-line text-xs leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collapsed Left Panel Vertical Strip (Desktop) */}
        {!isDescriptionOpen && (
          <div className="hidden lg:flex flex-col items-center py-3 px-1.5 bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-2xs shrink-0 self-stretch">
            <button
              type="button"
              onClick={() => setIsDescriptionOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Show Description"
              aria-label="Show Description"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span
              className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-wider mt-4 select-none cursor-pointer"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              onClick={() => setIsDescriptionOpen(true)}
            >
              Description
            </span>
          </div>
        )}

        {/* ── COLUMN 2: CENTER ANSWER AREA / CODING EDITOR ── */}
        <div className={cn(
          "flex-1 min-w-0 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#18181B] shadow-2xs flex flex-col overflow-hidden min-h-[460px] lg:min-h-0 lg:h-full",
          mobileTab !== "editor" && "hidden lg:flex"
        )}>
          {currentQuestion.type === "coding" ? (
            <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
              <CodeEditor
                key={activeCodingProblem.id}
                problem={activeCodingProblem}
                defaultLanguage={
                  (currentQuestion?.allowedLanguages && currentQuestion.allowedLanguages.length > 0
                    ? (currentQuestion.allowedLanguages[0] as CodingLanguage)
                    : module?.allowedLanguages && module.allowedLanguages.length === 1
                    ? (module.allowedLanguages[0] as CodingLanguage)
                    : module?.defaultLanguage
                    ? (module.defaultLanguage as CodingLanguage)
                    : null) ||
                  (codeAnswers[activeCodingProblem.id]?.language as CodingLanguage) ||
                  "java"
                }
                defaultCode={codeAnswers[activeCodingProblem.id]?.code}
                submissionResult={submissionResults[activeCodingProblem.id]}
                isSubmitting={isSubmittingCode}
                onSubmit={handleCodingSubmit}
                onCodeChange={handleCodeChange}
                showSubmit={true}
                height="100%"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#18181B]">
              {/* Header */}
              <div className="h-10 border-b border-slate-200 dark:border-zinc-800 px-4 flex items-center justify-between shrink-0 bg-white dark:bg-[#18181B] select-none">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {isMultiSelectQuestion(currentQuestion) ? "Options (Select All That Apply)" : "Options (Select One)"}
                  </span>
                  {answers[currentQuestion.id] && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Answer Selected
                    </span>
                  )}
                </div>
                {answers[currentQuestion.id] !== undefined && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearAnswer(currentQuestion.id)}
                    className="h-7 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 rounded-md cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Clear Selection
                  </Button>
                )}
              </div>

              {/* Options Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {(!currentQuestion.options || currentQuestion.options.length === 0) ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                    No options defined for this question.
                  </div>
                ) : (
                  currentQuestion.options.map((option, idx) => {
                    const isMulti = isMultiSelectQuestion(currentQuestion);
                    const isSelected = isOptionSelected(currentQuestion.id, option.id);
                    const letter = String.fromCharCode(65 + idx);

                    return (
                      <button
                        key={option.id || idx}
                        type="button"
                        onClick={() => handleAnswerSelect(currentQuestion, option.id)}
                        className={cn(
                          "w-full p-4 rounded-xl text-left border transition-all duration-150 flex items-center justify-between group text-xs font-medium cursor-pointer gap-3",
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/50 shadow-2xs"
                            : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors shrink-0",
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 group-hover:border-slate-300"
                            )}
                          >
                            {letter}
                          </div>
                          <span className="leading-relaxed break-words text-xs sm:text-sm font-medium">
                            {option.text}
                          </span>
                        </div>

                        {isSelected ? (
                          isMulti ? (
                            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                          )
                        ) : (
                          <div
                            className={cn(
                              "w-5 h-5 border-2 border-slate-300 dark:border-zinc-600 shrink-0 group-hover:border-slate-400",
                              isMulti ? "rounded-md" : "rounded-full"
                            )}
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── COLUMN 3: RIGHT QUESTION PALETTE PANEL ── */}
        {isPaletteOpen ? (
          <div className={cn(
            "w-full rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#18181B] shadow-2xs flex flex-col p-4 shrink-0 overflow-hidden",
            "lg:w-[22%] lg:min-w-[220px] lg:max-w-[280px] lg:h-full lg:sticky lg:top-0",
            mobileTab !== "palette" && "hidden lg:flex"
          )}>
            {/* STATIC PINNED TOP: Header & Stats Legend (Never scrolls) */}
            <div className="shrink-0 space-y-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Questions ({totalQuestions})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPaletteOpen(false)}
                  className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Hide Questions"
                  aria-label="Hide Questions"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Stats Legend */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Answered</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>In Progress</span>
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{draftCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-600 shrink-0" />
                    <span>Not Attempted</span>
                  </span>
                  <span className="font-bold text-slate-500 dark:text-zinc-400">{notAttemptedCount}</span>
                </div>
                {markedCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                      <span>Marked for Review</span>
                    </span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">{markedCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* SCROLLABLE INNER: Question Grid Buttons */}
            <div className="flex-1 overflow-y-auto pt-3 pr-1 space-y-3">
              {sectionGroups.length > 1 ? (
                sectionGroups.map((group, gIdx) => {
                  const grpAnswered = group.questions.filter((item) => isQuestionAnswered(item.question.id)).length;
                  const isCurrentGroup = group.questions.some((item) => item.globalIndex === currentQuestionIndex);

                  return (
                    <div
                      key={gIdx}
                      className={cn(
                        "space-y-2 p-2.5 rounded-xl border transition-colors",
                        isCurrentGroup
                          ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
                          : "bg-slate-50/70 dark:bg-zinc-900/40 border-slate-200/60 dark:border-zinc-800/60"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <span className="truncate flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", isCurrentGroup ? "bg-blue-600" : "bg-slate-400")} />
                          {group.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                          {grpAnswered}/{group.questions.length}
                        </span>
                      </div>
                    <div className="grid grid-cols-5 gap-2">
                      {group.questions.map(({ question: q, globalIndex }) => {
                        const isActive = globalIndex === currentQuestionIndex;
                        const isMarked = markedForReview.has(q.id);
                        const isAnswered = isQuestionAnswered(q.id);
                        const isDraft = isQuestionAttempted(q.id);

                        return (
                          <button
                            key={q.id || globalIndex}
                            type="button"
                            onClick={() => handleSelectQuestion(globalIndex)}
                            className={cn(
                              "h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer border",
                              isActive
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300 font-bold"
                                : isMarked
                                ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 font-bold"
                                : isAnswered
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold"
                                : isDraft
                                ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 font-bold"
                                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                            )}
                            title={q.title}
                          >
                            {globalIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const isActive = idx === currentQuestionIndex;
                    const isMarked = markedForReview.has(q.id);
                    const isAnswered = isQuestionAnswered(q.id);
                    const isDraft = isQuestionAttempted(q.id);

                    return (
                      <button
                        key={q.id || idx}
                        type="button"
                        onClick={() => handleSelectQuestion(idx)}
                        className={cn(
                          "h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer border",
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300 font-bold"
                            : isMarked
                            ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 font-bold"
                            : isAnswered
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold"
                            : isDraft
                            ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 font-bold"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                        )}
                        title={q.title}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center py-3 px-1.5 bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-2xs shrink-0 self-stretch">
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Show Questions"
              aria-label="Show Questions"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-wider mt-4 select-none cursor-pointer"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              onClick={() => setIsPaletteOpen(true)}
            >
              Questions ({totalQuestions})
            </span>
          </div>
        )}
      </div>

      {/* ── 4. BOTTOM NAVIGATION BAR (Matches Practice Page Reference) ── */}
      <footer className="h-12 sm:h-14 bg-white dark:bg-[#18181B] border-t border-slate-200/90 dark:border-zinc-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 shadow-2xs z-20 sticky bottom-0 select-none">
        {/* Left: Previous + Mark for Review */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevClick}
            disabled={currentQuestionIndex === 0}
            className="h-8 px-3 sm:px-4 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 shadow-2xs cursor-pointer disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Previous</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleMarkForReview(currentQuestion.id)}
            className={cn(
              "h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border gap-1.5 transition-colors cursor-pointer",
              markedForReview.has(currentQuestion.id)
                ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300"
                : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
            )}
          >
            <Flag className={cn("w-3.5 h-3.5", markedForReview.has(currentQuestion.id) ? "fill-purple-600 text-purple-600" : "text-slate-400")} />
            <span className="hidden sm:inline">{markedForReview.has(currentQuestion.id) ? "Marked for Review" : "Mark for Review"}</span>
            <span className="sm:hidden">{markedForReview.has(currentQuestion.id) ? "Marked" : "Review"}</span>
          </Button>
        </div>

        {/* Center: Question X / Total */}
        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
          {currentQuestionIndex + 1} / {totalQuestions}
        </span>

        {/* Right: Next + Review & Submit */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleNextClick}
            disabled={currentQuestionIndex >= totalQuestions - 1}
            className="h-8 px-3.5 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-40"
          >
            <span>Next</span>
            <span className="ml-1">→</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleInitiateSubmit}
            className="h-8 px-3.5 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Review &amp; Submit</span>
          </Button>
        </div>
      </footer>

      {/* Slide-over Questions Drawer Modal */}
      {showPaletteDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in-0 duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPaletteDrawer(false);
          }}
        >
          <div className="w-[310px] sm:w-[350px] max-w-[88vw] h-full bg-white dark:bg-[#18181B] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {renderMobileQuestionNavigation()}
          </div>
        </div>
      )}



      {/* Full-Page Comprehensive Answer Review & Code / Test Case Verification Dashboard */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] dark:bg-[#09090B] flex flex-col h-screen w-screen overflow-y-auto animate-in fade-in-0 duration-200">
          <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Top Navigation Back Button */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReviewModal(false)}
                className="h-8 px-4 text-xs font-semibold gap-2 border-slate-200 dark:border-zinc-800 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 shadow-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Practice
              </Button>
            </div>

            {/* Overview Card */}
            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-xs overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 pb-2">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <span className="inline-block bg-blue-50 text-[#2563EB] border border-blue-200/70 text-xs font-semibold px-3 py-1 rounded-full">
                      Submission Review
                    </span>
                    <h1 className="text-xl sm:text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] max-w-4xl break-words">
                      {module.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                      Assigned by <span className="font-semibold text-slate-800 dark:text-slate-200">{module.assignedBy || (module as any).assignedByName || "Instructor"}</span> • {questions.length} Total Questions
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReviewModal(false)}
                      className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-full border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Continue Practice
                    </Button>
                    <Button
                      size="sm"
                      disabled={isFinalSubmitting}
                      onClick={() => {
                        handleFinalSubmit();
                      }}
                      className="h-9 px-5 text-xs font-semibold gap-1.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" /> {isFinalSubmitting ? "Submitting..." : "Confirm & Final Submit"}
                    </Button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">TOTAL QUESTIONS</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">{totalQuestions}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">COMPLETED</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                      {answeredCount} <span className="text-xs font-medium text-slate-400">/ {totalQuestions}</span>
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">CODING SOLVED</p>
                    <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {codingQuestions.filter(cq => isQuestionAnswered(cq.id)).length} <span className="text-xs font-medium text-slate-400">/ {codingQuestions.length}</span>
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC]/70 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">TIME REMAINING</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono">
                      {isUntimed ? "Unlimited" : formatTimerDisplay(timeLeft)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Question Review Section Header & Filters */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Question Review & Answers ({questions.length})
                </h2>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setReviewFilter("all")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                      reviewFilter === "all"
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    All ({questions.length})
                  </button>
                  {mcqQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter("mcq")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                        reviewFilter === "mcq"
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      MCQs ({mcqQuestions.length})
                    </button>
                  )}
                  {codingQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter("coding")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                        reviewFilter === "coding"
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      Coding ({codingQuestions.length})
                    </button>
                  )}
                  {markedForReview.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter("marked")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                        reviewFilter === "marked"
                          ? "bg-[#F59E0B] text-white shadow-xs"
                          : "text-[#F59E0B] hover:bg-[#F59E0B]/10"
                      )}
                    >
                      Marked ({markedForReview.size})
                    </button>
                  )}
                  {totalQuestions - answeredCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter("unanswered")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                        reviewFilter === "unanswered"
                          ? "bg-[#EF4444] text-white shadow-xs"
                          : "text-[#EF4444] hover:bg-[#EF4444]/10"
                      )}
                    >
                      Unanswered ({totalQuestions - answeredCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Questions Review List */}
              <div className="space-y-4">
              {questions
                .filter((q) => {
                  const isMcq = q.type !== "coding" && q.section !== "coding";
                  const isCoding = !isMcq;
                  const answered = isQuestionAnswered(q.id);
                  const marked = markedForReview.has(q.id);

                  if (reviewFilter === "mcq") return isMcq;
                  if (reviewFilter === "coding") return isCoding;
                  if (reviewFilter === "marked") return marked;
                  if (reviewFilter === "unanswered") return !answered;
                  return true;
                })
                .map((q, qIndex) => {
                  const isMcq = q.type !== "coding" && q.section !== "coding";
                  const answered = isQuestionAnswered(q.id);
                  const marked = markedForReview.has(q.id);
                  const originalIndex = questions.findIndex(orig => orig.id === q.id);

                  if (isMcq) {
                    const selectedIds = (answers[q.id] as string[]) || [];
                    const mcqIdx = mcqQuestions.findIndex(m => m.id === q.id);

                    return (
                      <Card
                        key={q.id || qIndex}
                        className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden"
                      >
                        <div className="p-6 sm:p-7 space-y-4">
                          {/* Top Row: Section, Marks, Status, Edit */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {originalIndex + 1}
                              </span>
                              <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
                                {q.sectionTitle || q.section || (module as any).mcqSectionTitle || "MCQ Assessment"}
                              </span>
                              {q.marks && (
                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                  +{q.marks} Marks
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {marked && (
                                <span className="bg-amber-50 text-amber-600 border border-amber-200/70 text-xs font-semibold px-3 py-0.5 rounded-full flex items-center gap-1">
                                  <Flag className="h-3 w-3" /> Flagged
                                </span>
                              )}
                              {answered ? (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                                  Answered
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-600 border border-rose-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                                  Unattempted
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const targetIdx = questions.findIndex((item) => item.id === q.id);
                                  setCurrentQuestionIndex(targetIdx >= 0 ? targetIdx : 0);
                                  setShowReviewModal(false);
                                }}
                                className="h-7 px-3 rounded-full border-slate-200 dark:border-zinc-700 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/10 gap-1"
                              >
                                <Edit3 className="h-3 w-3" /> Edit
                              </Button>
                            </div>
                          </div>

                          {/* Question Text */}
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {q.text || q.title}
                          </h3>

                          {/* Options List */}
                          <div className="space-y-2 pt-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              OPTIONS & RESPONSE
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(q.options || []).map((opt, oIdx) => {
                                const isSelected = selectedIds.includes(opt.id);

                                return (
                                  <div
                                    key={opt.id || oIdx}
                                    className={cn(
                                      "p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all",
                                      isSelected
                                        ? "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xs"
                                        : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-slate-600 dark:text-slate-400"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className={cn(
                                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                          isSelected
                                            ? "bg-[#2563EB] text-white"
                                            : "bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400"
                                        )}
                                      >
                                        {String.fromCharCode(65 + oIdx)}
                                      </div>
                                      <span className={cn("truncate text-xs", isSelected ? "text-slate-900 dark:text-white font-bold" : "font-medium text-slate-700 dark:text-slate-300")}>
                                        {opt.text}
                                      </span>
                                    </div>

                                    {isSelected && (
                                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white shrink-0">
                                        Selected
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  } else {
                    // Coding Question Deep Inspection
                    const cqIdx = codingQuestions.findIndex(c => c.id === q.id);
                    const cqCode = codeAnswers[q.id]?.code || "";
                    const cqLang = codeAnswers[q.id]?.language || "java";
                    const submission = submissionResults[q.id];
                    const testCases = q.testCases || [];

                    return (
                      <Card
                        key={q.id || qIndex}
                        className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden"
                      >
                        <div className="p-6 sm:p-7 space-y-4">
                          {/* Coding Header */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {originalIndex + 1}
                              </span>
                              <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
                                {q.sectionTitle || q.section || (module as any).codingSectionTitle || "Coding Assessment"}
                              </span>
                              {q.marks && (
                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                  +{q.marks} Marks
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200/70 uppercase">
                                {cqLang}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {submission ? (
                                submission.status === "accepted" ? (
                                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                                    {submission.passed_test_cases}/{submission.total_test_cases} Passed
                                  </span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-600 border border-rose-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                                    {submission.passed_test_cases}/{submission.total_test_cases} Passed
                                  </span>
                                )
                              ) : answered ? (
                                <span className="bg-blue-50 text-[#2563EB] border border-blue-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                                  Code Saved
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-600 border border-rose-200/70 text-xs font-semibold px-3 py-0.5 rounded-full">
                                  No Code
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const targetIdx = questions.findIndex((item) => item.id === q.id);
                                  setCurrentQuestionIndex(targetIdx >= 0 ? targetIdx : 0);
                                  setShowReviewModal(false);
                                }}
                                className="h-7 px-3 rounded-full border-slate-200 dark:border-zinc-700 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/10 gap-1"
                              >
                                <Edit3 className="h-3 w-3" /> Edit in IDE
                              </Button>
                            </div>
                          </div>

                          {/* Question Text */}
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {q.title || q.text}
                          </h3>

                          {q.text && q.text !== q.title && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {q.text}
                            </p>
                          )}

                          {/* Code Viewer */}
                          <div className="space-y-1.5 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                SUBMITTED CODE ({cqLang.toUpperCase()})
                              </span>
                              {cqCode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cqCode);
                                    setCopiedCodeId(q.id);
                                    setTimeout(() => setCopiedCodeId(null), 2000);
                                  }}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-[#2563EB] transition-colors flex items-center gap-1"
                                >
                                  {copiedCodeId === q.id ? "Copied" : "Copy"}
                                </button>
                              )}
                            </div>

                            {cqCode ? (
                              <div className="rounded-2xl border border-slate-800 bg-[#090D16] p-4 overflow-x-auto max-h-64">
                                <pre className="font-mono text-[12px] leading-relaxed text-slate-200 whitespace-pre">{cqCode}</pre>
                              </div>
                            ) : (
                              <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 bg-slate-50 dark:bg-zinc-900/20">
                                No code written yet. Click &quot;Edit in IDE&quot; to write your solution.
                              </div>
                            )}
                          </div>

                          {/* Test Cases */}
                          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              TEST CASES ({testCases.length} {testCases.length === 1 ? "case" : "cases"})
                            </span>

                            {submission ? (
                              <span
                                className={cn(
                                  "text-xs font-semibold px-2.5 py-0.5 rounded-full",
                                  submission.status === "accepted"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/70"
                                    : "bg-rose-50 text-rose-600 border border-rose-200/70"
                                )}
                              >
                                {submission.passed_test_cases}/{submission.total_test_cases} Passed
                              </span>
                            ) : cqCode ? (
                              <span className="text-xs font-semibold text-slate-400">
                                Not Evaluated
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                No Code
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  }
                })}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Confirmation Bar */}
          <div className="h-16 px-4 sm:px-8 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md flex items-center justify-between shrink-0 shadow-lg z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                {answeredCount} of {totalQuestions} items answered
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                • Ready to submit your attempt?
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                className="h-9 px-4 text-xs font-semibold rounded-full border-slate-200 dark:border-zinc-700 hover:bg-slate-50"
              >
                ← Back to Practice
              </Button>
              <Button
                type="button"
                disabled={isFinalSubmitting}
                onClick={() => {
                  handleFinalSubmit();
                }}
                className="h-9 px-5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-semibold text-xs gap-1.5 rounded-full shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" /> {isFinalSubmitting ? "Submitting..." : "Confirm & Final Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl max-w-lg p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Complete Practice?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Please review your progress before finalizing your assessment. Once submitted, your answers will be evaluated and recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Submission Status Summary Cards */}
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">Answered Questions</span>
              <strong className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{answeredCount} of {totalQuestions}</strong>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">Unanswered Questions</span>
              <strong className="text-lg font-bold text-amber-800 dark:text-amber-300">{Math.max(0, totalQuestions - answeredCount)}</strong>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 block">Coding Submitted</span>
              <strong className="text-lg font-bold text-blue-800 dark:text-blue-300">
                {codingQuestions.filter(q => Boolean(submissionResults[q.id])).length} of {codingQuestions.length}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block">Remaining Time</span>
              <strong className="text-lg font-bold text-slate-800 dark:text-zinc-200 font-mono">
                {!isUntimed ? formatTimerDisplay(timeLeft) : "Untimed"}
              </strong>
            </div>
          </div>

          <AlertDialogFooter className="pt-2 gap-2 sm:gap-2">
            <AlertDialogCancel className="h-10 px-4 text-xs font-semibold rounded-xl">
              Continue Assessment
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isFinalSubmitting}
              onClick={() => handleFinalSubmit()}
              className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              {isFinalSubmitting ? "Submitting..." : "Confirm & Complete Practice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
