"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Code2,
  ClipboardList,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Terminal,
  FileCode,
  Save,
  Eye,
  ArrowLeft,
  Layers,
  Check,
  X,
  HelpCircle,
  Clock,
  Send,
  FileText,
  Lock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn, getErrorMessage } from "@/lib/utils";
import { formatSourceCode } from "@/lib/compiler/code-formatter";
import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";
import type { ScheduledTest, TestQuestion } from "@/components/admin/proctored-test-hub";

// Dynamic Monaco editor to prevent SSR mismatch
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#18181B] text-slate-400 text-xs font-mono">
      Loading code editor...
    </div>
  ),
});

export const SUPPORTED_LANGUAGES = [
  { id: "java", name: "Java", monaco: "java" },
  { id: "python", name: "Python", monaco: "python" },
  { id: "cpp", name: "C++", monaco: "cpp" },
  { id: "c", name: "C", monaco: "c" },
  { id: "javascript", name: "JavaScript", monaco: "javascript" },
  { id: "typescript", name: "TypeScript", monaco: "typescript" },
  { id: "csharp", name: "C#", monaco: "csharp" },
  { id: "sql", name: "SQL", monaco: "sql" },
  { id: "go", name: "Go", monaco: "go" },
  { id: "rust", name: "Rust", monaco: "rust" },
];

const DEFAULT_STARTER_CODES: Record<string, string> = {
  java: `public class Main {
    public static void main(String[] args) {
        // Write your solution here
    }
}`,
  python: `# Write your solution here
def main():
    pass

if __name__ == "__main__":
    main()`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here
    return 0;
}`,
  c: `#include <stdio.h>

int main() {
    // Write your solution here
    return 0;
}`,
  javascript: `// Write your solution here
function main() {
}

main();`,
  typescript: `// Write your solution here
function main(): void {
}

main();`,
  csharp: `using System;

public class Program {
    public static void Main(string[] args) {
        // Write your solution here
    }
}`,
  sql: `-- Write your SQL query here
SELECT * FROM table_name;`,
};

interface AssessmentQuestionEditorProps {
  test: ScheduledTest;
  onSave: (updatedTest: ScheduledTest) => Promise<void>;
  onBack: () => void;
  role?: "admin" | "trainer";
}

export function AssessmentQuestionEditor({
  test,
  onSave,
  onBack,
  role = "admin",
}: AssessmentQuestionEditorProps) {
  const { toast } = useToast();

  // Questions state loaded from database test
  const [questions, setQuestions] = useState<TestQuestion[]>(() => {
    if (test.questions && test.questions.length > 0) {
      return test.questions.map((q, idx) => ({
        ...q,
        id: q.id || `q_${Date.now()}_${idx}`,
        title: q.title || `Question ${idx + 1}`,
        type: q.type || "coding",
        marks: q.marks || 10,
        section: q.section || (q.type === "coding" ? "Coding Challenges" : "Multiple Choice"),
        difficulty: q.difficulty || "medium",
        language: q.language || (typeof q.starterCode === "object" ? Object.keys(q.starterCode)[0] : "java"),
        problemStatement: q.problemStatement || q.description || "",
        inputFormat: q.inputFormat || "",
        outputFormat: q.outputFormat || "",
        constraints: q.constraints || "",
        explanation: q.explanation || "",
        options: q.options && q.options.length > 0 ? q.options : [
          { id: 1, text: "Option A", isCorrect: true },
          { id: 2, text: "Option B", isCorrect: false },
          { id: 3, text: "Option C", isCorrect: false },
          { id: 4, text: "Option D", isCorrect: false },
        ],
        testCases: q.testCases && q.testCases.length > 0 ? q.testCases.map((tc, tcIdx) => ({
          ...tc,
          id: typeof tc.id === "number" ? tc.id : tcIdx + 1,
          output: tc.output || (tc as any).expected_output || (tc as any).expectedOutput || "",
          isHidden: Boolean(tc.isHidden || (tc as any).is_hidden),
        })) : [
          { id: 1, input: "1", output: "1", isHidden: false },
          { id: 2, input: "2", output: "2", isHidden: true },
        ],
      }));
    }
    return [];
  });

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeCodeTab, setActiveCodeTab] = useState<"starter" | "solution">("starter");
  const [activeConsoleTab, setActiveConsoleTab] = useState<
    "console" | "testcases" | "hiddentestcases" | "customtest" | "testresult"
  >("testcases");

  const [customInput, setCustomInput] = useState<string>("");
  const [consoleOutput, setConsoleOutput] = useState<{
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    error?: string | null;
    time?: string;
    memory?: number;
    status?: { description: string; id: number };
  } | null>(null);

  const [testCaseResults, setTestCaseResults] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showStudentPreview, setShowStudentPreview] = useState<boolean>(false);

  const monacoRef = useRef<any>(null);

  // Active question reference
  const currentQ: TestQuestion | undefined = questions[activeIndex];

  // Helper to get starter code string for current question and language
  const getStarterCodeString = useCallback(
    (q?: TestQuestion, lang?: string): string => {
      if (!q) return "";
      const currentLang = lang || q.language || "java";
      if (typeof q.starterCode === "string") return q.starterCode;
      if (q.starterCode && typeof q.starterCode === "object" && q.starterCode[currentLang]) {
        return q.starterCode[currentLang];
      }
      return DEFAULT_STARTER_CODES[currentLang] || "// Write your code here\n";
    },
    []
  );

  // Helper to get reference solution code string
  const getReferenceCodeString = useCallback(
    (q?: TestQuestion, lang?: string): string => {
      if (!q) return "";
      const currentLang = lang || q.language || "java";
      if (typeof q.referenceCode === "string") return q.referenceCode;
      if (q.referenceCode && typeof q.referenceCode === "object" && q.referenceCode[currentLang]) {
        return q.referenceCode[currentLang];
      }
      return "";
    },
    []
  );

  // Update active question field
  const updateCurrentQuestion = useCallback(
    (updater: Partial<TestQuestion> | ((prev: TestQuestion) => TestQuestion)) => {
      setQuestions((prevList) => {
        if (!prevList[activeIndex]) return prevList;
        const target = prevList[activeIndex];
        const updated = typeof updater === "function" ? updater(target) : { ...target, ...updater };
        const copy = [...prevList];
        copy[activeIndex] = updated;
        return copy;
      });
    },
    [activeIndex]
  );

  // Add a brand new question
  const handleAddNewQuestion = (type: "coding" | "mcq" = "coding") => {
    const newIdx = questions.length + 1;
    const newQ: TestQuestion = {
      id: `q_${Date.now()}_${newIdx}`,
      title: type === "coding" ? `Coding Problem ${newIdx}` : `Question ${newIdx}`,
      type: type,
      marks: type === "coding" ? 10 : 2,
      section: type === "coding" ? "Coding Challenges" : "Multiple Choice",
      difficulty: "medium",
      language: "java",
      problemStatement: "",
      inputFormat: "",
      outputFormat: "",
      constraints: "",
      explanation: "",
      starterCode: { java: DEFAULT_STARTER_CODES.java || "// Java" },
      referenceCode: { java: "" },
      options: [
        { id: 1, text: "Option A", isCorrect: true },
        { id: 2, text: "Option B", isCorrect: false },
        { id: 3, text: "Option C", isCorrect: false },
        { id: 4, text: "Option D", isCorrect: false },
      ],
      testCases: [
        { id: 1, input: "1", output: "1", isHidden: false },
        { id: 2, input: "2", output: "2", isHidden: true },
      ],
    };

    setQuestions((prev) => [...prev, newQ]);
    setActiveIndex(questions.length);
    toast({ title: "Question Added", description: `Created Question #${newIdx}` });
  };

  // Duplicate current question
  const handleDuplicateQuestion = () => {
    if (!currentQ) return;
    const dup: TestQuestion = {
      ...currentQ,
      id: `q_${Date.now()}_dup`,
      title: `${currentQ.title} (Copy)`,
      options: currentQ.options ? currentQ.options.map((o) => ({ ...o })) : undefined,
      testCases: currentQ.testCases ? currentQ.testCases.map((t) => ({ ...t })) : undefined,
    };
    setQuestions((prev) => {
      const copy = [...prev];
      copy.splice(activeIndex + 1, 0, dup);
      return copy;
    });
    setActiveIndex(activeIndex + 1);
    toast({ title: "Question Cloned", description: `Duplicated into question #${activeIndex + 2}` });
  };

  // Delete current question
  const handleDeleteQuestion = () => {
    if (questions.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "The assessment must contain at least one question.",
        variant: "destructive",
      });
      return;
    }
    const qToDelete = currentQ?.title || `Question #${activeIndex + 1}`;
    setQuestions((prev) => prev.filter((_, idx) => idx !== activeIndex));
    setActiveIndex((prev) => Math.max(0, prev - 1));
    toast({ title: "Question Removed", description: `Deleted ${qToDelete}` });
  };

  // Reorder question up
  const handleMoveQuestionUp = () => {
    if (activeIndex <= 0) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const cur = copy[activeIndex];
      const prevItem = copy[activeIndex - 1];
      if (!cur || !prevItem) return prev;
      copy[activeIndex] = prevItem;
      copy[activeIndex - 1] = cur;
      return copy;
    });
    setActiveIndex(activeIndex - 1);
  };

  // Reorder question down
  const handleMoveQuestionDown = () => {
    if (activeIndex >= questions.length - 1) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const cur = copy[activeIndex];
      const nextItem = copy[activeIndex + 1];
      if (!cur || !nextItem) return prev;
      copy[activeIndex] = nextItem;
      copy[activeIndex + 1] = cur;
      return copy;
    });
    setActiveIndex(activeIndex + 1);
  };

  // Save changes to database
  const handleSaveToDatabase = async (publish: boolean = false) => {
    setIsSaving(true);
    try {
      const totalMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
      const updatedTest: ScheduledTest = {
        ...test,
        totalQuestions: questions.length,
        maxMarks: totalMarks,
        questions: questions,
        status: publish ? "live" : test.status,
      };

      await onSave(updatedTest);
      toast({
        title: publish ? "Assessment Published" : "Assessment Saved",
        description: `Successfully saved ${questions.length} questions (${totalMarks} total marks) to the database.`,
      });
    } catch (err) {
      toast({
        title: "Save Failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Format code in active editor
  const handleFormatCode = () => {
    if (!currentQ) return;
    const currentLang = currentQ.language || "java";
    const currentCode =
      activeCodeTab === "starter"
        ? getStarterCodeString(currentQ, currentLang)
        : getReferenceCodeString(currentQ, currentLang);

    const formatted = formatSourceCode(currentCode, currentLang);
    if (activeCodeTab === "starter") {
      const starterObj = typeof currentQ.starterCode === "object" ? { ...currentQ.starterCode } : {};
      starterObj[currentLang] = formatted;
      updateCurrentQuestion({ starterCode: starterObj });
    } else {
      const refObj = typeof currentQ.referenceCode === "object" ? { ...currentQ.referenceCode } : {};
      refObj[currentLang] = formatted;
      updateCurrentQuestion({ referenceCode: refObj });
    }
    toast({ title: "Code Formatted", description: "Indentation and structure normalized." });
  };

  // Run code against compiler
  const handleRunCompiler = async () => {
    if (!currentQ) return;
    const currentLang = currentQ.language || "java";
    const codeToRun =
      activeCodeTab === "starter"
        ? getStarterCodeString(currentQ, currentLang)
        : getReferenceCodeString(currentQ, currentLang);

    if (!codeToRun.trim()) {
      toast({
        title: "Empty Code",
        description: "Please write or configure code before running.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setConsoleOutput(null);
    setTestCaseResults(null);

    try {
      if (activeConsoleTab === "customtest") {
        // Run with custom input
        const res = await fetch("/api/code/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: currentLang,
            code: codeToRun,
            stdin: customInput,
            input: customInput,
          }),
        });

        const data = await res.json();
        setConsoleOutput(data);
        setActiveConsoleTab("console");
      } else {
        // Run against configured test cases
        const sampleCases = (currentQ.testCases || []).map((tc) => ({
          id: String(tc.id),
          input: tc.input || "",
          expected_output: tc.output || (tc as any).expected_output || "",
          is_hidden: Boolean(tc.isHidden),
        }));

        const res = await fetch("/api/code/run-testcases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem_id: currentQ.id,
            language: currentLang,
            code: codeToRun,
            test_cases: sampleCases,
          }),
        });

        const data = await res.json();
        if (data.results) {
          setTestCaseResults(data.results);
          setActiveConsoleTab("testresult");
        } else {
          setConsoleOutput(data);
          setActiveConsoleTab("console");
        }
      }
    } catch (err) {
      setConsoleOutput({
        error: getErrorMessage(err),
        status: { description: "Execution Error", id: 11 },
      });
      setActiveConsoleTab("console");
    } finally {
      setIsRunning(false);
    }
  };

  // Separate sections for Question Palette
  const mcqQuestions = useMemo(
    () => questions.filter((q) => q.type === "mcq" || q.type === "msq"),
    [questions]
  );
  const codingQuestions = useMemo(
    () => questions.filter((q) => q.type === "coding" || q.type === "both"),
    [questions]
  );

  // Convert current questions into Student PracticeRunner format for interactive preview
  const previewQuestions: PracticeQuestion[] = useMemo(() => {
    return questions.map((q, idx) => {
      const isCoding = q.type === "coding";
      const isMSQ = q.type === "msq";
      const qId = q.id || `q_${idx + 1}`;

      if (isCoding) {
        return {
          id: qId,
          type: "coding",
          title: q.title || `Coding Problem ${idx + 1}`,
          text: q.problemStatement || q.description || "Solve the challenge.",
          marks: Number(q.marks) || 10,
          section: "coding",
          sectionTitle: "Coding Challenges",
          difficulty: q.difficulty || "medium",
          constraints: q.constraints || "",
          inputFormat: q.inputFormat || "",
          outputFormat: q.outputFormat || "",
          explanation: q.explanation || "",
          starterCode:
            typeof q.starterCode === "object"
              ? Object.entries(q.starterCode as Record<string, any>).reduce(
                  (acc, [k, v]) => ({ ...acc, [k]: String(v || "") }),
                  {} as Record<string, string>
                )
              : { [q.language || "java"]: String(q.starterCode || DEFAULT_STARTER_CODES[q.language || "java"] || "") },
          testCases: (q.testCases || []).map((tc, tcIdx) => ({
            id: String(tc.id || tcIdx + 1),
            input: tc.input || "",
            expected_output: tc.output || (tc as any).expected_output || "",
            is_hidden: Boolean(tc.isHidden),
          })),
        };
      } else {
        return {
          id: qId,
          type: isMSQ ? "multiple_choice" : "single_choice",
          title: q.title || `Question ${idx + 1}`,
          text: q.problemStatement || q.description || q.title || "",
          marks: Number(q.marks) || 2,
          section: "mcq",
          sectionTitle: isMSQ ? "Multiple Select (MSQ)" : "Multiple Choice (MCQ)",
          explanation: q.explanation || "",
          options: (q.options || []).map((opt, oIdx) => ({
            id: String(opt.id || oIdx + 1),
            text: opt.text || "",
            isCorrect: Boolean(opt.isCorrect),
          })),
        };
      }
    });
  }, [questions]);

  // Current active language
  const activeLanguage = currentQ?.language || "java";
  const activeMonacoLang =
    SUPPORTED_LANGUAGES.find((l) => l.id === activeLanguage)?.monaco || "java";

  // Filter test cases for tabs
  const publicTestCases = useMemo(
    () => (currentQ?.testCases || []).filter((tc) => !tc.isHidden),
    [currentQ?.testCases]
  );
  const hiddenTestCases = useMemo(
    () => (currentQ?.testCases || []).filter((tc) => tc.isHidden),
    [currentQ?.testCases]
  );

  return (
    <div className="space-y-3 w-full animate-in fade-in duration-300">
      {/* ── Student Preview Modal (100% Exact Student Experience) ── */}
      {showStudentPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col p-2 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 sm:px-6 border-b border-slate-200 dark:border-zinc-800 bg-blue-50/70 dark:bg-blue-950/30">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1">
                  Student Preview Mode
                </Badge>
                <span className="text-xs text-slate-600 dark:text-zinc-400 hidden sm:inline">
                  Interactive simulation using the live student runner engine.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStudentPreview(false)}
                className="h-8 font-bold text-xs border-slate-300 dark:border-zinc-700 gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Exit Preview
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PracticeRunnerEngine
                module={{
                  id: test.id,
                  title: test.title,
                  type: test.allowedQuestionTypes === "coding" ? "coding" : test.allowedQuestionTypes === "mcq" ? "mcq" : "mixed",
                  assignedBy: role === "trainer" ? "Trainer" : "Administrator",
                  durationMinutes: test.duration || 60,
                  totalMarks: test.maxMarks || 100,
                  passingMarks: Math.floor((test.maxMarks || 100) / 2),
                  proctoring: { fullscreenLock: false, copyPasteRestricted: false },
                }}
                questions={previewQuestions}
                onBack={() => setShowStudentPreview(false)}
                onSubmit={async () => {
                  toast({
                    title: "Preview Submission Received",
                    description: "Student submission flow tested successfully.",
                  });
                  setShowStudentPreview(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header (Exact Design Language as Student Assessment Header) ── */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:px-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#2563EB] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                Assessment Editor
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
              >
                {questions.length} {questions.length === 1 ? "Question" : "Questions"}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
              >
                {questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)} Total Marks
              </Badge>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate mt-1">
              {test.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowStudentPreview(true)}
            className="h-9 text-xs font-bold border-blue-200 dark:border-blue-900/50 text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/20 gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" /> Preview as Student
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSaveToDatabase(false)}
            disabled={isSaving}
            className="h-9 text-xs font-bold border-slate-200 dark:border-zinc-700 gap-1.5"
          >
            {isSaving ? "Saving Draft..." : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSaveToDatabase(true)}
            disabled={isSaving}
            className="h-9 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5 shadow-xs"
          >
            {isSaving ? "Publishing..." : (
              <>
                <Check className="h-3.5 w-3.5" />
                Save & Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main 3-Column Workspace (Exact Student Assessment Layout Structure) ── */}
      {questions.length === 0 ? (
        <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-12 text-center rounded-2xl shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] flex items-center justify-center mx-auto">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No questions in this assessment yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start configuring questions by adding your first coding problem or multiple-choice challenge.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => handleAddNewQuestion("coding")}
              className="h-9 text-xs font-bold bg-[#2563EB] text-white gap-1.5"
            >
              <Code2 className="h-4 w-4" /> Add Coding Problem
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAddNewQuestion("mcq")}
              className="h-9 text-xs font-bold border-slate-300 dark:border-zinc-700 gap-1.5"
            >
              <ClipboardList className="h-4 w-4" /> Add MCQ Question
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex items-stretch gap-4 w-full h-[calc(100vh-210px)] min-h-[580px] max-h-[920px] transition-all">
          {/* ════════ COLUMN 1: LEFT PANEL — QUESTION DETAILS ════════ */}
          <div className="w-[320px] xl:w-[360px] 2xl:w-[390px] h-full shrink-0 flex flex-col">
            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden h-full flex flex-col min-w-0">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                      Question {activeIndex + 1} of {questions.length}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full",
                        currentQ?.difficulty === "easy"
                          ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                          : currentQ?.difficulty === "hard"
                          ? "border-rose-500/30 text-rose-600 bg-rose-500/10"
                          : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                      )}
                    >
                      {currentQ?.difficulty || "medium"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border-blue-500/30 text-blue-600 bg-blue-500/10"
                    >
                      +{currentQ?.marks || 10} Marks
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Question Title
                  </label>
                  <Input
                    value={currentQ?.title || ""}
                    onChange={(e) => updateCurrentQuestion({ title: e.target.value })}
                    placeholder="e.g., Two Sum Problem or Array Reversal"
                    className="h-8 text-xs font-bold rounded-lg bg-white dark:bg-zinc-900"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4 text-xs leading-relaxed flex-1 overflow-y-auto min-h-0">
                {/* Question Type, Difficulty & Language Row */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Type
                    </label>
                    <Select
                      value={currentQ?.type || "coding"}
                      onValueChange={(val: any) => val && updateCurrentQuestion({ type: val })}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold bg-white dark:bg-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coding">Coding Challenge</SelectItem>
                        <SelectItem value="mcq">Single Choice (MCQ)</SelectItem>
                        <SelectItem value="msq">Multiple Select (MSQ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Difficulty
                    </label>
                    <Select
                      value={currentQ?.difficulty || "medium"}
                      onValueChange={(val: any) => val && updateCurrentQuestion({ difficulty: val })}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold bg-white dark:bg-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {currentQ?.type === "coding" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Language
                      </label>
                      <Select
                        value={currentQ?.language || "java"}
                        onValueChange={(val: string | null) => val && updateCurrentQuestion({ language: val })}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold bg-white dark:bg-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Marks
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={currentQ?.marks || 10}
                      onChange={(e) => updateCurrentQuestion({ marks: Number(e.target.value) || 1 })}
                      className="h-8 text-xs font-semibold bg-white dark:bg-zinc-800 text-center"
                    />
                  </div>
                </div>

                {/* Problem Statement */}
                <div className="space-y-1.5">
                  <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">
                    Problem Statement
                  </strong>
                  <Textarea
                    value={currentQ?.problemStatement || currentQ?.description || ""}
                    onChange={(e) =>
                      updateCurrentQuestion({
                        problemStatement: e.target.value,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the challenge or question clearly for candidates..."
                    rows={4}
                    className="text-xs resize-y bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 leading-relaxed"
                  />
                </div>

                {/* Coding Details: Input Format, Output Format, Constraints */}
                {currentQ?.type === "coding" && (
                  <>
                    <div className="p-3 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1.5">
                      <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">
                        Input Format:
                      </strong>
                      <Textarea
                        value={currentQ?.inputFormat || ""}
                        onChange={(e) => updateCurrentQuestion({ inputFormat: e.target.value })}
                        placeholder="e.g., The first line contains an integer T..."
                        rows={2}
                        className="text-xs resize-y bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                      />
                    </div>

                    <div className="p-3 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1.5">
                      <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">
                        Output Format:
                      </strong>
                      <Textarea
                        value={currentQ?.outputFormat || ""}
                        onChange={(e) => updateCurrentQuestion({ outputFormat: e.target.value })}
                        placeholder="e.g., Print the maximum sum in a single line..."
                        rows={2}
                        className="text-xs resize-y bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                      />
                    </div>

                    <div className="p-3 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-1.5">
                      <strong className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider block">
                        Constraints:
                      </strong>
                      <Textarea
                        value={currentQ?.constraints || ""}
                        onChange={(e) => updateCurrentQuestion({ constraints: e.target.value })}
                        placeholder="e.g., 1 <= N <= 10^5&#10;1 <= Arr[i] <= 10^9"
                        rows={2}
                        className="text-xs resize-y bg-white dark:bg-zinc-800 font-mono border-slate-200 dark:border-zinc-700"
                      />
                    </div>
                  </>
                )}

                {/* Explanation Section (Visible and Editable) */}
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-1.5">
                  <strong className="text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Explanation / Editorial
                  </strong>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    Displayed to students after submission or in solution reviews.
                  </p>
                  <Textarea
                    value={currentQ?.explanation || ""}
                    onChange={(e) => updateCurrentQuestion({ explanation: e.target.value })}
                    placeholder="Provide a detailed solution walkthrough, algorithmic complexity, or explanation..."
                    rows={3}
                    className="text-xs resize-y bg-white dark:bg-zinc-900 border-amber-200/60 dark:border-amber-900/50 leading-relaxed"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ════════ COLUMN 2: CENTER PANEL — CODE & CONFIGURATION ════════ */}
          <div className="flex-1 min-w-[420px] h-full overflow-hidden flex flex-col">
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] flex flex-col">
              {currentQ?.type === "coding" ? (
                <>
                  {/* Coding Editor Toolbar */}
                  <div className="flex items-center justify-between p-2.5 sm:px-4 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/70 shrink-0 flex-wrap gap-2">
                    {/* Code Tab: Starter Code vs Reference Solution */}
                    <div className="flex items-center bg-white dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setActiveCodeTab("starter")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          activeCodeTab === "starter"
                            ? "bg-[#2563EB] text-white shadow-xs"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        <span>Starter Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCodeTab("solution")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          activeCodeTab === "solution"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                        title="Authorized solution code (Strictly hidden from students)"
                      >
                        <Lock className="h-3.5 w-3.5 text-amber-300" />
                        <span>Reference Solution</span>
                      </button>
                    </div>

                    {/* Language & Actions */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={activeLanguage}
                        onValueChange={(val: string | null) => val && updateCurrentQuestion({ language: val })}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold w-[130px] bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map((l) => (
                            <SelectItem key={l.id} value={l.id} className="text-xs font-semibold">
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleFormatCode}
                        className="h-8 px-2.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 gap-1 rounded-lg"
                        title="Format Code (Shift + Alt + F)"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Format
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleRunCompiler}
                        disabled={isRunning}
                        className="h-8 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg shadow-xs"
                      >
                        {isRunning ? "Running Code..." : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Run Code
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Monaco Editor Canvas */}
                  <div className="flex-1 min-h-[260px] relative overflow-hidden bg-white border-t border-slate-200">
                    <MonacoEditor
                      height="100%"
                      language={activeMonacoLang}
                      theme="vs"
                      value={
                        activeCodeTab === "starter"
                          ? getStarterCodeString(currentQ, activeLanguage)
                          : getReferenceCodeString(currentQ, activeLanguage)
                      }
                      onChange={(val) => {
                        if (!currentQ) return;
                        const nextCode = val || "";
                        if (activeCodeTab === "starter") {
                          const existing =
                            typeof currentQ.starterCode === "object" ? { ...currentQ.starterCode } : {};
                          existing[activeLanguage] = nextCode;
                          updateCurrentQuestion({ starterCode: existing });
                        } else {
                          const existing =
                            typeof currentQ.referenceCode === "object" ? { ...currentQ.referenceCode } : {};
                          existing[activeLanguage] = nextCode;
                          updateCurrentQuestion({ referenceCode: existing });
                        }
                      }}
                      onMount={(editor) => {
                        monacoRef.current = editor;
                      }}
                      options={{
                        fontSize: 14,
                        lineHeight: 24,
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                      }}
                    />
                  </div>

                  {/* ── Center Bottom Panel: Console & Test Case Manager ── */}
                  <div className="h-[230px] border-t border-slate-200/80 dark:border-zinc-800 flex flex-col bg-slate-50/70 dark:bg-zinc-900/60">
                    {/* Console Tabs */}
                    <div className="flex items-center justify-between px-3 border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] shrink-0">
                      <div className="flex items-center gap-1 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("testcases")}
                          className={cn(
                            "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                            activeConsoleTab === "testcases"
                              ? "border-[#2563EB] text-[#2563EB]"
                              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Sample Test Cases</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600">
                            {publicTestCases.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("hiddentestcases")}
                          className={cn(
                            "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                            activeConsoleTab === "hiddentestcases"
                              ? "border-purple-600 text-purple-600"
                              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <Lock className="h-3.5 w-3.5 text-purple-500" />
                          <span>Hidden Test Cases</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                            {hiddenTestCases.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("customtest")}
                          className={cn(
                            "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                            activeConsoleTab === "customtest"
                              ? "border-[#2563EB] text-[#2563EB]"
                              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <Terminal className="h-3.5 w-3.5" />
                          <span>Custom Testcase</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("console")}
                          className={cn(
                            "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                            activeConsoleTab === "console"
                              ? "border-[#2563EB] text-[#2563EB]"
                              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Console</span>
                          {consoleOutput && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("testresult")}
                          className={cn(
                            "px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                            activeConsoleTab === "testresult"
                              ? "border-emerald-600 text-emerald-600"
                              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Test Result</span>
                          {testCaseResults && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold">
                              {testCaseResults.filter((r) => r.passed).length}/{testCaseResults.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Tab Body */}
                    <div className="flex-1 overflow-y-auto p-3 text-xs">
                      {/* 1. Sample Test Cases */}
                      {activeConsoleTab === "testcases" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-zinc-300">
                              Configured Sample (Public) Cases:
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newTc = {
                                  id: Date.now(),
                                  input: "",
                                  output: "",
                                  isHidden: false,
                                };
                                updateCurrentQuestion({
                                  testCases: [...(currentQ?.testCases || []), newTc],
                                });
                              }}
                              className="h-7 text-xs font-bold text-[#2563EB] border-[#2563EB]/40 gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Sample Test Case
                            </Button>
                          </div>

                          {publicTestCases.length === 0 ? (
                            <p className="text-slate-400 text-xs italic">
                              No sample test cases configured. Click &quot;Add Sample Test Case&quot; to define public examples.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {publicTestCases.map((tc, idx) => (
                                <div
                                  key={tc.id}
                                  className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                                      Case {idx + 1}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        updateCurrentQuestion({
                                          testCases: (currentQ?.testCases || []).filter((t) => t.id !== tc.id),
                                        });
                                      }}
                                      className="h-6 px-2 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 block uppercase">
                                      Input:
                                    </label>
                                    <Input
                                      value={tc.input || ""}
                                      onChange={(e) => {
                                        const updatedCases = (currentQ?.testCases || []).map((t) =>
                                          t.id === tc.id ? { ...t, input: e.target.value } : t
                                        );
                                        updateCurrentQuestion({ testCases: updatedCases });
                                      }}
                                      placeholder="Sample Input..."
                                      className="h-7 text-xs font-mono"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 block uppercase">
                                      Expected Output:
                                    </label>
                                    <Input
                                      value={tc.output || (tc as any).expected_output || ""}
                                      onChange={(e) => {
                                        const updatedCases = (currentQ?.testCases || []).map((t) =>
                                          t.id === tc.id ? { ...t, output: e.target.value } : t
                                        );
                                        updateCurrentQuestion({ testCases: updatedCases });
                                      }}
                                      placeholder="Expected Output..."
                                      className="h-7 text-xs font-mono"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Hidden Test Cases */}
                      {activeConsoleTab === "hiddentestcases" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-purple-700 dark:text-purple-300 block">
                                Configured Hidden Test Cases:
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Protected from public student viewing. Evaluated during test submission.
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newTc = {
                                  id: Date.now(),
                                  input: "",
                                  output: "",
                                  isHidden: true,
                                };
                                updateCurrentQuestion({
                                  testCases: [...(currentQ?.testCases || []), newTc],
                                });
                              }}
                              className="h-7 text-xs font-bold text-purple-600 border-purple-300 dark:border-purple-800 gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Hidden Test Case
                            </Button>
                          </div>

                          {hiddenTestCases.length === 0 ? (
                            <p className="text-slate-400 text-xs italic">
                              No hidden test cases configured. Click &quot;Add Hidden Test Case&quot; to configure anti-cheat test vectors.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {hiddenTestCases.map((tc, idx) => (
                                <div
                                  key={tc.id}
                                  className="p-3 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-2 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Lock className="h-3 w-3 text-purple-600" />
                                      <span className="font-bold text-purple-900 dark:text-purple-200">
                                        Hidden Case {idx + 1}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        updateCurrentQuestion({
                                          testCases: (currentQ?.testCases || []).filter((t) => t.id !== tc.id),
                                        });
                                      }}
                                      className="h-6 px-2 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block uppercase">
                                      Secret Input:
                                    </label>
                                    <Input
                                      value={tc.input || ""}
                                      onChange={(e) => {
                                        const updatedCases = (currentQ?.testCases || []).map((t) =>
                                          t.id === tc.id ? { ...t, input: e.target.value } : t
                                        );
                                        updateCurrentQuestion({ testCases: updatedCases });
                                      }}
                                      placeholder="Secret Input..."
                                      className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block uppercase">
                                      Expected Output:
                                    </label>
                                    <Input
                                      value={tc.output || (tc as any).expected_output || ""}
                                      onChange={(e) => {
                                        const updatedCases = (currentQ?.testCases || []).map((t) =>
                                          t.id === tc.id ? { ...t, output: e.target.value } : t
                                        );
                                        updateCurrentQuestion({ testCases: updatedCases });
                                      }}
                                      placeholder="Secret Expected Output..."
                                      className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Custom Testcase */}
                      {activeConsoleTab === "customtest" && (
                        <div className="space-y-2">
                          <label className="font-bold text-slate-700 dark:text-zinc-300 block">
                            Custom Standard Input (stdin):
                          </label>
                          <Textarea
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Enter custom input data here..."
                            rows={4}
                            className="font-mono text-xs bg-white dark:bg-[#18181B]"
                          />
                        </div>
                      )}

                      {/* 4. Console Tab */}
                      {activeConsoleTab === "console" && (
                        <div className="space-y-2 font-mono text-xs">
                          {consoleOutput ? (
                            <div className="space-y-2">
                              {consoleOutput.status && (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={cn(
                                      "text-[10px] font-bold uppercase",
                                      consoleOutput.status.id === 3
                                        ? "bg-emerald-500 text-white"
                                        : "bg-rose-500 text-white"
                                    )}
                                  >
                                    {consoleOutput.status.description}
                                  </Badge>
                                  {consoleOutput.time && (
                                    <span className="text-[11px] text-slate-500">
                                      Time: {consoleOutput.time}s
                                    </span>
                                  )}
                                </div>
                              )}
                              {consoleOutput.stdout && (
                                <div>
                                  <span className="text-slate-500 font-bold block text-[11px]">
                                    Standard Output:
                                  </span>
                                  <pre className="p-2.5 bg-white dark:bg-[#18181B] rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap">
                                    {consoleOutput.stdout}
                                  </pre>
                                </div>
                              )}
                              {(consoleOutput.stderr || consoleOutput.error || consoleOutput.compile_output) && (
                                <div>
                                  <span className="text-rose-500 font-bold block text-[11px]">
                                    Errors / Compiler Output:
                                  </span>
                                  <pre className="p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 overflow-x-auto whitespace-pre-wrap">
                                    {consoleOutput.stderr || consoleOutput.error || consoleOutput.compile_output}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">
                              Click &quot;Run Code&quot; to execute and view compiler output.
                            </p>
                          )}
                        </div>
                      )}

                      {/* 5. Test Result Tab */}
                      {activeConsoleTab === "testresult" && (
                        <div className="space-y-3 font-mono text-xs">
                          {testCaseResults && testCaseResults.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={cn(
                                    "text-xs font-bold",
                                    testCaseResults.every((r) => r.passed)
                                      ? "bg-emerald-500 text-white"
                                      : "bg-rose-500 text-white"
                                  )}
                                >
                                  {testCaseResults.every((r) => r.passed)
                                    ? "All Cases Passed"
                                    : "Failed Test Cases"}
                                </Badge>
                                <span className="text-slate-600 dark:text-zinc-400 text-xs">
                                  Passed {testCaseResults.filter((r) => r.passed).length} of{" "}
                                  {testCaseResults.length} cases
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-1">
                                {testCaseResults.map((tr, idx) => (
                                  <div
                                    key={tr.test_case_id || idx}
                                    className={cn(
                                      "p-2.5 rounded-xl border flex items-center justify-between gap-2",
                                      tr.passed
                                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                                        : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      {tr.passed ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                      ) : (
                                        <XCircle className="h-4 w-4 shrink-0" />
                                      )}
                                      <span className="font-bold">Test Case {idx + 1}</span>
                                    </div>
                                    <div className="text-right text-[11px]">
                                      {tr.passed ? (
                                        <span>Accepted ({tr.time_seconds || 0.02}s)</span>
                                      ) : (
                                        <span>
                                          Output Mismatch{" "}
                                          {tr.actual_output && `(Got: "${tr.actual_output}")`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">
                              Run the code to evaluate against configured test cases.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* MCQ / MSQ Editor (Exact Visual Match to Student MCQ Card with Editing) */
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div className="space-y-2 border-b border-slate-200 dark:border-zinc-800 pb-4">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
                      Configure Multiple Choice Options
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentQ?.type === "msq"
                        ? "Select multiple checkboxes for questions with multiple correct options."
                        : "Select the single radio button representing the correct answer."}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {(currentQ?.options || []).map((opt, idx) => (
                      <div
                        key={opt.id || idx}
                        className={cn(
                          "p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all",
                          opt.isCorrect
                            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                            : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Option Prefix Circle */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentQ) return;
                              const isMSQ = currentQ.type === "msq";
                              const updatedOptions = (currentQ.options || []).map((o, oIdx) => {
                                if (isMSQ) {
                                  return oIdx === idx ? { ...o, isCorrect: !o.isCorrect } : o;
                                } else {
                                  return { ...o, isCorrect: oIdx === idx };
                                }
                              });
                              updateCurrentQuestion({ options: updatedOptions });
                            }}
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer border",
                              opt.isCorrect
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-zinc-700"
                            )}
                            title="Click to toggle as correct answer"
                          >
                            {String.fromCharCode(65 + idx)}
                          </button>

                          {/* Option Text Input */}
                          <Input
                            value={opt.text}
                            onChange={(e) => {
                              if (!currentQ) return;
                              const updatedOptions = (currentQ.options || []).map((o, oIdx) =>
                                oIdx === idx ? { ...o, text: e.target.value } : o
                              );
                              updateCurrentQuestion({ options: updatedOptions });
                            }}
                            placeholder={`Enter Option ${String.fromCharCode(65 + idx)}...`}
                            className="h-9 text-xs font-medium border-slate-200 dark:border-zinc-700 flex-1"
                          />
                        </div>

                        {/* Correct Toggle & Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentQ) return;
                              const isMSQ = currentQ.type === "msq";
                              const updatedOptions = (currentQ.options || []).map((o, oIdx) => {
                                if (isMSQ) {
                                  return oIdx === idx ? { ...o, isCorrect: !o.isCorrect } : o;
                                } else {
                                  return { ...o, isCorrect: oIdx === idx };
                                }
                              });
                              updateCurrentQuestion({ options: updatedOptions });
                            }}
                            className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                              opt.isCorrect
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "text-slate-500 border-slate-200 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-600"
                            )}
                          >
                            {opt.isCorrect ? "Correct Answer" : "Mark Correct"}
                          </button>

                          {(currentQ?.options || []).length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!currentQ) return;
                                const filtered = (currentQ.options || []).filter((_, oIdx) => oIdx !== idx);
                                updateCurrentQuestion({ options: filtered });
                              }}
                              className="h-8 px-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const opts = currentQ?.options || [];
                      const nextLetter = String.fromCharCode(65 + opts.length);
                      updateCurrentQuestion({
                        options: [
                          ...opts,
                          { id: opts.length + 1, text: `Option ${nextLetter}`, isCorrect: false },
                        ],
                      });
                    }}
                    className="h-9 text-xs font-bold border-dashed border-slate-300 dark:border-zinc-700 text-[#2563EB] gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add Option
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ════════ COLUMN 3: RIGHT PANEL — QUESTION PALETTE ════════ */}
          <div className="w-[260px] xl:w-[280px] 2xl:w-[300px] shrink-0 h-full overflow-hidden flex flex-col">
            <Card className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden flex flex-col h-full min-w-0">
              <CardHeader className="p-4 pb-3 border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-bold text-sm">Questions</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border-slate-200 dark:border-zinc-700"
                    >
                      {activeIndex + 1}/{questions.length}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddNewQuestion(currentQ?.type === "coding" ? "coding" : "mcq")}
                    className="h-7 px-2 text-[11px] font-bold text-[#2563EB] hover:bg-[#2563EB]/10 gap-1 rounded-lg"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Section 1: MCQ Section */}
                {mcqQuestions.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                      <ClipboardList className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                      <span className="truncate">Multiple Choice (MCQ)</span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        ({mcqQuestions.length})
                      </span>
                    </span>
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((q, idx) => {
                        if (q.type !== "mcq" && q.type !== "msq") return null;
                        const isCurrent = activeIndex === idx;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            className={cn(
                              "h-9 w-full rounded-xl text-xs font-bold transition-all border flex items-center justify-center cursor-pointer",
                              isCurrent
                                ? "ring-2 ring-[#2563EB] bg-[#2563EB] text-white font-bold shadow-xs"
                                : "bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-blue-400"
                            )}
                            title={`Q${idx + 1}: ${q.title}`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 2: Coding Section */}
                {codingQuestions.length > 0 && (
                  <div className="space-y-2.5 pt-3 border-t border-slate-200/80 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                      <Code2 className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                      <span className="truncate">Coding Challenges</span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        ({codingQuestions.length})
                      </span>
                    </span>
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((q, idx) => {
                        if (q.type !== "coding" && q.type !== "both") return null;
                        const isCurrent = activeIndex === idx;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            className={cn(
                              "h-9 w-full rounded-xl text-xs font-bold transition-all border flex items-center justify-center cursor-pointer",
                              isCurrent
                                ? "ring-2 ring-[#2563EB] bg-[#2563EB] text-white font-bold shadow-xs"
                                : "bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-blue-400"
                            )}
                            title={`Q${idx + 1}: ${q.title}`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reorder / Action Toolbar */}
                <div className="p-3 bg-slate-50/80 dark:bg-zinc-900/60 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Manage Selected Question
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleMoveQuestionUp}
                      disabled={activeIndex === 0}
                      className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg"
                      title="Move Question Up in Exam Order"
                    >
                      <ArrowUp className="h-3 w-3" /> Move Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleMoveQuestionDown}
                      disabled={activeIndex === questions.length - 1}
                      className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg"
                      title="Move Question Down in Exam Order"
                    >
                      <ArrowDown className="h-3 w-3" /> Move Down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDuplicateQuestion}
                      className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg"
                      title="Clone this question"
                    >
                      <Copy className="h-3 w-3" /> Clone
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteQuestion}
                      className="h-7 px-2 text-[10px] font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1 rounded-lg"
                      title="Delete question"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Overall Statistics Summary */}
                <div className="p-3.5 bg-slate-50/70 dark:bg-zinc-900/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-400">Total Questions:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {questions.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-400">Coding Problems:</span>
                    <span className="font-bold text-[#2563EB]">{codingQuestions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-400">MCQ Questions:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {mcqQuestions.length}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      Total Points Pool:
                    </span>
                    <span className="font-bold text-[#2563EB]">
                      {questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)} Marks
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Navigation Bar (Exact Match to Student Assessment Bottom Bar) ── */}
      <div className="sticky bottom-2 sm:bottom-4 z-30 w-full bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-2.5 sm:p-3 sm:px-6 shadow-lg select-none transition-all">
        <div className="flex items-center justify-between w-full">
          {/* Left: Previous Question */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
            disabled={activeIndex === 0}
            className="h-9 px-4 text-xs font-bold rounded-xl border-slate-200 dark:border-zinc-700 gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>

          {/* Center: Question Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
              Question {questions.length > 0 ? activeIndex + 1 : 0} of {questions.length}
            </span>
          </div>

          {/* Right: Next Question or Save */}
          <div className="flex items-center gap-2">
            {activeIndex < questions.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="h-9 px-4 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl gap-1.5"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveToDatabase(false)}
                disabled={isSaving}
                className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
              >
                {isSaving ? "Saving Changes..." : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
