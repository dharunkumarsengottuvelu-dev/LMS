"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Play,
  RotateCcw,
  Loader2,
  Terminal,
  Copy,
  Check,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
  Lock,
  AlertTriangle,
  ShieldCheck,
  CheckCheck,
  History,
  FileCode
} from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CodingLanguage } from "@/types/coding";
import { registerMonacoCompletions } from "@/lib/monaco-completions";

// Lazy load Monaco editor in Pure Light ("vs") theme
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-white dark:bg-[#18181B]">
      <Loading size="sm" text="Loading editor..." ring={false} />
    </div>
  ),
});

export const SUPPORTED_LANGUAGES: { id: CodingLanguage; name: string; monacoLang: string; defaultTemplate: string }[] = [
  {
    id: "java",
    name: "Java",
    monacoLang: "java",
    defaultTemplate: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        // Write your code here
        System.out.println("Hello, World!");
    }
}
`,
  },
  {
    id: "c",
    name: "C",
    monacoLang: "c",
    defaultTemplate: `#include <stdio.h>

int main() {
    // Write your code here
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  {
    id: "cpp",
    name: "C++",
    monacoLang: "cpp",
    defaultTemplate: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello, World!" << endl;
    return 0;
}
`,
  },
  {
    id: "python",
    name: "Python",
    monacoLang: "python",
    defaultTemplate: `# Write your code here
print("Hello, World!")
`,
  },
  {
    id: "javascript",
    name: "JavaScript",
    monacoLang: "javascript",
    defaultTemplate: `// Write your code here
console.log("Hello, World!");
`,
  },
];

function toDeterministicUUID(str: string): string {
  if (!str) return "00000000-0000-0000-0000-000000000000";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, "0");
  const hex2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, "0");
  const hex3 = Math.abs((hash * 57) | 0).toString(16).padStart(8, "0");
  const hex4 = Math.abs((hash * 93) | 0).toString(16).padStart(8, "0");
  const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

function matchesProblemSubmission(s: any, pId: string, pSlug?: string): boolean {
  if (!s || !pId) return false;
  const subPid = String(s.problem_id || "");
  const subSlug = String(s.problem_slug || "");
  if (subPid === pId || (pSlug && subPid === pSlug)) return true;
  if (subSlug && (subSlug === pSlug || subSlug === pId)) return true;
  const pUUID = toDeterministicUUID(pId);
  if (subPid === pUUID) return true;
  if (pSlug && subPid === toDeterministicUUID(pSlug)) return true;
  return false;
}

export default function StudentPracticeCodingRunnerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const rawId = (params?.id as string) || "";
  const trackId = searchParams?.get("trackId") || "";
  const isReviewMode = searchParams?.get("mode") === "review";

  // Track & Module hierarchy state
  const [trackTitle, setTrackTitle] = useState<string>("Practice");
  const [moduleTitle, setModuleTitle] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [problems, setProblems] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active coding problem
  const currentProblem = problems[currentIdx] || null;

  useEffect(() => {
    const title = currentProblem?.title || moduleTitle || trackTitle;
    if (title) {
      document.title = `SensilLearn | ${title}`;
    }
  }, [currentProblem?.title, moduleTitle, trackTitle]);

  // Tabs
  const [leftTab, setLeftTab] = useState<"description" | "solutions" | "discuss" | "submissions">("description");
  const [bottomTab, setBottomTab] = useState<"testcase" | "testresult" | "console">("testcase");

  // All student submissions for review & persistence
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (isReviewMode) {
      setLeftTab("submissions");
    }
  }, [isReviewMode]);

  // Code & Language state
  const [selectedLanguage, setSelectedLanguage] = useState<CodingLanguage>("java");
  const [code, setCode] = useState<string>("");
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

  // Custom Input & Execution
  const [customInputText, setCustomInputText] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isRunningCustomInput, setIsRunningCustomInput] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Results
  const [runResults, setRunResults] = useState<any[] | null>(null);
  const [customRunResult, setCustomRunResult] = useState<any | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [isBottomMinimized, setIsBottomMinimized] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<{
    title: string;
    message: string;
    type?: "compilation" | "runtime" | "system";
  } | null>(null);

  // Student progress per problem
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set());
  const [inProgressProblemIds, setInProgressProblemIds] = useState<Set<string>>(new Set());

  // Practice completion modal & state
  const [showCompleteDialog, setShowCompleteDialog] = useState<boolean>(false);
  const [isCompletingPractice, setIsCompletingPractice] = useState<boolean>(false);

  // Execution tracking (Run vs Submit)
  const [executionType, setExecutionType] = useState<"run" | "submit" | null>(null);
  const [submissionMeta, setSubmissionMeta] = useState<{
    status?: string;
    execution_time_ms?: number;
    memory_used_kb?: number;
    score?: number;
  } | null>(null);

  // Discussion state
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  // ─── 1. FETCH MODULE & PROBLEMS FOR THIS PRACTICE TRACK ──────────────────────
  const loadPracticeData = useCallback(async () => {
    if (!rawId && !trackId) {
      setErrorMsg("Practice module identifier missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let resolvedTrack: any = null;
      let targetModule: any = null;

      // 1. Fetch practice track if trackId is provided
      if (trackId) {
        const res = await fetch(`/api/student/practices/${trackId}`);
        if (res.ok) {
          const data = await res.json();
          resolvedTrack = data.track;
        }
      }

      // If no track resolved yet, try fetching all student practice tracks
      if (!resolvedTrack) {
        const resAll = await fetch("/api/student/practices");
        if (resAll.ok) {
          const allData = await resAll.json();
          for (const t of allData.tracks || []) {
            const subs = t.sub_modules || t.subModules || [];
            const foundMod = subs.some((sm: any) =>
              (sm.modules || []).some((m: any) => m.id === rawId) || sm.id === rawId
            );
            if (foundMod || t.id === trackId || t.id === rawId) {
              const detailRes = await fetch(`/api/student/practices/${t.id}`);
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                resolvedTrack = detailData.track;
                break;
              }
            }
          }
        }
      }

      let codingProblemsList: any[] = [];
      let foundIndex = 0;

      if (resolvedTrack) {
        setTrackTitle(resolvedTrack.title || "Practice");
        const subs = resolvedTrack.sub_modules || resolvedTrack.subModules || [];

        // Locate module matching rawId
        for (const sm of subs) {
          for (const m of sm.modules || []) {
            if (m.id === rawId) {
              targetModule = m;
              break;
            }
            // Check if rawId is a coding problem id inside this module
            const cpIdx = (m.codingQuestions || []).findIndex((cq: any) => cq.id === rawId);
            if (cpIdx >= 0) {
              targetModule = m;
              foundIndex = cpIdx;
              break;
            }
          }
          if (targetModule) break;
          if (sm.id === rawId && Array.isArray(sm.codingQuestions) && sm.codingQuestions.length > 0) {
            targetModule = sm;
            break;
          }
        }

        if (targetModule) {
          setModuleTitle(targetModule.name || targetModule.title || "Module");
          setModuleId(targetModule.id || rawId);
          codingProblemsList = targetModule.codingQuestions || [];
        }
      }

      // Fallback: If not found in track, fetch direct problem
      if (codingProblemsList.length === 0) {
        const resDirect = await fetch(`/api/student/practices/coding/${rawId}`);
        if (resDirect.ok) {
          const directData = await resDirect.json();
          if (directData.problem) {
            codingProblemsList = [directData.problem];
          }
        }
      }

      if (codingProblemsList.length === 0) {
        throw new Error("No coding challenges found for this practice module.");
      }

      setProblems(codingProblemsList);
      setCurrentIdx(foundIndex < codingProblemsList.length ? foundIndex : 0);

      // Load student submissions to resolve solved/in-progress states
      try {
        const subRes = await fetch("/api/code/submissions");
        if (subRes.ok) {
          const subData = await subRes.json();
          const subs = Array.isArray(subData.submissions) ? subData.submissions : [];
          setAllSubmissions(subs);

          const solvedSet = new Set<string>();
          const inProgSet = new Set<string>();

          (codingProblemsList || []).forEach((prob: any) => {
            const probSubs = subs.filter((s: any) => matchesProblemSubmission(s, prob.id, prob.slug));
            if (probSubs.some((s: any) => s.status === "accepted" || s.status === "passed")) {
              solvedSet.add(prob.id);
            } else if (probSubs.length > 0) {
              inProgSet.add(prob.id);
            }
          });

          setSolvedProblemIds(solvedSet);
          setInProgressProblemIds(inProgSet);
        }
      } catch (subErr) {
        console.warn("Submissions fetch notice:", subErr);
      }
    } catch (err: any) {
      console.error("Error loading practice module:", err);
      setErrorMsg(err.message || "Failed to load practice coding problems.");
    } finally {
      setLoading(false);
    }
  }, [rawId, trackId]);

  useEffect(() => {
    loadPracticeData();
  }, [loadPracticeData]);

  // ─── 2. AUTOSAVE & RESTORE CODE PER PROBLEM ─────────────────────────────────
  const getStorageKey = useCallback(
    (pId: string, lang: string) => {
      const tId = trackId || "practice";
      const mId = moduleId || rawId;
      return `practice_saved_code_${tId}_${mId}_${pId}_${lang}`;
    },
    [trackId, moduleId, rawId]
  );

  // ─── LANGUAGE RESTRICTIONS: SINGLE vs MULTI vs ALL ─────────────────────────
  const allowedLanguages: string[] = useMemo(() => {
    if (!currentProblem) return [];
    const starter = currentProblem.starter_code || {};
    const raw =
      currentProblem.allowed_languages ||
      currentProblem.allowedLanguages ||
      starter.allowed_languages ||
      starter.allowedLanguages ||
      (currentProblem.templates ? Object.keys(currentProblem.templates) : null) ||
      (starter.templates ? Object.keys(starter.templates) : null);

    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((l: string) => String(l).toLowerCase().trim());
    }

    const defLang =
      currentProblem.default_language ||
      currentProblem.defaultLanguage ||
      starter.default_language ||
      starter.defaultLanguage;

    if (defLang && (currentProblem.language_mode === "single" || starter.language_mode === "single")) {
      return [String(defLang).toLowerCase().trim()];
    }

    return [];
  }, [currentProblem]);

  const availableLanguages = useMemo(() => {
    if (allowedLanguages.length > 0) {
      const filtered = SUPPORTED_LANGUAGES.filter((l) => allowedLanguages.includes(l.id.toLowerCase()));
      if (filtered.length > 0) return filtered;
    }
    return SUPPORTED_LANGUAGES;
  }, [allowedLanguages]);

  const currentSubmissions = useMemo(() => {
    if (!currentProblem) return [];
    return allSubmissions.filter((s: any) =>
      matchesProblemSubmission(s, currentProblem.id, currentProblem.slug)
    );
  }, [allSubmissions, currentProblem]);

  useEffect(() => {
    if (!currentProblem) return;

    // Resolve default language honoring single/multi allowed languages
    const starter = currentProblem.starter_code || {};
    const configuredDefault =
      currentProblem.default_language ||
      currentProblem.defaultLanguage ||
      starter.default_language ||
      starter.defaultLanguage;

    let initialLang: CodingLanguage = (configuredDefault && availableLanguages.some((l) => l.id === configuredDefault)
      ? configuredDefault
      : availableLanguages[0]?.id || "c") as CodingLanguage;

    setSelectedLanguage(initialLang);

    const latestSub = allSubmissions.find((s: any) =>
      matchesProblemSubmission(s, currentProblem.id, currentProblem.slug)
    );

    // Restore saved code from localStorage, or latest submitted code, or load starter template
    const key = getStorageKey(currentProblem.id, initialLang);
    const saved = typeof window !== "undefined" ? localStorage.getItem(key) : null;

    if (saved && saved.trim()) {
      setCode(saved);
    } else if (latestSub && latestSub.code && latestSub.code.trim()) {
      setCode(latestSub.code);
      if (latestSub.language && availableLanguages.some((l) => l.id === latestSub.language)) {
        setSelectedLanguage(latestSub.language as CodingLanguage);
      }
    } else {
      // Find template from problem or starter_code
      const problemTemplates = currentProblem.templates || starter.templates || {};
      const templateForLang =
        problemTemplates[initialLang] ||
        SUPPORTED_LANGUAGES.find((l) => l.id === initialLang)?.defaultTemplate ||
        "// Write your solution here\n";
      setCode(templateForLang);
    }

    // If there is a previous submission, populate test results for review!
    if (latestSub && Array.isArray(latestSub.results) && latestSub.results.length > 0) {
      setRunResults(latestSub.results);
      setExecutionType("submit");
      setConsoleOutput(
        `Verdict: ${String(latestSub.status || "EVALUATED").toUpperCase()}\n` +
          `Execution Time: ${latestSub.execution_time || "28ms"}\n` +
          `Passed Test Cases: ${latestSub.passed_test_cases || 0}/${latestSub.total_test_cases || 0}\n`
      );
      setSubmissionMeta({
        status: latestSub.status,
        score: latestSub.passed_test_cases === latestSub.total_test_cases ? 100 : 0,
        execution_time_ms: 28,
        memory_used_kb: 512,
      });
      if (isReviewMode) {
        setBottomTab("testresult");
      }
    } else {
      setRunResults(null);
      setCustomRunResult(null);
      setConsoleOutput("");
      setBottomTab("testcase");
    }
  }, [currentProblem?.id, getStorageKey, availableLanguages, allSubmissions, isReviewMode]);

  // Handle language switch
  const handleLanguageChange = (newLang: CodingLanguage) => {
    if (!currentProblem) return;
    setSelectedLanguage(newLang);

    const key = getStorageKey(currentProblem.id, newLang);
    const saved = typeof window !== "undefined" ? localStorage.getItem(key) : null;

    if (saved && saved.trim()) {
      setCode(saved);
    } else {
      const starter = currentProblem.starter_code || {};
      const problemTemplates = currentProblem.templates || starter.templates || {};
      const templateForLang =
        problemTemplates[newLang] ||
        SUPPORTED_LANGUAGES.find((l) => l.id === newLang)?.defaultTemplate ||
        "// Write your solution here\n";
      setCode(templateForLang);
    }
  };

  // Handle code change + auto save
  const handleCodeChange = (newVal: string | undefined) => {
    const val = newVal ?? "";
    setCode(val);
    if (currentProblem) {
      const key = getStorageKey(currentProblem.id, selectedLanguage);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(key, val);
        } catch {}
      }
      setInProgressProblemIds((prev) => new Set(prev).add(currentProblem.id));
    }
  };

  // Reset code to default starter
  const handleResetCode = () => {
    if (!currentProblem) return;
    const starter = currentProblem.starter_code || {};
    const problemTemplates = currentProblem.templates || starter.templates || {};
    const defaultSnippet =
      problemTemplates[selectedLanguage] ||
      SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage)?.defaultTemplate ||
      "// Write your solution here\n";

    setCode(defaultSnippet);
    const key = getStorageKey(currentProblem.id, selectedLanguage);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, defaultSnippet);
      } catch {}
    }
    toast({ title: "Code Reset", description: "Editor code restored to starter template." });
  };

  // All Test Cases resolved from currentProblem or starter_code
  const allTestCases = useMemo(() => {
    if (!currentProblem) return [];
    const starter = currentProblem.starter_code || {};
    const directTc =
      Array.isArray(currentProblem.test_cases) && currentProblem.test_cases.length > 0
        ? currentProblem.test_cases
        : Array.isArray(starter.test_cases) && starter.test_cases.length > 0
        ? starter.test_cases
        : [];
    return directTc;
  }, [currentProblem]);

  // ─── 3. SYSTEM TEST CASES (READ-ONLY) ───────────────────────────────────────
  const systemTestCases = useMemo(() => {
    if (!currentProblem) return [];
    const starter = currentProblem.starter_code || {};
    const directSample =
      Array.isArray(currentProblem.sample_test_cases) && currentProblem.sample_test_cases.length > 0
        ? currentProblem.sample_test_cases
        : Array.isArray(currentProblem.sampleTestCases) && currentProblem.sampleTestCases.length > 0
        ? currentProblem.sampleTestCases
        : Array.isArray(starter.sample_test_cases) && starter.sample_test_cases.length > 0
        ? starter.sample_test_cases
        : [];
    if (directSample.length > 0) return directSample;

    const publicCases = allTestCases.filter((tc: any) => !tc.is_hidden);
    if (publicCases.length > 0) return publicCases;

    const directExamples =
      Array.isArray(currentProblem.example_cases) && currentProblem.example_cases.length > 0
        ? currentProblem.example_cases
        : Array.isArray(starter.example_cases) && starter.example_cases.length > 0
        ? starter.example_cases
        : [];
    if (directExamples.length > 0) {
      return directExamples.map((eg: any, idx: number) => ({
        id: `sample_eg_${idx}`,
        name: `Sample Case ${idx + 1}`,
        input: eg.input === "No input" || eg.input === "(No input)" ? "" : (eg.input || ""),
        expected_output: eg.output || "",
        is_hidden: false,
      }));
    }

    return [
      {
        id: "tc_sample_1",
        name: "Sample Test Case 1",
        input: "(No input)",
        expected_output: "Hello, World!",
        is_hidden: false,
      },
    ];
  }, [currentProblem, allTestCases]);

  // NOTE: hiddenTestCases must never be sent to the browser.
  // We do NOT expose this variable in the Testcase tab UI.
  // It is intentionally unused on the client — hidden tests are evaluated SERVER-SIDE on Submit.

  // ─── 4. RUN CODE (AGAINST SAMPLE CASES ONLY — NO HIDDEN TESTS) ─────────────
  const handleRunCode = async () => {
    if (!currentProblem || isRunning || isSubmitting) return;
    setIsRunning(true);
    setExecutionError(null);
    setCustomRunResult(null);
    setSubmissionMeta(null);
    setExecutionType("run");
    setIsBottomMinimized(false);
    setBottomTab("testresult");
    setConsoleOutput("Compiling and executing against sample test cases...\n");

    try {
      // RUN only executes VISIBLE / SAMPLE test cases — NEVER hidden ones
      const sampleCases = systemTestCases.map((tc: any, i: number) => ({
        id: tc.id || `tc_sample_${i}`,
        input: tc.input === "(No input)" ? "" : (tc.input || ""),
        expected_output: tc.expected_output || "",
        is_hidden: false,
      }));

      const res = await fetch("/api/code/run-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: currentProblem.id,
          language: selectedLanguage,
          code,
          test_cases: sampleCases,
          include_hidden: false, // NEVER run hidden tests on Run
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "Execution failed";
        const isComp = errMsg.toLowerCase().includes("compil") || errMsg.toLowerCase().includes("syntax") || errMsg.toLowerCase().includes("error:");
        setExecutionError({
          title: isComp ? "Compilation Error" : "Execution Error",
          message: errMsg,
          type: isComp ? "compilation" : "system",
        });
        throw new Error(errMsg);
      }

      if (data.compilation_error) {
        setExecutionError({
          title: "Compilation Error",
          message: data.compilation_error,
          type: "compilation",
        });
      }

      const results = data.results || [];
      setRunResults(results);

      // Check if any failed test case has a compilation or runtime error
      const firstFailedWithError = results.find((r: any) => !r.passed && r.error);
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

      setConsoleOutput(
        data.stdout ||
          data.output ||
          `Execution finished in ${data.total_execution_time_ms || 25}ms.\n` +
            `Sample Tests Passed: ${results.filter((r: any) => r.passed).length}/${results.length}`
      );

      const allPassed = results.length > 0 && results.every((r: any) => r.passed);
      if (allPassed) {
        toast({ title: "Sample Tests Passed", description: "All visible test cases passed!" });
      } else {
        toast({ title: "Sample Tests Failed", description: "One or more sample test cases did not match.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Run error:", err);
      const errMsg = err.message || "Failed to execute code.";
      if (!executionError) {
        setExecutionError({
          title: "Execution Error",
          message: errMsg,
          type: "system",
        });
      }
      setConsoleOutput(`Execution Error: ${errMsg}`);
      toast({ title: "Run Error", description: errMsg, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  // ─── 5. RUN CUSTOM INPUT (TEMPORARY ONLY — NEVER SAVED AS TEST CASE) ────────
  const handleRunCustomInput = async () => {
    if (!currentProblem || isRunningCustomInput || isRunning) return;
    setIsRunningCustomInput(true);
    setExecutionError(null);
    setIsBottomMinimized(false);
    setBottomTab("testresult");
    setConsoleOutput(`Running solution with custom input...\nInput:\n${customInputText || "(None)"}\n`);

    try {
      const res = await fetch("/api/code/run-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: currentProblem.id,
          language: selectedLanguage,
          code,
          custom_input: customInputText,
          test_cases: [
            {
              id: "tc_custom_temp",
              input: customInputText,
              expected_output: "",
              is_hidden: false,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "Custom input execution failed";
        setExecutionError({
          title: "Custom Input Execution Error",
          message: errMsg,
          type: "system",
        });
        throw new Error(errMsg);
      }

      const firstResult = (data.results && data.results[0]) || {};
      setCustomRunResult({
        actual_output: firstResult.actual_output || data.stdout || "(Empty output)",
        error: firstResult.error || data.stderr || null,
        time_seconds: (data.total_execution_time_ms || 30) / 1000,
      });

      if (firstResult.error) {
        setExecutionError({
          title: "Runtime Error",
          message: firstResult.error,
          type: "runtime",
        });
      }

      setConsoleOutput(
        data.stdout || data.output || `Output:\n${firstResult.actual_output || "(No output produced)"}`
      );
    } catch (err: any) {
      console.error("Custom run error:", err);
      const errMsg = err.message || "Custom input execution failed";
      setCustomRunResult({ actual_output: "", error: errMsg });
      setConsoleOutput(`Custom Run Error: ${errMsg}`);
    } finally {
      setIsRunningCustomInput(false);
    }
  };

  // ─── 6. SUBMIT SOLUTION (evaluates ALL test cases including hidden, server-side) ─
  const handleSubmitCode = async () => {
    if (!currentProblem || isSubmitting) return;
    setIsSubmitting(true);
    setExecutionError(null);
    setCustomRunResult(null);
    setSubmissionMeta(null);
    setExecutionType("submit");
    setIsBottomMinimized(false);
    setBottomTab("testresult");
    setConsoleOutput("Submitting solution to practice evaluation engine...\n");

    try {
      const res = await fetch("/api/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: currentProblem.id,
          problem_title: currentProblem.title,
          language: selectedLanguage,
          code,
          context: "practice",
          track_id: trackId,
          module_id: moduleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "Submission evaluation failed";
        setExecutionError({
          title: "Submission Error",
          message: errMsg,
          type: "system",
        });
        throw new Error(errMsg);
      }

      const results = data.test_results || data.results || [];
      setRunResults(results);

      // Check if status is compilation_error or runtime_error
      if (data.status === "compilation_error" || data.status === "runtime_error" || data.error_message) {
        setExecutionError({
          title: data.status === "compilation_error" ? "Compilation Error" : "Runtime Error",
          message: data.error_message || results.find((r: any) => r.error)?.error || "An error occurred during evaluation.",
          type: data.status === "compilation_error" ? "compilation" : "runtime",
        });
      }

      const isAccepted = data.status === "accepted" || data.status === "passed";
      if (isAccepted) {
        setSolvedProblemIds((prev) => new Set(prev).add(currentProblem.id));
        setInProgressProblemIds((prev) => {
          const next = new Set(prev);
          next.delete(currentProblem.id);
          return next;
        });
        toast({
          title: "Problem Solved (✓)",
          description: `All test cases passed! Score: ${data.score || 100}`,
        });
      } else {
        setInProgressProblemIds((prev) => new Set(prev).add(currentProblem.id));
        toast({
          title: "Submission Status: " + (data.status || "Failed"),
          description: `Score: ${data.score || 0}. Review test results.`,
          variant: "destructive",
        });
      }

      setConsoleOutput(
        `Verdict: ${data.status?.toUpperCase() || "EVALUATED"}\n` +
          `Execution Time: ${data.execution_time_ms || 28}ms\n` +
          `Memory: ${Math.round((data.memory_used_kb || 512) / 1024)}MB\n` +
          (data.error_message ? `Error: ${data.error_message}` : "")
      );

      setSubmissionMeta({
        status: data.status,
        execution_time_ms: data.execution_time_ms || 28,
        memory_used_kb: data.memory_used_kb || 512,
        score: data.score,
      });

      // 1. Immediately record in local submissions list for instant Review
      const newlyCreatedSub = {
        id: data.id || `sub-${Date.now()}`,
        problem_id: currentProblem.id,
        problem_slug: currentProblem.slug,
        language: selectedLanguage,
        code,
        status: data.status,
        passed_test_cases: results.filter((r: any) => r.passed).length,
        total_test_cases: results.length,
        results,
        created_at: new Date().toISOString(),
      };
      setAllSubmissions((prev) => [newlyCreatedSub, ...prev]);

      // 2. Automatically sync attempt/progress to the practice track
      if (trackId) {
        try {
          await fetch(`/api/student/practices/${trackId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              module_id: moduleId || rawId,
              score: isAccepted ? 100 : 0,
              total_marks: 100,
              answers: {
                [currentProblem.id]: {
                  status: isAccepted ? "accepted" : "attempted",
                  verdict: data.status,
                },
              },
            }),
          });
        } catch (syncErr) {
          console.warn("Failed to auto-sync attempt to track:", syncErr);
        }
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      const errMsg = err.message || "Failed to submit code.";
      if (!executionError) {
        setExecutionError({
          title: "Submission Error",
          message: errMsg,
          type: "system",
        });
      }
      toast({ title: "Submission Failed", description: errMsg, variant: "destructive" });
      setConsoleOutput(`Submission Error: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 7. QUESTION NAVIGATION (PREVIOUS / NEXT / GRID SELECTION) ───────────────
  const handleSelectQuestion = (idx: number) => {
    if (idx < 0 || idx >= problems.length) return;
    setCurrentIdx(idx);
  };

  const handlePrev = () => {
    if (currentIdx > 0) handleSelectQuestion(currentIdx - 1);
  };

  const handleNext = () => {
    if (currentIdx < problems.length - 1) handleSelectQuestion(currentIdx + 1);
  };

  const handleBackToPractice = () => {
    if (trackId) {
      router.push(`/student/practices/${trackId}`);
    } else {
      router.push("/student/practices");
    }
  };

  // ─── 8. COMPLETE PRACTICE (Final Submission for entire Practice set) ─────────
  const handleCompletePractice = async () => {
    setIsCompletingPractice(true);
    try {
      // Autosave current code
      if (currentProblem) {
        const key = getStorageKey(currentProblem.id, selectedLanguage);
        if (typeof window !== "undefined" && code.trim()) {
          try { localStorage.setItem(key, code); } catch {}
        }
      }

      const solvedCount = solvedProblemIds.size;
      const score = Math.round((solvedCount / problems.length) * 100);

      // Record completion to DB via track POST endpoint
      if (trackId && moduleId) {
        try {
          await fetch(`/api/student/practices/${trackId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              module_id: moduleId,
              score,
              total_marks: 100,
              answers: Object.fromEntries(
                Array.from(solvedProblemIds).map((id) => [id, { status: "solved" }])
              ),
            }),
          });
        } catch {}
      }

      setShowCompleteDialog(false);
      toast({
        title: "Practice Completed! 🎉",
        description: `You solved ${solvedCount} of ${problems.length} problems. Score: ${score}%.`,
      });

      setTimeout(() => {
        if (trackId) {
          router.push(`/student/practices/${trackId}`);
        } else {
          router.push("/student/practices");
        }
      }, 1200);
    } catch (err: any) {
      console.error("Complete practice error:", err);
      toast({
        title: "Completion Error",
        description: err.message || "Could not record practice completion.",
        variant: "destructive",
      });
    } finally {
      setIsCompletingPractice(false);
    }
  };

  const handleCopyCode = (key: string, snippet: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(snippet);
      setCopiedCodeKey(key);
      setTimeout(() => setCopiedCodeKey(null), 2000);
    }
  };

  const handlePostComment = () => {
    if (!newCommentText.trim()) return;
    const newEntry = {
      id: `disc_${Date.now()}`,
      author: "Student",
      time: "Just now",
      content: newCommentText.trim(),
    };
    setDiscussions([newEntry, ...discussions]);
    setNewCommentText("");
    toast({ title: "Posted", description: "Your discussion note has been shared." });
  };

  // Stats for the Right Navigator Panel
  const solvedCount = useMemo(() => {
    return problems.filter((p) => solvedProblemIds.has(p.id)).length;
  }, [problems, solvedProblemIds]);

  const inProgressCount = useMemo(() => {
    return problems.filter((p) => inProgressProblemIds.has(p.id) && !solvedProblemIds.has(p.id)).length;
  }, [problems, inProgressProblemIds, solvedProblemIds]);

  const notAttemptedCount = useMemo(() => {
    const rem = problems.length - (solvedCount + inProgressCount);
    return rem >= 0 ? rem : 0;
  }, [problems.length, solvedCount, inProgressCount]);

  // Loading Screen
  if (loading) {
    return (
      <Loading
        fullScreen
        text="Loading coding challenge..."
        subtext="Preparing problem statement and editor workspace."
        size="lg"
      />
    );
  }

  // Error Screen
  if (errorMsg || !currentProblem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 font-sans text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xs space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Practice Problem Unavailable</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {errorMsg || "The requested practice question could not be loaded."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={handleBackToPractice} variant="outline" className="rounded-xl text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Practice
            </Button>
            <Button onClick={loadPracticeData} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen min-h-[100dvh] bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-hidden select-none">
      {/* ══════════════════════════════════════════════════════════════════════
          1. TOP ACTION HEADER (CLEAN PRACTICE HEADER — NO LMS/ASSESSMENT BLOAT)
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs z-20">
        {/* Left: ← Back to Practice / #1. Print Hello World [Easy] */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackToPractice}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Practice</span>
          </button>

          <span className="text-slate-300 font-medium">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              #{currentIdx + 1}. {currentProblem.title}
            </span>

            <span
              className={cn(
                "px-2 py-0.5 text-[11px] font-bold rounded-md capitalize shrink-0 border",
                currentProblem.difficulty === "easy"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : currentProblem.difficulty === "hard"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}
            >
              {currentProblem.difficulty === "easy" ? "Easy" : currentProblem.difficulty === "hard" ? "Hard" : "Medium"}
            </span>
          </div>
        </div>

        {/* Right: [Language ▼] [Reset Code] [Run] [Submit] */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language selector: Single Language (fixed/locked) vs Multi Language (filtered dropdown) */}
          {availableLanguages.length === 1 ? (
            <div className="h-8 px-3 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 flex items-center gap-1.5 shadow-2xs select-none">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <span className="font-bold">{availableLanguages[0]?.name || "Language"}</span>
            </div>
          ) : (
            <Select
              value={selectedLanguage}
              onValueChange={(val: any) => handleLanguageChange(val as CodingLanguage)}
            >
              <SelectTrigger className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-white border-slate-200 rounded-lg min-w-[95px] text-slate-800 shadow-2xs cursor-pointer">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-xs">
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id} className="text-xs font-medium cursor-pointer">
                    {lang.name}
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
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Code</span>
          </Button>

          {/* Run Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
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
            disabled={isSubmitting || isRunning}
            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
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

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN THREE-COLUMN WORKSPACE
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 min-h-0">
        {/* ─── COLUMN 1: LEFT PROBLEM DESCRIPTION PANEL ────────────────────── */}
        <div className="w-[30%] min-w-[280px] max-w-[420px] rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col overflow-hidden">
          {/* Left Panel Tabs: Description | Solutions | Submissions | Discuss */}
          <div className="h-10 border-b border-slate-200 px-3 flex items-center gap-4 shrink-0 bg-white">
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
              onClick={() => setLeftTab("submissions")}
              className={cn(
                "h-full text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5",
                leftTab === "submissions"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
              )}
            >
              <span>Submissions</span>
              {currentSubmissions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {currentSubmissions.length}
                </span>
              )}
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
                    {currentIdx + 1}. {currentProblem.title}
                  </h1>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[11px] font-bold rounded capitalize border",
                        currentProblem.difficulty === "easy"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : currentProblem.difficulty === "hard"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}
                    >
                      {currentProblem.difficulty === "easy" ? "Easy" : currentProblem.difficulty === "hard" ? "Hard" : "Medium"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Acceptance: <strong className="text-slate-700 font-bold">{currentProblem.acceptance_rate || "100%"}</strong>
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Points: <strong className="text-slate-700 font-bold">{currentProblem.points || 100}</strong>
                    </span>
                  </div>
                </div>

                {/* Problem Statement */}
                <div className="space-y-1.5">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                    Problem Statement
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {currentProblem.description || "Write a program to solve this coding problem."}
                  </p>
                </div>

                {/* Example(s) */}
                {(() => {
                  const starter = currentProblem.starter_code || {};
                  const examples =
                    (Array.isArray(currentProblem.example_cases) && currentProblem.example_cases.length > 0)
                      ? currentProblem.example_cases
                      : (Array.isArray(starter.example_cases) && starter.example_cases.length > 0)
                      ? starter.example_cases
                      : [];

                  return (
                    <div className="space-y-2.5">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                        Example
                      </h2>
                      {examples.length > 0 ? (
                        examples.map((eg: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-200/80 space-y-2"
                          >
                            <span className="text-xs font-bold text-slate-800 block">
                              Example {idx + 1}:
                            </span>
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-600 block">Input:</span>
                              <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                                {eg.input || "(No input)"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-600 block">Output:</span>
                              <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                                {eg.output || "(No output)"}
                              </div>
                            </div>
                            {eg.explanation && (
                              <p className="text-xs text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                                {eg.explanation}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                          <span className="text-xs font-bold text-slate-800 block">Example 1:</span>
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 block">Input:</span>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800">
                              (No input)
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 block">Output:</span>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800">
                              Hello, World!
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Constraints */}
                {(() => {
                  const starter = currentProblem.starter_code || {};
                  const constraintsText = currentProblem.constraints || starter.constraints || "There are no constraints.";
                  const inputFormatText = currentProblem.input_format || starter.input_format || "The program does not take any input.";
                  const outputFormatText = currentProblem.output_format || starter.output_format || "Print the exact required output.";
                  const rawTopics =
                    (Array.isArray(currentProblem.topic_tags) && currentProblem.topic_tags.length > 0)
                      ? currentProblem.topic_tags
                      : (Array.isArray(starter.topic_tags) && starter.topic_tags.length > 0)
                      ? starter.topic_tags
                      : [];

                  return (
                    <>
                      <div className="space-y-1.5">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900">Constraints</h2>
                        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {constraintsText}
                        </div>
                      </div>

                      {/* Input Format & Output Format Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[11px] font-bold text-slate-900 block">Input Format</span>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {inputFormatText}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[11px] font-bold text-slate-900 block">Output Format</span>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {outputFormatText}
                          </p>
                        </div>
                      </div>

                      {/* Topics */}
                      <div className="space-y-1.5 pt-1">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900">Topics</h2>
                        <div className="flex flex-wrap gap-1.5">
                          {rawTopics.length > 0 ? (
                            rawTopics.map((tag: string) => (
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
                  );
                })()}
              </>
            )}

            {/* TAB 2: SOLUTIONS */}
            {leftTab === "solutions" && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Official Editorial Solutions</h2>
                {currentProblem.solution_editorial ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed bg-blue-50/60 p-3 rounded-lg border border-blue-100">
                      {currentProblem.solution_editorial.overview}
                    </p>
                    {currentProblem.solution_editorial.approaches?.map((app: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50">
                        <h3 className="font-bold text-xs text-slate-900">{app.name}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{app.explanation}</p>
                        {Object.entries(app.code || {}).map(([lKey, snippet]: any) => (
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
                      size="sm"
                      onClick={handlePostComment}
                      disabled={!newCommentText.trim()}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1 font-semibold"
                    >
                      <Send className="w-3 h-3" /> Post
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {discussions.map((d) => (
                    <div key={d.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-800">{d.author}</span>
                        <span>{d.time}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{d.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SUBMISSIONS (REVIEW) */}
            {leftTab === "submissions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>My Submissions &amp; Review</span>
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    {currentSubmissions.length} {currentSubmissions.length === 1 ? "Attempt" : "Attempts"}
                  </span>
                </div>

                {currentSubmissions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <FileCode className="w-8 h-8 text-slate-400 mx-auto" />
                    <h3 className="text-xs font-bold text-slate-800">No Submissions Yet</h3>
                    <p className="text-[11px] text-slate-500">
                      Submit your solution using the &quot;Submit&quot; button to record attempts and view test results.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSubmissions.map((sub: any, idx: number) => {
                      const isAcc = sub.status === "accepted" || sub.status === "passed";
                      const dateStr = sub.created_at
                        ? new Date(sub.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
                        : "Recent";

                      return (
                        <div
                          key={sub.id || idx}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all space-y-2.5",
                            isAcc
                              ? "bg-emerald-50/40 border-emerald-200"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isAcc ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "text-xs font-bold uppercase",
                                  isAcc ? "text-emerald-800" : "text-rose-800"
                                )}
                              >
                                {sub.status ? sub.status.replace(/_/g, " ") : "Evaluated"}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">{dateStr}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5 border-t border-slate-100">
                            <span className="font-mono uppercase font-semibold text-slate-700">
                              {sub.language || selectedLanguage}
                            </span>
                            <span>
                              {sub.passed_test_cases || 0}/{sub.total_test_cases || (sub.results?.length || 1)} test cases
                            </span>
                            {sub.execution_time && <span>{sub.execution_time}</span>}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (sub.results && sub.results.length > 0) {
                                  setRunResults(sub.results);
                                  setExecutionType("submit");
                                  setBottomTab("testresult");
                                  setIsBottomMinimized(false);
                                  toast({ title: "Viewing Test Results", description: `Showing evaluation results for attempt ${currentSubmissions.length - idx}.` });
                                }
                              }}
                              className="h-7 text-[11px] px-2.5 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md font-semibold cursor-pointer"
                            >
                              Review Output
                            </Button>
                            {sub.code && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCode(sub.code);
                                  if (sub.language && availableLanguages.some((l) => l.id === sub.language)) {
                                    setSelectedLanguage(sub.language as CodingLanguage);
                                  }
                                  toast({ title: "Code Restored", description: "Loaded submission code into the editor." });
                                }}
                                className="h-7 text-[11px] px-2.5 border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 rounded-md font-semibold cursor-pointer"
                              >
                                Load into Editor
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── COLUMN 2: CENTER LIGHT CODE EDITOR + TESTCASE / CONSOLE PANEL ── */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
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
                      disabled={isRunning || isSubmitting}
                      className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold gap-1"
                    >
                      {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                      <span className="text-[11px]">Run</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSubmitCode}
                      disabled={isSubmitting || isRunning}
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
              {/* TAB 1: TESTCASE (CUSTOM INPUT + SYSTEM READ-ONLY CASES) */}
              {bottomTab === "testcase" && (
                <div className="space-y-4">
                  {/* Custom Input */}
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
                      onChange={(e) => setCustomInputText(e.target.value)}
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

                    {systemTestCases.map((tc: any, idx: number) => (
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
                  </div>
                </div>
              )}

              {/* TAB 2: TEST RESULT */}
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

                  {/* Custom Run Result */}
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

                  {/* Test Run Results (Run vs Submit aware) */}
                  {runResults && runResults.length > 0 ? (() => {
                    const visibleResults = runResults.filter((r) => !r.is_hidden);
                    const hiddenResults = runResults.filter((r) => r.is_hidden);
                    const allVisiblePassed = visibleResults.length > 0 && visibleResults.every((r) => r.passed);
                    const allHiddenPassed = hiddenResults.length === 0 || hiddenResults.every((r) => r.passed);
                    const isSubmit = executionType === "submit";

                    return (
                      <div className="space-y-3">
                        {/* Verdict header */}
                        <div className={cn(
                          "p-3 rounded-xl border flex items-center justify-between",
                          isSubmit
                            ? (allVisiblePassed && allHiddenPassed
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-rose-50 border-rose-200")
                            : (allVisiblePassed
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-rose-50 border-rose-200")
                        )}>
                          <span className="font-bold text-xs flex items-center gap-2">
                            {isSubmit ? (
                              allVisiblePassed && allHiddenPassed ? (
                                <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-emerald-800">Accepted — All test cases passed</span></>
                              ) : (
                                <><XCircle className="w-4 h-4 text-rose-600" /><span className="text-rose-800">Failed — Some test cases did not pass</span></>
                              )
                            ) : (
                              allVisiblePassed ? (
                                <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-emerald-800">Sample Tests Passed</span></>
                              ) : (
                                <><XCircle className="w-4 h-4 text-rose-600" /><span className="text-rose-800">Sample Tests Failed</span></>
                              )
                            )}
                          </span>
                          <span className="text-slate-500 font-medium text-xs">
                            {isSubmit
                              ? `${visibleResults.filter((r) => r.passed).length}/${visibleResults.length} visible passed`
                              : `${visibleResults.filter((r) => r.passed).length}/${visibleResults.length} passed`}
                          </span>
                        </div>

                        {/* Visible test case cards */}
                        {visibleResults.map((r, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-3 rounded-xl border space-y-2 transition-colors",
                              r.passed
                                ? "bg-emerald-50/40 border-emerald-200 text-emerald-900"
                                : "bg-rose-50/40 border-rose-200 text-rose-900"
                            )}
                          >
                            <div className="flex items-center justify-between font-bold text-xs">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5">
                                  {r.passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                  Test Case {idx + 1}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                  Sample
                                </span>
                              </div>
                              <span className={cn("text-[11px] font-bold", r.passed ? "text-emerald-600" : "text-rose-600")}>
                                {r.passed ? "PASSED" : "FAILED"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">Expected Output:</span>
                                <pre className="p-2 bg-white rounded border border-slate-200 text-slate-800 whitespace-pre-wrap min-h-[34px]">
                                  {r.expected_output || "(No output)"}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">Actual Output:</span>
                                <pre className="p-2 bg-white rounded border border-slate-200 text-slate-800 whitespace-pre-wrap min-h-[34px]">
                                  {r.actual_output || (r.passed ? "Match" : "(No output produced)")}
                                </pre>
                              </div>
                            </div>

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

                        {/* Hidden test cases — safe summary shown ONLY after Submit */}
                        {isSubmit && (
                          <div className={cn(
                            "p-3 rounded-xl border flex items-center justify-between text-xs",
                            allHiddenPassed
                              ? "bg-emerald-50/30 border-emerald-200"
                              : "bg-rose-50/30 border-rose-200"
                          )}>
                            <div className="flex items-center gap-2 font-semibold">
                              <Lock className={cn("w-3.5 h-3.5", allHiddenPassed ? "text-emerald-600" : "text-rose-600")} />
                              <span className={allHiddenPassed ? "text-emerald-800" : "text-rose-800"}>
                                Hidden Test Cases
                              </span>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                              allHiddenPassed
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-rose-100 text-rose-700 border-rose-200"
                            )}>
                              {hiddenResults.length === 0
                                ? "No hidden tests"
                                : allHiddenPassed
                                  ? `Passed (${hiddenResults.length}/${hiddenResults.length}) ✓`
                                  : `${hiddenResults.filter((r) => r.passed).length}/${hiddenResults.length} Passed`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })() : !customRunResult && !executionError ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Terminal className="w-6 h-6 mb-2 stroke-1" />
                      <p className="text-xs font-semibold">Click &apos;Run&apos; or &apos;Submit&apos; to view execution results.</p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 3: CONSOLE */}
              {bottomTab === "console" && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block uppercase">Execution Output</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl min-h-[140px] whitespace-pre-wrap overflow-x-auto">
                    {consoleOutput || "No console messages. Code execution logs will appear here."}
                  </pre>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* ─── COLUMN 3: RIGHT QUESTION NAVIGATOR PANEL ────────────────────── */}
        <div className="w-[18%] min-w-[200px] max-w-[260px] rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col p-4 space-y-4 shrink-0 overflow-y-auto">
          {/* Header */}
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Problems ({problems.length})
            </h3>
          </div>

          {/* Stats Legend */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-700 font-medium">Solved ({solvedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-slate-700 font-medium">In-progress ({inProgressCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
              <span className="text-slate-500 font-medium">Not Attempted ({notAttemptedCount})</span>
            </div>
          </div>

          {/* Question Grid Buttons: [1] [2] [3]... */}
          <div className="pt-2 border-t border-slate-100">
            <div className="grid grid-cols-5 gap-2">
              {problems.map((p, idx) => {
                const isActive = idx === currentIdx;
                const isSolved = solvedProblemIds.has(p.id);
                const isInProgress = inProgressProblemIds.has(p.id) && !isSolved;

                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => handleSelectQuestion(idx)}
                    className={cn(
                      "h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer border",
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300"
                        : isSolved
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                        : isInProgress
                        ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. BOTTOM NAVIGATION BAR: [ ← Previous ]   1 / 10   [ Next → ] [ Complete Practice ]
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="h-13 bg-white border-t border-slate-200/90 px-6 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="h-8 px-4 text-xs font-semibold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer disabled:opacity-40"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Previous
        </Button>

        <span className="text-xs sm:text-sm font-bold text-slate-800">
          {currentIdx + 1} / {problems.length}
        </span>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleNext}
            disabled={currentIdx >= problems.length - 1}
            className="h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-40"
          >
            Next <span className="ml-1">→</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCompleteDialog(true)}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Complete Practice
          </Button>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════════
          4. COMPLETE PRACTICE CONFIRMATION DIALOG
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-base font-bold text-slate-900">
              Complete Practice?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-500 mt-1">
              You have completed{" "}
              <span className="font-bold text-slate-800">{solvedProblemIds.size}</span> of{" "}
              <span className="font-bold text-slate-800">{problems.length}</span> problems.
              {solvedProblemIds.size < problems.length && (
                <span className="block mt-1 text-amber-600 text-xs font-medium">
                  You can still go back and attempt the remaining problems.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-xl border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
              onClick={() => setShowCompleteDialog(false)}
              disabled={isCompletingPractice}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
              onClick={handleCompletePractice}
              disabled={isCompletingPractice}
            >
              {isCompletingPractice ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Completing...</>
              ) : (
                <><CheckCheck className="w-4 h-4 mr-1.5" /> Complete Practice</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
