"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Component, ErrorInfo, ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  Play, RotateCcw, Loader2,
  CheckCircle2, XCircle, Clock,
  PanelLeftOpen, PanelRightOpen,
  ChevronUp, ChevronDown, Lock, Terminal,
  Sun, Moon, Maximize2, Minimize2,
  MoreHorizontal, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn, getErrorMessage } from "@/lib/utils";
import type { CodingLanguage, ExecuteCodeResult, CodingProblem, TestCaseResult, CodingSubmission } from "@/types";
import { LANGUAGE_DISPLAY_NAMES } from "@/types/coding";
import { registerMonacoCompletions } from "@/lib/monaco-completions";
import { formatSourceCode } from "@/lib/compiler/code-formatter";

// Lazy load Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-white dark:bg-[#141417]">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
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
  const [code, setCode] = useState<string>(() => {
    if (typeof window !== "undefined" && problem?.id) {
      try {
        const savedDraft = localStorage.getItem(`edunexus_draft_${problem.id}_${defaultLanguage}`);
        if (savedDraft !== null) return savedDraft;
      } catch {}
    }
    return defaultCode ?? (problem?.templates?.[defaultLanguage] || "");
  });
  const [stdin, setStdin] = useState(problem?.sample_input ?? "");
  const [output, setOutput] = useState<ExecuteCodeResult | null>(null);
  const [multiOutput, setMultiOutput] = useState<{ results: TestCaseResult[] } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"testcases" | "hiddentestcases" | "customtest" | "testresult">("testcases");
  const [showConsole, setShowConsole] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
  const [useFallbackTextarea, setUseFallbackTextarea] = useState(false);
  const [editorTheme, setEditorTheme] = useState<"lms-light" | "lms-dark">("lms-light");
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<"off" | "on">("off");
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [dbLanguages, setDbLanguages] = useState<{id: string, name: string}[]>([]);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const monacoEditorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const lastProblemIdRef = useRef<string | undefined>(problem?.id);
  const lastLangRef = useRef<CodingLanguage>(defaultLanguage);
  const hasUserEditedRef = useRef<boolean>(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const consoleContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Automatic Monaco ResizeObserver to layout immediately on container/viewport changes
  useEffect(() => {
    if (!editorContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.layout();
      }
    });
    observer.observe(editorContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const tabSize = useMemo(() => {
    return (language === "javascript" || language === "typescript" || language === "html" || language === "css" || language === "react")
      ? 2
      : 4;
  }, [language]);

  const handleCodeChangeInternal = useCallback((newVal: string) => {
    if (readOnly) return;
    hasUserEditedRef.current = true;
    setCode(newVal);
    onCodeChange?.(newVal, language);
  }, [readOnly, onCodeChange, language]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleFormatCode = useCallback(() => {
    if (readOnly || !code) return;
    try {
      if (monacoEditorRef.current) {
        const action = monacoEditorRef.current.getAction("editor.action.formatDocument");
        if (action) {
          action.run();
          toast({ title: "Code Formatted", description: "Indentation and spacing normalized." });
          return;
        }
      }
      const formatted = formatSourceCode(code, language, { tabSize, insertSpaces: true });
      if (formatted !== code) {
        handleCodeChangeInternal(formatted);
        toast({ title: "Code Formatted", description: "Indentation and spacing normalized." });
      }
    } catch {
      const formatted = formatSourceCode(code, language, { tabSize, insertSpaces: true });
      handleCodeChangeInternal(formatted);
    }
  }, [code, language, tabSize, readOnly, handleCodeChangeInternal, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
      // Ctrl + Enter -> Run Code
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleRun();
      }
      // Ctrl + Shift + Enter -> Submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      // Shift + Alt + F -> Format
      if (e.shiftKey && e.altKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        handleFormatCode();
      }
      // Ctrl + S -> Prevent default page save and show toast
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (problem?.id) {
          localStorage.setItem(`edunexus_draft_${problem.id}_${language}`, code);
          toast({ title: "Draft Saved", description: "Code draft saved locally." });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, code, language, problem?.id, handleFormatCode]);

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    monacoEditorRef.current = editor;
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

      // Bind custom formatting shortcut inside Monaco
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
        handleFormatCode();
      });

      // Bind Run shortcut inside Monaco
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        handleRun();
      });

      // 1. Intercept addContentWidget so any widget (including SuggestWidget) enforces preference [BELOW]
      try {
        if (typeof editor.addContentWidget === "function") {
          const origAddContentWidget = editor.addContentWidget.bind(editor);
          editor.addContentWidget = function(contentWidget: any) {
            if (contentWidget && typeof contentWidget.getPosition === "function") {
              const widgetId = typeof contentWidget.getId === "function" ? contentWidget.getId() : "";
              if (!widgetId || widgetId.toLowerCase().includes("suggest")) {
                const origGetPos = contentWidget.getPosition.bind(contentWidget);
                contentWidget.getPosition = function() {
                  const pos = origGetPos();
                  if (pos) {
                    pos.preference = [2]; // 2 = monaco.editor.ContentWidgetPositionPreference.BELOW
                  }
                  return pos;
                };
              }
            }
            return origAddContentWidget(contentWidget);
          };
        }
      } catch (err) {
        console.warn("[Monaco] Could not intercept addContentWidget:", err);
      }

      // 2. Access suggestController and enforce positioning directly
      try {
        const suggestContrib = editor.getContribution?.("editor.contrib.suggestController") as any;
        if (suggestContrib) {
          const widget = suggestContrib.widget?.value || suggestContrib._widget?.value;
          if (widget) {
            if (typeof widget.getPosition === "function") {
              const origGetPos = widget.getPosition.bind(widget);
              widget.getPosition = function() {
                const pos = origGetPos();
                if (pos) {
                  pos.preference = [2];
                }
                return pos;
              };
            }

            // Snap suggest widget below cursor
            widget.onDidShow?.(() => {
              requestAnimationFrame(() => {
                const domNode = widget.getDomNode?.() || document.querySelector(".monaco-editor .suggest-widget");
                if (domNode && domNode.classList.contains("above")) {
                  const pos = editor.getPosition();
                  const cursorCoord = editor.getScrolledVisiblePosition(pos);
                  const editorDom = editor.getDomNode();
                  if (cursorCoord && editorDom) {
                    const editorRect = editorDom.getBoundingClientRect();
                    const topBelow = editorRect.top + cursorCoord.top + cursorCoord.height + 4;
                    domNode.style.top = `${topBelow}px`;
                    domNode.classList.remove("above");
                    domNode.classList.add("below");
                  }
                }
              });
            });
          }
        }
      } catch (err) {
        console.warn("[Monaco] Could not bind suggestController widget:", err);
      }
    }
  }, [handleFormatCode]);

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

  const scrollToConsole = useCallback(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (typeof window !== "undefined" && consoleRef.current) {
      const rect = consoleRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 60) {
        window.scrollBy({ top: rect.bottom - window.innerHeight + 100, behavior: "smooth" });
      }
    }
  }, []);

  const handleTabClick = (tab: "testcases" | "hiddentestcases" | "customtest" | "testresult") => {
    setActiveTab(tab);
    setShowConsole(true);
    setTimeout(() => {
      scrollToConsole();
      if (consoleContentRef.current) {
        consoleContentRef.current.scrollTop = 0;
      }
    }, 80);
  };

  const handleConsoleToggle = () => {
    const nextState = !showConsole;
    setShowConsole(nextState);
    if (nextState) {
      setTimeout(() => {
        scrollToConsole();
      }, 80);
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
        scrollToConsole();
        if (consoleContentRef.current) {
          consoleContentRef.current.scrollTop = 0;
        }
      }, 80);
    }
  }, [submissionResult, scrollToConsole]);

  const allowedLanguages = useMemo(() => {
    if (problem?.templates && Object.keys(problem.templates).length > 0) {
      return Object.keys(problem.templates) as CodingLanguage[];
    }
    return [defaultLanguage] as CodingLanguage[];
  }, [problem, defaultLanguage]);

  useEffect(() => {
    if (!problem) return;

    const targetLang = allowedLanguages.includes(language)
      ? language
      : (allowedLanguages[0] || defaultLanguage || "python");

    const isProblemChange = problem.id !== lastProblemIdRef.current;
    const isLangChange = targetLang !== lastLangRef.current;

    if (isProblemChange || isLangChange) {
      lastProblemIdRef.current = problem.id;
      lastLangRef.current = targetLang;
      hasUserEditedRef.current = false;

      if (targetLang !== language) {
        setLanguage(targetLang);
      }

      const localKey = problem.id ? `edunexus_draft_${problem.id}_${targetLang}` : null;
      const savedDraft = (localKey && typeof window !== "undefined") ? localStorage.getItem(localKey) : null;
      const initialCode = savedDraft !== null
        ? savedDraft
        : (isProblemChange && defaultCode !== undefined ? defaultCode : (problem.templates?.[targetLang] || ""));

      setCode(initialCode);
      if (problem.sample_input !== undefined) {
        setStdin(problem.sample_input);
      }
      setOutput(null);
      setMultiOutput(null);

      // If no local draft exists, fetch cloud draft from database
      if (!savedDraft && problem.id) {
        const fetchProblemId = problem.id;
        fetch(`/api/student/drafts?problem_id=${fetchProblemId}&language=${targetLang}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (
              data?.draft?.code &&
              lastProblemIdRef.current === fetchProblemId &&
              lastLangRef.current === targetLang &&
              !hasUserEditedRef.current
            ) {
              setCode(data.draft.code);
              onCodeChange?.(data.draft.code, targetLang);
              if (localKey) {
                try {
                  localStorage.setItem(localKey, data.draft.code);
                } catch {}
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [problem?.id, allowedLanguages, defaultLanguage]);

  // Auto-save draft locally and to cloud database (debounced)
  useEffect(() => {
    if (problem?.id && code !== undefined) {
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
    lastLangRef.current = newLang;
    hasUserEditedRef.current = false;

    const localKey = problem?.id ? `edunexus_draft_${problem.id}_${newLang}` : null;
    const savedDraft = (localKey && typeof window !== "undefined") ? localStorage.getItem(localKey) : null;
    const template = problem?.templates?.[newLang] || "";
    const newCode = savedDraft !== null ? savedDraft : template;
    setCode(newCode);
    onCodeChange?.(newCode, newLang);
    if (problem?.sample_input !== undefined) {
      setStdin(problem.sample_input);
    }
    setOutput(null);
    setMultiOutput(null);

    if (!savedDraft && problem?.id) {
      const fetchProblemId = problem.id;
      fetch(`/api/student/drafts?problem_id=${fetchProblemId}&language=${newLang}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (
            data?.draft?.code &&
            lastProblemIdRef.current === fetchProblemId &&
            lastLangRef.current === newLang &&
            !hasUserEditedRef.current
          ) {
            setCode(data.draft.code);
            onCodeChange?.(data.draft.code, newLang);
            if (localKey) {
              try {
                localStorage.setItem(localKey, data.draft.code);
              } catch {}
            }
          }
        })
        .catch(() => {});
    }
  }, [problem, onCodeChange]);

  const handleRun = async () => {
    if (!code.trim()) {
      toast({ title: "Empty code", description: "Please write some code first", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setOutput(null);
    setMultiOutput(null);
    setShowConsole(true);
    const targetTab = activeTab === "customtest" ? "customtest" : "testcases";
    setActiveTab(targetTab);

    // Immediately scroll down to the Console panel
    setTimeout(() => {
      scrollToConsole();
    }, 80);

    try {
      if (targetTab === "customtest") {
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

        // Auto-select first failing test case if any, otherwise first testcase
        if (result?.results && Array.isArray(result.results)) {
          const firstFail = result.results.findIndex((r: any) => !r.passed);
          if (firstFail >= 0) {
            setSelectedTestCaseIdx(firstFail);
          }
        }
      }
      setShowConsole(true);
      setActiveTab(targetTab);
      setTimeout(() => {
        scrollToConsole();
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
          scrollToConsole();
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
    hasUserEditedRef.current = false;
    setCode(template);
    onCodeChange?.(template, language);
    if (problem?.id) {
      const localKey = `edunexus_draft_${problem.id}_${language}`;
      try {
        localStorage.removeItem(localKey);
      } catch {}
    }
    setOutput(null);
    setMultiOutput(null);
    toast({ title: "Reset Complete", description: "Restored starter code template." });
  };

  const isFillMode = height === "100%";

  return (
    <div
      className={cn(
        "flex flex-col bg-white dark:bg-[#141417] w-full h-full overflow-hidden transition-all duration-200 border border-gray-200 dark:border-zinc-800",
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen rounded-none border-0 shadow-2xl p-0 m-0"
          : !isFillMode && "rounded-xl shadow-xs"
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
        
        {/* Modern MNC-Style Editor Header & Toolbar */}
        <div className="flex items-center justify-between px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-[#F8FAFC] dark:bg-[#18181C] border-b border-gray-200 dark:border-zinc-800 shrink-0 select-none gap-1.5 sm:gap-2">
           <div className="text-xs font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
             {showQuestionToggle && onToggleQuestion && (
               <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600 p-0 shrink-0" onClick={onToggleQuestion} title="Show Question Statement">
                 <PanelLeftOpen className="h-4 w-4" />
               </Button>
             )}
             <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-600 dark:bg-blue-500 shadow-xs animate-pulse shrink-0"></span>
             <span className="font-semibold tracking-tight text-gray-900 dark:text-gray-100 hidden md:inline shrink-0">Code Editor</span>
             {isFullscreen && (
               <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/30 shrink-0 hidden sm:inline-flex">
                 FULLSCREEN (ESC)
               </Badge>
             )}
           </div>
           
           <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 max-w-full">
             {/* Language Selector */}
             {allowedLanguages.length > 1 ? (
               <Select value={language} onValueChange={(v) => { if (v) handleLanguageChange(v as CodingLanguage); }}>
                 <SelectTrigger className="h-7 sm:h-7.5 w-[105px] xs:w-[115px] sm:w-[130px] md:w-[145px] text-xs font-medium border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 shadow-2xs rounded-lg truncate shrink-0">
                   <SelectValue className="truncate whitespace-nowrap" />
                 </SelectTrigger>
                 <SelectContent>
                    {allowedLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang} className="text-xs font-medium whitespace-nowrap">
                        {dbLanguages.find(l => l.id === lang)?.name || LANGUAGE_DISPLAY_NAMES[lang as CodingLanguage] || lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-7 sm:h-7.5 px-2 sm:px-3 flex items-center justify-center text-xs border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-lg font-medium shadow-2xs whitespace-nowrap truncate max-w-[125px] shrink-0">
                  {dbLanguages.find(l => l.id === language)?.name || LANGUAGE_DISPLAY_NAMES[language as CodingLanguage] || language}
                </div>
              )}

              {language === "sql" && (
                <Badge variant="outline" className="h-7 sm:h-7.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1 shrink-0">
                  <span>DB:</span>
                  <span className="uppercase">{(problem?.sql_engine || "sqlite")}</span>
                </Badge>
              )}

             {/* Theme Toggle (Desktop/Tablet) */}
             <Button
               variant="ghost"
               size="icon"
               className="h-7 sm:h-7.5 w-7 sm:w-7.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg shrink-0 hidden md:inline-flex"
               onClick={() => setEditorTheme((t) => (t === "lms-light" ? "lms-dark" : "lms-light"))}
               title={editorTheme === "lms-light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
             >
               {editorTheme === "lms-light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
             </Button>

             {/* Reset Code (Desktop/Tablet) */}
             <Button
               variant="ghost"
               size="icon"
               className="h-7 sm:h-7.5 w-7 sm:w-7.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg shrink-0 hidden md:inline-flex"
               onClick={handleReset}
               title="Reset to starter template"
             >
               <RotateCcw className="h-3.5 w-3.5" />
             </Button>

             {/* Fullscreen Toggle (Desktop/Tablet) */}
             <Button
               variant="ghost"
               size="icon"
               className={cn(
                 "h-7 sm:h-7.5 w-7 sm:w-7.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg transition-colors shrink-0 hidden md:inline-flex",
                 isFullscreen && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50"
               )}
               onClick={toggleFullscreen}
               title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Code Editor"}
             >
               {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
             </Button>

             {/* Mobile More Options Dropdown */}
             <div className="md:hidden">
               <DropdownMenu>
                 <DropdownMenuTrigger className="h-7 w-7 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg shrink-0 flex items-center justify-center cursor-pointer hover:bg-gray-200/50 dark:hover:bg-zinc-800">
                   <MoreHorizontal className="h-3.5 w-3.5" />
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="w-40">
                   <DropdownMenuItem onClick={() => setEditorTheme((t) => (t === "lms-light" ? "lms-dark" : "lms-light"))} className="text-xs">
                     {editorTheme === "lms-light" ? <Moon className="h-3.5 w-3.5 mr-2 inline" /> : <Sun className="h-3.5 w-3.5 mr-2 inline" />}
                     <span>{editorTheme === "lms-light" ? "Dark Theme" : "Light Theme"}</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={handleReset} className="text-xs">
                     <RotateCcw className="h-3.5 w-3.5 mr-2 inline" />
                     <span>Reset Template</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={handleFormatCode} className="text-xs">
                     <Sparkles className="h-3.5 w-3.5 mr-2 inline" />
                     <span>Format Code</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={toggleFullscreen} className="text-xs">
                     {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 mr-2 inline" /> : <Maximize2 className="h-3.5 w-3.5 mr-2 inline" />}
                     <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>

             {/* Run Code Button (Always visible, shrink-0) */}
             <Button
               size="sm"
               className="h-7 sm:h-7.5 px-2 sm:px-3 text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white gap-1 sm:gap-1.5 rounded-lg shadow-sm shrink-0"
               onClick={() => handleRun()}
               disabled={isRunning || readOnly}
               title="Run Code (Ctrl+Enter)"
             >
               {isRunning ? (
                 <Loader2 className="h-3.5 w-3.5 animate-spin" />
               ) : (
                 <Play className="h-3 w-3 fill-current" />
               )}
               <span>{isRunning ? "..." : "Run"}</span>
             </Button>

             {/* Submit Button (Always visible, shrink-0) */}
             {showSubmit && onSubmit && (
               <Button
                 size="sm"
                 className="h-7 sm:h-7.5 px-2.5 sm:px-3.5 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1 sm:gap-1.5 rounded-lg shadow-sm shrink-0"
                 onClick={() => handleSubmit()}
                 disabled={isSubmitting || readOnly}
                 title="Submit Solution (Ctrl+Shift+Enter)"
               >
                 {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                 <span>{isSubmitting ? "..." : "Submit"}</span>
               </Button>
             )}

             {showNavigatorToggle && onToggleNavigator && (
                <Button variant="ghost" size="icon" className="h-7 sm:h-7.5 w-7 sm:w-7.5 text-gray-400 hover:text-blue-600 rounded-lg shrink-0" onClick={onToggleNavigator} title="Show Question Navigator">
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
              )}
           </div>
        </div>

        {/* Monaco Editor Body */}
        <div ref={editorContainerRef} className="flex-1 min-h-0 min-w-0 w-full h-full relative overflow-hidden bg-white dark:bg-[#141417]">
          {language === "html" || language === "css" || language === "react" ? (
            <div className="grid grid-cols-2 h-full">
              <div className="h-full border-r border-gray-200 dark:border-zinc-800">
                {useFallbackTextarea ? (
                  <textarea
                    value={code}
                    readOnly={readOnly}
                    onSelect={handleTextareaSelect}
                    onChange={(e) => {
                      handleCodeChangeInternal(e.target.value);
                      handleTextareaSelect(e);
                    }}
                    className="w-full h-full font-mono text-sm p-4 resize-none focus:outline-none bg-white dark:bg-[#141417] text-gray-800 dark:text-zinc-200"
                    placeholder="Write your code here..."
                  />
                ) : (
                  <MonacoErrorBoundary fallback={
                    <textarea
                      value={code}
                      onSelect={handleTextareaSelect}
                      onChange={(e) => {
                        handleCodeChangeInternal(e.target.value);
                        handleTextareaSelect(e);
                      }}
                      className="w-full h-full font-mono text-sm p-4 resize-none bg-white dark:bg-[#141417]"
                    />
                  }>
                    <MonacoEditor
                      language={language === "react" ? "typescript" : language}
                      value={code}
                      onChange={(v) => handleCodeChangeInternal(v ?? "")}
                      theme={editorTheme}
                      beforeMount={(monaco) => registerMonacoCompletions(monaco)}
                      onMount={handleEditorMount}
                      height="100%"
                      options={{
                        fixedOverflowWidgets: true,
                        fontSize,
                        lineHeight: Math.round(fontSize * 1.6),
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, Monaco, monospace",
                        fontLigatures: true,
                        minimap: { enabled: showMinimap, scale: 1, renderCharacters: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        lineNumbersMinChars: 3,
                        lineDecorationsWidth: 8,
                        glyphMargin: false,
                        folding: true,
                        foldingHighlight: true,
                        foldingStrategy: "auto",
                        showFoldingControls: "mouseover",
                        renderLineHighlight: "all",
                        renderLineHighlightOnlyWhenFocus: false,
                        tabSize,
                        insertSpaces: true,
                        detectIndentation: false,
                        autoClosingBrackets: "always",
                        autoClosingQuotes: "always",
                        autoClosingOvertype: "always",
                        autoSurround: "languageDefined",
                        readOnly,
                        wordWrap,
                        automaticLayout: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        cursorWidth: 2,
                        smoothScrolling: true,
                        bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
                        guides: {
                          indentation: true,
                          bracketPairs: true,
                          bracketPairsHorizontal: true,
                          highlightActiveIndentation: true,
                          highlightActiveBracketPair: true
                        },
                        matchBrackets: "always",
                        padding: { top: 14, bottom: 14 },
                        suggestFontSize: 13,
                        suggestLineHeight: 22,
                        quickSuggestions: { other: true, comments: true, strings: true },
                        quickSuggestionsDelay: 80,
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: "smart",
                        tabCompletion: "on",
                        wordBasedSuggestions: "allDocuments",
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
                handleCodeChangeInternal(e.target.value);
                handleTextareaSelect(e);
              }}
              className="w-full h-full font-mono text-sm p-4 resize-none focus:outline-none bg-white dark:bg-[#141417] text-gray-800 dark:text-zinc-200"
              placeholder="Write your code here..."
            />
          ) : (
            <MonacoErrorBoundary fallback={
              <textarea
                value={code}
                onSelect={handleTextareaSelect}
                onChange={(e) => {
                  handleCodeChangeInternal(e.target.value);
                  handleTextareaSelect(e);
                }}
                className="w-full h-full font-mono text-sm p-4 resize-none bg-white dark:bg-[#141417]"
              />
            }>
              <MonacoEditor
                language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
                value={code}
                onChange={(v) => handleCodeChangeInternal(v ?? "")}
                theme={editorTheme}
                beforeMount={(monaco) => registerMonacoCompletions(monaco)}
                onMount={handleEditorMount}
                height="100%"
                options={{
                  fixedOverflowWidgets: true,
                  fontSize,
                  lineHeight: Math.round(fontSize * 1.6),
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, Monaco, monospace",
                  fontLigatures: true,
                  minimap: { enabled: showMinimap, scale: 1, renderCharacters: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  lineNumbersMinChars: 3,
                  lineDecorationsWidth: 8,
                  glyphMargin: false,
                  folding: true,
                  foldingHighlight: true,
                  foldingStrategy: "auto",
                  showFoldingControls: "mouseover",
                  renderLineHighlight: "all",
                  renderLineHighlightOnlyWhenFocus: false,
                  tabSize,
                  insertSpaces: true,
                  detectIndentation: false,
                  autoClosingBrackets: "always",
                  autoClosingQuotes: "always",
                  autoClosingOvertype: "always",
                  autoSurround: "languageDefined",
                  readOnly,
                  wordWrap,
                  automaticLayout: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  cursorWidth: 2,
                  smoothScrolling: true,
                  bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
                  guides: {
                    indentation: true,
                    bracketPairs: true,
                    bracketPairsHorizontal: true,
                    highlightActiveIndentation: true,
                    highlightActiveBracketPair: true
                  },
                  matchBrackets: "always",
                  padding: { top: 14, bottom: 14 },
                  suggestFontSize: 13,
                  suggestLineHeight: 22,
                  quickSuggestions: { other: true, comments: true, strings: true },
                  quickSuggestionsDelay: 80,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "smart",
                  tabCompletion: "on",
                  wordBasedSuggestions: "allDocuments",
                }}
              />
            </MonacoErrorBoundary>
          )}
        </div>

        {/* ── Editor Status Bar ── */}
        <div className="h-7 px-3.5 bg-[#F8FAFC] dark:bg-[#18181C] border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs select-none shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-600 dark:text-zinc-400 text-[11px] font-medium tracking-tight">
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
                {LANGUAGE_DISPLAY_NAMES[language as CodingLanguage] || dbLanguages.find(l => l.id === language)?.name || (language ? String(language).toUpperCase() : "Code")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-slate-500 dark:text-zinc-400 text-[11px]">
            <span>UTF-8</span>
            <span>Spaces: {tabSize}</span>
            <span>{fontSize}px</span>
          </div>
        </div>
      </div>

      {/* ── Middle Divider / Action Bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#18181C] border-t border-b border-gray-200 dark:border-zinc-800 shrink-0 select-none">
        {/* Tabs for Bottom Pane */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={handleConsoleToggle}
            className="px-2.5 py-1 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-zinc-200 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0 rounded-md hover:bg-gray-200/60 dark:hover:bg-zinc-800"
          >
            <span>Console</span>
            {showConsole ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          
          <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-1 shrink-0" />

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
                  "px-3 py-1 text-xs font-medium transition-all whitespace-nowrap shrink-0 rounded-lg flex items-center gap-1.5",
                  showConsole && activeTab === tab.id
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-zinc-700 font-bold"
                    : "bg-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                )}
              >
                {isHidden && <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400 inline-block" />}
                <span>{tab.label}</span>
                {isHidden && hiddenCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-full">
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
        <div ref={consoleRef} className="flex flex-col flex-[2] min-h-[160px] bg-white dark:bg-[#141417] overflow-hidden relative">
        
        {/* Tab 1: Sample Test Cases */}
        {activeTab === "testcases" && (
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#141417]">
            {isRunning && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-xs font-semibold animate-pulse mb-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Running code against test cases...</span>
              </div>
            )}
            {problem?.test_cases?.filter((tc) => !tc.is_hidden).length ? (
              <div className="space-y-3.5">
                {/* Test case tabs (Case 1, Case 2...) */}
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2.5 overflow-x-auto">
                  {problem.test_cases.filter((tc) => !tc.is_hidden).map((tc, idx) => {
                    const res = multiOutput?.results?.find(r => r.test_case_id === tc.id);
                    return (
                      <button
                        key={tc.id || idx}
                        onClick={() => setSelectedTestCaseIdx(idx)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0",
                          selectedTestCaseIdx === idx
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold shadow-2xs"
                            : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900"
                        )}
                      >
                        <span>Case {idx + 1}</span>
                        {res && (
                          <span className={cn("w-2 h-2 rounded-full", res.passed ? "bg-green-500" : "bg-red-500")} />
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
                          <Badge className={cn("text-xs font-bold px-2.5 py-0.5", currentResult.passed ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-300 dark:border-green-800" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300 dark:border-red-800")}>
                            {currentResult.passed ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600 dark:text-green-400 inline" /> : <XCircle className="w-3.5 h-3.5 mr-1 text-red-600 dark:text-red-400 inline" />}
                            {currentResult.passed ? "Passed" : "Failed"}
                          </Badge>
                          {currentResult.time_seconds != null && (
                            <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {currentResult.time_seconds}s
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Input:</span>
                        <pre className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-gray-800 dark:text-zinc-200 whitespace-pre-wrap">{currentTc.input || "—"}</pre>
                      </div>

                      {currentResult && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Your Output:</span>
                          <pre className={cn("p-3 border rounded-lg font-mono text-xs whitespace-pre-wrap", currentResult.passed ? "bg-green-50/40 dark:bg-green-950/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900" : "bg-red-50/40 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900")}>
                            {currentResult.actual_output || currentResult.error || "—"}
                          </pre>
                        </div>
                      )}

                      {currentTc.expected_output && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Expected Output:</span>
                          <pre className="p-3 bg-green-50/30 dark:bg-green-950/20 border border-green-200 dark:border-green-900/60 rounded-lg font-mono text-xs text-green-800 dark:text-green-300 whitespace-pre-wrap">{currentTc.expected_output}</pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : output ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs font-bold", output.status.id === 3 ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300")}>
                    {output.status.description.toUpperCase()}
                  </Badge>
                  {output.time && (
                    <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {output.time}s
                    </span>
                  )}
                </div>
                <pre className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-gray-800 dark:text-zinc-200 whitespace-pre-wrap">
                  {output.stdout || output.stderr || output.compile_output || "Execution completed"}
                </pre>
              </div>
            ) : isRunning ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 text-blue-600 dark:text-blue-400 text-sm gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-xs font-semibold">Executing code...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 text-gray-400 text-sm gap-1.5">
                <Terminal className="h-6 w-6 text-gray-400" />
                <p className="text-xs">Click <strong className="text-gray-700 dark:text-zinc-300">Run Code (Ctrl+Enter)</strong> to execute and view sample test results.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Hidden Test Cases */}
        {activeTab === "hiddentestcases" && (
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#141417]">
            {submissionResult?.results ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Hidden Test Cases Evaluation
                  </span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {submissionResult.results.filter(r => r.passed).length} / {submissionResult.results.length} Passed
                  </Badge>
                </div>

                <div className="space-y-2">
                  {submissionResult.results.map((r, i) => {
                    const tc = problem?.test_cases?.find(t => t.id === r.test_case_id);
                    const isHidden = !tc || tc.is_hidden;
                    return (
                      <div key={r.test_case_id || i} className={cn("p-2.5 rounded-lg border flex items-center justify-between text-xs", r.passed ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300" : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300")}>
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
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-200 mb-1">
                    Hidden Test Cases ({problem?.test_cases?.filter(t => t.is_hidden).length || "Locked"})
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                    Hidden test cases verify edge cases and scale limits. Click <strong className="text-blue-600 dark:text-blue-400">Submit (Ctrl+Shift+Enter)</strong> to evaluate your solution.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Custom Testcase */}
        {activeTab === "customtest" && (
          <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#141417]">
            <div className="p-4 flex-1 flex flex-col min-h-0">
               <div className="flex items-center justify-between mb-1.5 shrink-0">
                 <label className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                   Custom Input (stdin)
                 </label>
                 <span className="text-xs text-gray-400">Click &quot;Run Code&quot; to test with this input</span>
               </div>
               <Textarea
                 placeholder={"Enter custom input values here...\nExample:\n5\n1 2 3 4 5"}
                 value={stdin}
                 onChange={(e) => setStdin(e.target.value)}
                 className="flex-1 resize-none font-mono text-xs bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 focus:ring-blue-500 min-h-[100px] rounded-lg"
               />
            </div>
          </div>
        )}

        {/* Tab 4: Test Result */}
        {activeTab === "testresult" && (
          <div ref={consoleContentRef} className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#141417]">
            {submissionResult ? (
              <div className="space-y-4">
                 <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 border",
                        submissionResult.status === "accepted"
                          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-300 dark:border-green-800"
                          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300 dark:border-red-800"
                      )}
                    >
                      {submissionResult.status === "accepted" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600 dark:text-green-400 inline" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 mr-1.5 text-red-600 dark:text-red-400 inline" />
                      )}
                      {submissionResult.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                      Passed: {submissionResult.passed_test_cases}/{submissionResult.total_test_cases}
                    </span>
                    {submissionResult.execution_time != null && (
                      <span className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5" /> {submissionResult.execution_time.toFixed(2)}s
                      </span>
                    )}
                 </div>
                 {submissionResult.results && (
                    <div className="space-y-2">
                      {submissionResult.results.map((r, i) => {
                        const tc = problem?.test_cases?.find(t => t.id === r.test_case_id);
                        const isHidden = !tc || tc.is_hidden;
                        return (
                          <details key={r.test_case_id || i} className="rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden shrink-0 group">
                            <summary className={cn(
                              "px-3.5 py-2.5 text-xs font-bold border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden",
                              r.passed ? "bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300 hover:bg-green-100" : "bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100"
                            )}>
                              <span className="flex items-center gap-2">
                                {isHidden && <Lock className="w-3.5 h-3.5 text-blue-500 inline shrink-0" />}
                                <span>Test Case {i + 1} {isHidden ? "(Hidden)" : ""}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                {r.time_seconds != null && (
                                  <span className="text-[11px] font-mono opacity-80">{r.time_seconds}s</span>
                                )}
                                <span className={cn("px-2 py-0.5 rounded text-[11px] font-bold", r.passed ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
                                  {r.passed ? "Passed" : "Failed"}
                                </span>
                              </div>
                            </summary>
                            
                            <div className="p-3.5 bg-white dark:bg-[#141417] space-y-2.5">
                              {isHidden && problem?.reveal_hidden_testcases === false ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("text-[11px] font-bold px-2 py-0.5", r.passed ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-300 dark:border-green-800" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800")}>
                                      {r.passed ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : <XCircle className="w-3 h-3 mr-1 inline" />}
                                      {r.passed ? "Hidden Test Case Passed" : "Hidden Test Case Failed"}
                                    </Badge>
                                    {r.time_seconds != null && (
                                      <span className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {r.time_seconds}s
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                                    {r.passed
                                      ? "This hidden test case evaluated successfully against scale, constraints, and boundary edge values."
                                      : (r.error || "The program's output did not match the hidden expected answer.")
                                    }
                                  </p>
                                  {r.error && (
                                    <pre className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-mono whitespace-pre-wrap border border-red-200 dark:border-red-900">
                                      {r.error}
                                    </pre>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {(tc?.input || r.input) && (
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                                        Input {isHidden && "(Hidden Case)"}:
                                      </p>
                                      <pre className="p-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-gray-800 dark:text-zinc-200 whitespace-pre-wrap max-h-28 overflow-y-auto">{tc?.input || r.input || "—"}</pre>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">{r.passed ? "Your Output:" : "Error / Your Output:"}</p>
                                    <pre className={cn("p-2.5 rounded-lg border text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto", r.passed ? "bg-green-50/40 dark:bg-green-950/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900" : "bg-red-50/40 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900")}>
                                      {r.error || (r.actual_output && r.actual_output !== "Match" && !r.actual_output.includes("Mismatch (Hidden") ? r.actual_output : (tc?.expected_output || r.expected_output)) || "Execution completed"}
                                    </pre>
                                  </div>
                                  {(tc?.expected_output || r.expected_output) && (
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">Expected Output:</p>
                                      <pre className="p-2.5 bg-green-50/30 dark:bg-green-950/20 border border-green-200 dark:border-green-900/60 rounded-lg text-xs font-mono text-green-800 dark:text-green-300 whitespace-pre-wrap max-h-28 overflow-y-auto">{(r.expected_output && r.expected_output !== "Hidden" ? r.expected_output : tc?.expected_output) || "—"}</pre>
                                    </div>
                                  )}
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
                  <Badge className={cn("text-xs font-bold", output.status.id === 3 ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300")}>
                    {output.status.description.toUpperCase()}
                  </Badge>
                </div>
                <pre className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg font-mono text-xs text-gray-800 dark:text-zinc-200 whitespace-pre-wrap">
                  {output.stdout || output.stderr || output.compile_output || "Execution completed"}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 text-gray-400 text-sm gap-1.5">
                <CheckCircle2 className="h-6 w-6 text-gray-400" />
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
