"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  Send, Code2, ClipboardList, Layers, Play, Check, Award,
  RotateCcw, Sparkles, Terminal, FileCode, CheckCheck, XCircle, AlertCircle,
  HelpCircle, ArrowRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Edit3, Copy, Search, CheckCircle, ExternalLink, ArrowUpRight, ListFilter, CornerDownRight, FileText, AlertTriangle, ArrowLeft
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CodingLanguage, CodingProblem, TestCase, CodingSubmission } from "@/types/coding";

export interface PracticeQuestion {
  id: string;
  type: "single_choice" | "multiple_choice" | "coding" | "mcq";
  section?: "mcq" | "coding" | string;
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
  onSubmit: (
    answers: Record<string, any>,
    metadata?: { timeSpentSeconds: number; completedAt: string; timeLeft: number; submissionResults?: Record<string, any> }
  ) => Promise<void>;
}

export function PracticeRunnerEngine({
  module,
  questions,
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

  const handleInitiateSubmit = () => {
    if (module.allowReviewBeforeSubmit !== false) {
      setShowReviewModal(true);
    } else {
      setShowSubmitDialog(true);
    }
  };

  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => isAlreadySubmitted);

  // Auto-persist all progress to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || isSubmitted || isAlreadySubmitted) return;
    try {
      const dataToSave = {
        answers,
        codeAnswers,
        submissionResults,
        markedForReview: Array.from(markedForReview),
        activeSection,
        mcqIndex,
        codingIndex,
        timeLeft,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn("Failed to persist practice progress:", e);
    }
  }, [answers, codeAnswers, submissionResults, markedForReview, activeSection, mcqIndex, codingIndex, timeLeft, storageKey, isSubmitted, isAlreadySubmitted]);

  const currentQuestion = currentSectionQuestions[currentSectionIndex] || questions[0];

  const handleFinalSubmit = useCallback(async () => {
    setShowSubmitDialog(false);
    setShowReviewModal(false);
    setIsSubmitted(true);

    const completedAt = new Date().toISOString();
    const timeSpentSeconds = Math.max(0, (module.durationMinutes * 60) - timeLeft);

    try {
      await onSubmit(
        { ...answers, ...codeAnswers },
        { timeSpentSeconds, completedAt, timeLeft, submissionResults }
      );
    } finally {
      // Always clear session after submit — prevents refresh from restoring the editor
      try {
        localStorage.removeItem(storageKey);
        // Also set a submitted marker so we can detect this state
        localStorage.setItem(`${storageKey}_submitted`, "true");
      } catch {}
    }
  }, [answers, codeAnswers, onSubmit, storageKey, module.durationMinutes, timeLeft]);

  const isUntimed = !module.durationMinutes || module.durationMinutes <= 0;

  // Countdown Timer — stops immediately when submitted or if untimed
  useEffect(() => {
    if (isSubmitted || isAlreadySubmitted || isUntimed) return;
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleFinalSubmit, isSubmitted, isAlreadySubmitted, isUntimed]);

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
    const ans = answers[questionId];
    if (!ans) return false;
    if (Array.isArray(ans) && ans.length > 0) return true;
    if (typeof ans === "string" && ans.trim().length > 0) return true;
    if (typeof ans === "object" && ans.code && ans.code.trim().length > 0) return true;
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
      templates: currentQuestion.starterCode || {
        java: "// Write your Java solution here\n",
        python: "# Write your Python solution here\n",
        cpp: "// Write your C++ solution here\n",
        javascript: "// Write your JavaScript solution here\n",
        c: "/* Write your C solution here */\n"
      },
      test_cases: testCases
    };
  }, [currentQuestion]);

  const renderPaletteContent = (canHide = false) => (
    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden flex flex-col h-full">
      <CardHeader className="p-3 pb-2.5 border-b border-[#E5E7EB] dark:border-[#27272A] shrink-0">
        <CardTitle className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">Palette</span>
            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">
              {answeredCount}/{totalQuestions}
            </Badge>
          </div>
          {canHide && (
            <button
              type="button"
              onClick={() => setShowQuestionPalette(false)}
              className="h-6 w-6 rounded-lg border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-center text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-muted transition-all shrink-0"
              title="Hide Question Palette"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pb-20 space-y-3 flex-1 overflow-y-auto">
        {mcqQuestions.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 truncate">
              <ClipboardList className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">{(module as any).mcqSectionTitle || "Section 1: MCQs"}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">({mcqQuestions.length})</span>
            </span>
            <div className="grid grid-cols-5 gap-2">
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
              <Code2 className="h-3.5 w-3.5 text-[#9333EA] shrink-0" />
              <span className="truncate">{(module as any).codingSectionTitle || "Section 2: Coding"}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">({codingQuestions.length})</span>
            </span>
            <div className="grid grid-cols-5 gap-2">
              {codingQuestions.map((cq, idx) => {
                const answered = isQuestionAnswered(cq.id);
                const marked = markedForReview.has(cq.id);
                const isCurrent = activeSection === "coding" && codingIndex === idx;

                let style = "bg-[#F9FAFB] dark:bg-[#09090B] text-[#4B5563] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9333EA]/50";
                if (isCurrent) style = "ring-2 ring-[#9333EA] bg-[#9333EA] text-white font-bold shadow-xs";
                else if (marked) style = "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B] font-bold";
                else if (answered) style = "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/40 font-bold";

                return (
                  <button
                    key={cq.id || idx}
                    onClick={() => {
                      setActiveSection("coding");
                      setCodingIndex(idx);
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

        <div className="p-2 bg-[#F9FAFB] dark:bg-[#09090B] rounded-lg border border-[#E5E7EB] dark:border-[#27272A] space-y-1 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#4B5563]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Answered
            </span>
            <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{answeredCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#4B5563]">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Review
            </span>
            <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{markedForReview.size}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#4B5563]">
              <span className="w-2 h-2 rounded-full bg-[#E5E7EB]" /> Total
            </span>
            <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalQuestions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isSubmitted || isAlreadySubmitted) {
    return (
      <div className="w-full py-8 space-y-6">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-8 text-center max-w-xl mx-auto shadow-sm space-y-4">
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
    <div className="space-y-4 w-full pb-16 relative">
      <div className="sticky top-2 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#FAFAFA] tracking-tight">
              {module.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#6B7280] font-medium pt-1">
            <span>Assigned by: <strong className="text-[#111827] dark:text-[#FAFAFA]">{module.assignedBy || (module as any).assignedByName || "Instructor"}</strong></span>
            <span>•</span>
            <span>Total Questions: <strong>{totalQuestions} ({mcqQuestions.length} MCQs, {codingQuestions.length} Coding Problems)</strong></span>
            <span>•</span>
            <span>Max Marks: <strong>{module.totalMarks || 100}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
            <Clock className="h-4 w-4 text-[#2563EB]" />
            <span>{isUntimed ? "No Time Limit" : formatTimerDisplay(timeLeft)}</span>
          </div>
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
                      {(module as any).mcqSectionTitle || "Section 1: MCQs"} • Question {mcqIndex + 1} of {mcqQuestions.length}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-0.5 rounded-lg",
                        isMultiSelectQuestion(currentQuestion)
                          ? "bg-[#9333EA]/10 text-[#9333EA] border border-[#9333EA]/30"
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
                    <p className="text-[11px] font-semibold text-[#9333EA]">
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
                              ? isMulti
                                ? "border-[#9333EA] bg-[#9333EA]/5 text-[#9333EA] ring-1 ring-[#9333EA] shadow-xs"
                                : "border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB] ring-1 ring-[#2563EB] shadow-xs"
                              : "border-[#E5E7EB] dark:border-[#27272A] hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#18181B] text-[#374151] dark:text-[#D1D5DB]"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors shrink-0",
                              isSelected
                                ? isMulti
                                  ? "bg-[#9333EA] text-white border-[#9333EA]"
                                  : "bg-[#2563EB] text-white border-[#2563EB]"
                                : "bg-muted border-border text-muted-foreground group-hover:border-foreground/40"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="leading-snug">{option.text}</span>
                          </div>
                          {isSelected ? (
                            isMulti ? (
                              <div className="w-5 h-5 rounded-md bg-[#9333EA] text-white flex items-center justify-center shrink-0 shadow-xs">
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
        <div className="flex items-start gap-4 w-full h-[640px] min-h-[520px] transition-all">
          {/* Left Problem Details Panel (Expandable / Collapsible) */}
          {showProblemStatement ? (
            <div className="w-[26%] min-w-[270px] max-w-[330px] h-full shrink-0">
              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden h-full flex flex-col">
                <CardHeader className="p-4 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A] bg-muted/20 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#9333EA] text-white text-xs font-bold px-3 py-1">
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
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProblemStatement(false)}
                      className="h-7 w-7 rounded-lg border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-center text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-muted transition-all"
                      title="Hide Problem Panel"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
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

          {/* Middle Monaco CodeEditor (Flex-1) */}
          <div className="flex-1 min-w-0 h-full">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB] dark:border-[#27272A] bg-white">
              <CodeEditor
                key={activeCodingProblem.id}
                problem={activeCodingProblem}
                defaultLanguage="java"
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

          {/* Right Question Palette Panel (Uniform medium width: 260px) */}
          {showQuestionPalette ? (
            <div className="w-[260px] shrink-0 h-full overflow-hidden">
              {renderPaletteContent(true)}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowQuestionPalette(true)}
              className="h-full w-9 shrink-0 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#9333EA] text-[#6B7280] hover:text-[#9333EA] flex flex-col items-center justify-center gap-3 p-1 transition-all shadow-xs group"
              title="Show Question Palette"
            >
              <div className="w-6 h-6 rounded-full bg-muted group-hover:bg-[#9333EA]/10 flex items-center justify-center transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase [writing-mode:vertical-rl] rotate-180">
                Question Palette
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Sticky Bottom Navigation Bar (Always Visible, Never Hidden on Scroll) ── */}
      <div className="sticky bottom-3 z-30 w-full bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3.5 px-6 flex items-center justify-between shadow-xl select-none transition-all">
        {/* Left Side: Question context or actions */}
        <div className="flex items-center gap-3">
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
                {markedForReview.has(currentQuestion.id) ? "Marked" : "Mark for Review"}
              </Button>

              {answers[currentQuestion.id] !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3.5 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 gap-1 rounded-full"
                  onClick={() => handleClearAnswer(currentQuestion.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear Response
                </Button>
              )}
            </>
          )}
          {activeSection === "coding" && (
            <div className="flex items-center gap-2">
              <Badge className="bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/30 font-bold uppercase text-[10px]">
                Problem {codingIndex + 1} of {codingQuestions.length}
              </Badge>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate max-w-xs">
                {activeCodingProblem.title}
              </span>
            </div>
          )}
        </div>

        {/* Center: Grouped Pill Navigation matching the screenshot! */}
        <div className="inline-flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-5 h-9 font-semibold text-xs border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 gap-1.5 shadow-2xs"
            disabled={activeSection === "mcq" ? mcqIndex === 0 : codingIndex === 0 && mcqQuestions.length === 0}
            onClick={handlePrevClick}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev</span>
          </Button>

          <div className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
            <span>
              {activeSection === "mcq"
                ? `${mcqIndex + 1} of ${mcqQuestions.length}`
                : `${codingIndex + 1} of ${codingQuestions.length}`}
            </span>
          </div>

          <Button
            size="sm"
            className="rounded-full px-5 h-9 font-bold text-xs bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5 shadow-sm"
            disabled={activeSection === "coding" && codingIndex === codingQuestions.length - 1}
            onClick={handleNextClick}
          >
            {activeSection === "mcq" && mcqIndex === mcqQuestions.length - 1 && codingQuestions.length > 0 ? (
              <><span>Proceed to Coding</span> <ArrowRight className="h-4 w-4" /></>
            ) : (
              <><span>Next</span> <ChevronRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* Right Side: Review & Submit */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-xs font-bold rounded-xl border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10"
            onClick={() => setShowReviewModal(true)}
          >
            Review & Submit
          </Button>
        </div>
      </div>



      {/* Full-Page Comprehensive Answer Review & Code / Test Case Verification Dashboard */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in-0 duration-200">
          {/* Top Sticky Header */}
          <div className="h-16 px-4 sm:px-8 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs z-20">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReviewModal(false)}
                className="h-9 px-3 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-xs font-bold gap-1.5 shrink-0 hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Practice
              </Button>
              <div className="h-4 w-[1px] bg-[#E2E8F0] dark:border-[#334155] hidden sm:block" />
              <div className="min-w-0 flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                  {module.title}
                </h2>
                <Badge className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 text-[10px] font-bold shrink-0 hidden sm:inline-flex">
                  Submission Review
                </Badge>
              </div>

            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>{formatTimerDisplay(timeLeft)}</span>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  handleFinalSubmit();
                }}
                className="h-9 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm & Final Submit
              </Button>
            </div>
          </div>

          {/* KPI Metrics Summary Row */}
          <div className="px-4 sm:px-8 py-4 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Questions */}
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#334155]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Total Items</p>
                <p className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">{totalQuestions}</p>
              </div>

              {/* Answered */}
              <div className="p-2.5 rounded-xl bg-[#16A34A]/5 border border-[#16A34A]/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A]">Completed</p>
                <p className="text-base font-extrabold text-[#16A34A] mt-0.5">
                  {answeredCount} <span className="text-xs font-semibold text-[#16A34A]/80">/ {totalQuestions}</span>
                </p>
              </div>

              {/* Coding Pass Status */}
              <div className="p-2.5 rounded-xl bg-[#9333EA]/5 border border-[#9333EA]/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9333EA]">Coding Solved</p>
                <p className="text-base font-extrabold text-[#9333EA] mt-0.5">
                  {codingQuestions.filter(cq => isQuestionAnswered(cq.id)).length} <span className="text-xs font-semibold text-[#9333EA]/80">/ {codingQuestions.length}</span>
                </p>
              </div>

              {/* Marked for Review */}
              <div className="p-2.5 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">Marked Review</p>
                <p className="text-base font-extrabold text-[#F59E0B] mt-0.5">{markedForReview.size}</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="max-w-7xl mx-auto flex items-center gap-2 pt-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setReviewFilter("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                  reviewFilter === "all"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                )}
              >
                All Questions ({questions.length})
              </button>
              {mcqQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter("mcq")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                    reviewFilter === "mcq"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
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
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                    reviewFilter === "coding"
                      ? "bg-[#9333EA] text-white shadow-xs"
                      : "bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                  )}
                >
                  Coding Challenges ({codingQuestions.length})
                </button>
              )}
              {markedForReview.size > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter("marked")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                    reviewFilter === "marked"
                      ? "bg-[#F59E0B] text-white shadow-xs"
                      : "bg-[#F1F5F9] dark:bg-[#1E293B] text-[#F59E0B] hover:bg-[#F59E0B]/10"
                  )}
                >
                  Marked for Review ({markedForReview.size})
                </button>
              )}
              {totalQuestions - answeredCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter("unanswered")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                    reviewFilter === "unanswered"
                      ? "bg-[#EF4444] text-white shadow-xs"
                      : "bg-[#F1F5F9] dark:bg-[#1E293B] text-[#EF4444] hover:bg-[#EF4444]/10"
                  )}
                >
                  Unanswered ({totalQuestions - answeredCount})
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Questions Deep Review Feed */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
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
                        className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-xs overflow-hidden transition-all hover:border-[#2563EB]/40"
                      >
                        {/* MCQ Question Header */}
                        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]/50 dark:bg-[#1E293B]/30">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                              {originalIndex + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
                                  {q.section === "mcq" ? (module as any).mcqSectionTitle || "MCQ Question" : "Multiple Choice"}
                                </span>
                                {q.marks && (
                                  <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-[#090D16]">
                                    +{q.marks} Marks
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                                {q.text || q.title}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {marked && (
                              <Badge className="bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 text-xs font-bold">
                                <Flag className="h-3.5 w-3.5 mr-1" /> Flagged
                              </Badge>
                            )}
                            {answered ? (
                              <Badge className="bg-[#16A34A] text-white text-xs font-bold gap-1">
                                <Check className="h-3.5 w-3.5" /> Answered
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-bold text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/5">
                                Unattempted
                              </Badge>
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
                              className="h-8 px-3 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Change Answer
                            </Button>
                          </div>
                        </div>

                        {/* MCQ Options Display */}
                        <div className="p-5 sm:p-6 space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                            Options & Selected Response
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(q.options || []).map((opt, oIdx) => {
                              const isSelected = selectedIds.includes(opt.id);
                              return (
                                <div
                                  key={opt.id || oIdx}
                                  className={cn(
                                    "p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 transition-all",
                                    isSelected
                                      ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] shadow-xs"
                                      : "border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/40 text-[#64748B] dark:text-[#94A3B8]"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0",
                                        isSelected
                                          ? "bg-[#2563EB] text-white"
                                          : "bg-white dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#334155] text-[#64748B]"
                                      )}
                                    >
                                      {String.fromCharCode(65 + oIdx)}
                                    </div>
                                    <span className={cn("truncate font-medium", isSelected && "text-[#0F172A] dark:text-white font-bold")}>
                                      {opt.text}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <Badge className="bg-[#2563EB] text-white text-[10px] font-extrabold shrink-0 gap-1">
                                      <Check className="h-3 w-3" /> Selected
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
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
                        className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-xs overflow-hidden transition-all hover:border-[#9333EA]/40"
                      >
                        {/* Coding Header */}
                        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-[#F8FAFC]/50 dark:bg-[#1E293B]/30">
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-[#9333EA] text-white flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">
                              {originalIndex + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-[11px] font-bold text-[#9333EA] uppercase tracking-wider">
                                  {(module as any).codingSectionTitle || "Coding Challenge"}
                                </span>
                                {q.marks && (
                                  <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] px-1.5 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#334155]">
                                    +{q.marks} Marks
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-[#9333EA] px-1.5 py-0.5 rounded bg-[#9333EA]/10 uppercase">
                                  {cqLang}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-snug">
                                {q.title || q.text}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            {submission ? (
                              submission.status === "accepted" ? (
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
                                  {submission.passed_test_cases}/{submission.total_test_cases} Passed
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#EF4444]/10 text-[#EF4444]">
                                  {submission.passed_test_cases}/{submission.total_test_cases} Passed
                                </span>
                              )
                            ) : answered ? (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600">
                                Saved (Not Tested)
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#EF4444]/10 text-[#EF4444]">
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
                              className="h-8 px-3 rounded-xl border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-[#9333EA] hover:bg-[#9333EA]/10"
                            >
                              Modify in IDE
                            </Button>
                          </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4">

                          {/* Code Viewer — static, read-only */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                                Your Code Solution ({cqLang.toUpperCase()})
                              </span>
                              {cqCode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cqCode);
                                    setCopiedCodeId(q.id);
                                    setTimeout(() => setCopiedCodeId(null), 2000);
                                  }}
                                  className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] transition-colors"
                                >
                                  {copiedCodeId === q.id ? "Copied" : "Copy"}
                                </button>
                              )}
                            </div>

                            {cqCode ? (
                              <div className="rounded-xl border border-[#1E293B] bg-[#090D16] p-4 overflow-x-auto max-h-64">
                                <pre className="font-mono text-[12px] leading-relaxed text-[#E2E8F0] whitespace-pre">{cqCode}</pre>
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl border border-dashed border-[#E2E8F0] dark:border-[#334155] text-center text-xs text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#1E293B]/20">
                                No code written yet. Click "Modify in IDE" to write your solution.
                              </div>
                            )}
                          </div>

                          {/* Test Cases — summary only */}
                          <div className="pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                            <div className="flex items-center justify-between py-2.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                                Test Cases ({testCases.length} {testCases.length === 1 ? "case" : "cases"})
                              </span>

                              {submission ? (
                                <span
                                  className={cn(
                                    "text-xs font-bold px-3 py-1 rounded-lg",
                                    submission.status === "accepted"
                                      ? "bg-[#16A34A]/10 text-[#16A34A]"
                                      : "bg-[#EF4444]/10 text-[#EF4444]"
                                  )}
                                >
                                  {submission.passed_test_cases}/{submission.total_test_cases} Passed
                                  {submission.status === "accepted" ? " — All Passed" : " — Some Failed"}
                                </span>
                              ) : cqCode ? (
                                <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] px-3 py-1 rounded-lg bg-[#F1F5F9] dark:bg-[#1E293B]">
                                  Not Tested
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-[#94A3B8] px-3 py-1 rounded-lg bg-[#F1F5F9] dark:bg-[#1E293B]">
                                  No Code
                                </span>
                              )}
                            </div>

                            {/* Per-test-case pass/fail row — name + badge only, no inputs/outputs */}
                            {submission && (submission.results || (submission as any).test_results) && (
                              <div className="space-y-1.5">
                                {(submission.results || (submission as any).test_results).map((tr: any, tIdx: number) => (
                                  <div
                                    key={tIdx}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#334155]"
                                  >
                                    <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                      Test Case {tIdx + 1}
                                      {testCases[tIdx]?.is_hidden && (
                                        <span className="ml-1.5 text-[10px] font-bold text-[#64748B]">(Hidden)</span>
                                      )}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-[11px] font-bold px-2.5 py-0.5 rounded-md",
                                        tr.passed
                                          ? "bg-[#16A34A]/10 text-[#16A34A]"
                                          : "bg-[#EF4444]/10 text-[#EF4444]"
                                      )}
                                    >
                                      {tr.passed ? "Passed" : "Failed"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Not tested yet */}
                            {!submission && testCases.length > 0 && cqCode && (
                              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#334155]">
                                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                  Code saved but not evaluated. Run tests in the IDE.
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setActiveSection("coding");
                                    setCodingIndex(cqIdx >= 0 ? cqIdx : 0);
                                    setShowReviewModal(false);
                                  }}
                                  className="h-7 px-3 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold text-[11px] rounded-lg shrink-0 ml-3"
                                >
                                  Run Tests
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                      </Card>
                    );
                  }
                })}
            </div>
          </div>

          {/* Sticky Bottom Confirmation Bar */}
          <div className="h-16 px-4 sm:px-8 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md flex items-center justify-between shrink-0 shadow-lg z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hidden sm:inline">
                {answeredCount} of {totalQuestions} items answered
              </span>
              <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                • Ready to submit your attempt?
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                className="h-10 px-5 text-xs font-bold rounded-xl border-[#E2E8F0] dark:border-[#334155]"
              >
                ← Back to Practice
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  handleFinalSubmit();
                }}
                className="h-10 px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm"
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
