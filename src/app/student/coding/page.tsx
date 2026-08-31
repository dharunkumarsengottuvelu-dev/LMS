"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Flag, CheckCircle2, XCircle, Code2,
  Loader2, Server, RefreshCw, Clock, BarChart2, X, PanelRightOpen, PanelRightClose
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/coding/code-editor";
import { StudentTopNav } from "@/components/layouts/student-top-nav";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { CodingSubmission, CodingLanguage, TestCaseResult, CodingProblem, TestCase } from "@/types/coding";
import { SAMPLE_CODING_PROBLEMS } from "@/services/coding-problems.service";

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
  const [showQuestion, setShowQuestion] = useState(true);
  const [jobeStatus, setJobeStatus] = useState<{ available: boolean; latencyMs?: number } | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [problems, setProblems] = useState<CodingProblem[]>(SAMPLE_CODING_PROBLEMS);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("track");
    if (!trackId) return;

    async function fetchTrack() {
      try {
        const res = await fetch(`/api/student/practices/${trackId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        const track = data.track;
        if (track && track.subModules) {
          const codingProbs: CodingProblem[] = [];
          
          const parseTestCases = (text?: string) => {
            if (!text) return [{ id: "tc_1", input: "", expected_output: "", is_hidden: false }];
            const cases: any[] = [];
            const lines = text.split('\n');
            lines.forEach((line, i) => {
              if (line.includes('->')) {
                 const [input, output] = line.split('->');
                 cases.push({ id: `tc_${i}`, input: input?.trim() || "", expected_output: output?.trim() || "", is_hidden: false });
              }
            });
            if (cases.length === 0) cases.push({ id: "tc_1", input: text, expected_output: "", is_hidden: false });
            return cases;
          };

          track.subModules.forEach((sm: any) => {
            if (sm.type === "coding" || sm.type === "mixed") {
              if (sm.codingQuestions && sm.codingQuestions.length > 0) {
                 sm.codingQuestions.forEach((cq: any) => {
                   codingProbs.push({
                     id: `${sm.id}_${cq.id}`,
                     title: cq.title,
                     slug: cq.title.toLowerCase().replace(/\s+/g, '-'),
                     description: cq.description || sm.problemDescription || "",
                     difficulty: cq.difficulty || "medium",
                     created_at: new Date().toISOString(),
                     updated_at: new Date().toISOString(),
                     templates: cq.templates || { 
                       "python": sm.starterCode || "", 
                       "java": sm.starterCode || "", 
                       "javascript": sm.starterCode || "", 
                       "cpp": sm.starterCode || "" 
                     },
                     test_cases: (cq.publicTestCases || cq.hiddenTestCases) ? [...(cq.publicTestCases || []), ...(cq.hiddenTestCases || [])] : parseTestCases(sm.publicTestCases)
                   });
                 });
              } else {
                 codingProbs.push({
                   id: sm.id,
                   title: sm.title,
                   slug: sm.title.toLowerCase().replace(/\s+/g, '-'),
                   description: sm.problemDescription || "Coding Problem",
                   difficulty: "medium",
                   created_at: new Date().toISOString(),
                   updated_at: new Date().toISOString(),
                   templates: { 
                     "python": sm.starterCode || "", 
                     "java": sm.starterCode || "", 
                     "javascript": sm.starterCode || "", 
                     "cpp": sm.starterCode || "" 
                   },
                   test_cases: parseTestCases(sm.publicTestCases)
                 });
              }
            }
          });
          if (codingProbs.length > 0) {
            setProblems(codingProbs);
          }
        }
      } catch (e) {
        console.error("Failed to load track problems", e);
      }
    }
    fetchTrack();
  }, []);

  const selectedProblem = problems[currentIdx] ?? problems[0];
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
    if (!selectedProblem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          problem_id: selectedProblem.id, 
          language, 
          code,
          test_cases: selectedProblem.test_cases 
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submission failed");
      }
      const sub = (await res.json()) as CodingSubmission;
      setLatestSubmission(sub);

      if (sub.status === "accepted") {
        setAnsweredIds((prev) => new Set([...prev, selectedProblem.id]));
        toast({ title: "Accepted", description: `All ${sub.total_test_cases} test cases passed.` });
      } else {
        toast({
          title: sub.status.replace("_", " ").toUpperCase(),
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
    if (!selectedProblem) return;
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

  const isFlagged = selectedProblem ? flagged.has(selectedProblem.id) : false;
  const isAnswered = selectedProblem ? answeredIds.has(selectedProblem.id) : false;

  if (!selectedProblem) {
    return (
      <div className="h-screen flex flex-col bg-background pt-[68px]">
        <StudentTopNav />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Code2 className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No Problems Available</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            There are currently no coding problems assigned or available for this track. Please check back later.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden pt-[68px]">
      {/* ── Top Navigation ── */}
      <StudentTopNav />

      {/* ── Assessment Header Bar ── */}
      <div className="flex items-center justify-between bg-card border-b border-border px-4 py-2 text-sm z-10">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1 text-primary hover:underline font-medium"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="text-green-600 dark:text-green-500 font-semibold">LIVE</span>
          </div>
          <h1 className="font-semibold text-foreground hidden sm:block">
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
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <BarChart2 className="h-3.5 w-3.5" />
            {answeredIds.size}/{totalProblems} answered
          </div>

          <Button
            size="sm"
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground hover:-translate-y-0.5 transition-all duration-200 ease-out text-xs font-semibold px-5 rounded-lg shadow-sm hover:shadow"
            onClick={() => toast({ title: "Assessment submitted!", description: "Your answers have been recorded." })}
          >
            Submit Assessment
          </Button>
        </div>
      </div>

      {/* ── 3-Column Body ── */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* ── LEFT: Problem Statement (Enlarged for readability) ── */}
        {showQuestion && (
        <div className="w-[480px] lg:w-[520px] xl:w-[560px] flex flex-col bg-card border-r border-border shrink-0 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex-1 overflow-y-auto flex flex-col h-full">
          {/* Question header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg text-foreground">
                Question {currentIdx + 1}: {selectedProblem.title}
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleFlag}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors duration-200 ${
                    isFlagged
                      ? "bg-orange-100 text-orange-600"
                      : "bg-muted text-muted-foreground hover:text-orange-500"
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  {isFlagged ? "Flagged" : "Flag"}
                </button>
                <button 
                  onClick={() => setShowQuestion(false)} 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-muted"
                  title="Hide Question"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-[11px] font-bold uppercase px-2.5 py-0.5">
                CODING
              </Badge>
              {selectedProblem.points != null && (
                <Badge className="bg-muted text-foreground border-border text-[11px] font-bold px-2.5 py-0.5">
                  {selectedProblem.points} marks
                </Badge>
              )}
              <Badge
                className={`text-[11px] font-bold uppercase border px-2.5 py-0.5 ${
                  DIFFICULTY_COLOR[selectedProblem.difficulty] ?? "bg-muted text-muted-foreground border-border"
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
            <TabsList className="mx-5 mt-4 mb-2 bg-muted rounded-lg p-0.5 h-8 w-auto justify-start">
              <TabsTrigger
                value="statement"
                className="text-xs font-semibold rounded-md data-[state=active]:bg-card data-[state=active]:shadow px-3.5 h-7 data-[state=active]:text-foreground"
              >
                Problem Statement
              </TabsTrigger>
              {latestSubmission && (
                <TabsTrigger
                  value="solution"
                  className="text-xs font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow px-3.5 h-7"
                >
                  Result
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="statement" className="flex-1 overflow-y-auto px-5 py-4 space-y-6 mt-0 animate-in fade-in duration-200">
              {/* Problem Statement */}
              <div>
                <p className="text-sm font-bold text-foreground mb-2">Problem Statement:</p>
                <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-line font-normal">
                  {selectedProblem.description}
                </p>
              </div>

              {/* Constraints */}
              {selectedProblem.constraints && (
                <div>
                  <p className="text-[12.5px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Constraints:</p>
                  <pre className="text-[13px] text-foreground font-mono bg-muted/70 rounded-xl p-4 border border-border whitespace-pre-wrap leading-relaxed">
                    {selectedProblem.constraints}
                  </pre>
                </div>
              )}

              {/* Input / Output Format */}
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-bold text-foreground mb-1.5">Input Format:</p>
                  <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                    {selectedProblem.input_format ?? "Given via standard input."}
                  </p>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground mb-1.5">Output Format:</p>
                  <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                    {selectedProblem.output_format ?? "Print the answer to standard output."}
                  </p>
                </div>
              </div>

              {/* Sample Test Cases */}
              {selectedProblem.test_cases?.filter((tc: TestCase) => !tc.is_hidden).length > 0 && (
                <div>
                  <p className="text-[13px] font-bold text-foreground mb-2.5">Sample Test Cases:</p>
                  {selectedProblem.test_cases
                    .filter((tc: TestCase) => !tc.is_hidden)
                    .map((tc: TestCase, i: number) => (
                      <div key={tc.id} className="mb-3.5 rounded-xl border border-border overflow-hidden shadow-2xs">
                        <div className="bg-muted px-3.5 py-2 text-xs font-bold text-foreground border-b border-border flex items-center justify-between">
                          <span>Test Case {i + 1}</span>
                          {tc.explanation && (
                            <span className="font-normal text-muted-foreground text-[11px] normal-case truncate max-w-[240px]">{tc.explanation}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-border">
                          <div className="p-3.5 bg-card">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Input:</p>
                            <pre className="text-[12.5px] font-mono text-primary whitespace-pre-wrap leading-relaxed">
                              {tc.input || "—"}
                            </pre>
                          </div>
                          <div className="p-3.5 bg-card">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Expected Output:</p>
                            <pre className="text-[12.5px] font-mono text-green-600 dark:text-green-500 whitespace-pre-wrap leading-relaxed">
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

                <div className="flex gap-4 text-xs text-muted-foreground font-mono">
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

            {/* ── Pill Navigation Footer ── */}
            <div className="p-3 border-t border-border bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-center gap-2.5 shrink-0 select-none">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-4 h-9 font-semibold text-xs border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 gap-1 shadow-2xs"
                disabled={currentIdx === 0}
                onClick={() => goTo(currentIdx - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </Button>

              <div className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                <span>{currentIdx + 1} of {totalProblems}</span>
              </div>

              <Button
                size="sm"
                className="rounded-full px-4 h-9 font-bold text-xs bg-[#3B82F6] hover:bg-[#1D4ED8] text-white gap-1 shadow-xs"
                disabled={currentIdx === totalProblems - 1}
                onClick={() => goTo(currentIdx + 1)}
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          )}

        {/* ── MIDDLE: Code Editor (flex-1) ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card min-w-0 relative animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 fill-mode-both">
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden h-full">
          <CodeEditor
            problem={selectedProblem}
            submissionResult={latestSubmission}
            defaultLanguage="java"
            height="100%"
            showSubmit={true}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            showQuestionToggle={!showQuestion}
            onToggleQuestion={() => setShowQuestion(true)}
            showNavigatorToggle={!showNavigator}
            onToggleNavigator={() => setShowNavigator(true)}
          />
            </div>
        </div>

        {showNavigator && (
          <div className="w-[290px] lg:w-[320px] flex flex-col bg-card border-l border-border shrink-0 relative animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            {/* ── RIGHT: Question Navigator ── */}
            <div className="flex-1 overflow-y-auto flex flex-col h-full">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Question Palette</h3>
                <button onClick={() => setShowNavigator(false)} className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-muted" title="Close Palette">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Section */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-primary">All Challenges</span>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {answeredIds.size}/{totalProblems} Solved
                  </span>
                </div>

                {/* Number grid */}
                <div className="grid grid-cols-5 gap-2.5">
                  {problems.map((p, i) => {
                    const answered = answeredIds.has(p.id);
                    const isCurrent = i === currentIdx;
                    const isFlaggd = flagged.has(p.id);

                    return (
                      <button
                        key={p.id}
                        onClick={() => goTo(i)}
                        className={`w-10 h-10 rounded-xl text-xs font-bold border transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-xs flex items-center justify-center ${
                          isCurrent
                            ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30"
                            : answered
                            ? "bg-green-600 text-white border-green-500 shadow-2xs"
                            : isFlaggd
                            ? "bg-orange-500 text-white border-orange-400"
                            : "bg-muted text-foreground border-border hover:bg-primary/10 hover:border-primary/30"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-primary inline-block shrink-0" />
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-green-600 inline-block shrink-0" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-orange-500 inline-block shrink-0" />
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-muted border border-border inline-block shrink-0" />
                    <span>Pending</span>
                  </div>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="px-5 py-4">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  <span>Progress</span>
                  <span className="text-primary font-mono">{Math.round((answeredIds.size / (totalProblems || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 mb-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(answeredIds.size / totalProblems) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{answeredIds.size} completed</span>
                  <span>{totalProblems} total</span>
                </div>
              </div>

          {/* Navigation buttons */}
            <div className="mt-auto border-t border-border p-3 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full flex-1 h-8 text-[11px] font-semibold border-slate-200 dark:border-zinc-700 gap-1"
                disabled={currentIdx === 0}
                onClick={() => goTo(currentIdx - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button
                size="sm"
                className="rounded-full flex-1 h-8 text-[11px] font-bold bg-[#3B82F6] hover:bg-[#1D4ED8] text-white gap-1"
                disabled={currentIdx === totalProblems - 1}
                onClick={() => goTo(currentIdx + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
