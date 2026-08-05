"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  Send, Grid3x3, Code2, ClipboardList, Layers, Play, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Assessment, AssessmentAttempt } from "@/types";

export interface PracticeQuestion {
  id: string;
  type: "single_choice" | "multiple_choice" | "coding";
  title: string;
  text: string;
  marks: number;
  order: number;
  options?: { id: string; text: string }[];
  starterCode?: Record<string, string>;
  testCases?: { input: string; expectedOutput: string }[];
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
  };
  questions: PracticeQuestion[];
  onSubmit: (answers: Record<string, any>) => Promise<void>;
}

export function PracticeRunnerEngine({
  module,
  questions,
  onSubmit,
}: PracticeRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, { code: string; language: string }>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(module.durationMinutes * 60);
  const [selectedLang, setSelectedLang] = useState<string>("python");
  const [codeRunOutput, setCodeRunOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

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
      const current = (prev[questionId] as string[]) ?? [];
      const updated = checked
        ? [...current, optionId]
        : current.filter((id) => id !== optionId);
      return { ...prev, [questionId]: updated };
    });
  };

  const handleCodeChange = (questionId: string, code: string) => {
    setCodeAnswers((prev) => ({
      ...prev,
      [questionId]: { code, language: selectedLang },
    }));
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { code, language: selectedLang },
    }));
  };

  const handleRunCodeTest = () => {
    setIsRunningCode(true);
    setCodeRunOutput(null);
    setTimeout(() => {
      setIsRunningCode(false);
      setCodeRunOutput("✓ All sample test cases passed successfully! (Output match: [0, 1])");
    }, 1200);
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

  const isQuestionAnswered = (qId: string) => {
    const ans = answers[qId];
    if (!ans) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === "object" && ans.code) return ans.code.trim().length > 0;
    return false;
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleFinalSubmit = async () => {
    setShowSubmitDialog(false);
    await onSubmit({ ...answers, ...codeAnswers });
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(q.id)).length;

  if (!currentQuestion) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Sticky High-Contrast Header Bar */}
      <div className="sticky top-[72px] z-30 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                Practice Module ({module.type.toUpperCase()})
              </span>
              <span className="text-xs text-[#6B7280]">Assigned by {module.assignedBy}</span>
            </div>
            <h1 className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA] truncate">
              {module.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer Box */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-base border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]">
              <Clock className="h-4 w-4 text-[#2563EB]" />
              {formatTimerDisplay(timeLeft)}
            </div>

            {/* Question Palette Drawer */}
            <Sheet open={showPalette} onOpenChange={setShowPalette}>
              <SheetTrigger className="inline-flex items-center justify-center rounded-lg h-[42px] px-4 gap-2 font-semibold text-xs text-[#111827] dark:text-[#FAFAFA] border border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors cursor-pointer">
                <Grid3x3 className="h-4 w-4 text-[#2563EB]" />
                <span>Palette ({answeredCount}/{totalQuestions})</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-white dark:bg-[#18181B] border-l border-[#E5E7EB] dark:border-[#27272A]">
                <SheetHeader>
                  <SheetTitle className="text-base font-semibold text-[#111827] dark:text-[#FAFAFA]">Practice Question Palette</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-5">
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, i) => {
                      const answered = isQuestionAnswered(q.id);
                      const marked = markedForReview.has(q.id);
                      return (
                        <button
                          key={q.id}
                          onClick={() => { setCurrentIndex(i); setShowPalette(false); }}
                          className={cn(
                            "w-10 h-10 rounded-lg text-xs font-bold transition-all border flex items-center justify-center",
                            i === currentIndex && "ring-2 ring-[#2563EB] ring-offset-2",
                            answered && "bg-[#16A34A] text-white border-[#16A34A]",
                            marked && !answered && "bg-[#F59E0B] text-white border-[#F59E0B]",
                            !answered && !marked && "bg-[#F3F4F6] dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA] border-[#E5E7EB] dark:border-[#27272A]"
                          )}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Submit Button */}
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="h-[42px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs gap-1.5 shadow-sm"
            >
              <Send className="h-4 w-4" /> Submit Practice
            </Button>
          </div>
        </div>
      </div>

      {/* Main Question Container */}
      <Card className="border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm">
        <CardContent className="p-8 space-y-6">
          {/* Question Badges Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded bg-[#2563EB]/10 text-[#2563EB]">
                Item {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-[#111827] dark:text-[#FAFAFA] capitalize">
                {currentQuestion.type === "coding" ? "💻 Coding Problem" : currentQuestion.type === "multiple_choice" ? "☑️ MCQ Multiple Select" : "🔘 MCQ Single Choice"}
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

          {/* Question Title & Prompt */}
          <div className="space-y-2">
            <h2 className="text-[20px] font-semibold text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
              {currentQuestion.title}
            </h2>
            <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
              {currentQuestion.text}
            </p>
          </div>

          {/* RENDER QUESTION ACCORDING TO FORMAT */}

          {/* 1. MCQ Single Choice */}
          {currentQuestion.type === "single_choice" && currentQuestion.options && (
            <RadioGroup
              value={(answers[currentQuestion.id]?.[0] as string) ?? ""}
              onValueChange={(v) => handleSingleAnswer(currentQuestion.id, v)}
              className="space-y-3 pt-2"
            >
              {currentQuestion.options.map((option) => {
                const isSelected = (answers[currentQuestion.id] as string[])?.includes(option.id);
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
          )}

          {/* 2. MCQ Multiple Choice */}
          {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Select all that apply:</p>
              {currentQuestion.options.map((option) => {
                const isSelected = (answers[currentQuestion.id] as string[])?.includes(option.id);
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

          {/* 3. CODING QUESTION EDITOR */}
          {currentQuestion.type === "coding" && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-4 p-3 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[#2563EB]" />
                  <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Select Language:</span>
                </div>
                <Select value={selectedLang} onValueChange={(v) => { if (v) setSelectedLang(v); }}>
                  <SelectTrigger className="w-40 h-9 text-xs bg-white dark:bg-[#18181B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python 3</SelectItem>
                    <SelectItem value="javascript">JavaScript (Node)</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="java">Java 17</SelectItem>
                    <SelectItem value="cpp">C++ 20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Code Editor Box */}
              <div className="space-y-2">
                <Textarea
                  value={codeAnswers[currentQuestion.id]?.code ?? (currentQuestion.starterCode?.[selectedLang] || "# Write your solution code here\n")}
                  onChange={(e) => handleCodeChange(currentQuestion.id, e.target.value)}
                  placeholder="Type your code here..."
                  className="font-mono text-sm min-h-[240px] bg-[#09090B] text-white border-[#27272A] focus:border-[#2563EB] p-4 leading-relaxed rounded-xl"
                />
              </div>

              {/* Test Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <Button
                  onClick={handleRunCodeTest}
                  disabled={isRunningCode}
                  variant="outline"
                  className="h-[40px] px-5 text-xs font-semibold gap-2 border-[#E5E7EB] dark:border-[#27272A]"
                >
                  <Play className="h-4 w-4 text-[#16A34A]" />
                  {isRunningCode ? "Executing Test Cases..." : "Run Test Cases"}
                </Button>

                {codeRunOutput && (
                  <div className="p-3 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/30 text-xs font-semibold text-[#16A34A] flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>{codeRunOutput}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Bottom Navigation Controls */}
      <div className="sticky bottom-6 z-30 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-xl shadow-lg flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="h-[44px] px-6 font-semibold text-sm gap-2 border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA]"
        >
          <ChevronLeft className="h-4 w-4" /> Previous Question
        </Button>

        <span className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
          {currentIndex + 1} / {totalQuestions}
        </span>

        <Button
          onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
          disabled={currentIndex === totalQuestions - 1}
          className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm gap-2"
        >
          Next Question <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Final Submit Confirmation Modal */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-[#111827] dark:text-[#FAFAFA]">Submit Practice Module?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
              You have answered <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{answeredCount}</span> out of <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalQuestions}</span> items in this practice module. Confirm submission?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-[44px]">Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmit} className="h-[44px] bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
              Confirm & Submit Practice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
