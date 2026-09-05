"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodingProblemsService } from "@/services/coding-problems.service";
import type {
  CodingProblem,
  Difficulty,
  TestCase,
  ExampleCase,
  SolutionEditorial,
  SolutionApproach,
} from "@/types/coding";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Code2,
  FileText,
  HelpCircle,
  Clock,
  Play,
  CheckCircle2,
  Copy,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const AVAILABLE_TOPICS = [
  "Array",
  "String",
  "Hash Table",
  "Dynamic Programming",
  "Two Pointers",
  "Binary Search",
  "Math",
  "Stack",
  "Greedy",
  "Tree",
  "Depth-First Search",
  "Breadth-First Search",
  "Graph",
  "Recursion",
  "Sorting",
  "Sliding Window",
  "Bit Manipulation",
  "Divide and Conquer",
  "Database",
  "SQL",
];

const DEFAULT_STARTER_CODES: Record<string, string> = {
  python: `class Solution:
    def solve(self):
        # Write your code here
        pass
`,
  java: `class Solution {
    public void solve() {
        // Write your code here
    }
}
`,
  cpp: `#include <iostream>
using namespace std;

class Solution {
public:
    void solve() {
        // Write your code here
    }
};
`,
  c: `#include <stdio.h>
#include <stdlib.h>

void solve() {
    // Write your code here
}
`,
  javascript: `/**
 * @return {void}
 */
var solve = function() {
    // Write your code here
};
`,
  typescript: `function solve(): void {
    // Write your code here
}
`,
};

export interface CodingProblemCreatorProps {
  initialProblem?: Partial<ExtendedCodingProblem | CodingProblem>;
  initialTitle?: string;
  initialDescription?: string;
  initialDifficulty?: Difficulty;
  initialConstraints?: string;
  initialInputFormat?: string;
  initialOutputFormat?: string;
  initialTemplates?: Record<string, string>;
  initialPublicTestCases?: TestCase[];
  initialHiddenTestCases?: TestCase[];
  initialQuestionType?: "programming" | "sql";
  initialSqlEngine?: any;
  initialSchemaSql?: any;
  initialSeedSql?: any;
  initialComparisonMode?: any;
  initialProvideTables?: any;
  initialSqlQuestionMode?: any;
  onCancel?: () => void;
  onSave?: (problem: any) => void;
  onChange?: (data: any) => void;
  hideHeader?: boolean;
  inline?: boolean;
}

export function CodingProblemCreator({
  initialProblem,
  initialTitle,
  initialDescription,
  initialDifficulty,
  initialConstraints,
  initialInputFormat,
  initialOutputFormat,
  initialTemplates,
  initialPublicTestCases,
  initialHiddenTestCases,
  onCancel,
  onSave,
  onChange,
}: CodingProblemCreatorProps) {
  const existing = useMemo(() => {
    return initialProblem || {};
  }, [initialProblem]);

  // View Mode: "edit_form" or "live_preview"
  const [activeView, setActiveView] = useState<"edit_form" | "live_preview">("edit_form");

  // 1. BASIC PROBLEM INFORMATION
  const [problemNumber, setProblemNumber] = useState<string>(() => {
    if (existing.id) return existing.id;
    const all = CodingProblemsService.getAllProblems();
    const maxId = all.reduce((max, p) => Math.max(max, parseInt(p.id, 10) || 0), 0);
    return String(maxId + 1);
  });

  // Auto-sync problem number if creating a new problem and existing problem list loads
  useEffect(() => {
    if (!existing.id) {
      CodingProblemsService.fetchProblems().then((all) => {
        if (all && all.length > 0) {
          const maxId = all.reduce((max, p) => Math.max(max, parseInt(p.id, 10) || 0), 0);
          setProblemNumber((curr) => (!curr || curr === "1" ? String(maxId + 1) : curr));
        }
      });
    }
  }, [existing.id]);

  const [title, setTitle] = useState<string>(existing.title || initialTitle || "");
  const [slug, setSlug] = useState<string>(existing.slug || "");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    existing.difficulty || initialDifficulty || "easy"
  );
  const [category, setCategory] = useState<string>(existing.category || "");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    (existing as ExtendedCodingProblem).topic_tags || []
  );
  const [points, setPoints] = useState<number>(existing.points || 100);
  const [customTagInput, setCustomTagInput] = useState<string>("");

  // Acceptance Rate (Auto from submissions vs Manual override)
  const initialRate = (existing as any).acceptance_rate
    ? String((existing as any).acceptance_rate).replace("%", "").trim()
    : "";
  const [isManualAcceptance, setIsManualAcceptance] = useState<boolean>(
    Boolean((existing as any).is_manual_acceptance || (existing as any).acceptance_rate)
  );
  const [manualAcceptanceRate, setManualAcceptanceRate] = useState<string>(initialRate);

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;

    const tagsToAdd = trimmed
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated = [...selectedTopics];
    let addedCount = 0;
    tagsToAdd.forEach((tag) => {
      if (!updated.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        updated.push(tag);
        addedCount++;
      }
    });

    setSelectedTopics(updated);
    setCustomTagInput("");
    if (addedCount > 0) {
      toast.success(`Added ${addedCount} tag${addedCount > 1 ? "s" : ""}`);
    } else {
      toast.info("Tag already exists in selection");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTopics(selectedTopics.filter((t) => t !== tagToRemove));
  };

  // 2. PROBLEM DESCRIPTION
  const [description, setDescription] = useState<string>(
    existing.description || initialDescription || ""
  );

  // 3. EXAMPLES
  const [examples, setExamples] = useState<ExampleCase[]>(() => {
    if (existing.example_cases && existing.example_cases.length > 0) {
      return existing.example_cases;
    }
    return [
      {
        id: "1",
        input: "",
        output: "",
        explanation: "",
      },
    ];
  });

  // 4. CONSTRAINTS
  const [constraints, setConstraints] = useState<string>(
    existing.constraints || initialConstraints || ""
  );

  // 5. INPUT / OUTPUT
  const [inputFormat, setInputFormat] = useState<string>(
    existing.input_format || initialInputFormat || ""
  );
  const [outputFormat, setOutputFormat] = useState<string>(
    existing.output_format || initialOutputFormat || ""
  );

  // 6. CODE CONFIGURATION
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    if (existing.templates && Object.keys(existing.templates).length > 0) {
      return existing.templates;
    }
    if (initialTemplates && Object.keys(initialTemplates).length > 0) {
      return initialTemplates;
    }
    return DEFAULT_STARTER_CODES;
  });
  const [activeCodeLang, setActiveCodeLang] = useState<string>("python");
  const [functionSignature, setFunctionSignature] = useState<string>(
    existing.function_signature || ""
  );
  const [driverCode, setDriverCode] = useState<string>(
    (existing as any).driver_code?.[activeCodeLang] || ""
  );
  const [timeLimitMs, setTimeLimitMs] = useState<number>(existing.time_limit_ms || 2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(existing.memory_limit_mb || 256);

  // 7 & 8. TEST CASES (PUBLIC & HIDDEN)
  const [testCases, setTestCases] = useState<TestCase[]>(() => {
    if (existing.test_cases && existing.test_cases.length > 0) {
      return existing.test_cases;
    }
    const combined: TestCase[] = [];
    if (initialPublicTestCases) {
      combined.push(...initialPublicTestCases.map((tc) => ({ ...tc, is_hidden: false })));
    }
    if (initialHiddenTestCases) {
      combined.push(...initialHiddenTestCases.map((tc) => ({ ...tc, is_hidden: true })));
    }
    if (combined.length > 0) return combined;

    return [
      {
        id: "tc-1",
        name: "Test Case 1",
        input: "",
        expected_output: "",
        is_hidden: false,
        weight: 10,
        is_enabled: true,
      },
    ];
  });

  // 9. SOLUTION
  const [editorialOverview, setEditorialOverview] = useState<string>(() => {
    return (existing as ExtendedCodingProblem).solution_editorial?.overview || "";
  });
  const [approaches, setApproaches] = useState<SolutionApproach[]>(() => {
    const edit = (existing as ExtendedCodingProblem).solution_editorial;
    if (edit && edit.approaches && edit.approaches.length > 0) {
      return edit.approaches;
    }
    return [];
  });

  // 10. PROBLEM SETTINGS
  const [maxAttempts, setMaxAttempts] = useState<number>(existing.max_attempts || 0);
  const [startDate, setStartDate] = useState<string>(existing.start_date || "");
  const [dueDate, setDueDate] = useState<string>(existing.due_date || "");
  const [status, setStatus] = useState<"draft" | "published">(
    existing.status || (existing.id ? "published" : "draft")
  );
  const [allowRun, setAllowRun] = useState<boolean>(existing.allow_run !== false);
  const [allowSubmit, setAllowSubmit] = useState<boolean>(existing.allow_submit !== false);
  const [isMandatory, setIsMandatory] = useState<boolean>(!!existing.is_mandatory);

  // Live Preview Tabs & Interactive State
  const [previewLeftTab, setPreviewLeftTab] = useState<"description" | "solutions" | "submissions" | "discuss">("description");
  const [previewActiveTestTab, setPreviewActiveTestTab] = useState<number>(0);
  const [previewConsoleOutput, setPreviewConsoleOutput] = useState<string | null>(null);

  // Notify parent on change
  React.useEffect(() => {
    if (onChange) {
      onChange({
        title,
        description,
        difficulty,
        constraints,
        input_format: inputFormat,
        output_format: outputFormat,
        templates,
        test_cases: testCases,
      });
    }
  }, [title, description, difficulty, constraints, inputFormat, outputFormat, templates, testCases, onChange]);

  // Handlers for Examples
  const handleAddExample = () => {
    const nextIdx = examples.length + 1;
    setExamples((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        input: "",
        output: "",
        explanation: "",
      },
    ]);
  };

  const handleUpdateExample = (index: number, field: keyof ExampleCase, value: string) => {
    setExamples((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as ExampleCase;
      return updated;
    });
  };

  const handleDeleteExample = (index: number) => {
    if (examples.length <= 1) {
      toast.error("A problem must have at least 1 example.");
      return;
    }
    setExamples((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveExample = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === examples.length - 1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const itemA = examples[index];
    const itemB = examples[targetIdx];
    if (!itemA || !itemB) return;
    const updated = [...examples];
    updated[index] = itemB;
    updated[targetIdx] = itemA;
    setExamples(updated);
  };

  // Handlers for Test Cases
  const handleAddTestCase = (isHidden: boolean = false) => {
    const nextNum = testCases.length + 1;
    const newCase: TestCase = {
      id: `tc-${Date.now()}`,
      name: `Test Case ${nextNum}`,
      input: "",
      expected_output: "",
      is_hidden: isHidden,
      weight: 10,
      is_enabled: true,
    };
    setTestCases((prev) => [...prev, newCase]);
  };

  const handleUpdateTestCase = (index: number, field: keyof TestCase, value: any) => {
    setTestCases((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as TestCase;
      return updated;
    });
  };

  const handleDeleteTestCase = (index: number) => {
    if (testCases.length <= 1) {
      toast.error("At least 1 test case is required.");
      return;
    }
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers for Approaches
  const handleAddApproach = () => {
    const nextIdx = approaches.length + 1;
    setApproaches((prev) => [
      ...prev,
      {
        name: `Approach ${nextIdx}`,
        timeComplexity: "",
        spaceComplexity: "",
        explanation: "",
        code: { python: "" },
      },
    ]);
  };

  const handleUpdateApproach = (index: number, field: keyof SolutionApproach, value: any) => {
    setApproaches((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as SolutionApproach;
      return updated;
    });
  };

  const handleDeleteApproach = (index: number) => {
    setApproaches((prev) => prev.filter((_, i) => i !== index));
  };

  // Save / Publish Pipeline
  const handleSave = async (saveStatus: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("Please provide a Problem Title.");
      return;
    }

    const autoSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const cleanNumber = problemNumber.trim() || String(Date.now()).slice(-4);

    const editorial: SolutionEditorial = {
      overview: editorialOverview,
      approaches,
    };

    const problemRecord: CodingProblem = {
      id: cleanNumber,
      title: title.trim(),
      slug: autoSlug,
      description: description.trim(),
      difficulty,
      category,
      topic_tags: selectedTopics,
      points,
      constraints,
      input_format: inputFormat,
      output_format: outputFormat,
      example_cases: examples,
      solution_editorial: editorial,
      templates,
      function_signature: functionSignature,
      test_cases: testCases,
      status: saveStatus,
      max_attempts: maxAttempts,
      time_limit_ms: timeLimitMs,
      memory_limit_mb: memoryLimitMb,
      start_date: startDate,
      due_date: dueDate,
      allow_run: allowRun,
      allow_submit: allowSubmit,
      is_mandatory: isMandatory,
      acceptance_rate: isManualAcceptance && manualAcceptanceRate.trim()
        ? `${manualAcceptanceRate.trim().replace("%", "")}%`
        : (existing as any).acceptance_rate || undefined,
      created_at: existing.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await CodingProblemsService.saveProblem(problemRecord);
      toast.success(
        saveStatus === "published"
          ? `Problem "${problemRecord.title}" published successfully.`
          : `Problem draft saved.`
      );
      if (onSave) {
        onSave(problemRecord);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save problem.");
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // VIEW: LIVE PREVIEW MODE (EXACT STUDENT PROBLEM PAGE STRUCTURE)
  // ════════════════════════════════════════════════════════════════════
  if (activeView === "live_preview") {
    const publicCases = testCases.filter((tc) => !tc.is_hidden && tc.is_enabled !== false);
    const hiddenCases = testCases.filter((tc) => tc.is_hidden && tc.is_enabled !== false);
    const activeCase = publicCases[previewActiveTestTab] || publicCases[0];

    return (
      <div className="flex flex-col h-[calc(100vh-85px)] bg-white text-slate-900 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Top Preview Banner */}
        <div className="h-12 bg-slate-900 text-white px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-xs font-semibold uppercase tracking-wider border border-blue-400/30">
              Live Student Preview
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Viewing exact problem interface seen by students at /coding/problems/{problemNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveView("edit_form")}
              className="h-8 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Editor</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSave("published")}
              className="h-8 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Publish Problem
            </Button>
          </div>
        </div>

        {/* ── STUDENT PROBLEM WORKSPACE ── */}
        <div className="flex-1 flex flex-col overflow-hidden font-sans">
          {/* Top Bar: Problem Title, Difficulty, Acceptance, Points */}
          <div className="h-11 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-slate-400">#{problemNumber}.</span>
              <span className="font-bold text-slate-900 text-sm">{title || "Untitled Problem"}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize ${
                  difficulty === "easy"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : difficulty === "medium"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {difficulty}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                Acceptance: <strong>{isManualAcceptance && manualAcceptanceRate ? `${manualAcceptanceRate.trim().replace("%", "")}%` : (existing as any).acceptance_rate ? `${(existing as any).acceptance_rate}%` : "—"}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-600 font-medium">
                Points: <strong>{points}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Limit: {timeLimitMs}ms / {memoryLimitMb}MB</span>
            </div>
          </div>

          {/* 2-Pane Body */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Description / Solutions / Submissions / Discuss */}
            <div className="w-full md:w-1/2 border-r border-slate-200 flex flex-col h-full overflow-hidden bg-white">
              {/* Tab Header */}
              <div className="h-10 px-4 border-b border-slate-200 bg-slate-50/70 flex items-center gap-1 text-xs shrink-0">
                {(["description", "solutions", "submissions", "discuss"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPreviewLeftTab(tab)}
                    className={`px-3 py-1.5 rounded-md font-semibold text-xs capitalize transition-colors ${
                      previewLeftTab === tab
                        ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Left Pane Tab Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
                {previewLeftTab === "description" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{title || "Problem Title"}</h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="capitalize font-semibold text-emerald-700">{difficulty}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{points} pts</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">Category: {category}</span>
                      </div>
                    </div>

                    {/* Problem Statement */}
                    <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                      {description || "No description provided."}
                    </div>

                    {/* Examples */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-900 text-sm">Examples</h3>
                      {examples.map((eg, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs font-mono">
                          <div className="font-bold text-xs text-slate-500 uppercase tracking-wider font-sans">
                            Example {idx + 1}:
                          </div>
                          <div>
                            <strong className="text-slate-900 font-sans">Input: </strong>
                            <span className="text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {eg.input}
                            </span>
                          </div>
                          <div>
                            <strong className="text-slate-900 font-sans">Output: </strong>
                            <span className="text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {eg.output}
                            </span>
                          </div>
                          {eg.explanation && (
                            <div className="text-xs text-slate-500 mt-1 font-sans">
                              <strong className="text-slate-700">Explanation: </strong>
                              {eg.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Constraints */}
                    {constraints && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-900 text-sm">Constraints:</h3>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">
                          {constraints}
                        </div>
                      </div>
                    )}

                    {/* Input & Output Specifications */}
                    {(inputFormat || outputFormat) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {inputFormat && (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                            <strong className="text-slate-800 block mb-1">Input Format:</strong>
                            <p className="text-slate-600 leading-relaxed font-mono">{inputFormat}</p>
                          </div>
                        )}
                        {outputFormat && (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                            <strong className="text-slate-800 block mb-1">Output Format:</strong>
                            <p className="text-slate-600 leading-relaxed font-mono">{outputFormat}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Topic Tags */}
                    {selectedTopics.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topics</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTopics.map((t) => (
                            <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {previewLeftTab === "solutions" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Official Editorial Solution</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Algorithmic breakdown, complexity, and sample reference implementation.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/60 text-xs text-slate-700 leading-relaxed">
                      {editorialOverview || "Official editorial overview provided by course trainer."}
                    </div>

                    {approaches.map((app, idx) => (
                      <div key={idx} className="space-y-3 p-4 rounded-xl border border-slate-200 bg-white text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">{app.name}</h4>
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                              Time: {app.timeComplexity}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                              Space: {app.spaceComplexity}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-600 leading-relaxed">{app.explanation}</p>

                        {app.code && Object.entries(app.code).map(([lang, snippet]) => (
                          <div key={lang} className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
                              <span className="uppercase font-mono">{lang}</span>
                              <span className="text-slate-400">Reference Solution</span>
                            </div>
                            <pre className="p-3 bg-white text-xs font-mono text-slate-800 overflow-x-auto">
                              {snippet}
                            </pre>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {previewLeftTab === "submissions" && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <p className="font-semibold text-slate-700">Submissions Tab</p>
                    <p className="mt-1">Students will view their submission history and verdicts here.</p>
                  </div>
                )}

                {previewLeftTab === "discuss" && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <p className="font-semibold text-slate-700">Discuss Forum</p>
                    <p className="mt-1">Students can share their code and ask questions about this problem.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Monaco Code Editor + Testcase Drawer */}
            <div className="w-full md:w-1/2 flex flex-col h-full overflow-hidden bg-slate-50/50">
              {/* Language Selector Bar */}
              <div className="h-10 px-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  <Select value={activeCodeLang} onValueChange={(val) => setActiveCodeLang(val || "python")}>
                    <SelectTrigger className="h-7.5 text-xs w-[130px] font-semibold bg-white border border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                      <SelectItem value="c">C</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewConsoleOutput(`Execution Verdict: Accepted (Test Case 1 Passed in 42ms)\nStdout: ${activeCase?.expected_output || "0 1"}`);
                      toast.success("Code run complete");
                    }}
                    className="h-7 text-xs font-semibold gap-1 text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
                  >
                    <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                    <span>Run</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      toast.success("Submission evaluated against hidden test cases: Accepted 100%");
                    }}
                    className="h-7 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Submit
                  </Button>
                </div>
              </div>

              {/* Monaco Code Editor */}
              <div className="flex-1 min-h-[300px] overflow-hidden">
                <Editor
                  height="100%"
                  language={activeCodeLang === "c" || activeCodeLang === "cpp" ? "cpp" : activeCodeLang}
                  theme="vs"
                  value={templates[activeCodeLang] || ""}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Bottom Testcase Strip */}
              <div className="h-44 border-t border-slate-200 bg-white p-3.5 flex flex-col shrink-0 overflow-hidden">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Testcase</span>
                    <span className="text-slate-300">|</span>
                    {publicCases.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewActiveTestTab(idx)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          previewActiveTestTab === idx
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    +{hiddenCases.length} Hidden Test Cases (Submit only)
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pt-2 space-y-2 text-xs font-mono">
                  {previewConsoleOutput ? (
                    <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-900 whitespace-pre-wrap">
                      {previewConsoleOutput}
                    </div>
                  ) : activeCase ? (
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-500 font-sans">Input: </span>
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-200 mt-0.5">{activeCase.input}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Expected: </span>
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-200 mt-0.5">{activeCase.expected_output}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400">No public test cases configured.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // VIEW: EDIT FORM (ALL 10 SECTIONS PROPERLY DESIGNED)
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 w-full pb-24">
      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Back to Problem Bank"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Back</span>
              </button>
            )}
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {existing.id ? `Edit Problem: ${title || existing.title}` : "New Coding Problem Creator"}
            </h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                status === "published"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {existing.id ? status : `New ${status}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Author algorithmic questions with exact 1:1 schema mapping to the student coding platform.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave("draft")}
            className="h-[40px] px-4 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            onClick={() => handleSave("published")}
            className="h-[40px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl shadow-sm"
          >
            Publish Problem
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1: BASIC PROBLEM INFORMATION
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            1. Basic Problem Information
          </h2>

          {/* Acceptance Rate Controller (Auto / Manual) */}
          <div className="flex items-center gap-2">
            {isManualAcceptance ? (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-blue-200 rounded-xl px-2.5 py-1 shadow-2xs">
                <label className="text-xs font-semibold text-slate-700">Acceptance Rate:</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={manualAcceptanceRate}
                    onChange={(e) => setManualAcceptanceRate(e.target.value)}
                    placeholder="e.g. 65"
                    className="h-7 w-20 text-xs font-mono font-bold text-center bg-white border-slate-300 rounded-lg px-1.5"
                  />
                  <span className="text-xs font-bold text-slate-600 font-mono">%</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                  Manual
                </Badge>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualAcceptance(false);
                    setManualAcceptanceRate("");
                  }}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline ml-1 cursor-pointer"
                  title="Switch to automatic calculation from student submissions"
                >
                  Reset to Auto
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Acceptance Rate:{" "}
                  {existing.id && (existing as any).acceptance_rate !== undefined ? (
                    <strong className="text-emerald-700 font-mono">
                      {(existing as any).acceptance_rate}%
                    </strong>
                  ) : (
                    <span className="font-mono text-slate-400">—</span>
                  )}{" "}
                  <span className="text-slate-400 text-[11px]">(Auto from submissions)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualAcceptance(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 bg-blue-50/70 hover:bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200 transition-colors cursor-pointer"
                  title="Set a manual benchmark acceptance rate"
                >
                  ✏️ Set Manually
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Problem Number *</label>
            <Input
              value={problemNumber}
              onChange={(e) => setProblemNumber(e.target.value)}
              placeholder="1"
              className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Problem Title *</label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                }
              }}
              placeholder="e.g. Reverse Linked List"
              className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Slug / URL Identifier</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. reverse-linked-list"
              className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Difficulty *</label>
            <div className="flex items-center gap-2 pt-0.5">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    difficulty === d
                      ? d === "easy"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : d === "medium"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-rose-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Category</label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Algorithms, Data Structures, SQL"
              className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Score / Points</label>
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl font-bold"
            />
          </div>
        </div>

        {/* Topics & Tags Picker with Manual Addition */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Topics & Tags</label>
              <p className="text-[11px] text-slate-400">Click predefined tags or manually type custom tags below.</p>
            </div>

            {/* Manual Tag Input Bar */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Input
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="Type custom tag (e.g. Trie, Heap)..."
                className="h-8 text-xs bg-slate-50/70 border-slate-200 rounded-lg w-full sm:w-56"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
                className="h-8 px-2.5 text-xs rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Button>
            </div>
          </div>

          {/* Predefined Pills + Custom Added Pills */}
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_TOPICS.map((topic) => {
              const isSelected = selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      handleRemoveTag(topic);
                    } else {
                      setSelectedTopics([...selectedTopics, topic]);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {topic}
                </button>
              );
            })}

            {/* Custom tags added manually that are not in predefined list */}
            {selectedTopics
              .filter((t) => !AVAILABLE_TOPICS.includes(t))
              .map((customTag) => (
                <span
                  key={customTag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
                >
                  <span>{customTag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(customTag)}
                    className="hover:text-blue-200 rounded-full transition-colors"
                    title="Remove tag"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </span>
              ))}
          </div>

          {/* Selection Summary */}
          {selectedTopics.length > 0 && (
            <div className="text-[11px] text-slate-500 pt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-700">Selected ({selectedTopics.length}):</span>
              <span className="text-slate-600 font-mono">{selectedTopics.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2: PROBLEM DESCRIPTION
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            2. Problem Description & Statement
          </h2>
          <span className="text-xs text-slate-400">Markdown syntax supported</span>
        </div>

        <Textarea
          rows={7}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter problem statement, detailed explanation, input requirements, expected output, and edge cases (Markdown supported)..."
          className="text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl font-mono leading-relaxed focus:bg-white"
        />
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3: EXAMPLES
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              3. Examples ({examples.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              These examples will be rendered directly on the student problem page.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleAddExample}
            className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Example</span>
          </Button>
        </div>

        <div className="space-y-4">
          {examples.map((eg, idx) => (
            <div
              key={eg.id || idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 font-mono">Example {idx + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMoveExample(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveExample(idx, "down")}
                    disabled={idx === examples.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteExample(idx)}
                    className="ml-2 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Input:</label>
                    <span className="text-[10px] text-slate-400">Auto-expands with content</span>
                  </div>
                  <Textarea
                    value={eg.input}
                    onChange={(e) => handleUpdateExample(idx, "input", e.target.value)}
                    placeholder="e.g. 5 10 5 8 20 15"
                    rows={Math.max(1, Math.min(10, (eg.input || "").split("\n").length))}
                    className="min-h-[38px] text-xs bg-white border-slate-200 rounded-lg font-mono resize-y py-2 leading-relaxed"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Output:</label>
                    <span className="text-[10px] text-slate-400">Auto-expands with content</span>
                  </div>
                  <Textarea
                    value={eg.output}
                    onChange={(e) => handleUpdateExample(idx, "output", e.target.value)}
                    placeholder="e.g. Expected output"
                    rows={Math.max(1, Math.min(10, (eg.output || "").split("\n").length))}
                    className="min-h-[38px] text-xs bg-white border-slate-200 rounded-lg font-mono resize-y py-2 leading-relaxed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Explanation:</label>
                  <span className="text-[10px] text-slate-400">Auto-expands with content</span>
                </div>
                <Textarea
                  value={eg.explanation || ""}
                  onChange={(e) => handleUpdateExample(idx, "explanation", e.target.value)}
                  placeholder="e.g. Explanation of the example (optional)"
                  rows={Math.max(1, Math.min(8, (eg.explanation || "").split("\n").length))}
                  className="min-h-[38px] text-xs bg-white border-slate-200 rounded-lg resize-y py-2 leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 4: CONSTRAINTS
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            4. Constraints
          </h2>
          <span className="text-xs text-slate-400">One constraint per line</span>
        </div>

        <Textarea
          rows={4}
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder="e.g.&#10;1 <= n <= 10^5&#10;0 <= arr[i] <= 10^9"
          className="text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl font-mono leading-relaxed"
        />
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5: INPUT / OUTPUT
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
          5. Input / Output Specifications
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Input</label>
            <Textarea
              rows={3}
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value)}
              placeholder="Describe input parameters and format..."
              className="text-xs bg-slate-50/70 border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Output</label>
            <Textarea
              rows={3}
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              placeholder="Describe expected output and return value..."
              className="text-xs bg-slate-50/70 border-slate-200 rounded-xl font-mono"
            />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 6: CODE CONFIGURATION (STARTER CODE PER LANGUAGE)
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              6. Code Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure starter code, driver code, and function signatures separately per language.
            </p>
          </div>

          {/* Languages Selector */}
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(DEFAULT_STARTER_CODES).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveCodeLang(lang)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                  activeCodeLang === lang
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Function Signature ({activeCodeLang})</label>
            <Input
              value={functionSignature}
              onChange={(e) => setFunctionSignature(e.target.value)}
              placeholder="e.g. def solve(nums: list[int]) -> int:"
              className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Time Limit (ms)</label>
              <Input
                type="number"
                value={timeLimitMs}
                onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Memory Limit (MB)</label>
              <Input
                type="number"
                value={memoryLimitMb}
                onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                className="h-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>
        </div>

        {/* Monaco Editor Container for Starter Code */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-slate-700 uppercase">
              {activeCodeLang} Starter Code
            </span>
            <button
              type="button"
              onClick={() => {
                setTemplates({
                  ...templates,
                  [activeCodeLang]: DEFAULT_STARTER_CODES[activeCodeLang] || "",
                });
                toast.success(`Reset starter code for ${activeCodeLang}`);
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset to Default
            </button>
          </div>
          <Editor
            height="220px"
            language={activeCodeLang === "c" || activeCodeLang === "cpp" ? "cpp" : activeCodeLang}
            theme="vs"
            value={templates[activeCodeLang] || ""}
            onChange={(val) => setTemplates({ ...templates, [activeCodeLang]: val || "" })}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              lineNumbersMinChars: 3,
            }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 7 & 8: TEST CASE CREATOR & HIDDEN TEST CASES
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              7 & 8. Test Cases ({testCases.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Public test cases are displayed to students. Hidden test cases are evaluated exclusively during Submit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleAddTestCase(false)}
              className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Public Case</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleAddTestCase(true)}
              className="h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Hidden Case</span>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {testCases.map((tc, idx) => (
            <div
              key={tc.id || idx}
              className={`p-4 rounded-xl border space-y-3 transition-colors ${
                tc.is_hidden
                  ? "bg-slate-50/90 border-slate-200"
                  : "bg-emerald-50/30 border-emerald-200/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={tc.name || `Test Case ${idx + 1}`}
                    onChange={(e) => handleUpdateTestCase(idx, "name", e.target.value)}
                    className="h-8 w-44 text-xs font-bold bg-white border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateTestCase(idx, "is_hidden", !tc.is_hidden)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      tc.is_hidden
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    }`}
                  >
                    {tc.is_hidden ? "Hidden (Submit Evaluation Only)" : "Public (Student Visible)"}
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <span>Weight:</span>
                    <Input
                      type="number"
                      value={tc.weight || 10}
                      onChange={(e) => handleUpdateTestCase(idx, "weight", Number(e.target.value))}
                      className="h-8 w-16 text-xs font-bold text-center bg-white border-slate-200 rounded-lg"
                    />
                    <span>pts</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTestCase(idx)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Input:</label>
                    <span className="text-[10px] text-slate-400">Auto-expands with content</span>
                  </div>
                  <Textarea
                    rows={Math.max(2, Math.min(12, (tc.input || "").split("\n").length))}
                    value={tc.input}
                    onChange={(e) => handleUpdateTestCase(idx, "input", e.target.value)}
                    placeholder="Input data for this test case"
                    className="min-h-[48px] text-xs bg-white border-slate-200 rounded-lg font-mono resize-y py-2 leading-relaxed"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Expected Output:</label>
                    <span className="text-[10px] text-slate-400">Auto-expands with content</span>
                  </div>
                  <Textarea
                    rows={Math.max(2, Math.min(12, (tc.expected_output || "").split("\n").length))}
                    value={tc.expected_output}
                    onChange={(e) => handleUpdateTestCase(idx, "expected_output", e.target.value)}
                    placeholder="Expected output result"
                    className="min-h-[48px] text-xs bg-white border-slate-200 rounded-lg font-mono resize-y py-2 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 9: SOLUTION
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              9. Solution & Editorial ({approaches.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Official solution, complexity analysis, and reference code.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleAddApproach}
            className="h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Approach</span>
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Official Solution Overview</label>
          <Textarea
            rows={3}
            value={editorialOverview}
            onChange={(e) => setEditorialOverview(e.target.value)}
            placeholder="High-level algorithmic explanation and intuition..."
            className="text-xs bg-slate-50/70 border-slate-200 rounded-xl leading-relaxed"
          />
        </div>

        <div className="space-y-4">
          {approaches.map((app, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <Input
                  value={app.name}
                  onChange={(e) => handleUpdateApproach(idx, "name", e.target.value)}
                  placeholder="Approach Name (e.g. Approach 1: Hash Map)"
                  className="h-8.5 w-72 text-xs font-bold bg-white border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteApproach(idx)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Time Complexity:</label>
                  <Input
                    value={app.timeComplexity}
                    onChange={(e) => handleUpdateApproach(idx, "timeComplexity", e.target.value)}
                    placeholder="O(n)"
                    className="h-8 text-xs bg-white border-slate-200 rounded-lg font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Space Complexity:</label>
                  <Input
                    value={app.spaceComplexity}
                    onChange={(e) => handleUpdateApproach(idx, "spaceComplexity", e.target.value)}
                    placeholder="O(n)"
                    className="h-8 text-xs bg-white border-slate-200 rounded-lg font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Explanation:</label>
                <Textarea
                  rows={2}
                  value={app.explanation}
                  onChange={(e) => handleUpdateApproach(idx, "explanation", e.target.value)}
                  placeholder="Explain why this approach works and how complexity holds..."
                  className="text-xs bg-white border-slate-200 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Reference Code:</label>
                <Textarea
                  rows={3}
                  value={app.code?.python || ""}
                  onChange={(e) =>
                    handleUpdateApproach(idx, "code", { ...app.code, python: e.target.value })
                  }
                  placeholder="# Solution reference code"
                  className="text-xs bg-white border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 10: PROBLEM SETTINGS
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
          10. Problem Settings & Governance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Maximum Attempts</label>
            <Input
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              placeholder="0 (Unlimited)"
              className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
            />
            <span className="text-[10px] text-slate-400">0 = unlimited</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Published Status</label>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setStatus("published")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  status === "published"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Published
              </button>
              <button
                type="button"
                onClick={() => setStatus("draft")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  status === "draft"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Draft
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Allow Run Code</span>
              <span className="text-[11px] text-slate-500">Students can test with custom inputs</span>
            </div>
            <Switch checked={allowRun} onCheckedChange={setAllowRun} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Allow Submit</span>
              <span className="text-[11px] text-slate-500">Students can submit official verdicts</span>
            </div>
            <Switch checked={allowSubmit} onCheckedChange={setAllowSubmit} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Mandatory Assignment</span>
              <span className="text-[11px] text-slate-500">Required graded challenge</span>
            </div>
            <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BOTTOM ACTION BAR: SAVE DRAFT | PREVIEW | PUBLISH
      ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-[42px] px-5 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel & Exit
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave("draft")}
            className="h-[42px] px-5 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveView("live_preview")}
            className="h-[42px] px-5 text-xs font-semibold rounded-xl border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-2 shadow-xs"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Problem</span>
          </Button>

          <Button
            type="button"
            onClick={() => handleSave("published")}
            className="h-[42px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl shadow-sm"
          >
            Publish Problem
          </Button>
        </div>
      </div>
    </div>
  );
}
