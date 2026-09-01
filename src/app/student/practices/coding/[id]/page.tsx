"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Code2, Clock, Cpu, FileCode,
  Layers, Loader2, Sparkles, Terminal, AlertCircle, RefreshCw, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/coding/code-editor";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CodingProblem, CodingSubmission, CodingLanguage } from "@/types";

export default function PracticeCodingRunnerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const problemId = (params?.id as string) || "";
  const trackId = searchParams.get("trackId");
  const subModuleId = searchParams.get("subModuleId");

  const [problem, setProblem] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<CodingSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProblem = async () => {
    if (!problemId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/student/practices/coding/${problemId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load coding problem");

      setProblem(data.problem);
      if (data.latestSubmission) {
        setSubmissionResult(data.latestSubmission);
      }
    } catch (err: any) {
      console.error("Error fetching coding problem:", err);
      setErrorMsg(err.message || "Failed to load coding problem");
      toast({
        title: "Error",
        description: err.message || "Problem could not be loaded",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblem();
  }, [problemId]);

  const handleSubmitSolution = async (code: string, language: CodingLanguage) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problemId,
          language,
          code,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmissionResult(data);

      if (data.status === "accepted" || data.status === "passed") {
        toast({
          title: "Practice Problem Solved",
          description: `All test cases passed! Score: ${data.score || 100} / ${data.max_score || 100}`,
        });
      } else {
        toast({
          title: "Tests Failed",
          description: `Status: ${data.status}. Score: ${data.score || 0}`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast({
        title: "Submission Error",
        description: err.message || "Failed to evaluate code with Jobe compiler",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (trackId) {
      router.push(`/student/practices/${trackId}`);
    } else {
      router.push("/student/practices");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9FAFB] dark:bg-[#09090B]">
        <Loader2 className="h-10 w-10 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  if (errorMsg || !problem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#F9FAFB] dark:bg-[#09090B]">
        <Card className="max-w-md w-full text-center p-6 border-destructive/30 rounded-2xl">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle className="mb-2">Unable to Load Practice Problem</CardTitle>
          <p className="text-sm text-muted-foreground mb-6">{errorMsg || "Problem not found."}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleBack} variant="outline" className="rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button onClick={fetchProblem} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const sampleTestCases = problem.sampleTestCases || [];

  const [mobileTab, setMobileTab] = useState<"problem" | "editor">("editor");

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-[#F9FAFB] dark:bg-[#09090B] overflow-hidden">
      {/* Top Runner Navbar */}
      <header className="h-14 border-b border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 sm:px-4 flex items-center justify-between shrink-0 z-10 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground rounded-lg shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Practice Track</span><span className="sm:hidden">Back</span>
          </Button>
          <div className="h-4 w-[1px] bg-border shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <Code2 className="h-4 w-4 text-[#2563EB] shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#FAFAFA] truncate">
              {problem.title}
            </span>
          </div>
        </div>

        {/* Mobile View Tab Switcher & Difficulty */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Tab Toggle */}
          <div className="flex md:hidden bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setMobileTab("problem")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
                mobileTab === "problem"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Problem
            </button>
            <button
              onClick={() => setMobileTab("editor")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
                mobileTab === "editor"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Code
            </button>
          </div>

          <Badge
            className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
              problem.difficulty === "easy"
                ? "bg-green-600 text-white"
                : problem.difficulty === "hard"
                ? "bg-red-600 text-white"
                : "bg-amber-600 text-white"
            }`}
          >
            {problem.difficulty}
          </Badge>
          {submissionResult?.status === "accepted" && (
            <Badge className="bg-[#16A34A] text-white text-[10px] uppercase font-bold hidden sm:flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Solved
            </Badge>
          )}
        </div>
      </header>

      {/* Main Split Layout: Left Problem Statement, Right Monaco Code Editor */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Problem Description Panel */}
        <div
          className={cn(
            "w-full md:w-[42%] lg:w-[38%] border-r border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] flex flex-col overflow-y-auto p-4 sm:p-5 md:p-6 space-y-6",
            mobileTab === "problem" ? "flex" : "hidden md:flex"
          )}
        >
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#FAFAFA] mb-2">
              {problem.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">
                Time Limit: {problem.timeLimitMs / 1000}s
              </Badge>
              <Badge variant="outline" className="text-xs">
                Memory: {Math.round(problem.memoryLimitKb / 1024)}MB
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Problem Description
            </h2>
            <div className="text-sm text-[#374151] dark:text-[#D1D5DB] leading-relaxed whitespace-pre-wrap">
              {problem.description || "Solve the coding challenge by implementing the required logic."}
            </div>

            {(problem.schemaSql || problem.schema_sql) && (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <strong className="text-[#2563EB] font-bold block text-xs flex items-center gap-1.5 font-sans">
                    <Database className="h-3.5 w-3.5" /> Provided Database Schema (DDL)
                  </strong>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold border-blue-300 text-[#2563EB]">
                    {problem.sqlEngine || problem.sql_engine || "sqlite"}
                  </Badge>
                </div>
                <pre className="text-foreground font-mono text-[10.5px] p-2 bg-background/80 rounded-lg border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {problem.schemaSql || problem.schema_sql}
                </pre>
                {(problem.seedSql || problem.seed_sql) && (
                  <div className="pt-1.5 space-y-1">
                    <strong className="text-muted-foreground font-bold block text-[11px] font-sans">Sample Data (DML):</strong>
                    <pre className="text-muted-foreground font-mono text-[10px] p-2 bg-background/80 rounded-lg border border-border/50 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                      {problem.seedSql || problem.seed_sql}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sample Test Cases */}
          {sampleTestCases.length > 0 && (
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sample Test Cases
              </h2>
              {sampleTestCases.map((tc: any, index: number) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] space-y-2 text-xs font-mono"
                >
                  <p className="font-sans font-bold text-[11px] text-[#2563EB]">
                    Sample Case {index + 1}:
                  </p>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-sans">Input:</span>
                    <pre className="p-2 bg-muted/40 rounded-lg overflow-x-auto text-[11px] mt-0.5">
                      {tc.input || "(empty)"}
                    </pre>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-sans">Expected Output:</span>
                    <pre className="p-2 bg-muted/40 rounded-lg overflow-x-auto text-[11px] mt-0.5">
                      {tc.expected_output || tc.output || "(empty)"}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Code Editor & Jobe Execution Panel */}
        <div
          className={cn(
            "flex-1 flex flex-col h-full bg-white overflow-hidden",
            mobileTab === "editor" ? "flex" : "hidden md:flex"
          )}
        >
          <CodeEditor
            problem={{
              id: problem.id,
              title: problem.title,
              slug: problem.slug,
              description: problem.description,
              difficulty: problem.difficulty,
              templates: problem.templates,
              test_cases: sampleTestCases,
            } as any}
            submissionResult={submissionResult}
            onSubmit={handleSubmitSolution}
            isSubmitting={isSubmitting}
            showSubmit={true}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}
