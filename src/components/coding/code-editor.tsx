"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Component, ErrorInfo, ReactNode } from "react";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import {
  Play, RotateCcw, Loader2,
  CheckCircle2, XCircle, Clock, Cpu,
  PanelLeftOpen, PanelRightOpen,
  ChevronUp, ChevronDown, Lock, Terminal, FileCode,
  Sun, Moon, Maximize2, Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn, getErrorMessage } from "@/lib/utils";
import type { CodingLanguage, ExecuteCodeResult, CodingProblem, TestCaseResult, CodingSubmission } from "@/types";
import { LANGUAGE_DISPLAY_NAMES } from "@/types/coding";
import { registerMonacoCompletions } from "@/lib/monaco-completions";

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

interface CodeEditorProps {
  submissionResult?: CodingSubmission | null;
  problem?: CodingProblem;
  onSubmit?: (code: string, language: CodingLanguage) => Promise<void>;
  onCodeChange?: (code: string, language: CodingLanguage) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
  showQuestionToggle?: boolean;
  onToggleQuestion?: () => void;
  showNavigatorToggle?: boolean;
  onToggleNavigator?: () => void;
  defaultLanguage?: CodingLanguage;
  defaultCode?: string;
  showSubmit?: boolean;
  height?: string;
}

export function CodeEditor({
  problem,
  submissionResult,
  onSubmit,
  onCodeChange,
  isSubmitting = false,
  readOnly = false,
  showQuestionToggle = false,
  onToggleQuestion,
  showNavigatorToggle = false,
  onToggleNavigator,
  defaultLanguage = "python",
  defaultCode,
  showSubmit = true,
  height = "450px",
}: CodeEditorProps) {
  const [language, setLanguage] = useState<CodingLanguage>(defaultLanguage);
  const [code, setCode] = useState<string>(
    defaultCode ?? (problem?.templates?.[defaultLanguage] || "")
  );
  const [stdin, setStdin] = useState(problem?.sample_input ?? "");
  const [output, setOutput] = useState<ExecuteCodeResult | null>(null);
  const [multiOutput, setMultiOutput] = useState<{ results: TestCaseResult[] } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"testcases" | "hiddentestcases" | "customtest" | "testresult">("testcases");
  const [showConsole, setShowConsole] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
  const [useFallbackTextarea, setUseFallbackTextarea] = useState(false);
  const [editorTheme, setEditorTheme] = useState<"lms-light" | "lms-dark">("lms-light");
  const [dbLanguages, setDbLanguages] = useState<{id: string, name: string}[]>([]);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const consoleRef = useRef<HTMLDivElement>(null);
  const consoleContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    setUseFallbackTextarea(false);
    if (monaco) registerMonacoCompletions(monaco);
    if (editor) {
      editor.onDidChangeCursorPosition((e: any) => {
        if (e?.position) {
          setCursorPos({
            line: e.position.lineNumber || 1,
            col: e.position.column || 1,
          });
        }
      });
    }
  }, []);

  const handleTextareaSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const val = target.value.substring(0, target.selectionStart ?? 0);
    const lines = val.split("\n");
    const lastLine = lines[lines.length - 1] ?? "";
    setCursorPos({
      line: lines.length || 1,
      col: lastLine.length + 1,
    });
  }, []);

  const handleTabClick = (tab: "testcases" | "hiddentestcases" | "customtest" | "testresult") => {
    setActiveTab(tab);
    setShowConsole(true);
    setTimeout(() => {
      consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (consoleContentRef.current) {
        consoleContentRef.current.scrollTop = 0;
      }
    }, 60);
  };

  const handleConsoleToggle = () => {
    const nextState = !showConsole;
    setShowConsole(nextState);
    if (nextState) {
      setTimeout(() => {
        consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  };

  useEffect(() => {
    fetch("/api/compiler/languages?enabled=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.languages) {
          setDbLanguages(data.languages.map((l: any) => ({
            id: l.jobe_language,
            name: l.display_name
          })));
        }
      })
      .catch((err) => console.error("Failed to fetch languages", err));
  }, []);

  useEffect(() => {
    if (submissionResult) {
      setActiveTab("testresult");
      setShowConsole(true);
      setTimeout(() => {
        consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (consoleContentRef.current) {
          consoleContentRef.current.scrollTop = 0;
        }
      }, 80);
    }
  }, [submissionResult]);

  const allowedLanguages = useMemo(() => {
    if (problem?.templates && Object.keys(problem.templates).length > 0) {
      return Object.keys(problem.templates) as CodingLanguage[];
    }
    return [defaultLanguage] as CodingLanguage[];
  }, [problem, defaultLanguage]);

  useEffect(() => {
    if (problem) {
      const currentLang = allowedLanguages.includes(language) ? language : (allowedLanguages[0] || "python");
      if (currentLang !== language) {
        setLanguage(currentLang);
        return;
      }
      
      const localKey = `edunexus_draft_${problem.id}_${currentLang}`;
      const savedDraft = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
      const initialCode = savedDraft !== null 
        ? savedDraft 
        : (defaultCode !== undefined ? defaultCode : (problem.templates?.[currentLang] || ""));
        
      setCode(initialCode);
      if (problem.sample_input !== undefined) {
        setStdin(problem.sample_input);
      }
      setOutput(null);

      // If no local draft exists (e.g. new laptop), fetch cloud draft from database
      if (!savedDraft && problem.id) {
        fetch(`/api/student/drafts?problem_id=${problem.id}&language=${currentLang}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.draft?.code) {
              setCode(data.draft.code);
              try {
                localStorage.setItem(localKey, data.draft.code);
              } catch {}
            }
          })
          .catch(() => {});
      }
    }
  }, [problem?.id, defaultCode]);

  // Auto-save draft locally and to cloud database (debounced)
  useEffect(() => {
    if (problem?.id && code) {
      const localKey = `edunexus_draft_${problem.id}_${language}`;
      try {
        localStorage.setItem(localKey, code);
      } catch (err) {
        console.warn("Failed to save local draft", err);
      }

      const timer = setTimeout(() => {
        fetch("/api/student/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem_id: problem.id,
            language,
            code,
          }),
        }).catch(() => {});
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [code, language, problem?.id]);

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
    const localKey = `edunexus_draft_${problem?.id}_${newLang}`;
    const savedDraft = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
    const template = problem?.templates?.[newLang] || "";
    setCode(savedDraft !== null ? savedDraft : template);
    if (problem?.sample_input) {
      setStdin(problem.sample_input);
    }
    setOutput(null);

    if (!savedDraft && problem?.id) {
      fetch(`/api/student/drafts?problem_id=${problem.id}&language=${newLang}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.draft?.code) {
            setCode(data.draft.code);
            try {
              localStorage.setItem(localKey, data.draft.code);
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [problem]);

  const handleRun = async () => {
    if (!code.trim()) {
      toast({ title: "Empty code", description: "Please write some code first", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setOutput(null);
    setMultiOutput(null);
    setShowConsole(true);

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
            sql_engine: problem?.sql_engine,
            schema_sql: problem?.schema_sql,
            seed_sql: problem?.seed_sql,
            comparison_mode: problem?.comparison_mode,
            dataset_name: problem?.dataset_name,
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
            test_cases: problem?.test_cases,
            sql_engine: problem?.sql_engine,
            schema_sql: problem?.schema_sql,
            seed_sql: problem?.seed_sql,
            comparison_mode: problem?.comparison_mode,
          }),
        });

        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          throw new Error(error.error ?? "Evaluation failed");
        }

        const result = await response.json();
        setMultiOutput(result);
      }
      setShowConsole(true);
      setActiveTab(activeTab === "customtest" ? "customtest" : "testcases");
      setTimeout(() => {
        consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (consoleContentRef.current) {
          consoleContentRef.current.scrollTop = 0;
        }
      }, 80);
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
        setShowConsole(true);
        setActiveTab("testresult");
        setTimeout(() => {
          consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 80);
        await onSubmit(code, language);
      } catch (err) {
        const msg = getErrorMessage(err);
        toast({ title: "Submission error", description: msg, variant: "destructive" });
      }
    }
  };

  const handleReset = () => {
    const template = problem?.templates?.[language] || "";
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
        "flex flex-col bg-white dark:bg-[#18181B] w-full h-full overflow-hidden transition-all duration-200",
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen rounded-none border-0 shadow-2xl p-0 m-0"
          : !isFillMode && "border border-gray-200 dark:border-zinc-800 rounded-xl"
      )}
      style={
        isFullscreen
          ? { height: "100vh", width: "100vw", zIndex: 9999 }
          : !isFillMode
          ? { height: height || "600px", minHeight: "450px" }
          : { height: "100%", minHeight: "450px" }
      }
    >
      {/* ── Top Pane: Code Editor ── */}
      <div className={cn("flex flex-col min-h-0 overflow-hidden border-b border-gray-200 dark:border-zinc-800", showConsole ? "flex-[3]" : "flex-1")}>
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shrink-0">
           <div className="text-xs font-bold text-gray-700 dark:text-zinc-200 flex items-center gap-2">
             {showQuestionToggle && onToggleQuestion && (
               <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600 p-0" onClick={onToggleQuestion} title="Show Question Statement">
                 <PanelLeftOpen className="h-4 w-4" />
               </Button>
             )}
             <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
             <span>Code Editor</span>
             {isFullscreen && (
               <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/30">
                 FULLSCREEN (ESC TO EXIT)
               </Badge>
             )}
           </div>
           
           <div className="flex items-center gap-1.5 sm:gap-2">
             {allowedLanguages.length > 1 ? (
               <Select value={language} onValueChange={(v) => handleLanguageChange(v as CodingLanguage)}>
                 <SelectTrigger className="h-7 w-[125px] text-[11px] border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                    {allowedLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang} className="text-xs">
                        {dbLanguages.find(l => l.id === lang)?.name || LANGUAGE_DISPLAY_NAMES[lang as CodingLanguage] || lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-7 px-2.5 flex items-center justify-center text-[11px] border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-md font-medium">
                  {dbLanguages.find(l => l.id === language)?.name || LANGUAGE_DISPLAY_NAMES[language as CodingLanguage] || language}
                </div>
              )}

              {language === "sql" && (
                <Badge variant="outline" className="h-7 text-[10px] font-bold px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <span>DB:</span>
                  <span className="uppercase">{(problem?.sql_engine || "sqlite")}</span>
                </Badge>
              )}

             <Button
               variant="ghost"
               size="icon"
               className="h-7 w-7 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
               onClick={() => setEditorTheme((t) => (t === "lms-light" ? "lms-dark" : "lms-light"))}
               title={editorTheme === "lms-light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
             >
               {editorTheme === "lms-light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
             </Button>

             <Button
               variant="ghost"
               size="icon"
               className="h-7 w-7 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
               onClick={handleReset}
               title="Reset to template"
             >
               <RotateCcw className="h-3.5 w-3.5" />
             </Button>

             {/* Fullscreen Toggle Button */}
             <Button
               variant="ghost"
               size="icon"
               className={cn(
                 "h-7 w-7 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors",
                 isFullscreen && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50"
               )}
               onClick={toggleFullscreen}
               title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Code Editor"}
             >
               {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
             </Button>

             {/* Run Code Button */}
             <Button
               size="sm"
               className="h-7 px-3 text-[11px] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white gap-1 rounded-lg shadow-xs"
               onClick={() => handleRun()}
               disabled={isRunning || readOnly}
             >
               {isRunning ? (
                 <Loader2 className="h-3 w-3 animate-spin" />
               ) : (
                 <Play className="h-3 w-3 fill-current" />
               )}
               {isRunning ? "Running..." : "Run Code"}
             </Button>

             {/* Submit Button */}
             {showSubmit && onSubmit && (
               <Button
                 size="sm"
                 className="h-7 px-3 text-[11px] font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1 rounded-lg shadow-xs"
                 onClick={() => handleSubmit()}
                 disabled={isSubmitting || readOnly}
               >
                 {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                 {isSubmitting ? "Submitting..." : "Submit"}
               </Button>
             )}

             {showNavigatorToggle && onToggleNavigator && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600" onClick={onToggleNavigator} title="Show Question Navigator">
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
              )}
           </div>
        </div>

        {/* Monaco Editor Body */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-white">
          {language === "html" || language === "css" || language === "react" ? (
            <div className="grid grid-cols-2 h-full">
              <div className="h-full border-r border-gray-200">
                {useFallbackTextarea ? (
                  <textarea
                    value={code}
                    readOnly={readOnly}
                    onSelect={handleTextareaSelect}
                    onChange={(e) => {
                      setCode(e.target.value);
                      handleTextareaSelect(e);
                    }}
                    className="w-full h-full font-mono text-sm p-4 resize-none focus:outline-none bg-white text-gray-800"
                    placeholder="Write your code here..."
                  />
                ) : (
                  <MonacoErrorBoundary fallback={
                    <textarea
                      value={code}
                      onSelect={handleTextareaSelect}
                      onChange={(e) => {
                        setCode(e.target.value);
                        handleTextareaSelect(e);
                      }}
                      className="w-full h-full font-mono text-sm p-4 resize-none bg-white"
                    />
                  }>
                    <MonacoEditor
                      language={language === "react" ? "typescript" : language}
                      value={code}
                      onChange={(v) => !readOnly && setCode(v ?? "")}
                      theme={editorTheme}
                      beforeMount={(monaco) => registerMonacoCompletions(monaco)}
                      onMount={handleEditorMount}
                      height="100%"
                      options={{
                        fontSize: 13.5,
                        lineHeight: 21,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', monospace",
                        fontLigatures: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        lineNumbersMinChars: 3,
                        lineDecorationsWidth: 4,
                        glyphMargin: false,
                        folding: true,
                        foldingHighlight: true,
                        renderLineHighlight: "all",
                        renderLineHighlightOnlyWhenFocus: false,
                        tabSize: 4,
                        readOnly,
                        wordWrap: "on",
                        automaticLayout: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        smoothScrolling: true,
                        bracketPairColorization: { enabled: true },
                        guides: { indentation: true, bracketPairs: true },
                        padding: { top: 10, bottom: 10 },
                        quickSuggestions: {
                          other: true,
                          comments: true,
                          strings: true,
                        },
                        quickSuggestionsDelay: 10,
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: "on",
                        tabCompletion: "on",
                        wordBasedSuggestions: "allDocuments",
                        suggest: {
                          showKeywords: true,
                          showSnippets: true,
                          showWords: true,
                          showClasses: true,
                          showFunctions: true,
                          showVariables: true,
                          showConstants: true,
                          showConstructors: true,
                          showFields: true,
                          showInterfaces: true,
                          showMethods: true,
                          showModules: true,
                          showProperties: true,
                          showStructs: true,
                          showTypeParameters: true,
                          showUnits: true,
                          showValues: true,
                          preview: true,
                          shareSuggestSelections: true,
                          insertMode: "insert",
                        },
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
              onSelect={handleTextareaSelect}
              onChange={(e) => {
                setCode(e.target.value);
                handleTextareaSelect(e);
              }}
              className="w-full h-full font-mono text-sm p-4 resize-none focus:outline-none bg-white text-gray-800"
              placeholder="Write your code here..."
            />
          ) : (
            <MonacoErrorBoundary fallback={
              <textarea
                value={code}
                onSelect={handleTextareaSelect}
                onChange={(e) => {
                  setCode(e.target.value);
                  onCodeChange?.(e.target.value, language);
                  handleTextareaSelect(e);
                }}
                className="w-full h-full font-mono text-sm p-4 resize-none bg-white"
              />
            }>
              <MonacoEditor
                language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
                value={code}
                onChange={(v) => {
                  if (!readOnly) {
                    setCode(v ?? "");
                    onCodeChange?.(v ?? "", language);
                  }
                }}
                theme={editorTheme}
                beforeMount={(monaco) => registerMonacoCompletions(monaco)}
                onMount={handleEditorMount}
                height="100%"
                options={{
                  fontSize: 13.5,
                  lineHeight: 21,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', monospace",
                  fontLigatures: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  lineNumbersMinChars: 3,
                  lineDecorationsWidth: 4,
                  glyphMargin: false,
                  folding: true,
                  foldingHighlight: true,
                  renderLineHighlight: "all",
                  renderLineHighlightOnlyWhenFocus: false,
                  tabSize: 4,
                  readOnly,
                  wordWrap: "on",
                  automaticLayout: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  bracketPairColorization: { enabled: true },
                  guides: { indentation: true, bracketPairs: true },
                  padding: { top: 10, bottom: 10 },
                  quickSuggestions: {
                    other: true,
                    comments: true,
                    strings: true,
                  },
                  quickSuggestionsDelay: 10,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  tabCompletion: "on",
                  wordBasedSuggestions: "allDocuments",
                  suggest: {
                    showKeywords: true,
                    showSnippets: true,
                    showWords: true,
                    showClasses: true,
                    showFunctions: true,
                    showVariables: true,
                    showConstants: true,
                    showConstructors: true,
                    showFields: true,
                    showInterfaces: true,
                    showMethods: true,
                    showModules: true,
                    showProperties: true,
                    showStructs: true,
                    showTypeParameters: true,
                    showUnits: true,
                    showValues: true,
                    preview: true,
                    shareSuggestSelections: true,
                    insertMode: "insert",
                  },
                }}
              />
            </MonacoErrorBoundary>
          )}
        </div>

        {/* ── Editor Status Bar ── */}
        <div className="h-7 px-3 bg-[#F8F9FD] border-t border-gray-200 flex items-center justify-between text-xs select-none shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-600 text-[11px] font-medium tracking-tight">
              Ln {cursorPos.line} : Col {cursorPos.col}
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
                {LANGUAGE_DISPLAY_NAMES[language as CodingLanguage] || dbLanguages.find(l => l.id === language)?.name || (language ? String(language).toUpperCase() : "Code")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-slate-500 text-[11px]">
            <span>UTF-8</span>
            <span>Spaces: 4</span>
            <span>13.5px</span>
          </div>
        </div>
      </div>

      {/* ── Middle Divider / Action Bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-b border-gray-200 shrink-0 select-none">
        {/* Tabs for Bottom Pane */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={handleConsoleToggle}
            className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-700 hover:text-gray-900 transition-colors shrink-0 rounded-md hover:bg-gray-200/60"
          >
            <span>Console</span>
            {showConsole ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          
          <div className="h-4 w-px bg-gray-300 mx-1 shrink-0" />

          {([
            { id: "testcases", label: "Sample Test Cases" },
            { id: "hiddentestcases", label: "Hidden Test Cases" },
            { id: "customtest", label: "Custom Testcase" },
            { id: "testresult", label: "Test Result" },
          ] as const).map((tab) => {
            const isHidden = tab.id === "hiddentestcases";
            const hiddenCount = problem?.test_cases?.filter(t => t.is_hidden).length ?? 0;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap shrink-0 rounded-md flex items-center gap-1.5",
                  showConsole && activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-xs border border-gray-200 font-bold"
                    : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                )}
              >
                {isHidden && <Lock className="w-3 h-3 text-blue-600 inline-block" />}
                <span>{tab.label}</span>
                {isHidden && hiddenCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded-full">
                    {hiddenCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Pane: Test Console ── */}
      {showConsole && (
        <div ref={consoleRef} className="flex flex-col flex-[2] min-h-[160px] bg-white overflow-hidden relative">
        
        {/* Tab 1: Sample Test Cases */}
        {activeTab === "testcases" && (
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {problem?.test_cases?.filter((tc) => !tc.is_hidden).length ? (
              <div className="space-y-3">
                {/* Test case tabs (Case 1, Case 2...) */}
                <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2 overflow-x-auto">
                  {problem.test_cases.filter((tc) => !tc.is_hidden).map((tc, idx) => {
                    const res = multiOutput?.results?.find(r => r.test_case_id === tc.id);
                    return (
                      <button
                        key={tc.id || idx}
                        onClick={() => setSelectedTestCaseIdx(idx)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0",
                          selectedTestCaseIdx === idx
                            ? "bg-gray-100 text-gray-900 border border-gray-300 font-bold shadow-2xs"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        )}
                      >
                        <span>Case {idx + 1}</span>
                        {res && (
                          <span className={cn("w-1.5 h-1.5 rounded-full", res.passed ? "bg-green-500" : "bg-red-500")} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Test Case Content */}
                {(() => {
                  const publicCases = problem.test_cases.filter((tc) => !tc.is_hidden);
                  const currentTc = publicCases[selectedTestCaseIdx] || publicCases[0];
                  const currentResult = multiOutput?.results?.find(r => r.test_case_id === currentTc?.id);
                  if (!currentTc) return null;

                  return (
                    <div className="space-y-3">
                      {currentResult && (
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[11px] font-bold px-2 py-0.5", currentResult.passed ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300")}>
                            {currentResult.passed ? <CheckCircle2 className="w-3 h-3 mr-1 text-green-600 inline" /> : <XCircle className="w-3 h-3 mr-1 text-red-600 inline" />}
                            {currentResult.passed ? "Passed" : "Failed"}
                          </Badge>
                          {currentResult.time_seconds != null && (
                            <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {currentResult.time_seconds}s
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Input:</span>
                        <pre className="p-2.5 bg-gray-50 border border-gray-200 rounded-md font-mono text-xs text-gray-800 whitespace-pre-wrap">{currentTc.input || "—"}</pre>
                      </div>

                      {currentResult && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Your Output:</span>
                          <pre className={cn("p-2.5 bg-gray-50 border rounded-md font-mono text-xs whitespace-pre-wrap", currentResult.passed ? "text-green-700 border-green-200" : "text-red-600 border-red-200")}>
                            {currentResult.actual_output || currentResult.error || "—"}
                          </pre>
                        </div>
                      )}

                      {currentTc.expected_output && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Expected Output:</span>
                          <pre className="p-2.5 bg-green-50/50 border border-green-200 rounded-md font-mono text-xs text-green-800 whitespace-pre-wrap">{currentTc.expected_output}</pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : output ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[11px] font-bold", output.status.id === 3 ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300")}>
                    {output.status.description.toUpperCase()}
                  </Badge>
                </div>
                <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md font-mono text-xs text-gray-800 whitespace-pre-wrap">
                  {output.stdout || output.stderr || output.compile_output || "Execution completed"}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 text-gray-400 text-sm gap-1">
                <Terminal className="h-6 w-6 text-gray-300" />
                <p className="text-xs">Click <strong>Run Code</strong> to execute and view sample test results.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Hidden Test Cases */}
        {activeTab === "hiddentestcases" && (
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {submissionResult?.results ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" /> Hidden Test Cases Evaluation
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {submissionResult.results.filter(r => r.passed).length} / {submissionResult.results.length} Passed
                  </Badge>
                </div>

                <div className="space-y-2">
                  {submissionResult.results.map((r, i) => {
                    const tc = problem?.test_cases?.find(t => t.id === r.test_case_id);
                    const isHidden = !tc || tc.is_hidden;
                    return (
                      <div key={r.test_case_id || i} className={cn("p-2.5 rounded-lg border flex items-center justify-between text-xs", r.passed ? "bg-green-50/50 border-green-200 text-green-800" : "bg-red-50/50 border-red-200 text-red-700")}>
                        <span className="font-semibold flex items-center gap-2">
                          <Lock className="w-3 h-3 text-blue-500" />
                          Test Case {i + 1} {isHidden ? "(Hidden)" : "(Public)"}
                        </span>
                        <div className="flex items-center gap-2">
                          {r.time_seconds != null && <span className="text-[10px] font-mono opacity-70">{r.time_seconds}s</span>}
                          <Badge className={cn("text-[10px] font-bold", r.passed ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
                            {r.passed ? "Passed" : "Failed"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-1">
                    Hidden Test Cases ({problem?.test_cases?.filter(t => t.is_hidden).length || "Locked"})
                  </h4>
                  <p className="text-[11px] text-gray-500 max-w-sm leading-relaxed">
                    Hidden test cases test edge cases and boundary limits without revealing inputs. Click <strong>Submit</strong> to evaluate your solution.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Custom Testcase */}
        {activeTab === "customtest" && (
          <div className="flex flex-col flex-1 min-h-0 bg-white">
            <div className="p-4 flex-1 flex flex-col min-h-0">
               <div className="flex items-center justify-between mb-1.5 shrink-0">
                 <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                   Custom Input (stdin)
                 </label>
                 <span className="text-[10px] text-gray-400">Click &quot;Run Code&quot; to test with this input</span>
               </div>
               <Textarea
                 placeholder={"Enter custom input values here...\nExample:\n5\n1 2 3 4 5"}
                 value={stdin}
                 onChange={(e) => setStdin(e.target.value)}
                 className="flex-1 resize-none font-mono text-xs bg-gray-50 border-gray-200 text-gray-800 focus:ring-blue-500 min-h-[100px]"
               />
            </div>
          </div>
        )}

        {/* Tab 4: Test Result */}
        {activeTab === "testresult" && (
          <div ref={consoleContentRef} className="flex-1 overflow-y-auto p-4 bg-white">
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
                        <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-600 inline" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1.5 text-red-600 inline" />
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
                    <div className="space-y-2">
                      {submissionResult.results.map((r, i) => {
                        const tc = problem?.test_cases?.find(t => t.id === r.test_case_id);
                        const isHidden = !tc || tc.is_hidden;
                        return (
                          <details key={r.test_case_id || i} className="rounded-lg border border-gray-200 overflow-hidden shrink-0 group">
                            <summary className={cn(
                              "px-3 py-1.5 text-[11px] font-bold border-b border-gray-200 flex justify-between items-center cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden",
                              r.passed ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-700 hover:bg-red-100"
                            )}>
                              <span>Test Case {i + 1} {isHidden && "(Hidden)"}</span>
                              <span>{r.passed ? "Passed" : "Failed"}</span>
                            </summary>
                            
                            <div className="grid grid-cols-1 divide-y divide-gray-200 bg-white">
                              {tc && !isHidden && (
                                <div className="p-2.5 bg-gray-50">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Input:</p>
                                  <pre className="text-[11px] font-mono text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">{tc.input}</pre>
                                </div>
                              )}
                              <div className="p-2.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Error / Output:</p>
                                <pre className={cn("text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto", r.passed ? "text-green-700" : "text-red-600")}>
                                  {r.error || r.actual_output || "Unknown error"}
                                </pre>
                              </div>
                              {tc && !isHidden && tc.expected_output && (
                                <div className="p-2.5">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Expected Output:</p>
                                  <pre className="text-[11px] font-mono text-green-700 whitespace-pre-wrap max-h-24 overflow-y-auto">{tc.expected_output}</pre>
                                </div>
                              )}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                 )}
              </div>
            ) : output ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[11px] font-bold", output.status.id === 3 ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300")}>
                    {output.status.description.toUpperCase()}
                  </Badge>
                </div>
                <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md font-mono text-xs text-gray-800 whitespace-pre-wrap">
                  {output.stdout || output.stderr || output.compile_output || "Execution completed"}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 text-gray-400 text-sm gap-1">
                <CheckCircle2 className="h-6 w-6 text-gray-300" />
                <p className="text-xs">Submit your code to see comprehensive evaluation results.</p>
              </div>
            )}
          </div>
        )}
        
        </div>
      )}
    </div>
  );
}
