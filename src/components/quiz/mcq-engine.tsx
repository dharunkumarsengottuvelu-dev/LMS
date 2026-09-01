"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  Send, Grid3x3, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Assessment, AssessmentAttempt, Question } from "@/types";

interface MCQEngineProps {
  assessment: Assessment;
  attempt: AssessmentAttempt;
  questions: Question[];
  onSubmit: (answers: Record<string, string[]>) => Promise<void>;
  isSubmitting?: boolean;
}

type QuestionStatus = "unanswered" | "answered" | "marked" | "answered-marked";

export function MCQAssessmentEngine({
  assessment,
  attempt,
  questions,
  onSubmit,
  isSubmitting = false,
}: MCQEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>(
    attempt.answers ?? {}
  );
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(
    new Set((attempt as { marked_for_review?: string[] }).marked_for_review ?? [])
  );
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const expiresAt = new Date(attempt.expires_at).getTime();
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  });
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (isSubmitting || isSubmitted) return;
    autoSaveRef.current = setInterval(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(`assessment_draft_${attempt.id}`, JSON.stringify(answers));
      }
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [answers, attempt.id, isSubmitting, isSubmitted]);

  // Countdown Timer — halts on submit, submit dialog, or completion
  useEffect(() => {
    if (isSubmitting || isSubmitted || showSubmitDialog || timeLeft <= 0) {
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
  }, [timeLeft, isSubmitting, isSubmitted, showSubmitDialog]);

  const handleSingleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  };

  const handleMultipleAnswer = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const updated = checked
        ? [...current, optionId]
        : current.filter((id) => id !== optionId);
      return { ...prev, [questionId]: updated };
    });
  };

  const toggleMarkForReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const getQuestionStatus = (questionId: string): QuestionStatus => {
    const hasAnswer = (answers[questionId]?.length ?? 0) > 0;
    const isMarked = markedForReview.has(questionId);
    if (hasAnswer && isMarked) return "answered-marked";
    if (hasAnswer) return "answered";
    if (isMarked) return "marked";
    return "unanswered";
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleFinalSubmit = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }
    setIsSubmitted(true);
    setShowSubmitDialog(false);
    await onSubmit(answers);
  };

  const answeredCount = questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length;
  const isWarning = timeLeft < 300;
  const isDanger = timeLeft < 60;

  const PaletteButton = ({ index, question }: { index: number; question: Question }) => {
    const status = getQuestionStatus(question.id);
    return (
      <button
        onClick={() => { setCurrentIndex(index); setShowPalette(false); }}
        className={cn(
          "w-10 h-10 rounded-lg text-xs font-bold transition-all duration-150 border flex items-center justify-center",
          index === currentIndex && "ring-2 ring-[#2563EB] ring-offset-2",
          status === "answered" && "bg-[#16A34A] text-white border-[#16A34A]",
          status === "marked" && "bg-[#F59E0B] text-white border-[#F59E0B]",
          status === "answered-marked" && "bg-[#2563EB] text-white border-[#2563EB]",
          status === "unanswered" && "bg-[#F3F4F6] dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]"
        )}
      >
        {index + 1}
      </button>
    );
  };

  if (!currentQuestion) return null;
  const currentAnswers = answers[currentQuestion.id] ?? [];

  return (
    <div className="w-full space-y-6">
      {/* Sticky High-Contrast Assessment Header Bar */}
      <div className="sticky top-[72px] z-30 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-semibold text-lg text-[#111827] dark:text-[#FAFAFA] truncate">
              {assessment.title}
            </h1>
            <p className="text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
              Question <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{currentIndex + 1}</span> of {totalQuestions} • <span className="font-bold text-[#2563EB]">{answeredCount}</span> answered
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* High Contrast Countdown Timer */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-base border shadow-sm",
              isDanger ? "border-[#DC2626] bg-[#FEF2F2] dark:bg-[#450A0A] text-[#DC2626] dark:text-[#FCA5A5]" :
              isWarning ? "border-[#F59E0B] bg-[#FFFBEB] dark:bg-[#451A03] text-[#D97706] dark:text-[#FCD34D]" :
              "border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]"
            )}>
              <Clock className="h-4 w-4 shrink-0" />
              {formatTimerDisplay(timeLeft)}
            </div>

            {/* Question Palette Sheet */}
            <Sheet open={showPalette} onOpenChange={setShowPalette}>
              <SheetTrigger className="inline-flex items-center justify-center rounded-lg h-[42px] px-4 gap-2 font-medium text-xs text-[#111827] dark:text-[#FAFAFA] border border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors cursor-pointer">
                <Grid3x3 className="h-4 w-4 text-[#2563EB]" />
                <span>Questions</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-white dark:bg-[#18181B] border-l border-[#E5E7EB] dark:border-[#27272A]">
                <SheetHeader>
                  <SheetTitle className="text-base font-semibold text-[#111827] dark:text-[#FAFAFA]">Questions</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-5">
                  <div className="grid grid-cols-6 gap-2">
                    {questions.map((q, i) => (
                      <PaletteButton key={q.id} index={i} question={q} />
                    ))}
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                      <span>Progress</span>
                      <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
                    </div>
                    <Progress value={(answeredCount / totalQuestions) * 100} className="h-2" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Submit Assessment Button */}
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="h-[42px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs gap-1.5 shadow-sm"
            >
              <Send className="h-4 w-4" /> Submit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Question Card with Ultra Crisp Typography & Visibility */}
      <Card className="border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm">
        <CardContent className="p-8 space-y-6">
          {/* Badges Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded bg-[#2563EB]/10 text-[#2563EB]">
                Question {currentIndex + 1}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA]">
                {currentQuestion.type === "multiple_choice" ? "Multiple Select" : "Single Choice"}
              </span>
              <span className="text-xs font-bold text-[#4B5563] dark:text-[#D1D5DB]">
                {currentQuestion.marks} Marks
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs h-9 font-semibold transition-colors",
                markedForReview.has(currentQuestion.id)
                  ? "bg-[#F59E0B]/10 border-[#F59E0B] text-[#D97706]"
                  : "text-[#4B5563] dark:text-[#D1D5DB] border-[#E5E7EB] dark:border-[#27272A]"
              )}
              onClick={toggleMarkForReview}
            >
              <Flag className="h-3.5 w-3.5" />
              {markedForReview.has(currentQuestion.id) ? "Marked for Review" : "Mark for Review"}
            </Button>
          </div>

          {/* Question Text */}
          <h2 className="text-[20px] font-semibold text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
            {currentQuestion.text}
          </h2>

          {/* Options List with High-Contrast Text & Clear Selected State */}
          <div className="space-y-3 pt-2">
            {currentQuestion.type === "single_choice" || currentQuestion.type === "true_false" ? (
              <RadioGroup
                value={currentAnswers[0] ?? ""}
                onValueChange={(v) => handleSingleAnswer(currentQuestion.id, v)}
                className="space-y-3"
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = currentAnswers.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleSingleAnswer(currentQuestion.id, option.id)}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border cursor-pointer transition-all duration-150",
                        isSelected
                          ? "bg-[#2563EB]/10 dark:bg-[#2563EB]/20 border-2 border-[#2563EB] shadow-sm"
                          : "bg-[#FAFAFA] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/60 hover:bg-[#F3F4F6] dark:hover:bg-[#18181B]"
                      )}
                    >
                      <RadioGroupItem value={option.id} id={`opt-${option.id}`} className="shrink-0 text-[#2563EB]" />
                      <Label
                        htmlFor={`opt-${option.id}`}
                        className="cursor-pointer text-[15px] font-semibold text-[#111827] dark:text-[#FAFAFA] leading-relaxed flex-1"
                      >
                        {option.text}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Select all options that apply:</p>
                {currentQuestion.options.map((option) => {
                  const isSelected = currentAnswers.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border cursor-pointer transition-all duration-150",
                        isSelected
                          ? "bg-[#2563EB]/10 dark:bg-[#2563EB]/20 border-2 border-[#2563EB] shadow-sm"
                          : "bg-[#FAFAFA] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/60 hover:bg-[#F3F4F6] dark:hover:bg-[#18181B]"
                      )}
                    >
                      <Checkbox
                        id={`opt-${option.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleMultipleAnswer(currentQuestion.id, option.id, checked === true)
                        }
                        className="shrink-0 text-[#2563EB]"
                      />
                      <Label htmlFor={`opt-${option.id}`} className="cursor-pointer text-[15px] font-semibold text-[#111827] dark:text-[#FAFAFA] leading-relaxed flex-1">
                        {option.text}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sticky Bottom Controls */}
      <div className="sticky bottom-6 z-30 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#E5E7EB] dark:border-[#27272A] p-3 rounded-2xl shadow-lg flex items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="rounded-full px-5 h-10 font-semibold text-xs border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 gap-1.5 shadow-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Prev</span>
        </Button>

        <div className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
          <span>{currentIndex + 1} of {totalQuestions}</span>
        </div>

        <Button
          onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
          disabled={currentIndex === totalQuestions - 1}
          className="rounded-full px-5 h-10 font-bold text-xs bg-[#3B82F6] hover:bg-[#1D4ED8] text-white gap-1.5 shadow-sm"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Final Submit Confirmation Modal */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-[#111827] dark:text-[#FAFAFA]">Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
              You have answered <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{answeredCount}</span> out of <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalQuestions}</span> questions. Once submitted, your scores will be locked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-[44px]">Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmit} className="h-[44px] bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
