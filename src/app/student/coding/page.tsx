"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Flag, CheckCircle2, XCircle,
  Loader2, Server, RefreshCw, Clock, BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/coding/code-editor";
import { StudentTopNav } from "@/components/layouts/student-top-nav";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { CodingSubmission, CodingLanguage, TestCaseResult } from "@/types/coding";
import { SubmissionService, SAMPLE_CODING_PROBLEMS } from "@/services/submission.service";

type ProblemTab = "statement" | "solution";

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

export default function StudentCodingIDEPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestSubmission, setLatestSubmission] = useState<CodingSubmission | null>(null);
  const [problemTab, setProblemTab] = useState<ProblemTab>("statement");
  const [showNavigator, setShowNavigator] = useState(true);
  const [jobeStatus, setJobeStatus] = useState<{ available: boolean; latencyMs?: number } | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const problems = SAMPLE_CODING_PROBLEMS;
  const selectedProblem = problems[currentIdx] ?? problems[0]!;
  const totalProblems = problems.length;

  /* ---- Health check ---- */
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/code/health");
      const data = await res.json();
      setJobeStatus({ available: data.status === "healthy", latencyMs: data.latency_ms });
    } catch {
      setJobeStatus({ available: false });
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  /* ---- Submit ---- */
  const handleSubmit = async (code: string, language: CodingLanguage) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_id: selectedProblem.id, language, code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submission failed");
      }
      const sub = (await res.json()) as CodingSubmission;
      setLatestSubmission(sub);

      if (sub.status === "accepted") {
        setAnsweredIds((prev) => new Set([...prev, selectedProblem.id]));
        toast({ title: "🎉 Accepted!", description: `All ${sub.total_test_cases} test cases passed.` });
      } else {
        toast({
          title: `❌ ${sub.status.replace("_", " ").toUpperCase()}`,
          description: `Passed ${sub.passed_test_cases}/${sub.total_test_cases} test cases.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(selectedProblem.id)) next.delete(selectedProblem.id);
      else next.add(selectedProblem.id);
      return next;
    });
  };

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < totalProblems) {
      setCurrentIdx(idx);
      setLatestSubmission(null);
    }
  };

  const isFlagged = flagged.has(selectedProblem.id);
  const isAnswered = answeredIds.has(selectedProblem.id);

  return (
    <div className="h-screen flex flex-col bg-[#F3F4F6] overflow-hidden">
      {/* ── Top Navigation ── */}
      <StudentTopNav />

      {/* ── Assessment Header Bar ── */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2 text-sm z-10">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-gray-400">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="text-green-600 font-semibold">LIVE</span>
          </div>
          <h1 className="font-semibold text-gray-800 hidden sm:block">
            Programming Challenges Assessment
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Engine Status */}
          <button
            onClick={checkHealth}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium ${
              jobeStatus?.available
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-600 border-amber-200"
            }`}
          >
            <Server className="h-3 w-3" />
            {jobeStatus?.available ? `Engine Ready (${jobeStatus.latencyMs ?? "–"}ms)` : "Engine Unavailable"}
            <RefreshCw className="h-3 w-3 ml-0.5" />
          </button>

          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <BarChart2 className="h-3.5 w-3.5" />
            {answeredIds.size}/{totalProblems} answered
          </div>

          <Button
            size="sm"
            className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-5 rounded-lg"
            onClick={() => toast({ title: "Assessment submitted!", description: "Your answers have been recorded." })}
          >
            ✓ Submit Assessment
          </Button>
        </div>
      </div>

      {/* ── 3-Column Body ── */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* ── LEFT: Problem Statement (280px) ── */}
        <div className="w-[300px] flex flex-col bg-white border-r border-gray-200 shrink-0">
          <div className="flex-1 overflow-y-auto flex flex-col h-full">
          {/* Question header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-base text-gray-800">
                Question {currentIdx + 1}
              </h2>
              <button
                onClick={toggleFlag}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                  isFlagged
                    ? "bg-orange-100 text-orange-600"
                    : "bg-gray-100 text-gray-500 hover:text-orange-500"
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                {isFlagged ? "Flagged" : "Flag for review"}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase px-2">
                CODING
              </Badge>
              {selectedProblem.points != null && (
                <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-bold px-2">
                  {selectedProblem.points} marks
                </Badge>
              )}
              <Badge
                className={`text-[10px] font-bold uppercase border px-2 ${
                  DIFFICULTY_COLOR[selectedProblem.difficulty] ?? "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {selectedProblem.difficulty}
              </Badge>
            </div>
          </div>

          {/* Problem content tabs */}
          <Tabs
            value={problemTab}
            onValueChange={(v) => setProblemTab(v as ProblemTab)}
            className="flex-1 flex flex-col"
          >
            <TabsList className="mx-4 mt-3 mb-0 bg-gray-100 rounded-lg p-0.5 h-8 w-auto justify-start">
              <TabsTrigger
                value="statement"
                className="text-xs font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow px-3 h-7"
              >
                Problem Statement
              </TabsTrigger>
              {latestSubmission && (
                <TabsTrigger
                  value="solution"
                  className="text-xs font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow px-3 h-7"
                >
                  Result
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="statement" className="flex-1 overflow-y-auto px-4 py-3 space-y-4 mt-0">
              {/* Problem Statement */}
              <div>
                <p className="text-[13px] font-bold text-gray-800 mb-1">Problem Statement:</p>
                <p className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-line">
                  {selectedProblem.description}
                </p>
              </div>

              {/* Constraints */}
              {selectedProblem.constraints && (
                <div>
                  <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-1">Constraints:</p>
                  <pre className="text-[12px] text-gray-700 font-mono bg-gray-50 rounded-lg p-3 border border-gray-200 whitespace-pre-wrap leading-relaxed">
                    {selectedProblem.constraints}
                  </pre>
                </div>
              )}

              {/* Input / Output Format */}
              <div className="space-y-2">
                <div>
                  <p className="text-[12px] font-bold text-gray-600 mb-1">Input Format:</p>
                  <p className="text-[12px] text-gray-700 leading-relaxed">
                    {selectedProblem.input_format ?? "Given via standard input."}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-gray-600 mb-1">Output Format:</p>
                  <p className="text-[12px] text-gray-700 leading-relaxed">
                    {selectedProblem.output_format ?? "Print the answer to standard output."}
                  </p>
                </div>
              </div>

              {/* Sample Test Cases */}
              {selectedProblem.test_cases?.filter((tc) => !tc.is_hidden).length > 0 && (
                <div>
                  <p className="text-[12px] font-bold text-gray-600 mb-2">Sample Test Cases:</p>
                  {selectedProblem.test_cases
                    .filter((tc) => !tc.is_hidden)
                    .map((tc, i) => (
                      <div key={tc.id} className="mb-3 rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
                          Test Case {i + 1}
                          {tc.explanation && (
                            <span className="ml-2 font-normal text-gray-400 normal-case">— {tc.explanation}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-gray-200">
                          <div className="p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Input:</p>
                            <pre className="text-[11.5px] font-mono text-blue-700 whitespace-pre-wrap leading-relaxed">
                              {tc.input || "—"}
                            </pre>
                          </div>
                          <div className="p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Expected Output:</p>
                            <pre className="text-[11.5px] font-mono text-green-700 whitespace-pre-wrap leading-relaxed">
                              {tc.expected_output || "—"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* Result Tab */}
            {latestSubmission && (
              <TabsContent value="solution" className="flex-1 overflow-y-auto px-4 py-3 space-y-3 mt-0">
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-sm ${
                    latestSubmission.status === "accepted"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {latestSubmission.status === "accepted" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  {latestSubmission.status.replace("_", " ").toUpperCase()}
                </div>

                <div className="flex gap-4 text-xs text-gray-600 font-mono">
                  <span>
                    Passed: <strong>{latestSubmission.passed_test_cases}/{latestSubmission.total_test_cases}</strong>
                  </span>
                  {latestSubmission.execution_time != null && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {latestSubmission.execution_time.toFixed(2)}s
                    </span>
                  )}
                </div>

                {latestSubmission.results && (
                  <div className="space-y-1.5">
                    {latestSubmission.results.map((r: TestCaseResult, i: number) => (
                      <div
                        key={r.test_case_id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                          r.passed
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-red-50 border-red-200 text-red-600"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          {r.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          Test Case #{i + 1}
                        </span>
                        <span className="font-mono">{r.passed ? "Passed" : r.error ?? "Failed"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
          </div>
        </div>

        {/* ── MIDDLE: Code Editor (flex-1) ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
          <div className="flex items-center justify-end px-2 py-1 bg-gray-50 border-b border-gray-200 shrink-0">
              <button
                onClick={() => setShowNavigator(!showNavigator)}
                className="text-xs font-semibold text-gray-500 hover:text-blue-600 px-2 py-1 rounded-md transition-colors"
              >
                {showNavigator ? "Hide Question Navigator" : "Show Question Navigator"}
              </button>
            </div>
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden h-full">
          <CodeEditor
            problem={selectedProblem}
            submissionResult={latestSubmission}
            defaultLanguage="java"
            height="100%"
            showSubmit={true}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
            </div>
        </div>

        {showNavigator && (
          <div className="w-[240px] flex flex-col bg-white border-l border-gray-200 shrink-0">
            {/* ── RIGHT: Question Navigator (220px) ── */}
            <div className="flex-1 overflow-y-auto flex flex-col h-full">
                  <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-sm text-gray-800">Question Navigator</h3>
          </div>

          {/* Section */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-blue-600">Programming Challenges</span>
              <span className="text-[11px] font-bold text-gray-500">
                {answeredIds.size}/{totalProblems}
              </span>
            </div>

            {/* Number grid */}
            <div className="grid grid-cols-5 gap-1.5">
              {problems.map((p, i) => {
                const answered = answeredIds.has(p.id);
                const isCurrent = i === currentIdx;
                const isFlaggd = flagged.has(p.id);

                return (
                  <button
                    key={p.id}
                    onClick={() => goTo(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : answered
                        ? "bg-green-500 text-white border-green-400"
                        : isFlaggd
                        ? "bg-orange-400 text-white border-orange-400"
                        : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-1.5 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-blue-600 inline-block" />
                Current
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-green-500 inline-block" />
                Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-orange-400 inline-block" />
                Flagged
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-gray-200 border border-gray-300 inline-block" />
                Not answered
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="px-4 py-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Overall Progress</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(answeredIds.size / totalProblems) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>{answeredIds.size} answered</span>
              <span>{totalProblems} questions</span>
            </div>
          </div>

          {/* Navigation buttons */}
            <div className="mt-4 border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[11px] h-7"
                  disabled={currentIdx === 0}
                  onClick={() => goTo(currentIdx - 1)}
                >
                  <ChevronLeft className="h-3 w-3 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[11px] h-7"
                  disabled={currentIdx === totalProblems - 1}
                  onClick={() => goTo(currentIdx + 1)}
                >
                  Next <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
