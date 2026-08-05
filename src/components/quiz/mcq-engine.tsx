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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatTimerDisplay } from "@/utils/date";
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
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
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
      // Save draft to localStorage
      localStorage.setItem(
        `assessment_draft_${attempt.id}`,
        JSON.stringify(answers)
      );
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [answers, attempt.id]);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`assessment_draft_${attempt.id}`);
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as Record<string, string[]>;
        setAnswers((prev) => ({ ...parsed, ...prev }));
      } catch {
        // ignore parse errors
      }
    }
  }, [attempt.id]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinalSubmit = useCallback(async () => {
    setShowSubmitDialog(false);
    localStorage.removeItem(`assessment_draft_${attempt.id}`);
    await onSubmit(answers);
  }, [answers, attempt.id, onSubmit]);

  const getQuestionStatus = (questionId: string): QuestionStatus => {
    const isAnswered = (answers[questionId]?.length ?? 0) > 0;
    const isMarked = markedForReview.has(questionId);
    if (isAnswered && isMarked) return "answered-marked";
    if (isAnswered) return "answered";
    if (isMarked) return "marked";
    return "unanswered";
  };

  const handleSingleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  };

  const handleMultipleAnswer = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      return {
        ...prev,
        [questionId]: checked
          ? [...current, optionId]
          : current.filter((id) => id !== optionId),
      };
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

  const answeredCount = questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length;
  const isWarning = timeLeft < 300; // Less than 5 minutes
  const isDanger = timeLeft < 60; // Less than 1 minute

  const PaletteButton = ({ index, question }: { index: number; question: Question }) => {
    const status = getQuestionStatus(question.id);
    return (
      <button
        onClick={() => { setCurrentIndex(index); setShowPalette(false); }}
        className={cn(
          "w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200 border",
          index === currentIndex && "ring-2 ring-primary ring-offset-1",
          status === "answered" && "bg-green-500 text-white border-green-500",
          status === "marked" && "bg-amber-500 text-white border-amber-500",
          status === "answered-marked" && "bg-blue-500 text-white border-blue-500",
          status === "unanswered" && "bg-muted text-muted-foreground border-border hover:border-primary/50",
        )}
      >
        {index + 1}
      </button>
    );
  };

  if (!currentQuestion) return null;

  const currentAnswers = answers[currentQuestion.id] ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">{assessment.title}</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIndex + 1} of {totalQuestions} • {answeredCount} answered
            </p>
          </div>

          {/* Timer */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg border",
            isDanger ? "timer-danger border-red-300 bg-red-50 dark:bg-red-950/20" :
            isWarning ? "timer-warning border-amber-300 bg-amber-50 dark:bg-amber-950/20" :
            "border-border bg-muted/50"
          )}>
            <Clock className="h-4 w-4 shrink-0" />
            {formatTimerDisplay(timeLeft)}
          </div>

          {/* Question Palette Sheet */}
          <Sheet open={showPalette} onOpenChange={setShowPalette}>
            <SheetTrigger>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Grid3x3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Palette</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Question Palette</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { label: "Answered", color: "bg-green-500" },
                    { label: "Marked", color: "bg-amber-500" },
                    { label: "Answered + Marked", color: "bg-blue-500" },
                    { label: "Unanswered", color: "bg-muted" },
                  ].map((item) => (
                    <span key={item.label} className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded ${item.color}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {questions.map((q, i) => (
                    <PaletteButton key={q.id} index={i} question={q} />
                  ))}
                </div>
                <Progress value={(answeredCount / totalQuestions) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {answeredCount} of {totalQuestions} questions answered
                </p>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            onClick={() => setShowSubmitDialog(true)}
            className="bg-brand-gradient text-white hover:opacity-90"
            size="sm"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Submit
          </Button>
        </div>
        <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-0.5 rounded-none" />
      </div>

      {/* Question Content */}
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Question header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Q{currentIndex + 1}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        currentQuestion.type === "multiple_choice"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      )}
                    >
                      {currentQuestion.type === "multiple_choice" ? "Multiple Select" : "Single Choice"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}
                    </span>
                    {assessment.negative_marking && currentQuestion.negative_marks > 0 && (
                      <span className="text-xs text-red-500">
                        -{currentQuestion.negative_marks} for wrong
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-1.5 shrink-0",
                      markedForReview.has(currentQuestion.id)
                        ? "text-amber-600 bg-amber-50"
                        : "text-muted-foreground"
                    )}
                    onClick={toggleMarkForReview}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {markedForReview.has(currentQuestion.id) ? "Marked" : "Mark"}
                  </Button>
                </div>

                {/* Question text */}
                <p className="text-base leading-relaxed font-medium">{currentQuestion.text}</p>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.type === "single_choice" || currentQuestion.type === "true_false" ? (
                    <RadioGroup
                      value={currentAnswers[0] ?? ""}
                      onValueChange={(v) => handleSingleAnswer(currentQuestion.id, v)}
                      className="space-y-2"
                    >
                      {currentQuestion.options.map((option) => {
                        const isSelected = currentAnswers.includes(option.id);
                        return (
                          <div
                            key={option.id}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40 hover:bg-accent"
                            )}
                            onClick={() => handleSingleAnswer(currentQuestion.id, option.id)}
                          >
                            <RadioGroupItem value={option.id} id={`opt-${option.id}`} className="shrink-0" />
                            <Label
                              htmlFor={`opt-${option.id}`}
                              className="cursor-pointer text-sm leading-relaxed flex-1"
                            >
                              {option.text}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
                      {currentQuestion.options.map((option) => {
                        const isSelected = currentAnswers.includes(option.id);
                        return (
                          <div
                            key={option.id}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40 hover:bg-accent"
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
                            <Label htmlFor={`opt-${option.id}`} className="cursor-pointer text-sm flex-1">
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
            disabled={currentIndex === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {/* Quick Jump Info */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{currentIndex + 1}</span>
            <span>/</span>
            <span>{totalQuestions}</span>
          </div>

          {currentIndex < totalQuestions - 1 ? (
            <Button
              onClick={() => setCurrentIndex((p) => Math.min(totalQuestions - 1, p + 1))}
              className="gap-1.5"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="bg-brand-gradient text-white gap-1.5"
              onClick={() => setShowSubmitDialog(true)}
            >
              <Send className="h-4 w-4" />
              Submit Test
            </Button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit? You cannot change your answers after submission.
            </AlertDialogDescription>
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted rounded-xl">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{answeredCount}</p>
                    <p className="text-xs text-muted-foreground">Answered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-600">{markedForReview.size}</p>
                    <p className="text-xs text-muted-foreground">Marked</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-500">
                      {totalQuestions - answeredCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Unanswered</p>
                  </div>
                </div>
                {totalQuestions - answeredCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      You have {totalQuestions - answeredCount} unanswered question{totalQuestions - answeredCount !== 1 ? "s" : ""}.
                    </p>
                  </div>
                )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="bg-brand-gradient text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
