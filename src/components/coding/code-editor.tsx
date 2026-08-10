"use client";

import { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from "react";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import {
  Play, RotateCcw, Loader2,
  CheckCircle2, XCircle, Clock, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn, getErrorMessage } from "@/lib/utils";
import type { CodingLanguage, ExecuteCodeResult, CodingProblem, TestCaseResult, CodingSubmission } from "@/types";
import { LANGUAGE_DISPLAY_NAMES } from "@/types/coding";

// Lazy load Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-white">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  ),
});

const SQLEditor = dynamic(() => import("./sql-editor").then((mod) => mod.SQLEditor), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#18181B] text-white">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
    </div>
  ),
});

const WebPreview = dynamic(() => import("./web-preview").then((mod) => mod.WebPreview), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#18181B] text-white">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
    </div>
  ),
});

// React Error Boundary to catch Monaco initialization crashes gracefully
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MonacoErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Monaco Error Boundary caught initialization error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const STARTER_TEMPLATES: Record<CodingLanguage, string> = {
  javascript: `// JavaScript Solution\n\nfunction solution(input) {\n  // Write your solution here\n  \n}\n\n// Read input\nconst lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');\nconsole.log(solution(lines));`,
  typescript: `// TypeScript Solution\n\nfunction solution(input: string[]): string {\n  // Write your solution here\n  return "";\n}\n\nconst lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');\nconsole.log(solution(lines));`,
  python: `# Python Solution\nimport sys\n\ndef solution(lines):\n    # Write your solution here\n    pass\n\nlines = sys.stdin.read().strip().split('\\n')\nresult = solution(lines)\nif result is not None:\n    print(result)`,
  java: `// Java Solution\nimport java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
  cpp: `// C++ Solution\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your solution here\n    \n    return 0;\n}`,
  c: `// C Solution\n#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  csharp: `// C# Solution\nusing System;\n\nclass Solution {\n    static void Main(string[] args) {\n        // Write your solution here\n    }\n}`,
  go: `// Go Solution\npackage main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    _ = reader\n    // Write your solution here\n}`,
  rust: `// Rust Solution\nuse std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    let _lines: Vec<String> = stdin.lock().lines()\n        .filter_map(|l| l.ok())\n        .collect();\n    // Write your solution here\n}`,
  kotlin: `// Kotlin Solution\nfun main() {\n    val lines = generateSequence(::readLine).toList()\n    // Write your solution here\n}`,
  swift: `// Swift Solution\nimport Foundation\n\nvar lines: [String] = []\nwhile let line = readLine() {\n    lines.append(line)\n}\n// Write your solution here`,
  php: `<?php\n// PHP Solution\n$lines = [];\nwhile ($line = fgets(STDIN)) {\n    $lines[] = trim($line);\n}\n// Write your solution here\n?>`,
  ruby: `# Ruby Solution\nlines = []\nwhile line = gets\n  lines << line.chomp\nend\n# Write your solution here`,
  scala: `// Scala Solution\nobject Solution {\n    def main(args: Array[String]): Unit = {\n        val lines = io.Source.stdin.getLines().toList\n        // Write your solution here\n    }\n}`,
  dart: `// Dart Solution\nimport 'dart:io';\n\nvoid main() {\n  // Write your solution here\n}`,
  sql: `SELECT * FROM students WHERE mark > 80;`,
  html: `<div className="container">\n  <h1>Hello EduNexus LMS</h1>\n  <p>Welcome to Live Web Preview mode!</p>\n</div>`,
  css: `body { font-family: sans-serif; background: #f8fafc; padding: 20px; }\nh1 { color: #2563eb; }`,
  react: `function App() {\n  const [count, setCount] = React.useState(0);\n  return (\n    <div style={{ padding: 20 }}>\n      <h2>React Counter Challenge</h2>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}`,
};

interface CodeEditorProps {
  submissionResult?: CodingSubmission | null;
  problem?: CodingProblem;
  onSubmit?: (code: string, language: CodingLanguage) => Promise<void>;
  isSubmitting?: boolean;
  readOnly?: boolean;
  defaultLanguage?: CodingLanguage;
  defaultCode?: string;
  showSubmit?: boolean;
  height?: string;
}

export function CodeEditor({
  problem,
  submissionResult,
  onSubmit,
  isSubmitting = false,
  readOnly = false,
  defaultLanguage = "python",
  defaultCode,
  showSubmit = true,
  height = "450px",
}: CodeEditorProps) {
  const [language, setLanguage] = useState<CodingLanguage>(defaultLanguage);
  const [code, setCode] = useState<string>(
    defaultCode ??
    (problem?.templates?.[defaultLanguage] ?? STARTER_TEMPLATES[defaultLanguage as keyof typeof STARTER_TEMPLATES] ?? "")
  );
  const [stdin, setStdin] = useState(problem?.sample_input ?? "");
  const [output, setOutput] = useState<ExecuteCodeResult | null>(null);
  const [multiOutput, setMultiOutput] = useState<{ results: TestCaseResult[] } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("testcases");
  const [useFallbackTextarea, setUseFallbackTextarea] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (submissionResult) {
      setActiveTab("testresult");
    }
  }, [submissionResult]);

  useEffect(() => {
    if (problem) {
      const template = problem.templates?.[language] ?? STARTER_TEMPLATES[language] ?? "";
      setCode(template);
      if (problem.sample_input !== undefined) {
        setStdin(problem.sample_input);
      }
      setOutput(null);
    }
  }, [problem]);

  useEffect(() => {
    const handleScriptEventError = (event: ErrorEvent | Event) => {
      const isEventObj = event instanceof Event || (event && typeof event === "object" && "type" in event);
      const msg = event instanceof ErrorEvent ? event.message : String((event as any)?.error || (event as any)?.message || event);

      if (
        isEventObj ||
        msg.includes("[object Event]") ||
        msg.includes("Script error") ||
        msg.includes("Monaco")
      ) {
        if (typeof event.preventDefault === "function") event.preventDefault();
        if (typeof (event as any).stopImmediatePropagation === "function") (event as any).stopImmediatePropagation();
        setUseFallbackTextarea(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const isEventReason =
        reason instanceof Event ||
        (reason && typeof reason === "object" && ("target" in reason || "type" in reason) && !("message" in reason)) ||
        String(reason) === "[object Event]" ||
        String(reason) === "[object ErrorEvent]";

      if (isEventReason) {
        if (typeof event.preventDefault === "function") event.preventDefault();
        setUseFallbackTextarea(true);
      }
    };

    window.addEventListener("error", handleScriptEventError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleScriptEventError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  const handleLanguageChange = useCallback((newLang: CodingLanguage) => {
    setLanguage(newLang);
    const template = problem?.templates?.[newLang] ?? STARTER_TEMPLATES[newLang] ?? "";
    setCode(template);
    if (problem?.sample_input) {
      setStdin(problem.sample_input);
    }
    setOutput(null);
  }, [problem]);

  const handleRun = async () => {
    if (!code.trim()) {
      toast({ title: "Empty code", description: "Please write some code first", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setOutput(null);
    setMultiOutput(null);

    try {
      if (activeTab === "customtest") {
        const response = await fetch("/api/code/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            code,
            stdin,
            input: stdin,
            input_data: stdin,
          }),
        });

        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          throw new Error(error.error ?? "Code execution failed");
        }

        const result = (await response.json()) as ExecuteCodeResult;
        setOutput(result);
      } else {
        const response = await fetch("/api/code/run-testcases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem_id: problem?.id,
            language,
            code,
          }),
        });

        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          throw new Error(error.error ?? "Evaluation failed");
        }

        const result = await response.json();
        setMultiOutput(result);
      }
      setActiveTab(activeTab === "customtest" ? "customtest" : "testcases");
    } catch (error) {
      const msg = getErrorMessage(error);
      toast({ title: "Run failed", description: msg, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      try {
        await onSubmit(code, language);
      } catch (err) {
        const msg = getErrorMessage(err);
        toast({ title: "Submission error", description: msg, variant: "destructive" });
      }
    }
  };

  const handleReset = () => {
    const template = problem?.templates?.[language] ?? STARTER_TEMPLATES[language] ?? "";
    setCode(template);
    setOutput(null);
  };

  const statusColor = output?.status
    ? output.status.id === 3
      ? "text-green-600"
      : output.status.id >= 4
      ? "text-red-500"
      : "text-amber-600"
    : "";

  const isFillMode = height === "100%";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-white",
        isFillMode ? "h-full" : "border border-gray-200 rounded-xl"
      )}
    >
      {/* ── Top Pane: Code Editor ── */}
      <div className="flex flex-col flex-[3] min-h-0 border-b border-gray-200">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
           <div className="text-xs font-bold text-gray-700 flex items-center gap-2">
             <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
             Code Editor
           </div>
           
           <div className="flex items-center gap-2">
             <Select value={language} onValueChange={(v) => handleLanguageChange(v as CodingLanguage)}>
               <SelectTrigger className="h-7 w-28 text-[11px] border-gray-300 bg-white text-gray-700">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {(Object.keys(LANGUAGE_DISPLAY_NAMES) as CodingLanguage[]).map((lang) => (
                   <SelectItem key={lang} value={lang} className="text-xs">
                     {LANGUAGE_DISPLAY_NAMES[lang]}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>

             <Button
               variant="ghost"
               size="icon"
               className="h-7 w-7 text-gray-400 hover:text-gray-700"
               onClick={handleReset}
               title="Reset to template"
             >
               <RotateCcw className="h-3 w-3" />
             </Button>
           </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0 relative">
            {language === "sql" ? (
              <SQLEditor
                datasetName={problem?.dataset_name ?? "university"}
                defaultQuery={code}
                height="100%"
              />
            ) : language === "html" || language === "css" || language === "react" ? (
              <div className="grid grid-cols-2 h-full">
                <div className="h-full border-r border-gray-200">
                  {useFallbackTextarea ? (
                    <textarea
                      value={code}
                      readOnly={readOnly}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full h-full font-mono text-sm p-4 resize-none focus:outline-none bg-white text-gray-800"
                      placeholder="Write your code here..."
                    />
                  ) : (
                    <MonacoErrorBoundary fallback={
                      <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full h-full font-mono text-sm p-4 resize-none bg-white"
                      />
                    }>
                      <MonacoEditor
                        language={language === "react" ? "typescript" : language}
                        value={code}
                        onChange={(v) => !readOnly && setCode(v ?? "")}
                        theme="vs"
                        onMount={() => setUseFallbackTextarea(false)}
                        height="100%"
                        options={{
                          fontSize: 14,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          lineNumbers: "on",
                          tabSize: 2,
                          readOnly,
                          wordWrap: "on",
                          automaticLayout: true,
                          padding: { top: 12, bottom: 12 },
                        }}
                      />
                    </MonacoErrorBoundary>
                  )}
                </div>
                <WebPreview
                  html={language === "html" ? code : ""}
                  css={language === "css" ? code : ""}
                  reactCode={language === "react" ? code : ""}
                  height="100%"
                />
              </div>
            ) : useFallbackTextarea ? (
              <textarea
                value={code}
                readOnly={readOnly}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full font-mono text-sm p-4 resize-none focus:outline-none bg-white text-gray-800"
                placeholder="Write your code here..."
              />
            ) : (
              <MonacoErrorBoundary fallback={
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-full font-mono text-sm p-4 resize-none bg-white"
                />
              }>
                <MonacoEditor
                  language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
                  value={code}
                  onChange={(v) => !readOnly && setCode(v ?? "")}
                  theme="vs"
                  onMount={() => setUseFallbackTextarea(false)}
                  height="100%"
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    renderLineHighlight: "line",
                    tabSize: 2,
                    readOnly,
                    wordWrap: "on",
                    formatOnPaste: true,
                    automaticLayout: true,
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </MonacoErrorBoundary>
            )}
        </div>
      </div>

      {/* ── Middle Divider / Action Bar ── */}
      <div className="flex items-center justify-between px-2 bg-gray-50 border-b border-gray-200 shrink-0 overflow-x-auto scrollbar-none">
        {/* Tabs for Bottom Pane */}
        <div className="flex items-center space-x-1 py-1">
          {(["testcases", "testresult", "customtest"] as const).map((tab) => {
            const labels: Record<string, string> = {
              testcases: "Sample Testcases",
              testresult: "Test Result",
              customtest: "Custom Testcase",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 rounded-md",
                  activeTab === tab
                    ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                    : "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                )}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
        
        {/* Run / Submit Actions */}
        <div className="flex items-center gap-2 pl-4 py-1 shrink-0">
           <Button
             size="sm"
             className="h-7 px-4 text-[11px] font-bold bg-green-500 hover:bg-green-600 text-white gap-1 rounded-md"
             onClick={() => handleRun()}
             disabled={isRunning || readOnly}
           >
             {isRunning ? (
               <Loader2 className="h-3 w-3 animate-spin" />
             ) : (
               <Play className="h-3 w-3" />
             )}
             {isRunning ? "Running..." : "Run Code"}
           </Button>

           {showSubmit && onSubmit && (
             <Button
               size="sm"
               className="h-7 px-4 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 rounded-md"
               onClick={() => handleSubmit()}
               disabled={isSubmitting || readOnly}
             >
               {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
               {isSubmitting ? "Submitting..." : "Submit"}
             </Button>
           )}
        </div>
      </div>

      {/* ── Bottom Pane: Test Console ── */}
      <div className="flex flex-col flex-[2] min-h-0 bg-white overflow-hidden relative">
      
      {activeTab === "testresult" && (
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {submissionResult ? (
            <div className="space-y-4">
               <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 border",
                      submissionResult.status === "accepted"
                        ? "bg-green-50 text-green-700 border-green-300"
                        : "bg-red-50 text-red-700 border-red-300"
                    )}
                  >
                    {submissionResult.status === "accepted" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1.5" />
                    )}
                    {submissionResult.status.replace("_", " ").toUpperCase()}
                  </Badge>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                    Passed: {submissionResult.passed_test_cases}/{submissionResult.total_test_cases}
                  </span>
                  {submissionResult.execution_time != null && (
                    <span className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> {submissionResult.execution_time.toFixed(2)}s
                    </span>
                  )}
               </div>
               {submissionResult.results && (
                  <div className="space-y-3">
                    {submissionResult.results.map((r, i) => {
                      const tc = problem?.test_cases?.find(t => t.id === r.test_case_id);
                      const isHidden = !tc;
                      return (
                        <div key={r.test_case_id} className="rounded-lg border border-gray-200 overflow-hidden shrink-0">
                          <div className={cn(
                            "px-3 py-1.5 text-[11px] font-bold border-b border-gray-200 flex justify-between items-center",
                            r.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          )}>
                            <span>Test Case {i + 1} {isHidden && "(Hidden)"}</span>
                            <span>{r.passed ? "Passed" : "Failed"}</span>
                          </div>
                          
                          {!r.passed && (
                            <div className="grid grid-cols-1 divide-y divide-gray-200 bg-white">
                              {tc && (
                                <div className="p-2.5 bg-gray-50">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Input:</p>
                                  <pre className="text-[11px] font-mono text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">{tc.input}</pre>
                                </div>
                              )}
                              <div className="p-2.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Error / Output:</p>
                                <pre className="text-[11px] font-mono text-red-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                  {r.error || r.actual_output || "Unknown error"}
                                </pre>
                              </div>
                              {tc && tc.expected_output && (
                                <div className="p-2.5">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Expected Output:</p>
                                  <pre className="text-[11px] font-mono text-green-700 whitespace-pre-wrap max-h-24 overflow-y-auto">{tc.expected_output}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
               )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
              <CheckCircle2 className="h-8 w-8 text-gray-300" />
              <p>Submit your code to see final evaluation results here.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "testcases" && (
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {multiOutput ? (
            <div className="space-y-3">
              {multiOutput.results.map((r, i) => {
                 const tc = problem?.test_cases?.find(t => t.id === r.test_case_id);
                 return (
                   <div key={r.test_case_id} className="rounded-lg border border-gray-200 overflow-hidden shrink-0">
                     <div className={cn(
                       "px-3 py-1.5 text-[11px] font-bold border-b border-gray-200 flex justify-between items-center",
                       r.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                     )}>
                       <span>Test Case {i + 1}</span>
                       <span>{r.passed ? "Passed" : "Failed"}</span>
                     </div>
                     <div className="grid grid-cols-2 divide-x divide-gray-200 bg-white">
                       <div className="p-2.5 space-y-2">
                         <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Input:</p>
                           <pre className="text-[11px] font-mono text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">{tc?.input || "—"}</pre>
                         </div>
                         <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Your Output:</p>
                           <pre className="text-[11px] font-mono text-blue-700 whitespace-pre-wrap max-h-24 overflow-y-auto">{r.actual_output || r.error || "—"}</pre>
                         </div>
                       </div>
                       <div className="p-2.5">
                         <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Expected Output:</p>
                         <pre className="text-[11px] font-mono text-green-700 whitespace-pre-wrap max-h-24 overflow-y-auto">{tc?.expected_output || "—"}</pre>
                       </div>
                     </div>
                   </div>
                 );
              })}
            </div>
          ) : output ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  className={cn(
                    "text-[11px] font-bold px-2.5 py-1 border",
                    output.status.id === 3
                      ? "bg-green-50 text-green-700 border-green-300"
                      : output.status.id === 6
                      ? "bg-red-50 text-red-700 border-red-300"
                      : output.status.id === 7
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-purple-50 text-purple-700 border-purple-300"
                  )}
                >
                  {output.status.id === 3 ? (
                    <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1.5" />
                  )}
                  {output.status.description.toUpperCase()}
                </Badge>
                {output.time && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" /> {output.time}s
                  </span>
                )}
                {output.memory && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                    <Cpu className="h-3 w-3" /> {(output.memory / 1024).toFixed(1)}MB
                  </span>
                )}
              </div>

              {output.status.id === 6 || output.compile_output ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-mono space-y-1">
                  <span className="text-red-600 font-bold block border-b border-red-200 pb-1">Compilation Error</span>
                  <pre className="overflow-auto max-h-32 text-red-700 whitespace-pre-wrap leading-relaxed">
                    {output.compile_output || output.stderr || output.message || "Compilation failed"}
                  </pre>
                </div>
              ) : output.status.id === 7 || (output.stderr && output.status.id !== 3) ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-mono space-y-1">
                    <span className="text-amber-700 font-bold block border-b border-amber-200 pb-1">Runtime Error & Stack Trace</span>
                    <pre className="overflow-auto max-h-32 text-amber-800 whitespace-pre-wrap leading-relaxed">
                      {output.stderr || output.message || "Runtime exception occurred"}
                    </pre>
                  </div>
                  {(!stdin || !stdin.trim()) &&
                  (output.stderr?.includes("NoSuchElementException") ||
                    output.stderr?.includes("EOFError") ||
                    output.message?.includes("NoSuchElementException")) ? (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 flex items-start gap-2">
                      <span className="font-bold text-blue-600 shrink-0">💡 Input Notice:</span>
                      <span>
                        The program requested input, but Custom Test input is empty. Go to <strong>Custom Testcase</strong> tab and enter input.
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs font-mono space-y-1">
                  <span className="text-gray-500 font-bold block border-b border-gray-200 pb-1">Standard Output (stdout)</span>
                  <pre className="overflow-auto max-h-32 text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {output.stdout || "Program executed successfully with no output."}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-3">
               {problem?.test_cases?.filter((tc) => !tc.is_hidden).length ? (
                 <div className="flex flex-col h-full">
                   {problem.test_cases.filter((tc) => !tc.is_hidden).map((tc, i) => (
                    <div key={tc.id} className="rounded-lg border border-gray-200 overflow-hidden mb-3 shrink-0">
                      <div className="bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-500 border-b border-gray-200">
                        Test Case {i + 1}
                        {tc.explanation && <span className="ml-2 font-normal text-gray-400">— {tc.explanation}</span>}
                      </div>
                      <div className="p-2.5 bg-white">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Input:</p>
                        <pre className="text-[11px] font-mono text-blue-700 whitespace-pre-wrap">{tc.input || "—"}</pre>
                      </div>
                    </div>
                   ))}
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                   No public test cases for this problem.
                 </div>
               )}
            </div>
          )}
        </div>
      )}

      {activeTab === "customtest" && (
        <div className="flex flex-col flex-1 min-h-0 bg-white">
          <div className="p-4 flex-1 flex flex-col min-h-0">
             <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5 shrink-0">
               Custom Input (stdin)
             </label>
             <Textarea
               placeholder={"Enter your custom input here...\nExample:\n4\n2 7 11 15\n9"}
               value={stdin}
               onChange={(e) => setStdin(e.target.value)}
               className="flex-1 resize-none font-mono text-sm bg-gray-50 border-gray-200 text-gray-800 focus:ring-blue-500 min-h-[100px]"
             />
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
}
