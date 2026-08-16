"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  Send, Code2, ClipboardList, Layers, Play, Check, Award,
  RotateCcw, Sparkles, Terminal, FileCode, CheckCheck, XCircle, AlertCircle,
  HelpCircle, ArrowRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    proctoring?: {
      fullscreenLock?: boolean;
      copyPasteRestricted?: boolean;
    };
  };
  questions: PracticeQuestion[];
  onSubmit: (answers: Record<string, any>) => Promise<void>;
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

  // Active section state
  const [activeSection, setActiveSection] = useState<"mcq" | "coding">(() => {
    if (typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
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

  const [timeLeft, setTimeLeft] = useState<number>(module.durationMinutes * 60);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [showProblemStatement, setShowProblemStatement] = useState(true);
  const [showQuestionPalette, setShowQuestionPalette] = useState(true);

  // Auto-persist all progress to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dataToSave = {
        answers,
        codeAnswers,
        submissionResults,
        markedForReview: Array.from(markedForReview),
        activeSection,
        mcqIndex,
        codingIndex,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn("Failed to persist practice progress:", e);
    }
  }, [answers, codeAnswers, submissionResults, markedForReview, activeSection, mcqIndex, codingIndex, storageKey]);

  const currentQuestion = currentSectionQuestions[currentSectionIndex] || questions[0];

  const handleFinalSubmit = useCallback(async () => {
    setShowSubmitDialog(false);
    await onSubmit({ ...answers, ...codeAnswers });
  }, [answers, codeAnswers, onSubmit]);

  // Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleFinalSubmit]);

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
        title: isAccepted ? "All Test Cases Passed! 🎉" : "Submission Evaluated",
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
      <CardContent className="p-3 space-y-3 flex-1 overflow-y-auto">
        {mcqQuestions.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 truncate">
              <ClipboardList className="h-3 w-3 text-[#2563EB] shrink-0" />
              <span className="truncate">{(module as any).mcqSectionTitle || "Section 1: MCQs"}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">({mcqQuestions.length})</span>
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {mcqQuestions.map((q, idx) => {
                const answered = isQuestionAnswered(q.id);
                const marked = markedForReview.has(q.id);
                const isCurrent = activeSection === "mcq" && mcqIndex === idx;

                let style = "bg-[#F9FAFB] dark:bg-[#09090B] text-[#4B5563] border-[#E5E7EB] dark:border-[#27272A]";
                if (isCurrent) style = "ring-2 ring-[#2563EB] bg-[#2563EB] text-white font-bold";
                else if (marked) style = "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]";
                else if (answered) style = "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/40 font-bold";

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => {
                      setActiveSection("mcq");
                      setMcqIndex(idx);
                    }}
                    className={`h-7 rounded-lg text-[11px] font-bold transition-all border ${style}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {codingQuestions.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 truncate">
              <Code2 className="h-3 w-3 text-[#9333EA] shrink-0" />
              <span className="truncate">{(module as any).codingSectionTitle || "Section 2: Coding"}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">({codingQuestions.length})</span>
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {codingQuestions.map((cq, idx) => {
                const answered = isQuestionAnswered(cq.id);
                const marked = markedForReview.has(cq.id);
                const isCurrent = activeSection === "coding" && codingIndex === idx;

                let style = "bg-[#F9FAFB] dark:bg-[#09090B] text-[#4B5563] border-[#E5E7EB] dark:border-[#27272A]";
                if (isCurrent) style = "ring-2 ring-[#9333EA] bg-[#9333EA] text-white font-bold";
                else if (marked) style = "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]";
                else if (answered) style = "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/40 font-bold";

                return (
                  <button
                    key={cq.id || idx}
                    onClick={() => {
                      setActiveSection("coding");
                      setCodingIndex(idx);
                    }}
                    className={`h-7 rounded-lg text-[11px] font-bold transition-all border ${style}`}
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

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No questions available in this practice module.
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-[#111827] dark:text-[#FAFAFA] tracking-tight">
              {module.title}
            </h1>
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 font-bold uppercase text-[10px]">
              {(module as any).category || `${module.type.toUpperCase()} MODULE`}
            </Badge>
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
            <span>{formatTimerDisplay(timeLeft)}</span>
          </div>
          <Button
            onClick={() => setShowSubmitDialog(true)}
            className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm"
          >
            <Send className="h-3.5 w-3.5" /> Submit Practice
          </Button>
        </div>
      </div>

      {activeSection === "mcq" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-6 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
                    {(module as any).mcqSectionTitle || "Section 1: MCQs"} • Question {mcqIndex + 1} of {mcqQuestions.length}
                  </span>
                  <CardTitle className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {currentQuestion.text || currentQuestion.title}
                  </CardTitle>
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
                      const selectedOptions = (answers[currentQuestion.id] as string[]) ?? [];
                      const isSelected = selectedOptions.includes(option.id);
                      const isMultiple = (currentQuestion.options?.filter(o => o.isCorrect).length || 0) > 1 || currentQuestion.type === "multiple_choice";

                      return (
                        <button
                          key={option.id || idx}
                          type="button"
                          onClick={() => {
                            if (isMultiple) {
                              handleMultipleAnswer(currentQuestion.id, option.id);
                            } else {
                              handleSingleAnswer(currentQuestion.id, option.id);
                            }
                          }}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between group",
                            isSelected
                              ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] shadow-xs"
                              : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB] hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                              isSelected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] group-hover:border-[#2563EB]"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="leading-snug">{option.text}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[#E5E7EB] dark:border-[#27272A]">
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={mcqIndex === 0}
                      variant="outline"
                      className="h-10 px-4 text-xs font-semibold gap-1 rounded-xl"
                      onClick={handlePrevClick}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>

                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 px-3 text-xs font-semibold gap-1.5 rounded-xl",
                        markedForReview.has(currentQuestion.id) ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]" : "text-[#4B5563]"
                      )}
                      onClick={() => toggleMarkForReview(currentQuestion.id)}
                    >
                      <Flag className="h-3.5 w-3.5" />
                      {markedForReview.has(currentQuestion.id) ? "Marked" : "Review"}
                    </Button>

                    {answers[currentQuestion.id] !== undefined && (
                      <Button
                        variant="ghost"
                        className="h-10 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 gap-1 rounded-xl"
                        onClick={() => handleClearAnswer(currentQuestion.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Clear
                      </Button>
                    )}
                  </div>

                  <Button
                    className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-1 rounded-xl shadow-sm"
                    onClick={handleNextClick}
                  >
                    {mcqIndex === mcqQuestions.length - 1 && codingQuestions.length > 0 ? (
                      <>Proceed to Coding Section <ArrowRight className="h-4 w-4 ml-1" /></>
                    ) : (
                      <>Next Question <ChevronRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {renderPaletteContent()}
          </div>
        </div>
      )}

      {activeSection === "coding" && (
        <div className="flex items-start gap-4 w-full transition-all">
          {/* Left Problem Details Panel (Expandable / Collapsible) */}
          {showProblemStatement ? (
            <div className="w-[26%] min-w-[270px] max-w-[330px] shrink-0">
              <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm rounded-2xl overflow-hidden h-[670px] flex flex-col">
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

                <CardContent className="p-4 space-y-4 text-xs leading-relaxed flex-1 overflow-y-auto">
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
              className="h-[670px] w-9 shrink-0 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#2563EB] text-[#6B7280] hover:text-[#2563EB] flex flex-col items-center justify-center gap-3 p-1 transition-all shadow-xs group"
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
          <div className="flex-1 min-w-0">
            <div className="w-full min-h-[670px] h-[670px] rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB] dark:border-[#27272A] bg-white">
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

          {/* Right Question Palette Panel (Compact 210px, Height 670px, pinned bottom Prev/Next) */}
          {showQuestionPalette ? (
            <div className="w-[210px] shrink-0 h-[670px] flex flex-col justify-between">
              <div className="flex-1 overflow-hidden min-h-0">
                {renderPaletteContent(true)}
              </div>

              <div className="flex items-center gap-1.5 pt-2 shrink-0">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold rounded-xl border-[#E5E7EB] dark:border-[#27272A] shadow-xs"
                  disabled={codingIndex === 0}
                  onClick={handlePrevClick}
                >
                  <ChevronLeft className="h-4 w-4 mr-0.5" /> Prev
                </Button>
                <Button
                  className="flex-1 h-9 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold text-xs rounded-xl shadow-xs"
                  disabled={codingIndex === codingQuestions.length - 1}
                  onClick={handleNextClick}
                >
                  Next <ChevronRight className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowQuestionPalette(true)}
              className="h-[670px] w-9 shrink-0 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#9333EA] text-[#6B7280] hover:text-[#9333EA] flex flex-col items-center justify-center gap-3 p-1 transition-all shadow-xs group"
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
