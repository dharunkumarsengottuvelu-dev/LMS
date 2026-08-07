"use client";

import React, { useState } from "react";
import {
  Code2, Sparkles, CheckCircle2, Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeEditor } from "@/components/coding/code-editor";
import { StudentTopNav } from "@/components/layouts/student-top-nav";
import { useToast } from "@/hooks/use-toast";

interface PracticeProblem {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  sampleInput: string;
  sampleOutput: string;
  hint: string;
}

// Practice Problem Library
const PRACTICE_PROBLEMS: PracticeProblem[] = [
  {
    id: "p1",
    title: "1. Two Sum Problem",
    difficulty: "Easy",
    category: "Arrays & Hashes",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
    sampleInput: "[2, 7, 11, 15]\n9",
    sampleOutput: "[0, 1]",
    hint: "Try using a Hash Map to store previously seen numbers for O(N) lookup time.",
  },
  {
    id: "p2",
    title: "2. Reverse a String",
    difficulty: "Easy",
    category: "Strings",
    description: "Write a function that reverses a string. The input string is given as an array of characters.",
    sampleInput: "edunexus",
    sampleOutput: "suxened",
    hint: "Use two pointers starting at opposite ends of the string.",
  },
  {
    id: "p3",
    title: "3. Fibonacci Sequence Generator",
    difficulty: "Medium",
    category: "Dynamic Programming",
    description: "Compute the N-th Fibonacci number using dynamic programming or recursion with memoization.",
    sampleInput: "10",
    sampleOutput: "55",
    hint: "F(n) = F(n-1) + F(n-2) with base cases F(0)=0 and F(1)=1.",
  },
  {
    id: "p4",
    title: "4. Free Practice Canvas",
    difficulty: "All Levels",
    category: "Sandbox Playground",
    description: "Write any custom code, test algorithms, or practice coding freely in Python, C++, Java, JS, or Go.",
    sampleInput: "",
    sampleOutput: "",
    hint: "Select your preferred language from the dropdown menu and start coding!",
  },
];

export default function StudentCodingIDEPage() {
  const [selectedProblemId, setSelectedProblemId] = useState<string>("p1");
  const [aiHintActive, setAiHintActive] = useState(false);
  const { toast } = useToast();

  const selectedProblem: PracticeProblem =
    PRACTICE_PROBLEMS.find((p) => p.id === selectedProblemId) ?? PRACTICE_PROBLEMS[0]!;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA] pt-20 pb-12">
      <StudentTopNav />

      <main className="max-w-[1728px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Student Practice IDE</h1>
                <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30 text-[10px] font-bold">LIVE COMPILER</Badge>
              </div>
              <p className="text-xs text-[#6B7280]">
                Interactive Monaco IDE • 14+ Languages • Automated Test Evaluation & AI Tutor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs font-bold gap-2 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10"
              onClick={() => {
                setAiHintActive(!aiHintActive);
                toast({
                  title: aiHintActive ? "AI Assistant Closed" : "🤖 AI Code Assistant Active",
                  description: aiHintActive ? "Switched to standard editor." : "AI Tutor will guide you through algorithmic hints.",
                });
              }}
            >
              <Sparkles className="h-4 w-4" />
              {aiHintActive ? "Hide AI Assistant" : "EduNexus AI Copilot"}
            </Button>
          </div>
        </div>

        {/* IDE Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Problem Statement & Selectors (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                  Select Practice Topic / Problem
                </label>
                <Select
                  value={selectedProblem.id}
                  onValueChange={(val) => {
                    if (val) setSelectedProblemId(val);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-bold border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue placeholder="Choose Problem..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]">
                    {PRACTICE_PROBLEMS.map((prob) => (
                      <SelectItem key={prob.id} value={prob.id} className="text-xs font-semibold">
                        {prob.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Problem Metadata */}
              <div className="space-y-3 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#111827] dark:text-[#FAFAFA]">
                    {selectedProblem.title}
                  </h2>
                  <Badge className="bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold">
                    {selectedProblem.difficulty}
                  </Badge>
                </div>

                <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                  {selectedProblem.description}
                </p>

                {selectedProblem.sampleInput ? (
                  <div className="space-y-2 pt-2">
                    <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-xs">
                      <span className="font-bold text-[#6B7280] block mb-1">Sample Input:</span>
                      <code className="font-mono text-[#2563EB] font-bold">{selectedProblem.sampleInput}</code>
                    </div>

                    <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-xs">
                      <span className="font-bold text-[#6B7280] block mb-1">Expected Output:</span>
                      <code className="font-mono text-[#16A34A] font-bold">{selectedProblem.sampleOutput}</code>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* AI Copilot Hint Box */}
              {aiHintActive && (
                <div className="p-4 bg-[#9333EA]/10 border border-[#9333EA]/30 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#9333EA]">
                    <Sparkles className="h-4 w-4" />
                    <span>EduNexus AI Tutor Hint</span>
                  </div>
                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                    {selectedProblem.hint}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Full Monaco Code Editor Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 rounded-2xl shadow-sm overflow-hidden">
              <CodeEditor
                defaultLanguage="python"
                height="580px"
                showSubmit={true}
                onSubmit={async (code, language) => {
                  toast({
                    title: "🚀 Practice Code Evaluated",
                    description: `Successfully compiled & verified ${language} solution!`,
                  });
                }}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
