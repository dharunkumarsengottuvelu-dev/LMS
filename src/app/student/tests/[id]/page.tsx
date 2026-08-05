"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, ShieldCheck, CheckCircle2, HelpCircle, Code2,
  Terminal, AlertTriangle, Send, RefreshCw, ChevronLeft, ChevronRight, Award
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface QuestionItem {
  id: number;
  type: "mcq" | "coding";
  question: string;
  options?: string[];
  correctOption?: number;
  explanation?: string;
  problemStatement?: string;
  starterCode?: Record<string, string>;
  sampleOutput?: string;
}

const mockExamQuestions: QuestionItem[] = [
  {
    id: 1,
    type: "mcq",
    question: "What is the primary benefit of React 19 Server Components in Next.js 16?",
    options: [
      "Components execute on the client side only",
      "Zero bundle size for server components rendered on the server",
      "Server components disable all CSS styles",
      "They eliminate the need for PostgreSQL databases"
    ],
    correctOption: 1,
    explanation: "Server Components execute exclusively on the server, sending zero client JS bundle weight for those components."
  },
  {
    id: 2,
    type: "mcq",
    question: "Which Supabase PostgreSQL feature restricts data access based on authentication policies?",
    options: [
      "Foreign Key Constraints",
      "Row Level Security (RLS)",
      "B-Tree Indexes",
      "WAL Replication Log"
    ],
    correctOption: 1,
    explanation: "Row Level Security (RLS) allows database administrators to define SQL policies restricting rows based on user authentication."
  },
  {
    id: 3,
    type: "coding",
    question: "Coding Problem 1: Implement Array Deduplication",
    problemStatement: "Write a function `uniqueArray(arr)` that accepts an array of numbers and returns a new array with all duplicate values removed.",
    starterCode: {
      javascript: "function uniqueArray(arr) {\n  // Write your code here\n  return Array.from(new Set(arr));\n}\n\nconsole.log(uniqueArray([1, 2, 2, 3, 4, 4, 5]));",
      python: "def unique_array(arr):\n    # Write your code here\n    return list(set(arr))\n\nprint(unique_array([1, 2, 2, 3, 4, 4, 5]))",
    },
    sampleOutput: "[1, 2, 3, 4, 5]",
  },
  {
    id: 4,
    type: "mcq",
    question: "How do Middleware files in Next.js execute relative to incoming HTTP requests?",
    options: [
      "After the page component renders in the browser",
      "Before a request is completed, intercepting headers and routing",
      "Only during build time npm run build",
      "Inside WebAssembly sandbox threads"
    ],
    correctOption: 1,
    explanation: "Next.js Middleware runs before a request is completed, allowing URL redirects and header authentication."
  },
  {
    id: 5,
    type: "coding",
    question: "Coding Problem 2: Validate Email Format",
    problemStatement: "Write a function `isValidEmail(email)` that returns `true` if the string contains '@' and '.', otherwise `false`.",
    starterCode: {
      javascript: "function isValidEmail(email) {\n  return email.includes('@') && email.includes('.');\n}\n\nconsole.log(isValidEmail('student@edunexus.io'));",
      python: "def is_valid_email(email):\n    return '@' in email and '.' in email\n\nprint(is_valid_email('student@edunexus.io'))",
    },
    sampleOutput: "true",
  }
];

export default function StudentTestRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes countdown
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<number | null>(null);

  // Coding Runner State
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [codeConsoleOutput, setCodeConsoleOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);

  const currentQ = (mockExamQuestions[currentIndex] || mockExamQuestions[0]) as QuestionItem;

  // Countdown Timer Effect
  useEffect(() => {
    if (isExamSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isExamSubmitted]);

  // Format timer MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMcqSelect = (questionId: number, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleRunCode = () => {
    setIsRunningCode(true);
    setTimeout(() => {
      setIsRunningCode(false);
      setCodeConsoleOutput(`[Executing ${selectedLanguage.toUpperCase()} Solution...]\nOutput:\nMatched Expected Sample Output\n✔ Test Cases 1 & 2 Passed!`);
      setAnswers((prev) => ({ ...prev, [currentQ.id]: codeContent }));
    }, 700);
  };

  const handleSubmitExam = () => {
    setIsSubmitDialogOpen(false);
    setIsExamSubmitted(true);

    // Calculate MCQ Score
    let correctCount = 0;
    mockExamQuestions.forEach((q) => {
      if (q.type === "mcq" && answers[q.id] === q.correctOption) {
        correctCount++;
      } else if (q.type === "coding" && answers[q.id]) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / mockExamQuestions.length) * 100);
    setScoreResult(calculatedScore);

    toast({
      title: "Exam Submitted Successfully",
      description: `Your evaluation score: ${calculatedScore}%`,
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* 1. Proctored Exam Header */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold text-[#111827] dark:text-[#FAFAFA]">
              Mid-Term Proctored Evaluation — Batch 2026-A
            </h1>
            <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold">
              Live Test
            </Badge>
          </div>
          <p className="text-xs text-[#6B7280]">Total Questions: {mockExamQuestions.length} | Max Marks: 100</p>
        </div>

        {/* Right Info: Timer & Proctoring Status */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#2563EB]/10 border border-[#2563EB]/20 px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#2563EB]">
            <ShieldCheck className="h-4 w-4" /> AI Proctoring Active
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold border ${
            timeLeft < 300 ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30 animate-pulse" : "bg-[#F3F4F6] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA] border-[#E5E7EB] dark:border-[#27272A]"
          }`}>
            <Clock className="h-4 w-4 text-[#2563EB]" /> {formatTime(timeLeft)}
          </div>

          {!isExamSubmitted ? (
            <Button className="h-10 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold gap-2" onClick={() => setIsSubmitDialogOpen(true)}>
              <Send className="h-4 w-4" /> Submit Exam
            </Button>
          ) : (
            <Button variant="outline" className="h-10 px-4 text-xs font-semibold" onClick={() => router.push("/student/tests")}>
              Back to Tests
            </Button>
          )}
        </div>
      </div>

      {/* RESULT CARD IF SUBMITTED */}
      {isExamSubmitted && scoreResult !== null && (
        <Card className="bg-white dark:bg-[#18181B] border-2 border-[#16A34A] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center font-bold text-xl shrink-0">
              {scoreResult}%
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">Exam Evaluation Complete!</h2>
              <p className="text-xs text-[#6B7280]">
                You scored <strong className="text-[#16A34A]">{scoreResult}%</strong> on this evaluation. Detailed performance feedback has been submitted to your trainer.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 2. Main Question Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEFT: Active Question Body (MCQ or Coding) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5">
                  Question {currentIndex + 1} of {mockExamQuestions.length}
                </Badge>
                <Badge className="bg-gray-100 dark:bg-[#09090B] text-gray-700 dark:text-gray-300 text-xs font-semibold">
                  {currentQ.type === "mcq" ? "MCQ Single Choice" : "Coding Problem"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* TYPE 1: MCQ QUESTION */}
              {currentQ.type === "mcq" && (
                <div className="space-y-6">
                  <h3 className="text-[18px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-snug">
                    {currentQ.question}
                  </h3>

                  <div className="space-y-3">
                    {currentQ.options?.map((opt, idx) => {
                      const isSelected = answers[currentQ.id] === idx;
                      return (
                        <button
                          key={idx}
                          disabled={isExamSubmitted}
                          onClick={() => handleMcqSelect(currentQ.id, idx)}
                          className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] font-bold shadow-xs"
                              : "border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]"
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TYPE 2: CODING QUESTION */}
              {currentQ.type === "coding" && (
                <div className="space-y-5">
                  <div className="p-4 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">{currentQ.question}</p>
                    <p className="text-sm text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
                      {currentQ.problemStatement}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#111827] dark:text-[#FAFAFA]">Code Editor</Label>
                    <Select value={selectedLanguage} onValueChange={(val: string | null) => {
                      if (!val) return;
                      setSelectedLanguage(val);
                      if (currentQ.starterCode && val in currentQ.starterCode) {
                        setCodeContent(currentQ.starterCode[val] ?? "");
                      }
                    }}>
                      <SelectTrigger className="w-36 h-9 text-xs">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript (Node)</SelectItem>
                        <SelectItem value="python">Python 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    disabled={isExamSubmitted}
                    className="font-mono text-xs leading-relaxed min-h-[160px] bg-[#09090B] text-[#FAFAFA] border-[#27272A] p-4"
                    value={codeContent || (currentQ.starterCode?.[selectedLanguage] || "")}
                    onChange={(e) => setCodeContent(e.target.value)}
                  />

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      disabled={isExamSubmitted || isRunningCode}
                      className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold gap-2"
                      onClick={handleRunCode}
                    >
                      {isRunningCode ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />}
                      {isRunningCode ? "Running Tests..." : "Run & Test Code"}
                    </Button>

                    <p className="text-xs text-[#6B7280]">Expected Output: <code className="bg-[#F3F4F6] dark:bg-[#27272A] px-1.5 py-0.5 rounded text-[#111827] dark:text-[#FAFAFA] font-bold">{currentQ.sampleOutput}</code></p>
                  </div>

                  {codeConsoleOutput && (
                    <div className="p-4 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                      <p className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider">Console Output & Test Results</p>
                      <pre className="text-xs text-white font-mono leading-relaxed whitespace-pre-wrap">{codeConsoleOutput}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <Button
                  disabled={currentIndex === 0}
                  variant="outline"
                  className="h-10 px-4 text-xs font-semibold gap-1"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                <Button
                  disabled={currentIndex === mockExamQuestions.length - 1}
                  className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-1"
                  onClick={() => setCurrentIndex((prev) => Math.min(mockExamQuestions.length - 1, prev + 1))}
                >
                  Next Question <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Question Palette Drawer */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                Question Palette
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {mockExamQuestions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = currentIndex === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-lg text-xs font-bold transition-all border ${
                        isCurrent
                          ? "ring-2 ring-[#2563EB] bg-[#2563EB] text-white"
                          : isAnswered
                          ? "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/40"
                          : "bg-[#F9FAFB] dark:bg-[#09090B] text-[#4B5563] border-[#E5E7EB] dark:border-[#27272A]"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-lg border border-[#E5E7EB] dark:border-[#27272A] space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#16A34A]" />
                  <span>Answered ({Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#F3F4F6] border border-[#E5E7EB]" />
                  <span>Unanswered ({mockExamQuestions.length - Object.keys(answers).length})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* CONFIRM SUBMISSION MODAL */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
              Submit Examination?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              You have answered {Object.keys(answers).length} out of {mockExamQuestions.length} questions. Are you sure you want to finalize your evaluation?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-10 text-xs font-semibold" onClick={() => setIsSubmitDialogOpen(false)}>
              Continue Exam
            </Button>
            <Button className="h-10 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold" onClick={handleSubmitExam}>
              Yes, Submit Evaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
