"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Play,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Layers,
  MessageSquare,
  Copy,
  Check,
  ThumbsUp,
  Send,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Lock,
  AlertTriangle,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CodingProblemsService } from "@/services/coding-problems.service";
import { CodingProgressService } from "@/services/coding-progress.service";
import { CodingDiscussService, type CodingDiscussPost } from "@/services/coding-discuss.service";
import { SubmissionService } from "@/services/submission.service";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import type { CodingLanguage, CodingSubmission, TestCaseResult } from "@/types/coding";
import { registerMonacoCompletions } from "@/lib/monaco-completions";
import { cn } from "@/lib/utils";

// Lazy load Monaco Editor with branded loading
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-[#18181B] text-slate-400 gap-2">
      <Loading size="sm" text="Loading editor..." ring={false} />
    </div>
  ),
});

const SUPPORTED_LANGUAGES: { id: CodingLanguage; name: string; monacoLang: string; label: string }[] = [
  { id: "java", name: "Java 21", monacoLang: "java", label: "Java" },
  { id: "python", name: "Python 3", monacoLang: "python", label: "Python" },
  { id: "cpp", name: "C++ (GCC 11)", monacoLang: "cpp", label: "C++" },
  { id: "c", name: "C (GCC 11)", monacoLang: "c", label: "C" },
  { id: "javascript", name: "JavaScript (Node.js)", monacoLang: "javascript", label: "JavaScript" },
  { id: "typescript", name: "TypeScript", monacoLang: "typescript", label: "TypeScript" },
];

export default function ProblemSolvingWorkspace() {
  const params = useParams();
  const router = useRouter();
  const problemId = (params?.problemId as string) || "1";

  // All problems list from database
  const [allProblems, setAllProblems] = useState<ExtendedCodingProblem[]>(() => {
    return CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load problems and submissions
  useEffect(() => {
    let isMounted = true;
    const loadFromDb = async () => {
      try {
        const [list, subs] = await Promise.all([
          CodingProblemsService.fetchProblems(),
          SubmissionService.fetchStudentSubmissions(),
        ]);
        if (!isMounted) return;

        const problemsList = list as ExtendedCodingProblem[];
        setAllProblems(problemsList);
        CodingProgressService.syncWithSubmissions(subs, problemsList);
      } catch (err) {
        console.error("Failed to load problems from DB:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadFromDb();
    return () => {
      isMounted = false;
    };
  }, []);

  // Current problem
  const problem = useMemo(() => {
    return allProblems.find((p) => p.id === problemId || p.slug === problemId) || null;
  }, [allProblems, problemId]);

  // Current problem 1-based sequential index
  const currentProblemIndex = useMemo(() => {
    if (!problem) return 0;
    const idx = allProblems.findIndex((p) => p.id === problem.id || p.slug === problem.slug);
    return idx >= 0 ? idx : 0;
  }, [allProblems, problem]);

  const questionNumber = currentProblemIndex + 1;

  useEffect(() => {
    if (problem?.title) {
      document.title = `SensilLearn | ${problem.title}`;
    }
  }, [problem?.title]);

  // Left Tab: Description, Solutions, Discuss
  const [leftTab, setLeftTab] = useState<"description" | "solutions" | "discuss">("description");

  // Bottom Tabs: Testcase, Test Result, Console
  const [bottomTab, setBottomTab] = useState<"testcase" | "testresult" | "console">("testcase");

  // Mobile segmented view tab switcher: "problem" | "editor" | "questions"
  const [mobileTab, setMobileTab] = useState<"problem" | "editor" | "questions">("editor");

  // Selected Language & Code State per Problem
  const [selectedLanguage, setSelectedLanguage] = useState<CodingLanguage>("java");
  const [code, setCode] = useState<string>("");

  // Custom Input text (temporary, not saved as system test case)
  const [customInputText, setCustomInputText] = useState<string>("");

  // Execution & Submission State
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningCustomInput, setIsRunningCustomInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<TestCaseResult[] | null>(null);
  const [customRunResult, setCustomRunResult] = useState<TestCaseResult | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string>("");
  const [latestSubmission, setLatestSubmission] = useState<CodingSubmission | null>(null);
  const [showVerdictModal, setShowVerdictModal] = useState(false);
  const [isBottomMinimized, setIsBottomMinimized] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<{
    title: string;
    message: string;
    type?: "compilation" | "runtime" | "system";
  } | null>(null);

  // Discussions & Comments
  const [discussions, setDiscussions] = useState<CodingDiscussPost[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  // Monaco Editor Ref
  const editorRef = useRef<any>(null);

  // Fullscreen state
  const [isEditorFullscreen, setIsEditorFullscreen] = useState<boolean>(false);

  const toggleEditorFullscreen = useCallback(() => {
    setIsEditorFullscreen((prev) => !prev);
    setTimeout(() => {
      editorRef.current?.layout();
    }, 50);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditorFullscreen) {
        setIsEditorFullscreen(false);
        setTimeout(() => editorRef.current?.layout(), 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditorFullscreen]);

  // ─── LANGUAGE RESTRICTIONS: SINGLE vs MULTI vs ALL ─────────────────────────
  const allowedLanguages: string[] = useMemo(() => {
    if (!problem) return [];
    const starter = (problem as any).starter_code || {};
    const raw =
      (problem as any).allowed_languages ||
      (problem as any).allowedLanguages ||
      starter.allowed_languages ||
      starter.allowedLanguages ||
      (problem.templates ? Object.keys(problem.templates) : null) ||
      (starter.templates ? Object.keys(starter.templates) : null);

    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((l: string) => String(l).toLowerCase().trim());
    }

    const defLang =
      (problem as any).default_language ||
      (problem as any).defaultLanguage ||
      starter.default_language ||
      starter.defaultLanguage;

    if (defLang && ((problem as any).language_mode === "single" || starter.language_mode === "single")) {
      return [String(defLang).toLowerCase().trim()];
    }

    return [];
  }, [problem]);

  const availableLanguages = useMemo(() => {
    if (allowedLanguages.length > 0) {
      const filtered = SUPPORTED_LANGUAGES.filter((l) => allowedLanguages.includes(l.id.toLowerCase()));
      if (filtered.length > 0) return filtered;
    }
    return SUPPORTED_LANGUAGES;
  }, [allowedLanguages]);

  // Load problem-specific state whenever active problem changes
  useEffect(() => {
    if (!problem) return;

    const starter = (problem as any).starter_code || {};
    const configuredDefault =
      (problem as any).default_language ||
      (problem as any).defaultLanguage ||
      starter.default_language ||
      starter.defaultLanguage;

    const saved = CodingProgressService.getProblemState(problem.id);
    const targetSavedLang = saved?.language;

    const lang: CodingLanguage = (
      targetSavedLang && availableLanguages.some((l) => l.id === targetSavedLang)
        ? targetSavedLang
        : (configuredDefault && availableLanguages.some((l) => l.id === configuredDefault))
        ? configuredDefault
        : availableLanguages[0]?.id || "java"
    ) as CodingLanguage;

    setSelectedLanguage(lang);

    const initialCode =
      saved?.code ||
      problem.templates?.[lang] ||
      starter.templates?.[lang] ||
      problem.templates?.["java"] ||
      problem.templates?.["python"] ||
      "";
    setCode(initialCode);

    setCustomInputText(saved?.customInput || "");
    setRunResults(saved?.lastExecutionResult?.results || null);
    setCustomRunResult(null);
    setBottomTab("testcase");
    setDiscussions(CodingDiscussService.getPosts(problem.id));

    const allSubs = SubmissionService.getStudentSubmissions();
    const problemSubs = allSubs.filter((s) => s.problem_id === problem.id);
    if (problemSubs.length > 0 && problemSubs[0]) {
      setLatestSubmission(problemSubs[0]);
    } else {
      setLatestSubmission(saved?.lastSubmission || null);
    }
  }, [problem?.id, availableLanguages]);

  // Handle Language Change
  const handleLanguageChange = (newLang: CodingLanguage) => {
    setSelectedLanguage(newLang);
    if (!problem) return;

    // Check saved draft in localStorage for this language
    const langSavedKey = `lms_code_${problem.id}_${newLang}`;
    const savedForLang = typeof window !== "undefined" ? localStorage.getItem(langSavedKey) : null;

    if (savedForLang) {
      setCode(savedForLang);
    } else {
      const template = problem.templates?.[newLang] || (problem as any).starter_code?.templates?.[newLang] || "";
      setCode(template);
    }

    CodingProgressService.saveDraft(problem.id, newLang, code, {
      customInput: customInputText,
    });
  };

  // Handle Code Change & Autosave
  const handleCodeChange = (newCode: string | undefined) => {
    const val = newCode || "";
    setCode(val);

    if (problem) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`lms_code_${problem.id}_${selectedLanguage}`, val);
        } catch {}
      }
      CodingProgressService.saveDraft(problem.id, selectedLanguage, val, {
        customInput: customInputText,
      });
    }
  };

  // Reset Code to default starter template
  const handleResetCode = () => {
    if (!problem) return;
    const template = problem.templates?.[selectedLanguage] || "";
    setCode(template);
    CodingProgressService.saveDraft(problem.id, selectedLanguage, template, {
      customInput: customInputText,
    });
    toast.info("Code reset to starter template.");
  };

  // Navigate to problem with autosave preservation
  const handleNavigateProblem = useCallback(
    (targetProblemId: string) => {
      if (problem?.id) {
        CodingProgressService.saveDraft(problem.id, selectedLanguage, code, {
          customInput: customInputText,
        });
      }
      router.push(`/coding/problems/${targetProblemId}`);
    },
    [problem?.id, selectedLanguage, code, customInputText, router]
  );

  // System Sample Test Cases (Read-Only)
  const systemTestCases = useMemo(() => {
    if (!problem) return [];
    const publicCases = (problem.test_cases || []).filter((tc) => !tc.is_hidden);
    if (publicCases.length > 0) return publicCases;

    if (problem.example_cases && problem.example_cases.length > 0) {
      return problem.example_cases.map((eg, idx) => ({
        id: `eg_${idx}`,
        input: eg.input,
        expected_output: eg.output,
        is_hidden: false,
      }));
    }

    return [
      {
        id: "sample_default",
        input: problem.sample_input || "(No input)",
        expected_output: problem.sample_output || "",
        is_hidden: false,
      },
    ];
  }, [problem]);

  // Hidden Test Cases (Evaluated on Run & Submit)
  const hiddenTestCases = useMemo(() => {
    if (!problem) return [];
    return (problem.test_cases || []).filter((tc) => tc.is_hidden);
  }, [problem]);

  // RUN CODE against system sample and hidden test cases
  const handleRunCode = async () => {
    if (!problem) return;
    setIsRunning(true);
    setExecutionError(null);
    setIsBottomMinimized(false);
    setBottomTab("testresult");
    setConsoleLogs(`[RUN] Executing ${selectedLanguage.toUpperCase()} code against test cases...\n`);

    try {
      const sampleCases = systemTestCases.map((tc) => ({
        id: tc.id,
        input: tc.input === "(No input)" ? "" : tc.input,
        expected_output: tc.expected_output || "",
        is_hidden: false,
      }));

      const hiddenCases = hiddenTestCases.map((tc) => ({
        id: tc.id,
        input: tc.input || "",
        expected_output: tc.expected_output || "",
        is_hidden: true,
      }));

      const casesToRun = [...sampleCases, ...hiddenCases];

      const res = await fetch("/api/code/run-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          language: selectedLanguage,
          code,
          test_cases: casesToRun,
          include_hidden: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error || "Failed to execute code";
        const isComp = errMsg.toLowerCase().includes("compil") || errMsg.toLowerCase().includes("syntax") || errMsg.toLowerCase().includes("error:");
        setExecutionError({
          title: isComp ? "Compilation Error" : "Execution Error",
          message: errMsg,
          type: isComp ? "compilation" : "system",
        });
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.compilation_error) {
        setExecutionError({
          title: "Compilation Error",
          message: data.compilation_error,
          type: "compilation",
        });
      }

      const results: TestCaseResult[] = data.results || [];
      setRunResults(results);

      // Check if any failed case has compilation or runtime diagnostic
      const firstFailedWithError = results.find((r) => !r.passed && r.error);
      if (firstFailedWithError && !data.compilation_error) {
        const errText = firstFailedWithError.error || "";
        const isComp = errText.toLowerCase().includes("compil") || errText.toLowerCase().includes("syntax");
        const isRun = errText.toLowerCase().includes("traceback") || errText.toLowerCase().includes("exception") || errText.toLowerCase().includes("runtime");
        if (isComp || isRun) {
          setExecutionError({
            title: isComp ? "Compilation Error" : "Runtime Error",
            message: errText,
            type: isComp ? "compilation" : "runtime",
          });
        }
      }

      let logStr = `\n===== TEST EXECUTION SUMMARY =====\n`;
      let passedCount = 0;
      results.forEach((r, idx) => {
        logStr += `Test Case ${idx + 1}${r.is_hidden ? " [Hidden]" : ""}: ${r.passed ? "PASSED (✓)" : "FAILED (✗)"} [Time: ${Math.round((r.time_seconds || 0.02) * 1000)}ms]\n`;
        if (r.passed) passedCount++;
        if (r.error) logStr += `Error: ${r.error}\n`;
      });
      logStr += `==================================\nTotal: ${passedCount}/${results.length} Passed\n`;
      setConsoleLogs((prev) => prev + logStr);

      CodingProgressService.saveDraft(problem.id, selectedLanguage, code, {
        customInput: customInputText,
        lastExecutionResult: { results, runAt: new Date().toISOString() },
      });

      if (passedCount === results.length) {
        toast.success(`Passed ${results.length} of ${results.length} test cases!`);
      } else {
        toast.warning(`${passedCount}/${results.length} test cases passed.`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Execution error";
      if (!executionError) {
        setExecutionError({
          title: "Execution Error",
          message: errMsg,
          type: "system",
        });
      }
      toast.error(errMsg);
      setConsoleLogs((prev) => prev + `\n[ERROR] ${errMsg}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  // RUN CUSTOM INPUT (Temporary single execution, never saved as test case)
  const handleRunCustomInput = async () => {
    if (!problem) return;
    setIsRunningCustomInput(true);
    setIsBottomMinimized(false);
    setBottomTab("testresult");
    setConsoleLogs(`[CUSTOM INPUT] Running code with custom stdin...\n`);

    try {
      const res = await fetch("/api/code/run-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          language: selectedLanguage,
          code,
          test_cases: [
            {
              id: "custom_input_temp",
              input: customInputText,
              expected_output: "",
              is_hidden: false,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Custom input execution failed");
      }

      const data = await res.json();
      const results: TestCaseResult[] = data.results || [];
      const res0 = results[0] || null;
      setCustomRunResult(res0);

      if (res0) {
        setConsoleLogs(
          (prev) =>
            prev +
            `\n===== CUSTOM INPUT OUTPUT =====\n${res0.actual_output || "(No output produced)"}\n${
              res0.error ? `Error: ${res0.error}\n` : ""
            }Time: ${Math.round((res0.time_seconds || 0.02) * 1000)}ms\n`
        );
      }
      toast.success("Custom input executed successfully");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Custom input execution error";
      toast.error(errMsg);
      setConsoleLogs((prev) => prev + `\n[ERROR] ${errMsg}\n`);
    } finally {
      setIsRunningCustomInput(false);
    }
  };

  // SUBMIT SOLUTION
  const handleSubmitCode = async () => {
    if (!problem) return;
    setIsSubmitting(true);
    setExecutionError(null);
    setIsBottomMinimized(false);
    setBottomTab("testresult");
    setConsoleLogs(`[SUBMIT] Submitting solution for official evaluation...\n`);

    const wasAlreadySolved =
      CodingProgressService.getProblemStatus(problem.id) === "solved" ||
      (latestSubmission?.status === "accepted");

    try {
      const res = await fetch("/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          language: selectedLanguage,
          code,
          test_cases: problem.test_cases,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error || "Submission evaluation failed";
        setExecutionError({
          title: "Submission Error",
          message: errMsg,
          type: "system",
        });
        throw new Error(errMsg);
      }

      const submission: CodingSubmission = await res.json();
      setLatestSubmission(submission);
      setRunResults(submission.results || []);
      setShowVerdictModal(true);

      if (submission.status === "compilation_error" || submission.status === "runtime_error" || (submission as any).error_message) {
        setExecutionError({
          title: submission.status === "compilation_error" ? "Compilation Error" : "Runtime Error",
          message: (submission as any).error_message || (submission.results || []).find((r: any) => r.error)?.error || "An error occurred during evaluation.",
          type: submission.status === "compilation_error" ? "compilation" : "runtime",
        });
      }

      CodingProgressService.markAttempted(
        problem.id,
        selectedLanguage,
        code,
        submission,
        wasAlreadySolved
      );

      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("student-activity-updated", { detail: submission }));
        } catch {}
      }

      if (submission.status === "accepted") {
        const scoreVal = (submission as any).score ?? problem.points ?? 100;
        const maxScoreVal = (submission as any).max_score ?? problem.points ?? 100;
        toast.success("Accepted! All test cases passed.", {
          description: `Score: ${scoreVal} / ${maxScoreVal}`,
        });
      } else {
        toast.error(`Verdict: ${submission.status.replace("_", " ").toUpperCase()}`, {
          description: `${submission.passed_test_cases}/${submission.total_test_cases} test cases passed.`,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Submission error";
      if (!executionError) {
        setExecutionError({
          title: "Submission Error",
          message: errMsg,
          type: "system",
        });
      }
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discussion helper
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !problem) return;
    const post = await CodingDiscussService.addPost({
      problemId: problem.id,
      title: `Discussion on ${problem.title}`,
      author: { name: "Student", role: "student", badge: "Student" },
      tags: [selectedLanguage, problem.difficulty],
      content: newCommentText.trim(),
    });
    if (post) {
      setDiscussions([post, ...discussions]);
      setNewCommentText("");
      toast.success("Comment posted");
    }
  };

  // Copy helper
  const handleCopyCode = (key: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedCodeKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  // Counts for Right Question Navigation
  const solvedCount = useMemo(() => {
    return allProblems.filter((p) => CodingProgressService.isProblemSolved(p.id, p.slug)).length;
  }, [allProblems, latestSubmission]);

  const inProgressCount = useMemo(() => {
    return allProblems.filter((p) => {
      const isSolved = CodingProgressService.isProblemSolved(p.id, p.slug);
      if (isSolved) return false;
      const status = CodingProgressService.getProblemStatus(p.id);
      return status === "in_progress" || status === "attempted";
    }).length;
  }, [allProblems, latestSubmission]);

  const notAttemptedCount = useMemo(() => {
    const total = allProblems.length;
    const remaining = total - solvedCount - inProgressCount;
    return remaining >= 0 ? remaining : 0;
  }, [allProblems.length, solvedCount, inProgressCount]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground font-sans">
        <Loading
          text="Loading coding problem..."
          subtext="Preparing code lab problem and test cases."
          size="lg"
        />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 font-sans p-6 text-center">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Problem Not Available in Code Lab</h2>
        <p className="text-xs text-slate-600 max-w-md mb-6 leading-relaxed">
          This problem belongs to a Practice Module or is not published in Code Lab. Practice and Code Lab problems are isolated.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push("/coding")} variant="outline" className="rounded-xl text-xs">
            Back to Code Lab
          </Button>
          <Button onClick={() => router.push("/student/practices")} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs">
            Go to Practice
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen min-h-[100dvh] bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-hidden select-none">
      {/* ─── 1. TOP HEADER & ACTION BAR (CLEAN, NO GLOBAL LMS NAVBAR) ─── */}
      <header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs z-20">
        {/* Left: ← Back to Practice / #1. Title [Difficulty] */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/coding");
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Practice</span>
          </button>

          <span className="text-slate-300 font-medium">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              #{questionNumber}. {problem.title}
            </span>

            <span
              className={cn(
                "px-2 py-0.5 text-[11px] font-bold rounded-md capitalize shrink-0 border",
                problem.difficulty === "easy"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : problem.difficulty === "hard"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}
            >
              {problem.difficulty === "easy" ? "Easy" : problem.difficulty === "hard" ? "Hard" : "Medium"}
            </span>
          </div>
        </div>

        {/* Right Action Bar: [Language ▼] [Reset Code] [Run] [Submit] */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Language selector: Single Language (fixed/locked) vs Multi Language (filtered dropdown) */}
          {availableLanguages.length === 1 ? (
            <div className="h-8.5 px-3 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 flex items-center gap-1.5 shadow-2xs select-none">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <span className="font-bold">{availableLanguages[0]?.label || availableLanguages[0]?.name || "Language"}</span>
            </div>
          ) : (
            <Select
              value={selectedLanguage}
              onValueChange={(val) => handleLanguageChange(val as CodingLanguage)}
            >
              <SelectTrigger className="h-8.5 text-xs font-semibold bg-white border-slate-200 w-28 sm:w-32 rounded-lg text-slate-800 shadow-2xs cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-md z-50">
                {availableLanguages.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs font-medium cursor-pointer">
                    {l.label || l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Reset Code */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetCode}
            className="h-8.5 px-3 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Code</span>
          </Button>

          {/* Run Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting || isRunningCustomInput}
            className="h-8.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run</span>
          </Button>

          {/* Submit Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleSubmitCode}
            disabled={isSubmitting || isRunning || isRunningCustomInput}
            className="h-8.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>Submit</span>
          </Button>
        </div>
      </header>

      {/* Mobile Tab Switcher (< lg viewports) */}
      <div className="lg:hidden flex items-center justify-between p-1 bg-slate-100 border-b border-slate-200 px-3 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("problem")}
          className={cn(
            "flex-1 py-1 text-xs font-semibold rounded-md transition-all",
            mobileTab === "problem" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600"
          )}
        >
          Description
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("editor")}
          className={cn(
            "flex-1 py-1 text-xs font-semibold rounded-md transition-all",
            mobileTab === "editor" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600"
          )}
        >
          Code &amp; Test
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("questions")}
          className={cn(
            "flex-1 py-1 text-xs font-semibold rounded-md transition-all",
            mobileTab === "questions" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600"
          )}
        >
          Problems ({allProblems.length})
        </button>
      </div>

      {/* ─── 2. MAIN 3-COLUMN WORKSPACE: LEFT (PROBLEM) | CENTER (EDITOR & TEST) | RIGHT (PROBLEMS) ─── */}
      <main className="flex-1 p-3 sm:p-4 overflow-hidden min-h-0">
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[30%_minmax(0,1fr)_20%] xl:grid-cols-[29%_minmax(0,1fr)_19%] gap-3.5 overflow-hidden">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN: PROBLEM DESCRIPTION PANEL
          ══════════════════════════════════════════════════════════════════ */}
          <div
            className={cn(
              "h-full rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col overflow-hidden",
              mobileTab === "problem" ? "flex" : "hidden lg:flex"
            )}
          >
            {/* Tabs: Description | Solutions | Discuss (0) */}
            <div className="h-10 border-b border-slate-200 px-4 flex items-center gap-5 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setLeftTab("description")}
                className={cn(
                  "h-full text-xs font-bold transition-all relative cursor-pointer",
                  leftTab === "description"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                )}
              >
                Description
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("solutions")}
                className={cn(
                  "h-full text-xs font-bold transition-all relative cursor-pointer",
                  leftTab === "solutions"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                )}
              >
                Solutions
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("discuss")}
                className={cn(
                  "h-full text-xs font-bold transition-all relative cursor-pointer",
                  leftTab === "discuss"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                )}
              >
                Discuss ({discussions.length})
              </button>
            </div>

            {/* Panel Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-slate-800 text-xs sm:text-sm select-text">
              {leftTab === "description" && (
                <>
                  {/* Title & Stats */}
                  <div className="space-y-2">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {questionNumber}. {problem.title}
                    </h1>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-bold rounded capitalize border",
                          problem.difficulty === "easy"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : problem.difficulty === "hard"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {problem.difficulty === "easy" ? "Easy" : problem.difficulty === "hard" ? "Hard" : "Medium"}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Acceptance: <strong className="text-slate-700 font-bold">{problem.acceptance_rate || "100%"}</strong>
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Points: <strong className="text-slate-700 font-bold">{problem.points || 100}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Problem Statement */}
                  <div className="space-y-1.5">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      Problem Statement
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {problem.description || "Write a program to solve the coding challenge."}
                    </p>
                  </div>

                  {/* Example(s) */}
                  <div className="space-y-2.5">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      Example
                    </h2>
                    {problem.example_cases && problem.example_cases.length > 0 ? (
                      problem.example_cases.map((eg, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 space-y-2"
                        >
                          <span className="text-xs font-bold text-slate-800 block">
                            Example {idx + 1}:
                          </span>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600 block">Input:</span>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                              {eg.input || "(No input)"}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600 block">Output:</span>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                              {eg.output}
                            </div>
                          </div>

                          {eg.explanation && (
                            <p className="text-[11px] text-slate-500 pt-0.5 leading-relaxed">
                              <strong className="text-slate-700">Explanation: </strong>
                              {eg.explanation}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 space-y-2">
                        <span className="text-xs font-bold text-slate-800 block">
                          Example 1:
                        </span>
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-600 block">Input:</span>
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800">
                            {problem.sample_input || "(No input)"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-600 block">Output:</span>
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800">
                            {problem.sample_output || "(No output required)"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Constraints */}
                  <div className="space-y-1.5">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      Constraints
                    </h2>
                    <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                      {problem.constraints || "There are no constraints."}
                    </p>
                  </div>

                  {/* Side-by-Side: Input Format & Output Format */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1">
                      <strong className="text-xs font-bold text-slate-900 block">
                        Input Format
                      </strong>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {problem.input_format || "The program does not take any input."}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1">
                      <strong className="text-xs font-bold text-slate-900 block">
                        Output Format
                      </strong>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {problem.output_format || `Print exactly: ${problem.sample_output || "output"}`}
                      </p>
                    </div>
                  </div>

                  {/* Topics */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      Topics
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.topic_tags && problem.topic_tags.length > 0 ? (
                        problem.topic_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-medium">
                            Basic
                          </span>
                          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-medium">
                            Output
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: SOLUTIONS */}
              {leftTab === "solutions" && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">Official Editorial Solutions</h2>
                  {problem.solution_editorial ? (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600 leading-relaxed bg-blue-50/60 p-3 rounded-lg border border-blue-100">
                        {problem.solution_editorial.overview}
                      </p>
                      {problem.solution_editorial.approaches.map((app, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50">
                          <h3 className="font-bold text-xs text-slate-900">{app.name}</h3>
                          <p className="text-xs text-slate-600 leading-relaxed">{app.explanation}</p>
                          {Object.entries(app.code).map(([lKey, snippet]) => (
                            <div key={lKey} className="mt-2 rounded-lg border border-slate-200 overflow-hidden bg-white">
                              <div className="bg-slate-100 px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                                <span>{lKey}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(`${idx}-${lKey}`, snippet)}
                                  className="text-slate-500 hover:text-slate-900 cursor-pointer flex items-center gap-1"
                                >
                                  {copiedCodeKey === `${idx}-${lKey}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>Copy</span>
                                </button>
                              </div>
                              <pre className="p-3 text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre">
                                {snippet}
                              </pre>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No editorial solutions available for this question.</p>
                  )}
                </div>
              )}

              {/* TAB 3: DISCUSS */}
              {leftTab === "discuss" && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">Problem Discussion</h2>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <Textarea
                      placeholder="Share your logic, doubts, or approach..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="h-16 text-xs bg-white border-slate-200 resize-none rounded-lg"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim()}
                        className="bg-blue-600 text-white rounded-lg text-xs h-7.5 px-3 gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> Post
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {discussions.map((d) => (
                      <div key={d.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                          <span>{d.author.name}</span>
                          <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{d.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              CENTER COLUMN: LIGHT MONACO CODE EDITOR + TESTCASE / CONSOLE PANEL
          ══════════════════════════════════════════════════════════════════ */}
          <div
            className={cn(
              "h-full flex flex-col gap-3 overflow-hidden min-h-0",
              mobileTab === "editor" ? "flex" : "hidden lg:flex"
            )}
          >
            {/* Upper: Light Code Editor Card */}
            <div
              className={cn(
                "rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col overflow-hidden transition-all duration-150",
                isEditorFullscreen
                  ? "fixed inset-0 z-50 rounded-none border-none h-screen w-screen shadow-2xl"
                  : "flex-1 min-h-[280px]"
              )}
            >
              {/* Editor Header Bar: Blue Dot + Code Editor + Language Badge + Fullscreen Button */}
              <div className="h-10 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span className="text-xs font-bold text-slate-800">Code Editor</span>
                  {isEditorFullscreen && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full">
                      FULLSCREEN (ESC)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEditorFullscreen && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResetCode}
                        className="h-7 px-2 text-xs font-semibold gap-1 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span className="hidden sm:inline text-[11px]">Reset</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleRunCode}
                        disabled={isRunning || isSubmitting || isRunningCustomInput}
                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold gap-1"
                      >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                        <span className="text-[11px]">Run</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmitCode}
                        disabled={isSubmitting || isRunning || isRunningCustomInput}
                        className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold gap-1"
                      >
                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 stroke-[2.5]" />}
                        <span className="text-[11px]">Submit</span>
                      </Button>
                    </>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">
                      {selectedLanguage}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleEditorFullscreen}
                    className="h-7 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                    title={isEditorFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Code Editor"}
                  >
                    {isEditorFullscreen ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-semibold text-blue-600 text-[11px]">Exit</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="font-medium text-slate-600 text-[11px]">Fullscreen</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Monaco Editor in Pure Light ("vs") Theme */}
              <div className="flex-1 relative bg-white overflow-hidden">
                <MonacoEditor
                  language={SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage)?.monacoLang || "java"}
                  value={code}
                  theme="vs"
                  onChange={handleCodeChange}
                  beforeMount={(monaco) => registerMonacoCompletions(monaco)}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monaco.editor.setTheme("vs");
                  }}
                  options={{
                    fontSize: 13,
                    lineHeight: 21,
                    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    automaticLayout: true,
                    tabSize: selectedLanguage === "python" ? 4 : 2,
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                  }}
                />
              </div>
            </div>

            {/* Lower: Testcase / Test Result / Console Panel */}
            <div
              className={cn(
                "rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col overflow-hidden shrink-0 transition-all duration-200",
                isBottomMinimized ? "h-9.5" : "h-60 sm:h-64"
              )}
            >
              {/* Bottom Panel Tabs: Testcase | Test Result | Console + Minimize/Expand Button */}
              <div className="h-9.5 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 bg-white select-none">
                <div className="flex items-center gap-5 h-full">
                  <button
                    type="button"
                    onClick={() => {
                      setBottomTab("testcase");
                      if (isBottomMinimized) setIsBottomMinimized(false);
                    }}
                    className={cn(
                      "h-full text-xs font-bold transition-all relative cursor-pointer",
                      bottomTab === "testcase"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                    )}
                  >
                    Testcase
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBottomTab("testresult");
                      if (isBottomMinimized) setIsBottomMinimized(false);
                    }}
                    className={cn(
                      "h-full text-xs font-bold transition-all relative cursor-pointer",
                      bottomTab === "testresult"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                    )}
                  >
                    Test Result
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBottomTab("console");
                      if (isBottomMinimized) setIsBottomMinimized(false);
                    }}
                    className={cn(
                      "h-full text-xs font-bold transition-all relative cursor-pointer",
                      bottomTab === "console"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                    )}
                  >
                    Console
                  </button>
                </div>

                {/* Minimize / Expand Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsBottomMinimized((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title={isBottomMinimized ? "Expand testcase panel" : "Minimize testcase panel"}
                >
                  {isBottomMinimized ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-blue-600 font-semibold text-[11px]">Expand</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span className="text-slate-600 text-[11px]">Minimize</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bottom Tab Content */}
              {!isBottomMinimized && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
                {/* ─── TAB 1: TESTCASE (CUSTOM INPUT + SYSTEM TEST CASES) ─── */}
                {bottomTab === "testcase" && (
                  <div className="space-y-4">
                    {/* Custom Input Option */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">Custom Input</span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleRunCustomInput}
                          disabled={isRunningCustomInput || isRunning || isSubmitting}
                          className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
                        >
                          {isRunningCustomInput ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>Run Custom Input</span>
                        </Button>
                      </div>

                      <Textarea
                        placeholder="Enter custom input (if required)"
                        value={customInputText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomInputText(val);
                          if (problem) {
                            CodingProgressService.saveDraft(problem.id, selectedLanguage, code, {
                              customInput: val,
                            });
                          }
                        }}
                        className="h-16 text-xs font-mono bg-white border-slate-200 rounded-lg resize-none shadow-2xs"
                      />
                    </div>

                    {/* System Test Cases (Strictly Read-Only, No Add/Delete Case) */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Sample Test Cases ({systemTestCases.length})
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                          Public
                        </span>
                      </div>

                      {systemTestCases.map((tc, idx) => (
                        <div key={tc.id || idx} className="space-y-2">
                          <span className="font-semibold text-slate-700 text-xs block">
                            Sample Case {idx + 1}:
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-600">Input (stdin)</span>
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 min-h-[38px] whitespace-pre-wrap">
                                {tc.input || "(No input)"}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-600">Expected Output</span>
                              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 min-h-[38px] whitespace-pre-wrap">
                                {tc.expected_output || "(No output)"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Hidden Test Cases Section */}
                      {hiddenTestCases.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Hidden Test Cases ({hiddenTestCases.length})</span>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                              Evaluated on Run & Submit
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {hiddenTestCases.map((tc: any, hIdx: number) => (
                              <div
                                key={tc.id || hIdx}
                                className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                              >
                                <span className="font-medium text-slate-700">Hidden Test Case {hIdx + 1}</span>
                                <span className="text-[11px] text-slate-400 font-mono">🔒 [Hidden]</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: TEST RESULT ─── */}
                {bottomTab === "testresult" && (
                  <div className="space-y-3">
                    {/* Compilation / Runtime Error Banner */}
                    {executionError && (
                      <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="font-bold text-xs text-rose-900">{executionError.title}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 px-2 py-0.5 bg-white border border-rose-200 rounded">
                            {executionError.type || "Error"}
                          </span>
                        </div>
                        <pre className="p-2.5 bg-white border border-rose-200 text-rose-800 rounded-lg font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-2xs">
                          {executionError.message}
                        </pre>
                      </div>
                    )}

                    {/* Custom Input Result */}
                    {customRunResult && (
                      <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                          <span>Custom Input Result</span>
                          <span className="text-slate-500 font-normal">
                            Runtime: {Math.round((customRunResult.time_seconds || 0.02) * 1000)}ms
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 block mb-1">Your Output:</span>
                          <pre className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                            {customRunResult.actual_output || "(Empty output)"}
                          </pre>
                        </div>
                        {customRunResult.error && (
                          <div className="p-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-mono">
                            {customRunResult.error}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Standard & Hidden Test Run Results */}
                    {runResults && runResults.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            Verdict: {runResults.every((r) => r.passed) ? (
                              <span className="text-emerald-600 font-bold">All Passed (✓)</span>
                            ) : (
                              <span className="text-rose-600 font-bold">Some Failed (✗)</span>
                            )}
                          </span>
                          <span className="text-slate-500 font-medium text-xs">
                            {runResults.filter((r) => r.passed).length}/{runResults.length} Test Cases Passed
                          </span>
                        </div>

                        {runResults.map((r, rIdx) => (
                          <div
                            key={rIdx}
                            className={cn(
                              "p-3 rounded-xl border space-y-2 transition-colors",
                              r.passed ? "bg-emerald-50/40 border-emerald-200/80" : "bg-rose-50/40 border-rose-200/80"
                            )}
                          >
                            <div className="flex items-center justify-between font-bold text-xs">
                              <div className="flex items-center gap-2">
                                <span className={cn("flex items-center gap-1.5", r.passed ? "text-emerald-700" : "text-rose-700")}>
                                  {r.passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                  Case {rIdx + 1}
                                </span>
                                {r.is_hidden ? (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    <Lock className="w-2.5 h-2.5" />
                                    Hidden
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                    Sample
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[11px] font-bold", r.passed ? "text-emerald-600" : "text-rose-600")}>
                                  {r.passed ? "PASSED" : "FAILED"}
                                </span>
                                <span className="text-slate-500 text-[11px] font-normal">
                                  {Math.round((r.time_seconds || 0.02) * 1000)}ms
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                              <div>
                                <span className="text-[10px] font-semibold text-slate-600 block uppercase font-sans">Expected Output:</span>
                                <pre className="p-2 bg-white rounded border border-slate-200 font-mono text-xs whitespace-pre-wrap min-h-[34px]">
                                  {r.is_hidden ? "[Hidden for evaluation]" : (r.expected_output || "(No output)")}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-slate-600 block uppercase font-sans">Actual Output:</span>
                                <pre className="p-2 bg-white rounded border border-slate-200 font-mono text-xs whitespace-pre-wrap min-h-[34px]">
                                  {r.actual_output || (r.passed ? "Match" : "(No output produced)")}
                                </pre>
                              </div>
                            </div>

                            {/* Error Details Box */}
                            {r.error && (
                              <div className="p-2.5 bg-rose-50/90 border border-rose-200 rounded-lg space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block font-sans">
                                  Error / Diagnostic:
                                </span>
                                <pre className="text-xs text-rose-800 font-mono whitespace-pre-wrap">
                                  {r.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : !customRunResult && !executionError ? (
                      <div className="py-8 text-center text-slate-400">
                        Click <strong className="text-slate-600">Run</strong> or <strong className="text-slate-600">Run Custom Input</strong> to evaluate your code.
                      </div>
                    ) : null}
                  </div>
                )}

                {/* ─── TAB 3: CONSOLE ─── */}
                {bottomTab === "console" && (
                  <div className="h-full">
                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs h-full min-h-[120px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                      {consoleLogs || "Console ready. Execution logs will stream here...\n"}
                    </pre>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: PROBLEMS QUESTION NAVIGATION PANEL
          ══════════════════════════════════════════════════════════════════ */}
          <div
            className={cn(
              "h-full rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col overflow-hidden",
              mobileTab === "questions" ? "flex" : "hidden lg:flex"
            )}
          >
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Problems ({allProblems.length})
                </h3>
              </div>

              {/* Status Legend (No Emojis) */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 font-medium">Solved</span>
                  <span className="font-bold text-slate-900 ml-auto">({solvedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-600 font-medium">In-progress</span>
                  <span className="font-bold text-slate-900 ml-auto">({inProgressCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-slate-600 font-medium">Not Attempted</span>
                  <span className="font-bold text-slate-900 ml-auto">({notAttemptedCount})</span>
                </div>
              </div>

              {/* Questions Grid Numbers: [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] ... */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {allProblems.map((p, idx) => {
                  const qNum = idx + 1;
                  const isCurrent = p.id === problem.id || p.slug === problem.slug;
                  const isSolved = CodingProgressService.isProblemSolved(p.id, p.slug);
                  const isProg =
                    !isSolved &&
                    (CodingProgressService.getProblemStatus(p.id) === "in_progress" ||
                      CodingProgressService.getProblemStatus(p.id) === "attempted");

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleNavigateProblem(p.id)}
                      className={cn(
                        "h-9 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer shadow-2xs",
                        isCurrent
                          ? "bg-blue-600 text-white font-bold ring-2 ring-blue-600/30"
                          : isSolved
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200/80 font-bold"
                          : isProg
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200/80 font-bold"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                      )}
                    >
                      {qNum}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── 3. BOTTOM PREVIOUS / NEXT BAR ─── */}
      <footer className="h-14 bg-white border-t border-slate-200/90 px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentProblemIndex <= 0}
          onClick={() => {
            const prevProb = allProblems[currentProblemIndex - 1];
            if (currentProblemIndex > 0 && prevProb) {
              handleNavigateProblem(prevProb.id);
            }
          }}
          className="h-8.5 px-4 text-xs font-semibold text-slate-700 border-slate-200 rounded-lg gap-1.5 disabled:opacity-40 cursor-pointer hover:bg-slate-50 shadow-2xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </Button>

        <span className="text-xs font-bold text-slate-700 tracking-wide font-mono">
          {questionNumber} / {allProblems.length}
        </span>

        <Button
          type="button"
          size="sm"
          disabled={currentProblemIndex >= allProblems.length - 1}
          onClick={() => {
            const nextProb = allProblems[currentProblemIndex + 1];
            if (currentProblemIndex < allProblems.length - 1 && nextProb) {
              handleNavigateProblem(nextProb.id);
            }
          }}
          className="h-8.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs transition-all"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </footer>

      {/* Submission Verdict Dialog */}
      <Dialog open={showVerdictModal} onOpenChange={setShowVerdictModal}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 p-6 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-2 text-center items-center">
            {latestSubmission?.status === "accepted" ? (
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-1">
                <XCircle className="w-7 h-7" />
              </div>
            )}
            <DialogTitle className="text-lg font-bold text-slate-900 capitalize">
              {latestSubmission?.status === "accepted" ? "Solution Accepted!" : `Verdict: ${latestSubmission?.status?.replace("_", " ")}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Passed {latestSubmission?.passed_test_cases || 0} of {latestSubmission?.total_test_cases || 0} test cases.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Score</span>
                <span className="font-bold text-slate-800">
                  {(latestSubmission as any)?.score ?? Math.round(((latestSubmission?.passed_test_cases || 0) / Math.max(1, latestSubmission?.total_test_cases || 1)) * (problem?.points || 100))} / {(latestSubmission as any)?.max_score ?? (problem?.points || 100)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Runtime</span>
                <span className="font-bold text-slate-800">
                  {latestSubmission?.execution_time ? `${Math.round(latestSubmission.execution_time * 1000)}ms` : "16ms"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowVerdictModal(false)}
              className="w-full h-8.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
            >
              Continue Practice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
