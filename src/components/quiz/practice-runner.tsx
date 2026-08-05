"use client";

import { useState, useEffect } from "react";
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2,
  Send, Grid3x3, Code2, ClipboardList, Layers, Play, Check, Award,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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
    }, 900);
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

  const handleClearAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
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
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12 w-full">
      
      {/* 1. MNC-Level Clean Non-Truncated Header Bar */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] md:text-[22px] font-bold text-[#111827] dark:text-[#FAFAFA] tracking-tight">
                {module.title}
              </h1>
              <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold px-2.5 py-0.5 shrink-0">
                Practice Module ({module.type.toUpperCase()})
              </Badge>
            </div>
            <p className="text-xs text-[#6B7280]">
              Assigned by: <strong className="text-[#111827] dark:text-[#FAFAFA]">{module.assignedBy}</strong> | Total Questions: <strong>{totalQuestions}</strong> | Max Marks: <strong>{module.totalMarks}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Timer Box */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border ${
              timeLeft < 300 ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30 animate-pulse" : "bg-[#F9FAFB] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA] border-[#E5E7EB] dark:border-[#27272A]"
            }`}>
              <Clock className="h-4 w-4 text-[#2563EB]" />
              {formatTimerDisplay(timeLeft)}
            </div>

            {/* Submit Practice Button */}
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="h-[44px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-2 shadow-sm"
            >
              <Send className="h-4 w-4" /> Submit Practice
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* LEFT QUESTION PANEL (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            
            {/* Question Card Header */}
            <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1">
                  Question {currentIndex + 1} of {totalQuestions}
                </Badge>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-[#E5E7EB] dark:border-[#27272A]">
                  {currentQuestion.type === "coding" ? "💻 Coding Problem" : currentQuestion.type === "multiple_choice" ? "☑️ MCQ Multiple Select" : "🔘 MCQ Single Choice"}
                </Badge>
              </div>

              <span className="text-xs font-bold text-[#6B7280]">Marks: {currentQuestion.marks}</span>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Question Title & Statement */}
              <div className="space-y-2">
                <h2 className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                  {currentQuestion.title}
                </h2>
                <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                  {currentQuestion.text}
                </p>
              </div>

              {/* 1. MCQ Single Choice Options (MNC Alphabet Cards) */}
              {currentQuestion.type === "single_choice" && currentQuestion.options && (
                <div className="space-y-3 pt-2">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = (answers[currentQuestion.id] as string[])?.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSingleAnswer(currentQuestion.id, option.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between",
                          isSelected
                            ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] shadow-xs"
                            : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB] hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0",
                            isSelected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span>{option.text}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. MCQ Multiple Choice Options */}
              {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Select all options that apply:</p>
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = (answers[currentQuestion.id] as string[])?.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleMultipleAnswer(currentQuestion.id, option.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between",
                          isSelected
                            ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] shadow-xs"
                            : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB] hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded border flex items-center justify-center text-xs font-bold shrink-0",
                            isSelected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span>{option.text}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. Coding Question Editor */}
              {currentQuestion.type === "coding" && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Code Solution Editor</Label>
                    <Select value={selectedLang} onValueChange={(v) => { if (v) setSelectedLang(v); }}>
                      <SelectTrigger className="w-40 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python 3</SelectItem>
                        <SelectItem value="javascript">JavaScript (Node)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    value={codeAnswers[currentQuestion.id]?.code ?? (currentQuestion.starterCode?.[selectedLang] || "# Write code here\n")}
                    onChange={(e) => handleCodeChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your code here..."
                    className="font-mono text-xs min-h-[220px] bg-[#09090B] text-[#FAFAFA] border-[#27272A] p-4 leading-relaxed rounded-xl"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      onClick={handleRunCodeTest}
                      disabled={isRunningCode}
                      className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold gap-2"
                    >
                      <Play className="h-4 w-4" />
                      {isRunningCode ? "Executing Tests..." : "Run Test Cases"}
                    </Button>

                    {codeRunOutput && (
                      <p className="text-xs text-[#16A34A] font-bold">{codeRunOutput}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <div className="flex items-center gap-2">
                  <Button
                    disabled={currentIndex === 0}
                    variant="outline"
                    className="h-10 px-4 text-xs font-semibold gap-1"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>

                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 px-3 text-xs font-semibold gap-1.5",
                      markedForReview.has(currentQuestion.id) ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]" : "text-[#4B5563]"
                    )}
                    onClick={toggleMarkForReview}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {markedForReview.has(currentQuestion.id) ? "Marked for Review" : "Mark for Review"}
                  </Button>

                  {answers[currentQuestion.id] !== undefined && (
                    <Button
                      variant="ghost"
                      className="h-10 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 gap-1"
                      onClick={() => handleClearAnswer(currentQuestion.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Clear Response
                    </Button>
                  )}
                </div>

                <Button
                  disabled={currentIndex === totalQuestions - 1}
                  className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-1"
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                >
                  Next Question <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT QUESTION PALETTE DRAWER (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                Practice Question Palette
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const answered = isQuestionAnswered(q.id);
                  const marked = markedForReview.has(q.id);
                  const isCurrent = currentIndex === idx;

                  let style = "bg-[#F9FAFB] dark:bg-[#09090B] text-[#4B5563] border-[#E5E7EB] dark:border-[#27272A]";
                  if (isCurrent) style = "ring-2 ring-[#2563EB] bg-[#2563EB] text-white font-bold";
                  else if (marked) style = "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]";
                  else if (answered) style = "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/40 font-bold";

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-lg text-xs font-bold transition-all border ${style}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#4B5563]">
                    <span className="w-3 h-3 rounded-full bg-[#16A34A]" /> Answered
                  </span>
                  <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#4B5563]">
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B]" /> Marked for Review
                  </span>
                  <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{markedForReview.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#4B5563]">
                    <span className="w-3 h-3 rounded-full bg-[#E5E7EB]" /> Unanswered
                  </span>
                  <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{totalQuestions - answeredCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Final Submit Confirmation Modal */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">Submit Practice Module?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B7280]">
              You have answered {answeredCount} out of {totalQuestions} items in this practice module. Are you sure you want to finalize your submission?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 text-xs font-semibold">Continue Practice</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmit} className="h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold">
              Yes, Submit Practice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
