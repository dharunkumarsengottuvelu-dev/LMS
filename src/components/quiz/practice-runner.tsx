"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  Send, Code2, ClipboardList, Layers, Play, Check, Award,
  RotateCcw, Sparkles, Terminal, FileCode, CheckCheck, XCircle, AlertCircle,
  HelpCircle, ArrowRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Edit3, Copy, Search, CheckCircle, ExternalLink, ArrowUpRight, ListFilter, CornerDownRight, FileText, AlertTriangle, ArrowLeft, Database, X
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
    proctoring?: {
      fullscreenLock?: boolean;
      copyPasteRestricted?: boolean;
    };
  };
  questions: PracticeQuestion[];
  extraHeaderContent?: React.ReactNode;
  onSubmit: (
    answers: Record<string, any>,
    metadata?: { timeSpentSeconds: number; completedAt: string; timeLeft: number; submissionResults?: Record<string, any> }
  ) => Promise<void>;
}

export function PracticeRunnerEngine({
  module,
  questions,
  extraHeaderContent,
  onSubmit,
}: PracticeRunnerProps) {
  const { toast } = useToast();

  // Separate questions by section
  const mcqQuestions = useMemo(() => 
    questions.filter(q => q.type === "mcq" || q.type === "single_choice" || q.type === "multiple_choice" || q.section === "mcq"),
    [questions]
  );

  const codingQuestions = useMemo(() => 
    questions.filter(q => q.type === "coding" || q.section === "coding"),
    [questions]
  );

  const hasBothSections = mcqQuestions.length > 0 && codingQuestions.length > 0;

  const storageKey = `lms_practice_session_${module.id}`;

  // If the session was already submitted, don't restore any state from localStorage
  const isAlreadySubmitted =
    typeof window !== "undefined" &&
    localStorage.getItem(`${storageKey}_submitted`) === "true";

  // Active section state
  const [activeSection, setActiveSection] = useState<"mcq" | "coding">(() => {
    if (!isAlreadySubmitted && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.activeSection) return parsed.activeSection;
        }
      } catch {}
    }
    return mcqQuestions.length > 0 ? "mcq" : "coding";
  });

  const [mcqIndex, setMcqIndex] = useState<number>(() => {
    if (!isAlreadySubmitted && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.mcqIndex === "number") return parsed.mcqIndex;
        }
      } catch {}
    }
    return 0;
  });

  const [codingIndex, setCodingIndex] = useState<number>(() => {
    if (!isAlreadySubmitted && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`lms_practice_session_${module.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.codingIndex === "number") return parsed.codingIndex;
        }
      } catch {}
    }
    return 0;
  });

  const currentSectionQuestions = activeSection === "mcq" ? mcqQuestions : codingQuestions;
  const currentSectionIndex = activeSection === "mcq" ? mcqIndex : codingIndex;

  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    if (!isAlreadySubmitted && typeof window !== "undefined") {
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
    if (!isAlreadySubmitted && typeof window !== "undefined") {
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
    if (!isAlreadySubmitted && typeof window !== "undefined") {
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
    if (!isAlreadySubmitted && typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
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
    if (!isAlreadySubmitted && typeof window !== "undefined") {
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
              return Math.max(0, Math.min(adjusted, module.durationMinutes * 60));
            }
            return Math.min(parsed.timeLeft, module.durationMinutes * 60);
          }
        }
      } catch {}
    }
    return module.durationMinutes * 60;
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

  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => isAlreadySubmitted);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const timeLeftRef = React.useRef<number>(timeLeft);
  timeLeftRef.current = timeLeft;

  const handleInitiateSubmit = () => {
    // Stop/pause timer immediately when user opens review/submit
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (module.allowReviewBeforeSubmit !== false) {
      setShowReviewModal(true);
    } else {
      setShowSubmitDialog(true);
    }
  };

  // Restore progress from cloud if switching devices
  useEffect(() => {
    if (isSubmitted || isAlreadySubmitted) return;
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
            if (saved.activeSection) setActiveSection(saved.activeSection);
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
      activeSection,
      mcqIndex,
      codingIndex,
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
  }, [answers, codeAnswers, submissionResults, markedForReview, activeSection, mcqIndex, codingIndex, timeLeft, sessionStartTime, storageKey, isSubmitted, isAlreadySubmitted]);

  const currentQuestion = currentSectionQuestions[currentSectionIndex] || questions[0];

  const handleFinalSubmit = useCallback(async () => {
    // 1. Immediately halt and clear the countdown timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSubmitted(true);
    setShowSubmitDialog(false);
    setShowReviewModal(false);

    const completedAt = new Date().toISOString();
    const finalRemainingTime = timeLeftRef.current;
    
    // Compute elapsed time accurately
    const elapsedFromStart = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 1000));
    const timeSpentSeconds = module.durationMinutes > 0
      ? Math.max(1, (module.durationMinutes * 60) - finalRemainingTime)
      : elapsedFromStart;

    try {
      await onSubmit(
        { ...answers, ...codeAnswers },
        { timeSpentSeconds, completedAt, timeLeft: finalRemainingTime, submissionResults }
      );
    } finally {
      // Always clear session after submit — prevents refresh from restoring the editor
      try {
        localStorage.removeItem(storageKey);
        // Also set a submitted marker so we can detect this state
        localStorage.setItem(`${storageKey}_submitted`, "true");
      } catch {}
    }
  }, [answers, codeAnswers, onSubmit, storageKey, module.durationMinutes, sessionStartTime, submissionResults]);

  const isUntimed = !module.durationMinutes || module.durationMinutes <= 0;

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
    if (!module.proctoring?.copyPasteRestricted) return;

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
  }, [module.proctoring?.copyPasteRestricted, toast]);

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
    if (!currentSectionQuestions[currentSectionIndex]) return;
    const qId = currentSectionQuestions[currentSectionIndex].id;
    setCodeAnswers((prev) => ({
      ...prev,
      [qId]: { code, language },
    }));
    setAnswers((prev) => ({
      ...prev,
      [qId]: { code, language },
    }));
  }, [currentSectionQuestions, currentSectionIndex]);

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
    const isCodingQ = codingQuestions.some((cq) => cq.id === questionId);
    if (isCodingQ) {
      // Coding questions turn GREEN only when code is actually submitted!
      return Boolean(submissionResults[questionId]);
    }
    // MCQ questions
    const ans = answers[questionId];
    if (!ans) return false;
    if (Array.isArray(ans) && ans.length > 0) return true;
    if (typeof ans === "string" && ans.trim().length > 0) return true;
    return false;
  };

  const isQuestionAttempted = (questionId: string) => {
    if (isQuestionAnswered(questionId)) return false;
    const isCodingQ = codingQuestions.some((cq) => cq.id === questionId);
    if (isCodingQ) {
      const cqAns = codeAnswers[questionId];
      if (cqAns?.code && cqAns.code.trim().length > 0) return true;
      const rawAns = answers[questionId];
      if (rawAns && typeof rawAns === "object" && rawAns.code && rawAns.code.trim().length > 0) return true;
    }
    return false;
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(q.id)).length;
  const totalQuestions = questions.length;

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleNextClick = () => {
    if (activeSection === "mcq") {
      if (mcqIndex < mcqQuestions.length - 1) {
        setMcqIndex(mcqIndex + 1);
      } else if (codingQuestions.length > 0) {
        setActiveSection("coding");
        setCodingIndex(0);
      }
    } else {
      if (codingIndex < codingQuestions.length - 1) {
        setCodingIndex(codingIndex + 1);
      }
    }
  };

  const handlePrevClick = () => {
    if (activeSection === "coding") {
      if (codingIndex > 0) {
        setCodingIndex(codingIndex - 1);
      } else if (mcqQuestions.length > 0) {
        setActiveSection("mcq");
        setMcqIndex(mcqQuestions.length - 1);
      }
    } else {
      if (mcqIndex > 0) {
        setMcqIndex(mcqIndex - 1);
      }
    }
  };

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
      templates: (() => {
        const rawTemplates = typeof currentQuestion.starterCode === "string"
          ? { java: currentQuestion.starterCode }
          : (currentQuestion.starterCode || {
              java: "// Write your Java solution here\n",
              python: "# Write your Python solution here\n",
              cpp: "// Write your C++ solution here\n",
              javascript: "// Write your JavaScript solution here\n",
              c: "/* Write your C solution here */\n"
            });
        const formatted: Record<string, string> = {};
        for (const [lang, tmpl] of Object.entries(rawTemplates)) {
          formatted[lang] = formatSourceCode(tmpl as string, lang);
        }
        return formatted;
      })(),
      test_cases: testCases,
      reveal_hidden_testcases: (currentQuestion as any).reveal_hidden_testcases !== false
    };
  }, [currentQuestion]);

  const renderProblemStatementContent = (canHide = false) => (
    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden h-full flex flex-col min-w-0">
      <CardHeader className="p-4 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] bg-muted/20 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1">
              Problem {codingIndex + 1} of {codingQuestions.length}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-[10px] font-bold uppercase px-2.5 py-0.5",
              activeCodingProblem.difficulty === "easy" ? "border-green-500/30 text-green-600 bg-green-500/10" :
              activeCodingProblem.difficulty === "hard" ? "border-red-500/30 text-red-600 bg-red-500/10" :
              "border-amber-500/30 text-amber-600 bg-amber-500/10"
            )}>
              {activeCodingProblem.difficulty}
            </Badge>
            {currentQuestion?.marks && (
              <Badge variant="outline" className="text-[10px] font-bold uppercase px-2.5 py-0.5 border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/10">
                +{currentQuestion.marks} Marks
              </Badge>
            )}
          </div>
          {canHide && (
            <button
              type="button"
              onClick={() => setShowProblemStatement(false)}
              className="h-7 w-7 rounded-lg border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-center text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-muted transition-all shrink-0"
              title="Hide Problem Panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        <CardTitle className="text-base font-bold text-foreground mt-2">
          {activeCodingProblem.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs leading-relaxed flex-1 overflow-y-auto min-h-0">
        <div className="space-y-2">
          <strong className="text-foreground text-sm block font-bold">Problem Statement</strong>
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-sm">
            {activeCodingProblem.description}
          </p>
        </div>

        {/* SQL Mode 1: Provided Database Schema & Seed Data Inspector */}
        {activeCodingProblem.schema_sql && (
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-[#2563EB] font-bold block text-xs flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Provided Database Schema (DDL)
              </strong>
              <Badge variant="outline" className="text-[9px] uppercase font-bold border-blue-300 text-[#2563EB]">
                {activeCodingProblem.sql_engine || "sqlite"}
              </Badge>
            </div>
            <pre className="text-foreground font-mono text-[10.5px] p-2 bg-background/80 rounded-lg border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {activeCodingProblem.schema_sql}
            </pre>
            {activeCodingProblem.seed_sql && (
              <div className="pt-1.5 space-y-1">
                <strong className="text-muted-foreground font-bold block text-[11px]">Sample Data (DML):</strong>
                <pre className="text-muted-foreground font-mono text-[10px] p-2 bg-background/80 rounded-lg border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {activeCodingProblem.seed_sql}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeCodingProblem.constraints && (
          <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-1">
            <strong className="text-foreground font-bold block">Constraints:</strong>
            <code className="text-muted-foreground font-mono text-[11px] whitespace-pre-line">{activeCodingProblem.constraints}</code>
          </div>
        )}

        {activeCodingProblem.input_format && (
          <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-1">
            <strong className="text-foreground font-bold block">Input Format:</strong>
            <p className="text-muted-foreground whitespace-pre-line">{activeCodingProblem.input_format}</p>
          </div>
        )}

        {activeCodingProblem.output_format && (
          <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-1">
            <strong className="text-foreground font-bold block">Output Format:</strong>
            <p className="text-muted-foreground whitespace-pre-line">{activeCodingProblem.output_format}</p>
          </div>
        )}

        {/* Sample Test Cases Table */}
        {activeCodingProblem.test_cases && activeCodingProblem.test_cases.length > 0 && (
          <div className="space-y-2 pt-1">
            <strong className="text-foreground font-bold block">Sample Test Cases:</strong>
            {activeCodingProblem.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
              <div key={tc.id || idx} className="p-3 rounded-xl bg-background border border-border/70 font-mono text-[11px] space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-bold shrink-0">Input:</span>
                  <pre className="text-foreground font-semibold whitespace-pre-wrap">{tc.input}</pre>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-border/40">
                  <span className="text-muted-foreground font-bold shrink-0">Expected:</span>
                  <pre className="text-emerald-600 dark:text-emerald-400 font-semibold whitespace-pre-wrap">{tc.expected_output}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPaletteContent = (canHide = false) => (
    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden flex flex-col h-full min-w-0">
      <CardHeader className="p-3 pb-2.5 border-b border-[#E5E7EB] dark:border-[#27272A] shrink-0">
        <CardTitle className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">Questions</span>
            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">
              {answeredCount}/{totalQuestions}
            </Badge>
          </div>
          {canHide && (
            <button
              type="button"
              onClick={() => setShowQuestionPalette(false)}
              className="h-6 w-6 rounded-lg border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-center text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-muted transition-all shrink-0"
              title="Hide Questions"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pb-6 space-y-3 flex-1 overflow-y-auto">
        {mcqQuestions.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 truncate">
              <ClipboardList className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">{mcqQuestions[0]?.sectionTitle || (module as any).mcqSectionTitle || "Multiple Choice"}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">({mcqQuestions.length})</span>
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {mcqQuestions.map((q, idx) => {
                const answered = isQuestionAnswered(q.id);
                const marked = markedForReview.has(q.id);
                const isCurrent = activeSection === "mcq" && mcqIndex === idx;

                let style = "bg-[#F9FAFB] dark:bg-[#09090B] text-[#4B5563] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/50";
                if (isCurrent) style = "ring-2 ring-[#2563EB] bg-[#2563EB] text-white font-bold shadow-xs";
                else if (marked) style = "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B] font-bold";
                else if (answered) style = "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/40 font-bold";

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => {
                      setActiveSection("mcq");
                      setMcqIndex(idx);
                      setShowPaletteDrawer(false);
                    }}
                    className={`h-8 w-full rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${style}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {codingQuestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 truncate">
              <Code2 className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">{codingQuestions[0]?.sectionTitle || (module as any).codingSectionTitle || "Coding Challenges"}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">({codingQuestions.length})</span>
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {codingQuestions.map((cq, idx) => {
                const isSubmitted = Boolean(submissionResults[cq.id]);
                const isAttempted = isQuestionAttempted(cq.id);
                const marked = markedForReview.has(cq.id);
                const isCurrent = activeSection === "coding" && codingIndex === idx;

                let style = "bg-[#F9FAFB] dark:bg-[#09090B] text-[#4B5563] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/50";
                if (isCurrent) {
                  style = "ring-2 ring-[#2563EB] bg-[#2563EB] text-white font-bold shadow-xs";
                } else if (marked) {
                  style = "bg-[#8B5CF6]/15 text-[#7C3AED] dark:text-[#A78BFA] border-[#8B5CF6]/50 font-bold";
                } else if (isSubmitted) {
                  // Only GREEN if user actually clicked Submit!
                  style = "bg-[#16A34A]/15 text-[#16A34A] dark:text-emerald-400 border-[#16A34A]/50 font-bold";
                } else if (isAttempted) {
                  // YELLOW / ORANGE if user wrote code / attempted without submitting!
                  style = "bg-[#F59E0B]/20 text-[#D97706] dark:text-[#F59E0B] border-[#F59E0B]/50 font-bold";
                }

                return (
                  <button
                    key={cq.id || idx}
                    onClick={() => {
                      setActiveSection("coding");
                      setCodingIndex(idx);
                      setShowPaletteDrawer(false);
                      setMobileTab("editor");
                    }}
                    className={`h-8 w-full rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${style}`}
                    title={cq.title}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-2.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-1.5 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#4B5563] dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Submitted
            </span>
            <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{answeredCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#4B5563] dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> In-Progress / Draft
            </span>
            <span className="font-bold text-[#D97706] dark:text-[#F59E0B]">
              {questions.filter((q) => isQuestionAttempted(q.id)).length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#4B5563] dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-[#E5E7EB] dark:bg-zinc-700" /> Total Questions
            </span>
            <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalQuestions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleResetAndRetake = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`lms_practice_session_${module.id}`);
        localStorage.removeItem(`lms_practice_session_${module.id}_submitted`);
        localStorage.removeItem(`lms_completed_assessment_${module.id}`);
        localStorage.removeItem("lms_proctoring_violations");
      } catch {}
    }
    setIsSubmitted(false);
    setAnswers({});
    setCodeAnswers({});
    setSubmissionResults({});
    setMarkedForReview(new Set());
    setTimeLeft(module.durationMinutes * 60);
    timeLeftRef.current = module.durationMinutes * 60;
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
              Practice Completed
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
                  window.location.href = "/student/assessments";
                }
              }}
              className="text-xs font-semibold rounded-xl"
            >
              Back to Assessments
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
        No questions available in this practice module.
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full pb-28 relative">
      <div className="sticky top-2 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#FAFAFA] tracking-tight">
              {module.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#6B7280] font-medium pt-1 flex-wrap">
            <span>Assigned by: <strong className="text-[#111827] dark:text-[#FAFAFA]">{module.assignedBy || (module as any).assignedByName || "Instructor"}</strong></span>
            <span>•</span>
            <span>Total Questions: <strong>{totalQuestions} ({mcqQuestions.length} MCQs, {codingQuestions.length} Coding Problems)</strong></span>
            <span>•</span>
            <span>Max Marks: <strong>{module.totalMarks > 0 ? module.totalMarks : questions.reduce((sum, q) => sum + (q.marks || 0), 0)}</strong></span>
          </div>
        </div>

        {extraHeaderContent && (
          <div className="flex items-center justify-center shrink-0">
            {extraHeaderContent}
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {!isUntimed && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
              <Clock className="h-4 w-4 text-[#2563EB]" />
              <span>{formatTimerDisplay(timeLeft)}</span>
            </div>
          )}
          <Button
            onClick={handleInitiateSubmit}
            className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm"
          >
            <Send className="h-3.5 w-3.5" /> Submit Practice
          </Button>
        </div>
      </div>

      {activeSection === "mcq" && (
        <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
          <div className="flex-1 min-w-0 space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-6 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
                      Question {mcqIndex + 1} of {mcqQuestions.length}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-0.5 rounded-lg",
                        isMultiSelectQuestion(currentQuestion)
                          ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30"
                          : "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30"
                      )}
                    >
                      {isMultiSelectQuestion(currentQuestion) ? "Multiple Choice (Checkboxes)" : "Single Choice (Radio)"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {currentQuestion.text || currentQuestion.title}
                  </CardTitle>
                  {isMultiSelectQuestion(currentQuestion) && (
                    <p className="text-[11px] font-semibold text-[#2563EB]">
                      * You can select multiple correct options for this question.
                    </p>
                  )}
                </div>
                {currentQuestion.marks && (
                  <Badge variant="outline" className="text-xs font-bold bg-[#F9FAFB] dark:bg-[#09090B]">
                    +{currentQuestion.marks} Marks
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-3 pt-2">
                  {(!currentQuestion.options || currentQuestion.options.length === 0) ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs">
                      No options defined for this question.
                    </div>
                  ) : (
                    currentQuestion.options.map((option, idx) => {
                      const isMulti = isMultiSelectQuestion(currentQuestion);
                      const isSelected = isOptionSelected(currentQuestion.id, option.id);
                      return (
                        <button
                          key={option.id || idx}
                          type="button"
                          onClick={() => handleAnswerSelect(currentQuestion, option.id)}
                          className={cn(
                            "w-full p-4 rounded-xl text-left border transition-all duration-200 flex items-center justify-between group text-xs font-medium cursor-pointer",
                            isSelected
                              ? "border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB] ring-1 ring-[#2563EB] shadow-xs"
                              : "border-[#E5E7EB] dark:border-[#27272A] hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#18181B] text-[#374151] dark:text-[#D1D5DB]"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors shrink-0",
                              isSelected
                                ? "bg-[#2563EB] text-white border-[#2563EB]"
                                : "bg-muted border-border text-muted-foreground group-hover:border-foreground/40"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="leading-snug">{option.text}</span>
                          </div>
                          {isSelected ? (
                            isMulti ? (
                              <div className="w-5 h-5 rounded-md bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />
                            )
                          ) : (
                            <div className={cn(
                              "w-5 h-5 border-2 border-[#D1D5DB] dark:border-[#3F3F46] shrink-0",
                              isMulti ? "rounded-md" : "rounded-full"
                            )} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-full lg:w-[260px] shrink-0">
            {renderPaletteContent()}
          </div>
        </div>
      )}

      {activeSection === "coding" && (
        <div className="space-y-3 w-full">
          {/* Mobile & Tablet Segmented View Switcher (< lg / < 1024px) */}
          <div className="flex lg:hidden items-center p-1 bg-[#F1F5F9] dark:bg-[#18181C] rounded-xl border border-slate-200 dark:border-zinc-800 gap-1 select-none">
            <button
              type="button"
              onClick={() => setMobileTab("problem")}
              className={cn(
                "flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                mobileTab === "problem"
                  ? "bg-white dark:bg-zinc-800 text-[#2563EB] shadow-xs"
                  : "text-[#64748B] dark:text-zinc-400 hover:text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Problem</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("editor")}
              className={cn(
                "flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                mobileTab === "editor"
                  ? "bg-white dark:bg-zinc-800 text-[#2563EB] shadow-xs"
                  : "text-[#64748B] dark:text-zinc-400 hover:text-foreground"
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Code & Output</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("palette")}
              className={cn(
                "flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                mobileTab === "palette"
                  ? "bg-white dark:bg-zinc-800 text-[#2563EB] shadow-xs"
                  : "text-[#64748B] dark:text-zinc-400 hover:text-foreground"
              )}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Questions ({answeredCount}/{totalQuestions})</span>
            </button>
          </div>

          {/* Desktop Responsive Workspace (>= lg / >= 1024px) */}
          <div className="hidden lg:flex items-stretch gap-3.5 w-full h-[calc(100vh-210px)] min-h-[580px] max-h-[960px] transition-all">
            {/* Left Problem Details Panel (Expandable / Collapsible) */}
            {showProblemStatement ? (
              <div className="w-[30%] xl:w-[28%] min-w-[270px] max-w-[380px] h-full shrink-0">
                {renderProblemStatementContent(true)}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowProblemStatement(true)}
                className="h-full w-9 shrink-0 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#2563EB] text-[#6B7280] hover:text-[#2563EB] flex flex-col items-center justify-center gap-3 p-1 transition-all shadow-xs group"
                title="Show Problem Details"
              >
                <div className="w-6 h-6 rounded-full bg-muted group-hover:bg-[#2563EB]/10 flex items-center justify-center transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold tracking-wider uppercase [writing-mode:vertical-rl] rotate-180">
                  Problem Details
                </span>
              </button>
            )}

            {/* Middle Monaco CodeEditor (Flex-1 with min-w-0 for maximum space) */}
            <div className="flex-1 min-w-[380px] sm:min-w-[420px] h-full overflow-hidden">
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB] dark:border-[#27272A] bg-white">
                <CodeEditor
                  key={activeCodingProblem.id}
                  problem={activeCodingProblem}
                  defaultLanguage={
                    (currentQuestion?.allowedLanguages && currentQuestion.allowedLanguages.length > 0
                      ? (currentQuestion.allowedLanguages[0] as CodingLanguage)
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
            </div>

            {/* Right Questions Panel (Responsive width, auto-collapsible) */}
            {showQuestionPalette ? (
              <div className="w-[230px] xl:w-[250px] 2xl:w-[270px] shrink-0 h-full overflow-hidden">
                {renderPaletteContent(true)}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowQuestionPalette(true)}
                className="h-full w-9 shrink-0 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#2563EB] text-[#6B7280] hover:text-[#2563EB] flex flex-col items-center justify-center gap-3 p-1 transition-all shadow-xs group"
                title="Show Questions"
              >
                <div className="w-6 h-6 rounded-full bg-muted group-hover:bg-[#2563EB]/10 flex items-center justify-center transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold tracking-wider uppercase [writing-mode:vertical-rl] rotate-180">
                  Questions
                </span>
              </button>
            )}
          </div>

          {/* Mobile & Tablet Body Views (< lg / < 1024px) */}
          <div className="lg:hidden w-full">
            {mobileTab === "problem" && (
              <div className="min-h-[500px] h-[calc(100vh-250px)]">
                {renderProblemStatementContent(false)}
              </div>
            )}

            {mobileTab === "editor" && (
              <div className="w-full h-[calc(100vh-250px)] min-h-[520px] rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB] dark:border-[#27272A] bg-white">
                <CodeEditor
                  key={activeCodingProblem.id}
                  problem={activeCodingProblem}
                  defaultLanguage={
                    (currentQuestion?.allowedLanguages && currentQuestion.allowedLanguages.length > 0
                      ? (currentQuestion.allowedLanguages[0] as CodingLanguage)
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
            )}

            {mobileTab === "palette" && (
              <div className="min-h-[500px] h-[calc(100vh-250px)]">
                {renderPaletteContent(false)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Navigation Bar (Always Visible, Never Hidden on Scroll) ── */}
      <div className="sticky bottom-3 z-30 w-full bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 sm:p-3.5 px-4 sm:px-6 flex items-center justify-between shadow-xl select-none transition-all gap-2">
        {/* Left Side: Question context or actions */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {activeSection === "mcq" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-full border-slate-200 dark:border-zinc-700",
                  markedForReview.has(currentQuestion.id) ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]" : "text-[#4B5563]"
                )}
                onClick={() => toggleMarkForReview(currentQuestion.id)}
              >
                <Flag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{markedForReview.has(currentQuestion.id) ? "Marked" : "Mark for Review"}</span>
              </Button>

              {answers[currentQuestion.id] !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 gap-1 rounded-full hidden sm:flex"
                  onClick={() => handleClearAnswer(currentQuestion.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear Response
                </Button>
              )}
            </>
          )}
          {activeSection === "coding" && (
            <div className="flex items-center gap-2 min-w-0">
              <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 font-bold uppercase text-[10px] shrink-0">
                Problem {codingIndex + 1} of {codingQuestions.length}
              </Badge>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate hidden md:inline max-w-[150px] lg:max-w-xs">
                {activeCodingProblem.title}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaletteDrawer(true)}
                className="h-8 px-2.5 text-xs text-[#2563EB] border-[#2563EB]/30 rounded-xl xl:hidden flex items-center gap-1 font-bold shrink-0"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Questions</span>
              </Button>
            </div>
          )}
        </div>

        {/* Center: Grouped Pill Navigation */}
        <div className="inline-flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-3.5 sm:px-5 h-9 font-semibold text-xs border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 gap-1 sm:gap-1.5 shadow-2xs"
            disabled={activeSection === "mcq" ? mcqIndex === 0 : codingIndex === 0 && mcqQuestions.length === 0}
            onClick={handlePrevClick}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Prev</span>
          </Button>

          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 h-9 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
            <span>
              {activeSection === "mcq"
                ? `${mcqIndex + 1} of ${mcqQuestions.length}`
                : `${codingIndex + 1} of ${codingQuestions.length}`}
            </span>
          </div>

          <Button
            size="sm"
            className="rounded-full px-3.5 sm:px-5 h-9 font-bold text-xs bg-[#3B82F6] hover:bg-[#1D4ED8] text-white gap-1 sm:gap-1.5 shadow-sm"
            disabled={activeSection === "coding" && codingIndex === codingQuestions.length - 1}
            onClick={handleNextClick}
          >
            {activeSection === "mcq" && mcqIndex === mcqQuestions.length - 1 && codingQuestions.length > 0 ? (
              <><span>Coding</span> <ArrowRight className="h-4 w-4" /></>
            ) : (
              <><span className="hidden xs:inline">Next</span> <ChevronRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* Right Side: Review & Submit */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 sm:px-4 text-xs font-bold rounded-xl border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10"
            onClick={() => setShowReviewModal(true)}
          >
            <span className="hidden sm:inline">Review & Submit</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        </div>
      </div>

      {/* Slide-over Questions Drawer Modal */}
      {showPaletteDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in-0 duration-200">
          <div className="w-[300px] sm:w-[340px] h-full bg-white dark:bg-[#18181B] shadow-2xl p-4 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[#2563EB]" /> Questions
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPaletteDrawer(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pt-3">
              {renderPaletteContent(false)}
            </div>
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-2">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <span className="inline-block bg-blue-50 text-[#2563EB] border border-blue-200/70 text-xs font-semibold px-3 py-1 rounded-full">
                      Submission Review
                    </span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] max-w-4xl">
                      {module.title}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-normal pt-0.5">
                      Assigned by <span className="font-semibold text-slate-800 dark:text-slate-200">{module.assignedBy || (module as any).assignedByName || "Instructor"}</span> • {questions.length} Total Questions
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReviewModal(false)}
                      className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-full border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Continue Practice
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowReviewModal(false);
                        handleFinalSubmit();
                      }}
                      className="h-9 px-5 text-xs font-semibold gap-1.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white shadow-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Confirm & Final Submit
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
                                {q.sectionTitle || (module as any).mcqSectionTitle || "SECTION 1: MCQS"}
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
                                  setActiveSection("mcq");
                                  setMcqIndex(mcqIdx >= 0 ? mcqIdx : 0);
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
                                {q.sectionTitle || (module as any).codingSectionTitle || "SECTION 2: CODING"}
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
                                  setActiveSection("coding");
                                  setCodingIndex(cqIdx >= 0 ? cqIdx : 0);
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
                                No code written yet. Click "Edit in IDE" to write your solution.
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
                onClick={() => {
                  setShowReviewModal(false);
                  handleFinalSubmit();
                }}
                className="h-9 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs gap-1.5 rounded-full shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm & Final Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">Submit Practice Module?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B7280]">
              You have completed {answeredCount} out of {totalQuestions} items in this practice module. Are you sure you want to finalize your submission?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 text-xs font-semibold rounded-xl">Continue Practice</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleFinalSubmit()} className="h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl">
              Yes, Submit Practice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
