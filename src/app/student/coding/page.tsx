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

    const localTracks = localStorage.getItem("enterprise_lms_practice_tracks_v2");
    if (localTracks) {
      try {
        const parsed = JSON.parse(localTracks);
        const track = parsed.find((t: any) => t.id === trackId);
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
                     id: cq.id,
                     title: cq.title,
                     slug: cq.title.toLowerCase().replace(/\\s+/g, '-'),
                     description: cq.description || sm.problemDescription || "",
                     difficulty: cq.difficulty || "medium",
                     created_at: new Date().toISOString(),
                     updated_at: new Date().toISOString(),
                     templates: cq.templates || { 
                       "python3": sm.starterCode || "", 
                       "java": sm.starterCode || "", 
                       "javascript": sm.starterCode || "", 
                       "cpp": sm.starterCode || "" 
                     },
                     test_cases: parseTestCases(sm.publicTestCases)
                   });
                 });
              } else {
                 codingProbs.push({
                   id: sm.id,
                   title: sm.title,
                   slug: sm.title.toLowerCase().replace(/\\s+/g, '-'),
                   description: sm.problemDescription || "Coding Problem",
                   difficulty: "medium",
                   created_at: new Date().toISOString(),
                   updated_at: new Date().toISOString(),
                   templates: { 
                     "python3": sm.starterCode || "", 
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
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground hover:-translate-y-0.5 transition-all duration-200 ease-out text-xs font-bold px-5 rounded-lg shadow-sm hover:shadow"
            onClick={() => toast({ title: "Assessment submitted!", description: "Your answers have been recorded." })}
          >
            ✓ Submit Assessment
          </Button>
        </div>
      </div>

      {/* ── 3-Column Body ── */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* ── LEFT: Problem Statement (280px) ── */}
        {showQuestion && (
        <div className="w-[300px] flex flex-col bg-card border-r border-border shrink-0 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex-1 overflow-y-auto flex flex-col h-full">
          {/* Question header */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base text-foreground">
                Question {currentIdx + 1}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleFlag}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors duration-200 ${
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
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center ml-1"
                  title="Hide Question"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-[10px] font-bold uppercase px-2">
                CODING
              </Badge>
              {selectedProblem.points != null && (
                <Badge className="bg-muted text-foreground border-border text-[10px] font-bold px-2">
                  {selectedProblem.points} marks
                </Badge>
              )}
              <Badge
                className={`text-[10px] font-bold uppercase border px-2 ${
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
            <TabsList className="mx-4 mt-4 mb-2 bg-muted rounded-lg p-0.5 h-8 w-auto justify-start">
              <TabsTrigger
                value="statement"
                className="text-xs font-semibold rounded-md data-[state=active]:bg-card data-[state=active]:shadow px-3 h-7 data-[state=active]:text-foreground"
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

            <TabsContent value="statement" className="flex-1 overflow-y-auto px-4 py-4 space-y-6 mt-0 animate-in fade-in duration-200">
              {/* Problem Statement */}
              <div>
                <p className="text-[13px] font-bold text-foreground mb-2">Problem Statement:</p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed whitespace-pre-line">
                  {selectedProblem.description}
                </p>
              </div>

              {/* Constraints */}
              {selectedProblem.constraints && (
                <div>
                  <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Constraints:</p>
                  <pre className="text-[12px] text-foreground font-mono bg-muted rounded-lg p-4 border border-border whitespace-pre-wrap leading-relaxed">
                    {selectedProblem.constraints}
                  </pre>
                </div>
              )}

              {/* Input / Output Format */}
              <div className="space-y-4">
                <div>
                  <p className="text-[12px] font-bold text-muted-foreground mb-2">Input Format:</p>
                  <p className="text-[12px] text-foreground leading-relaxed">
                    {selectedProblem.input_format ?? "Given via standard input."}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-muted-foreground mb-2">Output Format:</p>
                  <p className="text-[12px] text-foreground leading-relaxed">
                    {selectedProblem.output_format ?? "Print the answer to standard output."}
                  </p>
                </div>
              </div>

              {/* Sample Test Cases */}
              {selectedProblem.test_cases?.filter((tc: TestCase) => !tc.is_hidden).length > 0 && (
                <div>
                  <p className="text-[12px] font-bold text-muted-foreground mb-2">Sample Test Cases:</p>
                  {selectedProblem.test_cases
                    .filter((tc: TestCase) => !tc.is_hidden)
                    .map((tc: TestCase, i: number) => (
                      <div key={tc.id} className="mb-3 rounded-xl border border-border overflow-hidden">
                        <div className="bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                          Test Case {i + 1}
                          {tc.explanation && (
                            <span className="ml-2 font-normal text-muted-foreground opacity-80 normal-case">— {tc.explanation}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-border">
                          <div className="p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Input:</p>
                            <pre className="text-[11.5px] font-mono text-primary whitespace-pre-wrap leading-relaxed">
                              {tc.input || "—"}
                            </pre>
                          </div>
                          <div className="p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Expected Output:</p>
                            <pre className="text-[11.5px] font-mono text-green-600 dark:text-green-500 whitespace-pre-wrap leading-relaxed">
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
          <div className="w-[240px] flex flex-col bg-card border-l border-border shrink-0 relative animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            {/* ── RIGHT: Question Navigator (220px) ── */}
            <div className="flex-1 overflow-y-auto flex flex-col h-full">
                  <div className="px-4 py-4 border-b border-border flex items-center gap-2">
             <button onClick={() => setShowNavigator(false)} className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center">
               <ChevronRight className="w-4 h-4" />
             </button>
             <h3 className="font-bold text-sm text-foreground">Question Navigator</h3>
          </div>

          {/* Section */}
          <div className="px-4 py-5 border-b border-border">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-semibold text-primary">Programming Challenges</span>
              <span className="text-[11px] font-bold text-muted-foreground">
                {answeredIds.size}/{totalProblems}
              </span>
            </div>

            {/* Number grid */}
            <div className="grid grid-cols-5 gap-2">
              {problems.map((p, i) => {
                const answered = answeredIds.has(p.id);
                const isCurrent = i === currentIdx;
                const isFlaggd = flagged.has(p.id);

                return (
                  <button
                    key={p.id}
                    onClick={() => goTo(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-sm ${
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : answered
                        ? "bg-green-500 text-white border-green-400"
                        : isFlaggd
                        ? "bg-orange-400 text-white border-orange-400"
                        : "bg-muted text-foreground border-border hover:bg-primary/10 hover:border-primary/30"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded bg-primary inline-block" />
                Current
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded bg-green-500 inline-block" />
                Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-orange-400 inline-block" />
                Flagged
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded bg-muted border border-border inline-block" />
                Not answered
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="px-4 py-5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Overall Progress</p>
            <div className="w-full bg-muted rounded-full h-2 mb-3">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${(answeredIds.size / totalProblems) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{answeredIds.size} answered</span>
              <span>{totalProblems} questions</span>
            </div>
          </div>

          {/* Navigation buttons */}
            <div className="mt-2 border-t border-border pt-4 pb-2 px-1">
              <div className="flex items-center justify-between gap-3">
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
