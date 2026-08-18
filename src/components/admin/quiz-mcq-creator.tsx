"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ListChecks } from "lucide-react";

export interface McqQuestion {
  id: string;
  question: string;
  type: "single" | "multiple";
  options: string[];
  correctIndex?: number;
  correctIndexes?: number[];
  explanation?: string;
}

interface QuizMcqCreatorProps {
  value: string;
  onChange: (value: string) => void;
}

export function QuizMcqCreator({ value, onChange }: QuizMcqCreatorProps) {
  const [questions, setQuestions] = useState<McqQuestion[]>([]);

  useEffect(() => {
    if (value !== JSON.stringify(questions)) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setQuestions(
            parsed.map((q: any, idx: number) => ({
              id: q.id || `q_${Date.now()}_${idx}`,
              question: q.question || "",
              type: q.type === "multiple" ? "multiple" : "single",
              options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Option 1", "Option 2", "Option 3", "Option 4"],
              correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
              correctIndexes: Array.isArray(q.correctIndexes) ? q.correctIndexes : [typeof q.correctIndex === "number" ? q.correctIndex : 0],
              explanation: q.explanation || "",
            }))
          );
        }
      } catch (e) {
        if (value && !value.startsWith("[")) {
          setQuestions([
            {
              id: Date.now().toString(),
              question: value,
              type: "single",
              options: ["Option 1", "Option 2", "Option 3", "Option 4"],
              correctIndex: 0,
              correctIndexes: [0],
              explanation: "",
            },
          ]);
        } else if (!value) {
          setQuestions([]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const saveToParent = (newQs: McqQuestion[]) => {
    onChange(JSON.stringify(newQs));
  };

  const addQuestion = (afterIndex?: number) => {
    const newQ: McqQuestion = {
      id: `q_${Date.now()}`,
      question: "",
      type: "single",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correctIndex: 0,
      correctIndexes: [0],
      explanation: "",
    };
    let newQs: McqQuestion[];
    if (typeof afterIndex === "number" && afterIndex >= 0) {
      newQs = [...questions];
      newQs.splice(afterIndex + 1, 0, newQ);
    } else {
      newQs = [...questions, newQ];
    }
    setQuestions(newQs);
    saveToParent(newQs);
  };

  const updateQuestionText = (index: number, val: string) => {
    const newQs = [...questions];
    const q = newQs[index];
    if (q) {
      newQs[index] = { ...q, question: val };
      setQuestions(newQs);
      saveToParent(newQs);
    }
  };

  const updateQuestionType = (index: number, type: "single" | "multiple") => {
    const newQs = [...questions];
    const q = newQs[index];
    if (q) {
      const defaultCorrect = q.correctIndex !== undefined ? [q.correctIndex] : [0];
      newQs[index] = {
        ...q,
        type,
        correctIndex: q.correctIndex ?? 0,
        correctIndexes: q.correctIndexes && q.correctIndexes.length > 0 ? q.correctIndexes : defaultCorrect,
      };
      setQuestions(newQs);
      saveToParent(newQs);
    }
  };

  const updateOptionText = (qIndex: number, optIndex: number, val: string) => {
    const newQs = [...questions];
    const q = newQs[qIndex];
    if (q) {
      const newOptions = [...q.options];
      newOptions[optIndex] = val;
      newQs[qIndex] = { ...q, options: newOptions };
      setQuestions(newQs);
      saveToParent(newQs);
    }
  };

  const addOption = (qIndex: number) => {
    const newQs = [...questions];
    const q = newQs[qIndex];
    if (q) {
      const newOptions = [...q.options, `Option ${q.options.length + 1}`];
      newQs[qIndex] = { ...q, options: newOptions };
      setQuestions(newQs);
      saveToParent(newQs);
    }
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const newQs = [...questions];
    const q = newQs[qIndex];
    if (q && q.options.length > 2) {
      const newOptions = q.options.filter((_, i) => i !== optIndex);
      let newCorrectIndex = q.correctIndex === optIndex ? 0 : (q.correctIndex || 0) > optIndex ? (q.correctIndex || 0) - 1 : q.correctIndex;
      let newCorrectIndexes = (q.correctIndexes || [0])
        .filter((i) => i !== optIndex)
        .map((i) => (i > optIndex ? i - 1 : i));
      if (newCorrectIndexes.length === 0) newCorrectIndexes = [0];

      newQs[qIndex] = {
        ...q,
        options: newOptions,
        correctIndex: newCorrectIndex,
        correctIndexes: newCorrectIndexes,
      };
      setQuestions(newQs);
      saveToParent(newQs);
    }
  };

  const toggleCorrectOption = (qIndex: number, optIndex: number) => {
    const newQs = [...questions];
    const q = newQs[qIndex];
    if (!q) return;

    if (q.type === "single") {
      newQs[qIndex] = {
        ...q,
        correctIndex: optIndex,
        correctIndexes: [optIndex],
      };
    } else {
      const current = q.correctIndexes || [];
      let nextIndexes: number[];
      if (current.includes(optIndex)) {
        if (current.length > 1) {
          nextIndexes = current.filter((i) => i !== optIndex);
        } else {
          nextIndexes = current; // Keep at least one correct
        }
      } else {
        nextIndexes = [...current, optIndex].sort((a, b) => a - b);
      }
      newQs[qIndex] = {
        ...q,
        correctIndex: nextIndexes[0] ?? 0,
        correctIndexes: nextIndexes,
      };
    }

    setQuestions(newQs);
    saveToParent(newQs);
  };

  const updateExplanation = (qIndex: number, val: string) => {
    const newQs = [...questions];
    const q = newQs[qIndex];
    if (q) {
      newQs[qIndex] = { ...q, explanation: val };
      setQuestions(newQs);
      saveToParent(newQs);
    }
  };

  const removeQuestion = (index: number) => {
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
    saveToParent(newQs);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, qIndex) => {
        const isMultiple = q.type === "multiple";
        const correctSet = new Set(isMultiple ? (q.correctIndexes || []) : [q.correctIndex ?? 0]);

        return (
          <div
            key={q.id}
            className="p-5 rounded-2xl border-2 border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] space-y-4 shadow-sm"
          >
            {/* Header: Question Number & Type Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white font-mono font-bold text-xs">
                  QUESTION {qIndex + 1}
                </span>

                {/* Choice Type Buttons */}
                <div className="flex items-center bg-[#F3F4F6] dark:bg-[#09090B] p-0.5 rounded-lg border border-[#E5E7EB] dark:border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => updateQuestionType(qIndex, "single")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      !isMultiple
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                    }`}
                  >
                    Single Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => updateQuestionType(qIndex, "multiple")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      isMultiple
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                    }`}
                  >
                    Multiple Choice
                  </button>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(qIndex)}
                className="h-8 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg self-end sm:self-center"
              >
                Delete Question
              </Button>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Question Statement</label>
              <Textarea
                placeholder="Type your question statement here..."
                value={q.question}
                onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                rows={3}
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Answer Options ({isMultiple ? "Select all correct options" : "Select one correct option"})
                </label>
                <span className="text-[11px] font-semibold text-[#2563EB]">
                  {isMultiple ? "Multi-select checkboxes" : "Single-select radio"}
                </span>
              </div>

              <div className="space-y-2.5">
                {q.options.map((opt, oIndex) => {
                  const isCorrect = correctSet.has(oIndex);

                  return (
                    <div key={oIndex} className="flex items-center gap-2.5">
                      {/* Correct Toggle Indicator */}
                      <button
                        type="button"
                        onClick={() => toggleCorrectOption(qIndex, oIndex)}
                        title={isCorrect ? "Marked as correct answer" : "Click to mark as correct answer"}
                        className={`h-[42px] px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          isCorrect
                            ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                            : "bg-[#F9FAFB] dark:bg-[#09090B] text-[#6B7280] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/40"
                        }`}
                      >
                        <span className="font-mono text-[11px]">
                          {isMultiple ? (isCorrect ? "[x]" : "[ ]") : (isCorrect ? "(o)" : "( )")}
                        </span>
                        <span>{isCorrect ? "Correct" : "Option"}</span>
                      </button>

                      {/* Option Text Input */}
                      <Input
                        value={opt}
                        onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1} text...`}
                        className={`h-[42px] text-xs rounded-xl flex-1 ${
                          isCorrect
                            ? "bg-[#EFF6FF] dark:bg-[#1E3A8A]/10 border-[#2563EB]/40 font-semibold text-[#111827] dark:text-[#FAFAFA]"
                            : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                        }`}
                      />

                      {/* Remove Option Button */}
                      {q.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(qIndex, oIndex)}
                          className="h-[42px] px-2.5 text-xs text-[#DC2626] hover:bg-[#DC2626]/10 rounded-xl"
                          title="Remove Option"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Option Button */}
              {q.options.length < 8 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(qIndex)}
                  className="h-8 px-3 text-xs font-semibold text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/10 rounded-lg"
                >
                  + Add Option
                </Button>
              )}
            </div>

            {/* Answer Explanation */}
            <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Explanation & Learning Note (Shown after answering)
              </label>
              <Input
                placeholder="Explain why this answer is correct..."
                value={q.explanation || ""}
                onChange={(e) => updateExplanation(qIndex, e.target.value)}
                className="h-[40px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            {/* Quick Add at End of Question Card */}
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addQuestion(qIndex)}
                className="h-8 px-3 text-xs font-bold rounded-lg border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 shadow-xs bg-white dark:bg-[#18181B]"
              >
                <ListChecks className="h-3.5 w-3.5" /> + MCQ Question
              </Button>
            </div>
          </div>
        );
      })}

      {/* Add New Question Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => addQuestion()}
        className="w-full h-[48px] border-dashed border-2 border-[#2563EB]/40 rounded-xl text-xs font-bold text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5"
      >
        <ListChecks className="h-4 w-4" /> + MCQ Question
      </Button>
    </div>
  );
}

