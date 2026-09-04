"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Play,
  XCircle,
  RotateCcw,
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Code2,
  Terminal,
  BookOpen,
  MessageSquare,
  Layers,
  Sparkles,
  Copy,
  Check,
  Plus,
  Pause,
  ThumbsUp,
  Send
} from "lucide-react";
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

// Lazy load Monaco Editor with light theme loading spinner
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-white text-slate-400 gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <span className="text-xs font-medium text-slate-500">Loading Monaco Editor...</span>
    </div>
  ),
});

const SUPPORTED_LANGUAGES: { id: CodingLanguage; name: string; monacoLang: string }[] = [
  { id: "python", name: "Python 3", monacoLang: "python" },
  { id: "javascript", name: "JavaScript (Node.js)", monacoLang: "javascript" },
  { id: "typescript", name: "TypeScript", monacoLang: "typescript" },
  { id: "java", name: "Java 21", monacoLang: "java" },
  { id: "cpp", name: "C++ (GCC 11)", monacoLang: "cpp" },
  { id: "c", name: "C (GCC 11)", monacoLang: "c" },
];

export default function ProblemSolvingWorkspace() {
  const params = useParams();
  const router = useRouter();
  const problemId = (params?.problemId as string) || "1";

  // Derived Problem & All Problems from DB
  const [allProblems, setAllProblems] = useState<ExtendedCodingProblem[]>(() => {
    return CodingProblemsService.getAllProblems() as ExtendedCodingProblem[];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const list = await CodingProblemsService.fetchProblems();
        setAllProblems(list as ExtendedCodingProblem[]);
      } catch (err) {
        console.error("Failed to load problems from database:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFromDb();
  }, []);

  const problem = useMemo(() => {
    return allProblems.find((p) => p.id === problemId || p.slug === problemId) || null;
  }, [allProblems, problemId]);

  const [leftTab, setLeftTab] = useState<"description" | "solutions" | "submissions" | "discuss">("description");

  // Code & Language State initialized with saved state
  const [selectedLanguage, setSelectedLanguage] = useState<CodingLanguage>(() => {
    const p = CodingProblemsService.getAllProblems().find((item) => item.id === problemId || item.slug === problemId);
    if (!p) return "python";
    const saved = CodingProgressService.getProblemState(p.id);
    return saved?.language || "python";
  });

  const [code, setCode] = useState<string>(() => {
    const p = CodingProblemsService.getAllProblems().find((item) => item.id === problemId || item.slug === problemId) as ExtendedCodingProblem;
    if (!p) return "";
    const saved = CodingProgressService.getProblemState(p.id);
    if (saved && saved.code) return saved.code;
    const lang = saved?.language || "python";
    return p.templates[lang] || p.templates["python"] || "";
  });

  // Bottom Console Tabs
  const [bottomTab, setBottomTab] = useState<"testcase" | "testresult" | "console">("testcase");
  const [bottomExpanded, setBottomExpanded] = useState<boolean>(true);
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState<number>(0);
  const [customTestCases, setCustomTestCases] = useState<{ id: string; input: string; expected_output?: string }[]>(() => {
    const p = CodingProblemsService.getAllProblems().find((item) => item.id === problemId || item.slug === problemId) as ExtendedCodingProblem;
    if (!p) return [{ id: "tc_1", input: "" }];
    const initialCases = (p.test_cases || [])
      .filter((tc) => !tc.is_hidden)
      .map((tc) => ({
        id: tc.id,
        input: tc.input,
        expected_output: tc.expected_output,
      }));
    return initialCases.length > 0 ? initialCases : [{ id: "tc_custom_1", input: p.sample_input || "" }];
  });

  // Execution & Submission State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<TestCaseResult[] | null>(() => {
    const p = CodingProblemsService.getAllProblems().find((item) => item.id === problemId || item.slug === problemId);
    if (!p) return null;
    const saved = CodingProgressService.getProblemState(p.id);
    return saved?.lastExecutionResult?.results || null;
  });
  const [consoleLogs, setConsoleLogs] = useState<string>("");
  const [latestSubmission, setLatestSubmission] = useState<CodingSubmission | null>(() => {
    const p = CodingProblemsService.getAllProblems().find((item) => item.id === problemId || item.slug === problemId);
    if (!p) return null;
    const saved = CodingProgressService.getProblemState(p.id);
    return saved?.lastSubmission || null;
  });
  const [showVerdictModal, setShowVerdictModal] = useState(false);

  // Submission Viewer Modal
  const [selectedSubmissionForView, setSelectedSubmissionForView] = useState<CodingSubmission | null>(null);

  // Problem Submissions History
  const [problemSubmissions, setProblemSubmissions] = useState<CodingSubmission[]>(() => {
    const allSubs = SubmissionService.getStudentSubmissions();
    return allSubs.filter((s) => s.problem_id === problemId);
  });

  // Discussions
  const [discussions, setDiscussions] = useState<CodingDiscussPost[]>(() => {
    return CodingDiscussService.getPosts(problemId);
  });
  const [newCommentText, setNewCommentText] = useState("");

  // Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    const p = CodingProblemsService.getAllProblems().find((item) => item.id === problemId || item.slug === problemId);
    if (!p) return 0;
    const saved = CodingProgressService.getProblemState(p.id);
    return saved?.timerSeconds || 0;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Copy state for solutions
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  // Monaco Editor Ref
  const editorRef = useRef<unknown>(null);

  // Re-route if problem doesn't exist after loading completes
  useEffect(() => {
    if (!isLoading && !problem) {
      toast.error("Problem not found");
      router.push("/coding/problems");
    }
  }, [isLoading, problem, router]);

  // 2. Timer Tick
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        const next = prev + 1;
        if (problem?.id && next % 10 === 0) {
          CodingProgressService.saveDraft(problem.id, selectedLanguage, code, { timerSeconds: next });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, problem, selectedLanguage, code]);

  // 3. Handle Language Change
  const handleLanguageChange = (newLang: CodingLanguage) => {
    setSelectedLanguage(newLang);
    if (!problem) return;

    // Check if saved draft exists for this language
    const saved = localStorage.getItem(`edunexus_draft_${problem.id}_${newLang}`);
    if (saved) {
      setCode(saved);
    } else {
      const template = problem.templates[newLang] || "";
      setCode(template);
    }
    CodingProgressService.saveDraft(problem.id, newLang, code);
  };

  // 4. Handle Code Change & Autosave
  const handleCodeChange = (newCode: string | undefined) => {
    const val = newCode || "";
    setCode(val);

    if (problem) {
      CodingProgressService.saveDraft(problem.id, selectedLanguage, val, {
        timerSeconds,
      });
    }
  };

  // 5. Reset Code Confirmation
  const handleResetCode = () => {
    if (!problem) return;
    if (window.confirm("Are you sure you want to reset code? Your current edits will be replaced with the default template.")) {
      const template = problem.templates[selectedLanguage] || "";
      setCode(template);
      CodingProgressService.saveDraft(problem.id, selectedLanguage, template);
      toast.info("Code restored to starter template.");
    }
  };

  // 6. RUN CODE (Real Execution against public test cases)
  const handleRunCode = async () => {
    if (!problem) return;
    setIsRunning(true);
    setBottomTab("testresult");
    setBottomExpanded(true);
    setConsoleLogs(`[RUN] Executing ${selectedLanguage.toUpperCase()} code against test cases...\n`);

    try {
      const casesToRun = customTestCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expected_output: tc.expected_output || "",
        is_hidden: false,
      }));

      const res = await fetch("/api/code/run-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          language: selectedLanguage,
          code,
          test_cases: casesToRun,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to execute code on server");
      }

      const data = await res.json();
      const results: TestCaseResult[] = data.results || [];
      setRunResults(results);

      // Log execution trace to console
      let logStr = `\n===== RUN EXECUTION SUMMARY =====\n`;
      let passedCount = 0;
      results.forEach((r, idx) => {
        logStr += `Case ${idx + 1}: ${r.passed ? "PASSED (✓)" : "FAILED (✗)"} [Time: ${(r.time_seconds || 0.02) * 1000} ms]\n`;
        if (r.passed) passedCount++;
        if (r.error) logStr += `Error: ${r.error}\n`;
      });
      logStr += `================================\nTotal: ${passedCount}/${results.length} Passed\n`;
      setConsoleLogs((prev) => prev + logStr);

      // Update progress state
      CodingProgressService.saveDraft(problem.id, selectedLanguage, code, {
        timerSeconds,
        lastExecutionResult: { results, runAt: new Date().toISOString() },
      });

      if (passedCount === results.length) {
        toast.success(`All ${results.length} test cases passed! Ready to submit.`);
      } else {
        toast.warning(`${passedCount}/${results.length} test cases passed. Review output mismatch.`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Execution error";
      console.error("Run error:", err);
      toast.error(errMsg);
      setConsoleLogs((prev) => prev + `\n[ERROR] ${errMsg}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 7. SUBMIT CODE (Real Execution against Public + Hidden Online Judge Test Cases)
  const handleSubmitCode = async () => {
    if (!problem) return;
    setIsSubmitting(true);
    setConsoleLogs(`[SUBMIT] Sending solution to Online Judge for official grading...\n`);

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
        throw new Error(errJson.error || "Submission failed");
      }

      const submission: CodingSubmission = await res.json();
      setLatestSubmission(submission);
      setShowVerdictModal(true);

      // Reload submissions for this problem
      setProblemSubmissions((prev) => [submission, ...prev]);

      // Record in progress service
      CodingProgressService.markAttempted(problem.id, selectedLanguage, code, submission);

      // Notify Activity Heatmap & listeners that a verified submission was completed
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("student-activity-updated", { detail: submission }));
        } catch (storageErr) {
          console.warn("Storage sync notice:", storageErr);
        }
      }

      if (submission.status === "accepted") {
        toast.success("ACCEPTED! You solved this problem!", {
          description: `Passed all ${submission.total_test_cases} test cases.`,
        });
      } else {
        toast.error(`Verdict: ${submission.status.replace("_", " ").toUpperCase()}`, {
          description: `${submission.passed_test_cases}/${submission.total_test_cases} test cases passed.`,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit code";
      console.error("Submit error:", err);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy Solution Code Helper
  const handleCopyCode = (key: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedCodeKey(key);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  // Add Comment Helper
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !problem) return;
    const post = await CodingDiscussService.addPost({
      problemId: problem.id,
      title: `Approach for ${problem.title}`,
      author: { name: "You (Student)", role: "student", badge: "Student" },
      tags: [selectedLanguage, problem.difficulty],
      content: newCommentText.trim(),
    });
    if (post) {
      setDiscussions([post, ...discussions]);
      setNewCommentText("");
      toast.success("Discussion post published");
    }
  };

  // Format timer
  const formattedTimer = useMemo(() => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [timerSeconds]);

  // Prev & Next Problem Navigation
  const currentProblemIndex = useMemo(() => {
    return allProblems.findIndex((p) => p.id === problem?.id);
  }, [allProblems, problem]);

  const prevProblem = currentProblemIndex > 0 ? allProblems[currentProblemIndex - 1] : null;
  const nextProblem = currentProblemIndex >= 0 && currentProblemIndex < allProblems.length - 1 ? allProblems[currentProblemIndex + 1] : null;

  if (!problem) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] bg-white text-slate-900 overflow-hidden font-sans">
      {/* ── TOP WORKSPACE ACTION BAR ── */}
      <div className="h-11 bg-white border-b border-slate-200 px-3.5 flex items-center justify-between shrink-0 shadow-xs z-10">
        {/* Left: Problem Info & Breadcrumb */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/coding/problems"
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Problem List</span>
          </Link>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate max-w-[220px] sm:max-w-md">
              {problem.title}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded capitalize ${
                problem.difficulty === "easy"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : problem.difficulty === "medium"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {problem.difficulty}
            </span>
          </div>
        </div>

        {/* Center: Prev/Next & Timer */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-200">
            {prevProblem ? (
              <Link href={`/coding/problems/${prevProblem.id}`}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0 text-slate-300">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="text-xs font-mono font-medium text-slate-500 px-1">
              {currentProblemIndex + 1} / {allProblems.length}
            </span>
            {nextProblem ? (
              <Link href={`/coding/problems/${nextProblem.id}`}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0 text-slate-300">
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{formattedTimer}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="ml-1 text-slate-400 hover:text-slate-700"
              title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Right: Language Selector, Reset, Run, Submit */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <Select
            value={selectedLanguage}
            onValueChange={(val) => handleLanguageChange(val as CodingLanguage)}
          >
            <SelectTrigger className="h-8.5 text-xs font-semibold bg-slate-50 border-slate-200 w-36 rounded-lg text-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-md">
              {SUPPORTED_LANGUAGES.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs font-medium">
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Code */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetCode}
            title="Reset code to initial template"
            className="h-8.5 px-2.5 border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          {/* Run Code Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="h-8.5 px-3.5 bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800 rounded-lg font-semibold text-xs gap-1.5 shadow-xs"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-slate-700 text-slate-700" />
            )}
            <span>Run</span>
          </Button>

          {/* Submit Code Button */}
          <Button
            size="sm"
            onClick={handleSubmitCode}
            disabled={isSubmitting || isRunning}
            className="h-8.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            )}
            <span>Submit</span>
          </Button>
        </div>
      </div>

      {/* ── SPLIT MAIN WORKSPACE (LEFT PANE & RIGHT PANE) ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ── LEFT PANE: DESCRIPTION / SOLUTIONS / SUBMISSIONS / DISCUSS ── */}
        <div className="w-full md:w-1/2 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
          {/* Left Pane Navigation Tabs */}
          <div className="h-10 bg-slate-50/70 border-b border-slate-200 px-3 flex items-center shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLeftTab("description")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leftTab === "description"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                Description
              </button>
              <button
                onClick={() => setLeftTab("solutions")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leftTab === "solutions"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                Solutions
              </button>
              <button
                onClick={() => setLeftTab("submissions")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leftTab === "submissions"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                Submissions ({problemSubmissions.length})
              </button>
              <button
                onClick={() => setLeftTab("discuss")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leftTab === "discuss"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                Discuss ({discussions.length})
              </button>
            </div>
          </div>

          {/* Left Pane Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {/* TAB 1: DESCRIPTION */}
            {leftTab === "description" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{problem.title}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                        problem.difficulty === "easy"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : problem.difficulty === "medium"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                    <span className="text-xs text-slate-500">
                      Acceptance: <strong>{problem.acceptance_rate || "55%"}</strong>
                    </span>
                    <span className="text-xs text-slate-500">
                      Points: <strong>{problem.points || 100}</strong>
                    </span>
                  </div>
                </div>

                {/* Problem Statement */}
                <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {problem.description}
                </div>

                {/* Example Cases */}
                {problem.example_cases && problem.example_cases.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm">Examples</h3>
                    {problem.example_cases.map((eg, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                        <div className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                          Example {idx + 1}:
                        </div>
                        <div className="text-xs font-mono">
                          <strong className="text-slate-900 font-sans">Input: </strong>
                          <pre className="inline-block text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-xs whitespace-pre-wrap max-w-full align-top">
                            {eg.input}
                          </pre>
                        </div>
                        <div className="text-xs font-mono">
                          <strong className="text-slate-900 font-sans">Output: </strong>
                          <pre className="inline-block text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-xs whitespace-pre-wrap max-w-full align-top">
                            {eg.output}
                          </pre>
                        </div>
                        {eg.explanation && (
                          <div className="text-xs text-slate-500 mt-1">
                            <strong className="text-slate-700">Explanation: </strong>
                            {eg.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm">Constraints:</h3>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">
                      {problem.constraints}
                    </div>
                  </div>
                )}

                {/* Input & Output Specifications */}
                {(problem.input_format || problem.output_format) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {problem.input_format && (
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                        <strong className="text-slate-800 block mb-1">Input Format:</strong>
                        <p className="text-slate-600 leading-relaxed font-mono">{problem.input_format}</p>
                      </div>
                    )}
                    {problem.output_format && (
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                        <strong className="text-slate-800 block mb-1">Output Format:</strong>
                        <p className="text-slate-600 leading-relaxed font-mono">{problem.output_format}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Topic Tags */}
                {problem.topic_tags && problem.topic_tags.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topics</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.topic_tags.map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hints Accordion */}
                {problem.hints && problem.hints.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hints</h4>
                    <div className="space-y-2">
                      {problem.hints.map((hint, idx) => (
                        <details
                          key={idx}
                          className="group border border-slate-200 rounded-xl p-3 bg-slate-50/50 cursor-pointer"
                        >
                          <summary className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span>Hint {idx + 1}</span>
                            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <p className="text-xs text-slate-600 mt-2 pl-1 leading-relaxed">{hint}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: EDITORIAL SOLUTIONS */}
            {leftTab === "solutions" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Official Editorial Solution</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    In-depth breakdown of optimal algorithms, space/time complexity, and sample implementation.
                  </p>
                </div>

                {problem.solution_editorial ? (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/60 text-xs text-slate-700 leading-relaxed">
                      {problem.solution_editorial.overview}
                    </div>

                    {problem.solution_editorial.approaches.map((app, idx) => (
                      <div key={idx} className="space-y-3 p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 text-sm">{app.name}</h3>
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                              Time: {app.timeComplexity}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                              Space: {app.spaceComplexity}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{app.explanation}</p>

                        {/* Code Snippet Box */}
                        {Object.entries(app.code).map(([lang, snippet]) => (
                          <div key={lang} className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
                              <span className="uppercase font-mono">{lang}</span>
                              <button
                                onClick={() => handleCopyCode(`${idx}-${lang}`, snippet)}
                                className="flex items-center gap-1 text-slate-500 hover:text-slate-900"
                              >
                                {copiedCodeKey === `${idx}-${lang}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>Copy</span>
                              </button>
                            </div>
                            <pre className="p-3 bg-white text-xs font-mono text-slate-800 overflow-x-auto">
                              {snippet}
                            </pre>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No editorial published for this problem yet.</p>
                )}
              </div>
            )}

            {/* TAB 3: SUBMISSION HISTORY */}
            {leftTab === "submissions" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Your Submissions</h2>
                  <p className="text-xs text-slate-500">
                    All submissions for {problem.title}. Click any row to view submitted code and execution verdict.
                  </p>
                </div>

                {problemSubmissions.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No submissions recorded for this problem yet.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Language</th>
                          <th className="py-2.5 px-3">Runtime</th>
                          <th className="py-2.5 px-3">Memory</th>
                          <th className="py-2.5 px-3">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {problemSubmissions.map((sub) => (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubmissionForView(sub)}
                            className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-3">
                              <span
                                className={`font-semibold capitalize ${
                                  sub.status === "accepted" ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {sub.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600 uppercase">
                              {sub.language}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {sub.execution_time ? `${(sub.execution_time * 1000).toFixed(0)} ms` : "0.04 s"}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {sub.memory_used ? `${(sub.memory_used / 1024).toFixed(1)} MB` : "16.2 MB"}
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {new Date(sub.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DISCUSS */}
            {leftTab === "discuss" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Problem Discussion</h2>
                  <p className="text-xs text-slate-500">
                    Ask questions, share alternate algorithms, and discuss test cases with peers.
                  </p>
                </div>

                {/* Add new post */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Textarea
                    placeholder="Share your thought, edge cases, or ask a question..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="h-20 text-xs bg-white border-slate-200 resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newCommentText.trim()}
                      className="bg-blue-600 text-white rounded-lg text-xs h-8 px-3 gap-1"
                    >
                      <Send className="w-3 h-3" /> Post
                    </Button>
                  </div>
                </div>

                {/* Posts List */}
                <div className="space-y-3">
                  {discussions.map((d) => (
                    <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{d.author.name}</span>
                        <span className="text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">{d.title}</h4>
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{d.content}</p>
                      <div className="flex items-center gap-3 pt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                          <ThumbsUp className="w-3 h-3" /> {d.upvotes}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <MessageSquare className="w-3 h-3" /> {d.commentsCount} replies
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: MONACO CODE EDITOR & TESTCASE/CONSOLE RUNNER ── */}
        <div className="w-full md:w-1/2 flex flex-col bg-white overflow-hidden">
          {/* Editor Header Bar */}
          <div className="h-10 bg-slate-50/70 border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Code Editor</span>
              <span className="text-[11px] font-mono text-slate-400">({selectedLanguage.toUpperCase()})</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Check className="w-3 h-3" /> Autosaved
              </span>
            </div>
          </div>

          {/* Monaco Editor Container in Pure White Theme */}
          <div className="flex-1 relative bg-white overflow-hidden">
            <MonacoEditor
              language={SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage)?.monacoLang || "python"}
              value={code}
              theme="vs" // Standard Pure White Monaco Theme
              onChange={handleCodeChange}
              beforeMount={(monaco) => registerMonacoCompletions(monaco)}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                // Ensure pure white background and crisp styling
                monaco.editor.setTheme("vs");
              }}
              options={{
                fontSize: 13.5,
                lineHeight: 22,
                fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                formatOnPaste: true,
                formatOnType: true,
                automaticLayout: true,
                tabSize: selectedLanguage === "python" ? 4 : 2,
              }}
            />
          </div>

          {/* ── BOTTOM CONSOLE / TESTCASE PANEL ── */}
          <div
            className={`border-t border-slate-200 bg-white flex flex-col transition-all duration-200 ${
              bottomExpanded ? "h-64" : "h-9"
            }`}
          >
            {/* Panel Tabs Bar */}
            <div className="h-9 bg-slate-50/80 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setBottomTab("testcase"); setBottomExpanded(true); }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                    bottomTab === "testcase"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Testcase
                </button>
                <button
                  onClick={() => { setBottomTab("testresult"); setBottomExpanded(true); }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                    bottomTab === "testresult"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Test Result {runResults && `(${runResults.filter((r) => r.passed).length}/${runResults.length})`}
                </button>
                <button
                  onClick={() => { setBottomTab("console"); setBottomExpanded(true); }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                    bottomTab === "console"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Terminal className="w-3 h-3 inline mr-1 text-slate-400" />
                  Console
                </button>
              </div>

              <button
                onClick={() => setBottomExpanded(!bottomExpanded)}
                className="text-xs text-slate-500 hover:text-slate-900 px-2 py-0.5 rounded"
              >
                {bottomExpanded ? "Collapse ▼" : "Expand ▲"}
              </button>
            </div>

            {/* Panel Body */}
            {bottomExpanded && (
              <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
                {/* 1. TESTCASE TAB */}
                {bottomTab === "testcase" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      {customTestCases.map((tc, idx) => (
                        <button
                          key={tc.id}
                          onClick={() => setActiveTestCaseIdx(idx)}
                          className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                            activeTestCaseIdx === idx
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          const newTc = { id: `custom_${Date.now()}`, input: "" };
                          setCustomTestCases([...customTestCases, newTc]);
                          setActiveTestCaseIdx(customTestCases.length);
                        }}
                        className="px-2 py-1 text-xs rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Case
                      </button>
                    </div>

                    {customTestCases[activeTestCaseIdx] && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-sans font-bold text-slate-700">Test Input (stdin):</label>
                        <Textarea
                          value={customTestCases[activeTestCaseIdx].input}
                          onChange={(e) => {
                            const updated = [...customTestCases];
                            if (updated[activeTestCaseIdx]) {
                              updated[activeTestCaseIdx] = {
                                ...updated[activeTestCaseIdx],
                                input: e.target.value,
                              };
                              setCustomTestCases(updated);
                            }
                          }}
                          placeholder="Enter custom inputs here..."
                          className="font-mono text-xs bg-slate-50 border-slate-200 h-24 resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 2. TEST RESULT TAB */}
                {bottomTab === "testresult" && (
                  <div>
                    {!runResults ? (
                      <div className="text-center py-8 text-slate-400 text-xs font-sans">
                        Click <strong>Run</strong> to test your code against input test cases.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          {runResults.map((r, idx) => (
                            <button
                              key={r.test_case_id}
                              onClick={() => setActiveTestCaseIdx(idx)}
                              className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1 ${
                                activeTestCaseIdx === idx
                                  ? r.passed
                                    ? "bg-emerald-600 text-white"
                                    : "bg-rose-600 text-white"
                                  : r.passed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {r.passed ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>

                        {runResults[activeTestCaseIdx] && (
                          <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="flex items-center justify-between text-xs font-sans">
                              <span
                                className={`font-bold ${
                                  runResults[activeTestCaseIdx].passed ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {runResults[activeTestCaseIdx].passed ? "Passed" : "Wrong Answer / Error"}
                              </span>
                              <span className="text-slate-500 font-mono">
                                Runtime: {((runResults[activeTestCaseIdx].time_seconds || 0.02) * 1000).toFixed(0)} ms
                              </span>
                            </div>

                            <div>
                              <span className="font-sans font-semibold text-slate-500 text-[11px]">Input:</span>
                              <pre className="p-2 bg-white rounded border border-slate-200 text-slate-800 text-xs mt-0.5">
                                {runResults[activeTestCaseIdx].input || "(no input)"}
                              </pre>
                            </div>

                            <div>
                              <span className="font-sans font-semibold text-slate-500 text-[11px]">Output:</span>
                              <pre className="p-2 bg-white rounded border border-slate-200 text-slate-800 text-xs mt-0.5">
                                {runResults[activeTestCaseIdx].actual_output || "(empty)"}
                              </pre>
                            </div>

                            <div>
                              <span className="font-sans font-semibold text-slate-500 text-[11px]">Expected:</span>
                              <pre className="p-2 bg-white rounded border border-slate-200 text-slate-800 text-xs mt-0.5">
                                {runResults[activeTestCaseIdx].expected_output || "(empty)"}
                              </pre>
                            </div>

                            {runResults[activeTestCaseIdx].error && (
                              <div>
                                <span className="font-sans font-semibold text-rose-600 text-[11px]">Error Details:</span>
                                <pre className="p-2 bg-rose-50 text-rose-800 rounded border border-rose-200 text-xs mt-0.5">
                                  {runResults[activeTestCaseIdx].error}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CONSOLE TAB */}
                {bottomTab === "console" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-sans text-slate-400">
                      <span>Standard Output & Compiler Diagnostics</span>
                      <button
                        onClick={() => setConsoleLogs("")}
                        className="text-slate-500 hover:text-slate-900"
                      >
                        Clear
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 min-h-[100px] whitespace-pre-wrap">
                      {consoleLogs || "No logs output yet. Run or submit code to view execution details."}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SUBMISSION VERDICT MODAL ── */}
      <Dialog open={showVerdictModal} onOpenChange={setShowVerdictModal}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 shadow-xl">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 bg-emerald-100 text-emerald-600">
              {latestSubmission?.status === "accepted" ? (
                <Check className="w-6 h-6 stroke-[3]" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600" />
              )}
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              {latestSubmission?.status === "accepted" ? "Accepted!" : "Submission Verdict"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              {latestSubmission?.status === "accepted"
                ? "Congratulations! Your code passed all test cases including hidden judge cases."
                : "Your code failed some test cases. Review the breakdown below and try again."}
            </DialogDescription>
          </DialogHeader>

          {latestSubmission && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Verdict</div>
                  <div
                    className={`font-bold text-sm mt-0.5 capitalize ${
                      latestSubmission.status === "accepted" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {latestSubmission.status.replace("_", " ")}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Passed</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    {latestSubmission.passed_test_cases} / {latestSubmission.total_test_cases}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Runtime</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">
                    {latestSubmission.execution_time ? `${(latestSubmission.execution_time * 1000).toFixed(0)} ms` : "42 ms"}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="font-mono uppercase font-bold text-slate-800">{latestSubmission.language}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submitted At:</span>
                  <span className="text-slate-800">{new Date(latestSubmission.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowVerdictModal(false)}
                  className="flex-1 rounded-xl text-xs font-semibold border-slate-200"
                >
                  Back to Workspace
                </Button>
                {latestSubmission.status === "accepted" && nextProblem && (
                  <Link href={`/coding/problems/${nextProblem.id}`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs gap-1">
                      Next Problem <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── VIEW SUBMITTED CODE MODAL ── */}
      <Dialog
        open={!!selectedSubmissionForView}
        onOpenChange={(open) => !open && setSelectedSubmissionForView(null)}
      >
        <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>Submitted Solution</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${
                  selectedSubmissionForView?.status === "accepted"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {selectedSubmissionForView?.status.replace("_", " ")}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Language: {selectedSubmissionForView?.language.toUpperCase()} • Submitted:{" "}
              {selectedSubmissionForView?.created_at && new Date(selectedSubmissionForView.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmissionForView && (
            <div className="space-y-4">
              <pre className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 max-h-96 overflow-y-auto whitespace-pre-wrap">
                {selectedSubmissionForView.code}
              </pre>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSubmissionForView(null)}
                  className="rounded-xl text-xs border-slate-200"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
