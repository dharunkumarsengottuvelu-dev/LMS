"use client";

import React, { useState, useEffect } from "react";
import {
  Code2, Plus, Trash2, CheckCircle2, Clock, Play,
  Sparkles, Save, ShieldCheck, Layers, FileText,
  AlertCircle, Check, Eye, ChevronRight, Terminal,
  Cpu, HardDrive, HelpCircle, ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SubmissionService } from "@/services/submission.service";
import type { CodingProblem, TestCase, Difficulty, CodingLanguage } from "@/types/coding";

interface SupportedLangOption {
  id: CodingLanguage;
  label: string;
  defaultTemplate: string;
}

const SUPPORTED_LANGUAGES_LIST: SupportedLangOption[] = [
  {
    id: "c",
    label: "C",
    defaultTemplate: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int max_val = -2000000000;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        if (x > max_val) max_val = x;
    }
    printf("%d\\n", max_val);
    return 0;
}`
  },
  {
    id: "cpp",
    label: "C++",
    defaultTemplate: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    if (!(cin >> n)) return 0;
    int max_val = -2e9;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        if (x > max_val) max_val = x;
    }
    cout << max_val << "\\n";
    return 0;
}`
  },
  {
    id: "java",
    label: "Java",
    defaultTemplate: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int max = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            int val = sc.nextInt();
            if (val > max) max = val;
        }
        System.out.println(max);
    }
}`
  },
  {
    id: "python",
    label: "Python",
    defaultTemplate: `import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    nums = [int(x) for x in input_data[1:n+1]]
    print(max(nums))

if __name__ == "__main__":
    main()`
  },
  {
    id: "javascript",
    label: "JavaScript",
    defaultTemplate: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length === 0 || input[0] === "") return;
    const n = parseInt(input[0], 10);
    const nums = input.slice(1, n + 1).map(Number);
    console.log(Math.max(...nums));
}

main();`
  },
  {
    id: "csharp",
    label: "C#",
    defaultTemplate: `using System;
using System.Linq;

class Solution {
    static void Main() {
        var input = Console.In.ReadToEnd().Split(new[] { ' ', '\\n', '\\r', '\\t' }, StringSplitOptions.RemoveEmptyEntries);
        if (input.Length == 0) return;
        int n = int.Parse(input[0]);
        int[] nums = input.Skip(1).Take(n).Select(int.Parse).ToArray();
        Console.WriteLine(nums.Max());
    }
}`
  },
  {
    id: "go",
    label: "Go",
    defaultTemplate: `package main

import (
    "fmt"
    "os"
)

func main() {
    var n int
    if _, err := fmt.Fscan(os.Stdin, &n); err != nil {
        return
    }
    maxVal := -1000000000
    for i := 0; i < n; i++ {
        var x int
        fmt.Fscan(os.Stdin, &x)
        if x > maxVal {
            maxVal = x
        }
    }
    fmt.Println(maxVal)
}`
  },
  {
    id: "php",
    label: "PHP",
    defaultTemplate: `<?php
$input = file_get_contents('php://stdin');
$tokens = preg_split('/\\s+/', trim($input));
if (empty($tokens) || $tokens[0] === '') exit;
$n = (int)$tokens[0];
$max = -2000000000;
for ($i = 1; $i <= $n; $i++) {
    $val = (int)$tokens[$i];
    if ($val > $max) $max = $val;
}
echo $max . "\\n";
?>`
  }
];

export interface CodingProblemCreatorProps {
  onCancel?: () => void;
  onSave?: (problem: CodingProblem) => void;
  onChange?: (problemData: {
    title: string;
    description: string;
    difficulty: Difficulty;
    constraints: string;
    inputFormat: string;
    outputFormat: string;
    templates: Record<string, string>;
    publicTestCases: TestCase[];
    hiddenTestCases: TestCase[];
  }) => void;
  initialTitle?: string;
  initialDescription?: string;
  hideHeader?: boolean;
  inline?: boolean;
  onAddAnotherQuestion?: () => void;
}

export function CodingProblemCreator({
  onCancel,
  onSave,
  onChange,
  initialTitle,
  initialDescription,
  hideHeader = false,
  inline = false,
  onAddAnotherQuestion,
}: CodingProblemCreatorProps) {
  const { toast } = useToast();

  // Problem Metadata State
  const [title, setTitle] = useState(initialTitle || "Find the Largest Element");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [points, setPoints] = useState(10);

  // Specifications State
  const [description, setDescription] = useState(
    initialDescription || "Given an array of integers, write a program to find and output the largest element in the array."
  );
  const [inputFormat, setInputFormat] = useState(
    "First line contains an integer N representing the size of the array.\nSecond line contains N space-separated integers."
  );
  const [outputFormat, setOutputFormat] = useState(
    "Print a single integer representing the maximum value found in the array."
  );
  const [constraints, setConstraints] = useState(
    "1 <= N <= 10^5\n-10^9 <= A[i] <= 10^9"
  );

  // Supported Languages
  const [selectedLanguages, setSelectedLanguages] = useState<CodingLanguage[]>([
    "c", "cpp", "java", "python", "javascript"
  ]);

  // Starter Code Templates by Language
  const [activeTemplateLang, setActiveTemplateLang] = useState<CodingLanguage>("java");
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    SUPPORTED_LANGUAGES_LIST.forEach((l) => {
      initial[l.id] = l.defaultTemplate;
    });
    return initial;
  });

  // Public Test Cases
  const [publicTestCases, setPublicTestCases] = useState<TestCase[]>([
    {
      id: "tc_pub_1",
      input: "5\n10 25 7 42 18",
      expected_output: "42",
      is_hidden: false,
      explanation: "Among 10, 25, 7, 42, 18, the maximum number is 42."
    }
  ]);

  // Hidden Test Cases
  const [hiddenTestCases, setHiddenTestCases] = useState<TestCase[]>([
    {
      id: "tc_hid_1",
      input: "6\n-10 -25 -7 -42 -3 -100",
      expected_output: "-3",
      is_hidden: true,
      explanation: "Edge case: negative values."
    },
    {
      id: "tc_hid_2",
      input: "1\n99999",
      expected_output: "99999",
      is_hidden: true,
      explanation: "Single element array."
    }
  ]);

  // Execution Limits
  const [timeLimit, setTimeLimit] = useState(2);
  const [memoryLimit, setMemoryLimit] = useState(256);

  // Published Problems List
  const [publishedProblems, setPublishedProblems] = useState<CodingProblem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const all = SubmissionService.getAllProblems();
    setPublishedProblems(all);
  }, []);

  useEffect(() => {
    if (onChange) {
      const filteredTemplates: Record<string, string> = {};
      selectedLanguages.forEach((lang) => {
        filteredTemplates[lang] = templates[lang] || SUPPORTED_LANGUAGES_LIST.find((l) => l.id === lang)?.defaultTemplate || "";
      });
      onChange({
        title,
        description,
        difficulty,
        constraints,
        inputFormat,
        outputFormat,
        templates: filteredTemplates,
        publicTestCases,
        hiddenTestCases,
      });
    }
  }, [title, description, difficulty, constraints, inputFormat, outputFormat, selectedLanguages, templates, publicTestCases, hiddenTestCases, onChange]);

  const toggleLanguage = (lang: CodingLanguage) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleTemplateChange = (code: string) => {
    setTemplates((prev) => ({
      ...prev,
      [activeTemplateLang]: code
    }));
  };

  const addPublicTestCase = () => {
    setPublicTestCases((prev) => [
      ...prev,
      {
        id: `tc_pub_${Date.now()}`,
        input: "",
        expected_output: "",
        is_hidden: false,
        explanation: ""
      }
    ]);
  };

  const removePublicTestCase = (id: string) => {
    setPublicTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const addHiddenTestCase = () => {
    setHiddenTestCases((prev) => [
      ...prev,
      {
        id: `tc_hid_${Date.now()}`,
        input: "",
        expected_output: "",
        is_hidden: true,
        explanation: ""
      }
    ]);
  };

  const removeHiddenTestCase = (id: string) => {
    setHiddenTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const handleSaveProblem = async (status: "published" | "draft") => {
    if (!title.trim()) {
      toast({ title: "Title Required", description: "Please specify a problem title.", variant: "destructive" });
      return;
    }

    if (publicTestCases.length === 0) {
      toast({ title: "Public Test Case Required", description: "Add at least 1 public test case.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const problemId = `prob_${slug || Date.now()}`;

      const filteredTemplates: Record<string, string> = {};
      selectedLanguages.forEach((lang) => {
        filteredTemplates[lang] = templates[lang] || SUPPORTED_LANGUAGES_LIST.find((l) => l.id === lang)?.defaultTemplate || "";
      });

      const problemData: CodingProblem = {
        id: problemId,
        title: title.trim(),
        slug,
        description: description.trim(),
        difficulty,
        category: "Algorithms",
        constraints,
        input_format: inputFormat,
        output_format: outputFormat,
        points: points || 10,
        sample_input: publicTestCases[0]?.input || "",
        sample_output: publicTestCases[0]?.expected_output || "",
        templates: filteredTemplates,
        test_cases: [...publicTestCases, ...hiddenTestCases],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await SubmissionService.saveProblem(problemData);
      setPublishedProblems(SubmissionService.getAllProblems());

      if (onSave) {
        onSave(problemData);
      }

      toast({
        title: status === "published" ? "Problem Published!" : "Problem Saved as Draft",
        description: `"${title}" has been successfully saved to the compiler sandbox.`,
      });

      if (onCancel) onCancel();
    } catch (err) {
      console.error("Failed to save coding problem:", err);
      toast({ title: "Save Failed", description: "Could not save problem. Please check input.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={inline ? "space-y-6 w-full" : "space-y-8 max-w-5xl mx-auto pb-16"}>
      {/* Top Header */}
      {!hideHeader && !inline && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-center gap-3">
            {onCancel && (
              <Button onClick={onCancel} variant="outline" size="sm" className="h-9 font-semibold text-xs gap-2 border-[#E5E7EB] dark:border-[#27272A]">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-[#9333EA]" />
                <h1 className="text-xl font-bold uppercase tracking-wider text-[#111827] dark:text-[#FAFAFA]">
                  Create Coding Problem
                </h1>
              </div>
              <p className="text-xs text-[#6B7280]">Author algorithmic coding problems, test cases, and starter templates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveProblem("draft")}
              disabled={isSaving}
              className="h-10 px-5 text-xs font-semibold rounded-xl border-[#E5E7EB] dark:border-[#27272A] gap-2"
            >
              <Save className="h-3.5 w-3.5" /> Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveProblem("published")}
              disabled={isSaving}
              className="h-10 px-6 bg-[#9333EA] hover:bg-[#7E22CE] text-white text-xs font-semibold rounded-xl gap-2 shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" /> Publish Problem
            </Button>
          </div>
        </div>
      )}

      {/* Main Authoring Form */}
      <div className="space-y-8">
        
        {/* Section 1: Problem Overview */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9333EA] flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> 1. Problem Overview & Parameters
            </h2>
            {onAddAnotherQuestion && (
              <Button
                type="button"
                onClick={onAddAnotherQuestion}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-bold border-[#9333EA]/30 text-[#9333EA] hover:bg-[#9333EA]/10 gap-1 rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Coding Question
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Find the Largest Element"
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Difficulty</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                  <SelectTrigger className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Duration (Minutes)</label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                  className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Total Problem Points</label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value, 10) || 10)}
                  className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Problem Specifications */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9333EA] flex items-center gap-2">
            <FileText className="h-4 w-4" /> 2. Problem Statement & Specifications
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Statement</label>
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write full problem description..."
                className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Input Format</label>
                <Textarea
                  rows={3}
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  placeholder="Format of inputs..."
                  className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Output Format</label>
                <Textarea
                  rows={3}
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  placeholder="Format of outputs..."
                  className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Constraints</label>
              <Textarea
                rows={2}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g. 1 <= N <= 10^5"
                className="text-xs font-mono rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>
          </div>
        </Card>

        {/* Section 3: Supported Languages */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9333EA] flex items-center gap-2">
            <Cpu className="h-4 w-4" /> 3. Supported Execution Languages
          </h2>
          <p className="text-xs text-[#6B7280]">Select the programming languages students can use to submit their code:</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SUPPORTED_LANGUAGES_LIST.map((lang) => {
              const isChecked = selectedLanguages.includes(lang.id);
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => toggleLanguage(lang.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-bold transition-all text-left ${
                    isChecked
                      ? "bg-[#9333EA]/10 border-[#9333EA] text-[#9333EA] dark:text-[#C084FC]"
                      : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                    isChecked ? "bg-[#9333EA] border-[#9333EA] text-white" : "border-[#9CA3AF]"
                  }`}>
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Section 4: Starter Code Template */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#9333EA] flex items-center gap-2">
                <Terminal className="h-4 w-4" /> 4. Starter Code Templates
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Author standard I/O template code for each language</p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedLanguages.map((langId) => {
                const langObj = SUPPORTED_LANGUAGES_LIST.find((l) => l.id === langId);
                const isActive = activeTemplateLang === langId;
                return (
                  <button
                    key={langId}
                    type="button"
                    onClick={() => setActiveTemplateLang(langId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#9333EA] text-white shadow-sm"
                        : "bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    {langObj?.label || langId}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">
                Language Template: <span className="text-[#9333EA] font-mono">{activeTemplateLang.toUpperCase()}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const defaultCode = SUPPORTED_LANGUAGES_LIST.find((l) => l.id === activeTemplateLang)?.defaultTemplate || "";
                  handleTemplateChange(defaultCode);
                }}
                className="text-[11px] text-[#2563EB] hover:underline"
              >
                Reset to Default Solution Template
              </button>
            </div>

            <Textarea
              rows={12}
              value={templates[activeTemplateLang] || ""}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="font-mono text-xs leading-relaxed bg-[#09090B] text-[#FAFAFA] border-[#27272A] rounded-xl p-4"
            />
          </div>
        </Card>

        {/* Section 5: Public Test Cases */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> 5. Public Test Cases ({publicTestCases.length})
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Visible sample inputs & expected outputs for student testing</p>
            </div>
            <Button
              type="button"
              onClick={addPublicTestCase}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold border-[#2563EB] text-[#2563EB] gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Test Case
            </Button>
          </div>

          <div className="space-y-4">
            {publicTestCases.map((tc, idx) => (
              <div key={tc.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#2563EB] text-white text-[10px] font-bold">Public Case #{idx + 1}</Badge>
                  {publicTestCases.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removePublicTestCase(tc.id)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#DC2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6B7280]">Input (STDIN)</label>
                    <Textarea
                      rows={3}
                      value={tc.input}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPublicTestCases((prev) =>
                          prev.map((item) => (item.id === tc.id ? { ...item, input: val } : item))
                        );
                      }}
                      placeholder="e.g. 5&#10;10 25 7 42 18"
                      className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6B7280]">Expected Output (STDOUT)</label>
                    <Textarea
                      rows={3}
                      value={tc.expected_output}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPublicTestCases((prev) =>
                          prev.map((item) => (item.id === tc.id ? { ...item, expected_output: val } : item))
                        );
                      }}
                      placeholder="e.g. 42"
                      className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#6B7280]">Explanation (Optional)</label>
                  <Input
                    value={tc.explanation || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPublicTestCases((prev) =>
                        prev.map((item) => (item.id === tc.id ? { ...item, explanation: val } : item))
                      );
                    }}
                    placeholder="Explanation of test case..."
                    className="text-xs bg-white dark:bg-[#18181B] rounded-lg h-9"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 6: Hidden Test Cases */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#D97706] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> 6. Hidden Test Cases ({hiddenTestCases.length})
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Evaluation test cases used for scoring (hidden from students)</p>
            </div>
            <Button
              type="button"
              onClick={addHiddenTestCase}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold border-[#D97706] text-[#D97706] gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Hidden Test Case
            </Button>
          </div>

          <div className="space-y-4">
            {hiddenTestCases.map((tc, idx) => (
              <div key={tc.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#D97706] text-white text-[10px] font-bold">Hidden Case #{idx + 1}</Badge>
                  {hiddenTestCases.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeHiddenTestCase(tc.id)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#DC2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6B7280]">Input (STDIN)</label>
                    <Textarea
                      rows={3}
                      value={tc.input}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHiddenTestCases((prev) =>
                          prev.map((item) => (item.id === tc.id ? { ...item, input: val } : item))
                        );
                      }}
                      placeholder="Input..."
                      className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6B7280]">Expected Output (STDOUT)</label>
                    <Textarea
                      rows={3}
                      value={tc.expected_output}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHiddenTestCases((prev) =>
                          prev.map((item) => (item.id === tc.id ? { ...item, expected_output: val } : item))
                        );
                      }}
                      placeholder="Expected Output..."
                      className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 7: Execution Limits */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9333EA] flex items-center gap-2">
            <Clock className="h-4 w-4" /> 7. Execution Environment Limits
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Time Limit (Seconds)</label>
              <Input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 2)}
                className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Memory Limit (MB)</label>
              <Input
                type="number"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(parseInt(e.target.value, 10) || 256)}
                className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        {!inline && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveProblem("draft")}
              disabled={isSaving}
              className="h-12 px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveProblem("published")}
              disabled={isSaving}
              className="h-12 px-8 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" /> Publish Problem
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
