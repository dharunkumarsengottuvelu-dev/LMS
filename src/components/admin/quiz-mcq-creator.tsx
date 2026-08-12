"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface McqQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizMcqCreatorProps {
  value: string;
  onChange: (value: string) => void;
}

export function QuizMcqCreator({ value, onChange }: QuizMcqCreatorProps) {
  const [questions, setQuestions] = useState<McqQuestion[]>([]);

  useEffect(() => {
    // Only update if the parent value is different from our stringified state
    if (value !== JSON.stringify(questions)) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setQuestions(parsed);
        }
      } catch (e) {
        if (value && !value.startsWith("[")) {
          setQuestions([{
            id: Date.now().toString(),
            question: value,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 0
          }]);
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

  const addQuestion = () => {
    const newQs = [...questions, {
      id: Date.now().toString(),
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0
    }];
    setQuestions(newQs);
    saveToParent(newQs);
  };

  const updateQuestion = (index: number, val: string) => {
    const newQs = [...questions];
    newQs[index] = { ...newQs[index], question: val };
    setQuestions(newQs);
    saveToParent(newQs);
  };

  const updateOption = (qIndex: number, optIndex: number, val: string) => {
    const newQs = [...questions];
    const newOptions = [...newQs[qIndex].options];
    newOptions[optIndex] = val;
    newQs[qIndex] = { ...newQs[qIndex], options: newOptions };
    setQuestions(newQs);
    saveToParent(newQs);
  };

  const setCorrectOption = (qIndex: number, optIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex] = { ...newQs[qIndex], correctIndex: optIndex };
    setQuestions(newQs);
    saveToParent(newQs);
  };

  const removeQuestion = (index: number) => {
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
    saveToParent(newQs);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, qIndex) => (
        <div key={q.id} className="p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] space-y-4 shadow-sm relative group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Question {qIndex + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeQuestion(qIndex)}
              className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <Textarea 
            placeholder="Type your question here..."
            value={q.question}
            onChange={(e) => updateQuestion(qIndex, e.target.value)}
            className="text-sm rounded-xl min-h-[80px] bg-[#F9FAFB] dark:bg-[#09090B] focus-visible:ring-[#D97706]/30 border-[#E5E7EB] dark:border-[#27272A]"
          />
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Answer Options</label>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#D97706]">
                Select the correct answer
              </span>
            </div>
            <div className="grid gap-2">
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-3 relative group/option">
                  <button
                    type="button"
                    title="Click to set as correct answer"
                    onClick={() => setCorrectOption(qIndex, oIndex)}
                    className="shrink-0 transition-all outline-none"
                  >
                    {q.correctIndex === oIndex ? (
                      <CheckCircle2 className="h-6 w-6 text-[#D97706] scale-110 shadow-sm rounded-full bg-white dark:bg-black" />
                    ) : (
                      <Circle className="h-6 w-6 text-[#D1D5DB] group-hover/option:text-[#9CA3AF] dark:text-[#3F3F46] dark:group-hover/option:text-[#9CA3AF]" />
                    )}
                  </button>
                  <Input 
                    value={opt}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    placeholder={`Option ${oIndex + 1}`}
                    className={`h-[42px] text-xs rounded-xl transition-all ${
                      q.correctIndex === oIndex 
                        ? "border-[#D97706]/40 bg-[#D97706]/5 focus-visible:ring-[#D97706]/30" 
                        : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addQuestion}
        className="w-full h-[46px] border-dashed border-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA] dark:border-[#27272A] hover:bg-[#F9FAFB] dark:hover:bg-[#18181B]"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Question
      </Button>
    </div>
  );
}
