"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  AlertTriangle, BookmarkCheck, Send, Grid3x3
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
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Auto-save answers every 30 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(`assessment_draft_${attempt.id}`, JSON.stringify(answers));
      }
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [answers, attempt.id]);

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
  }, [timeLeft]);

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
          "w-9 h-9 rounded-lg text-xs font-bold transition-all duration-200 border",
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
    <div className="space-y-6">
      {/* Assessment Header Bar */}
      <div className="sticky top-[72px] z-30 bg-white dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg text-[#111827] dark:text-[#FAFAFA] truncate">
              {assessment.title}
            </h1>
            <p className="text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
              Question {currentIndex + 1} of {totalQuestions} • {answeredCount} answered
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer Box */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-base border",
              isDanger ? "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]" :
              isWarning ? "border-[#F59E0B] bg-[#FFFBEB] text-[#D97706]" :
              "border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]"
            )}>
              <Clock className="h-4 w-4 shrink-0" />
              {formatTimerDisplay(timeLeft)}
            </div>

            {/* Question Palette Drawer */}
            <Sheet open={showPalette} onOpenChange={setShowPalette}>
              <SheetTrigger>
                <Button variant="outline" size="sm" className="h-[40px] gap-1.5 font-medium">
                  <Grid3x3 className="h-4 w-4" />
                  <span>Question Palette</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-base font-semibold text-[#111827] dark:text-[#FAFAFA]">Question Palette</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-7 gap-2">
                    {questions.map((q, i) => (
                      <PaletteButton key={q.id} index={i} question={q} />
                    ))}
                  </div>
                  <Progress value={(answeredCount / totalQuestions) * 100} className="h-2" />
                  <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] text-center font-medium">
                    {answeredCount} of {totalQuestions} questions answered
                  </p>
                </div>
              </SheetContent>
            </Sheet>

            {/* Submit Button */}
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="h-[40px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium gap-1.5"
            >
              <Send className="h-4 w-4" /> Submit Assessment
            </Button>
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <Card className="border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B]">
        <CardContent className="p-8 space-y-6">
          {/* Question Header Badges */}
          <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs font-semibold px-3 py-1">
                Question {currentIndex + 1}
              </Badge>
              <Badge className="bg-[#2563EB] text-white text-xs font-medium">
                {currentQuestion.type === "multiple_choice" ? "Multiple Select" : "Single Choice"}
              </Badge>
              <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                {currentQuestion.marks} Marks
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs h-9 font-medium",
                markedForReview.has(currentQuestion.id)
                  ? "bg-[#F59E0B]/10 border-[#F59E0B] text-[#D97706]"
                  : "text-[#4B5563] dark:text-[#9CA3AF]"
              )}
              onClick={toggleMarkForReview}
            >
              <Flag className="h-3.5 w-3.5" />
              {markedForReview.has(currentQuestion.id) ? "Marked for Review" : "Mark for Review"}
            </Button>
          </div>

          {/* Question Text (High-contrast Crisp Font) */}
          <h2 className="text-[18px] font-semibold text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
            {currentQuestion.text}
          </h2>

          {/* Option List */}
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
                        "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150",
                        isSelected
                          ? "bg-[#2563EB]/10 border-2 border-[#2563EB]"
                          : "bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/50"
                      )}
                    >
                      <RadioGroupItem value={option.id} id={`opt-${option.id}`} className="shrink-0" />
                      <Label
                        htmlFor={`opt-${option.id}`}
                        className="cursor-pointer text-[15px] font-medium text-[#111827] dark:text-[#FAFAFA] leading-relaxed flex-1"
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
                        "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150",
                        isSelected
                          ? "bg-[#2563EB]/10 border-2 border-[#2563EB]"
                          : "bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/50"
                      )}
                    >
                      <Checkbox
                        id={`opt-${option.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleMultipleAnswer(currentQuestion.id, option.id, checked === true)
                        }
                        className="shrink-0"
                      />
                      <Label htmlFor={`opt-${option.id}`} className="cursor-pointer text-[15px] font-medium text-[#111827] dark:text-[#FAFAFA] leading-relaxed flex-1">
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

      {/* Navigation Footer Controls */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="h-[44px] px-6 font-medium text-sm gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        <span className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">
          {currentIndex + 1} / {totalQuestions}
        </span>

        <Button
          onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
          disabled={currentIndex === totalQuestions - 1}
          className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm gap-2"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-[#111827] dark:text-[#FAFAFA]">Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#4B5563] leading-relaxed">
              You have answered <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{answeredCount}</span> out of <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalQuestions}</span> questions. Once submitted, you cannot modify your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
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
