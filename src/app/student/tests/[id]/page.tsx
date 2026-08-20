"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, ShieldCheck, CheckCircle2, Code2,
  ChevronLeft, ChevronRight, Award, Camera, Video, Maximize2,
  AlertTriangle, RotateCcw, Check, X, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";

export default function StudentTestRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const testId = (params?.id as string) || "";
  const [testData, setTestData] = useState<any>(null);
  const [formattedQuestions, setFormattedQuestions] = useState<PracticeQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);
  const [submissionData, setSubmissionData] = useState<any>(null);

  // Proctoring States
  const [tabSwitchViolations, setTabSwitchViolations] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraCollapsed, setIsCameraCollapsed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load Real Test & Assigned Questions from Database API
  useEffect(() => {
    if (!testId) return;
    setIsLoading(true);
    fetch(`/api/student/tests/${testId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setLoadError(data.error);
        } else if (data.test) {
          setTestData(data.test);
          
          // Format questions to match PracticeRunnerEngine format exactly
          const rawQuestions: any[] = data.questions || [];
          const formatted: PracticeQuestion[] = rawQuestions.map((q: any, idx: number) => {
            const isCoding = q.type === "coding";
            const isMSQ = q.type === "msq" || q.type === "multiple_choice" || q.type === "both";
            const qId = q.questionId || `q_${idx + 1}`;

            if (isCoding) {
              const testCases = (q.testCases || []).map((tc: any, tcIdx: number) => ({
                id: tc.id || `tc_${tcIdx + 1}`,
                input: tc.input || "",
                expected_output: tc.output || tc.expected_output || tc.expectedOutput || "",
                is_hidden: Boolean(tc.isHidden || tc.is_hidden),
              }));

              return {
                id: qId,
                type: "coding",
                title: q.question || `Coding Problem ${idx + 1}`,
                text: q.problemStatement || q.question || "Solve the challenge.",
                marks: Number(q.marks) || 10,
                section: "coding",
                sectionTitle: "Coding Challenges",
                difficulty: "medium",
                constraints: q.constraints || "Standard time and memory limits apply.",
                inputFormat: q.inputFormat || "Standard Input",
                outputFormat: q.outputFormat || "Standard Output",
                starterCode: q.starterCode || {
                  python: "# Write your Python solution here\n",
                  java: "// Write your Java solution here\n",
                  cpp: "// Write your C++ solution here\n",
                  javascript: "// Write your JavaScript solution here\n",
                  c: "/* Write your C solution here */\n"
                },
                testCases: testCases.length > 0 ? testCases : [{ id: "tc_1", input: "1", expected_output: "1", is_hidden: false }]
              };
            } else {
              // MCQ or MSQ
              const optionsList = (q.options || []).map((opt: any, optIdx: number) => {
                const optText = typeof opt === "string" ? opt : opt.text || "";
                const isCorrect = typeof opt === "object" ? Boolean(opt.isCorrect) : optIdx === (q.correctOption || 0);
                return {
                  id: `opt_${optIdx + 1}`,
                  text: optText,
                  isCorrect: isCorrect,
                };
              });

              return {
                id: qId,
                type: isMSQ ? "multiple_choice" : "single_choice",
                title: q.question || `Question ${idx + 1}`,
                text: q.problemStatement || q.question || "",
                marks: Number(q.marks) || 1,
                section: "mcq",
                sectionTitle: isMSQ ? "Multiple Select (MSQ)" : "Multiple Choice (MCQ)",
                options: optionsList,
              };
            }
          });

          setFormattedQuestions(formatted);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch assessment:", err);
        setLoadError(getErrorMessage(err));
        setIsLoading(false);
      });
  }, [testId]);

  // Handle Hardware Camera for Proctoring if enabled
  useEffect(() => {
    if (!testData?.proctoring?.webcamTracking || isExamSubmitted) return;

    let mediaStream: MediaStream | null = null;
    if (typeof window !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          mediaStream = stream;
          setIsCameraActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn("Proctoring webcam permission denied:", err);
          setIsCameraActive(false);
        });
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [testData?.proctoring?.webcamTracking, isExamSubmitted]);

  // Fullscreen and Tab Switch Monitoring
  useEffect(() => {
    if (!testData?.proctoring?.tabSwitchLock || isExamSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isExamSubmitted) {
        setTabSwitchViolations((prev) => {
          const next = prev + 1;
          toast({
            variant: "destructive",
            title: `Proctoring Warning (${next}/3)`,
            description: "Tab switching is forbidden during proctored exams!",
          });
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [testData?.proctoring?.tabSwitchLock, isExamSubmitted, toast]);

  const moduleMeta = useMemo(() => {
    if (!testData) return null;
    return {
      id: testData.id || testId,
      title: testData.title || "Proctored Examination",
      type: "mixed" as const,
      assignedBy: "Instructor / Admin",
      durationMinutes: testData.duration || 60,
      totalMarks: testData.maxMarks || (formattedQuestions.reduce((acc, q) => acc + (q.marks || 1), 0) || 100),
      passingMarks: testData.hasPassingCriteria === false ? 0 : (testData.passingCriteriaType === "marks" ? (testData.passingMarks || 40) : Math.round(((testData.maxMarks || 100) * (testData.passPercentage || 40)) / 100)),
      allowReviewBeforeSubmit: true,
      proctoring: {
        fullscreenLock: Boolean(testData.proctoring?.fullscreenLock),
        copyPasteRestricted: Boolean(testData.proctoring?.copyPasteRestricted),
      }
    };
  }, [testData, testId, formattedQuestions]);

  const handleSubmit = async (
    answers: Record<string, any>,
    meta?: { timeSpentSeconds: number; completedAt: string; timeLeft: number; submissionResults?: Record<string, any> }
  ) => {
    try {
      // Map back answers into numerical question IDs / q numbers for backward compatibility
      const indexedAnswers: Record<string, any> = {};
      formattedQuestions.forEach((q, idx) => {
        const studentAns = answers[q.id];
        if (studentAns !== undefined && studentAns !== null) {
          if (q.type === "single_choice") {
            const optIdx = (q.options || []).findIndex(o => (Array.isArray(studentAns) ? studentAns.includes(o.id) : studentAns === o.id));
            indexedAnswers[idx + 1] = optIdx >= 0 ? optIdx : 0;
          } else if (q.type === "multiple_choice") {
            const selectedIndices = (q.options || [])
              .map((o, oIdx) => ((Array.isArray(studentAns) ? studentAns.includes(o.id) : studentAns === o.id) ? oIdx : -1))
              .filter(i => i >= 0);
            indexedAnswers[idx + 1] = selectedIndices;
          } else {
            indexedAnswers[idx + 1] = typeof studentAns === "object" ? studentAns.code : studentAns;
          }
        }
      });

      const response = await fetch(`/api/student/tests/${testId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: indexedAnswers,
          rawAnswers: answers,
          timeSpentSeconds: meta?.timeSpentSeconds || 0,
          violationsCount: tabSwitchViolations,
          autoSubmitted: false,
        }),
      });

      const resData = await response.json();
      setSubmissionData({
        score: resData.score ?? 0,
        totalMarks: resData.totalMarks ?? moduleMeta?.totalMarks ?? 100,
        percentage: resData.percentage ?? Math.round(((resData.score || 0) / (resData.totalMarks || 100)) * 100),
        passed: resData.passed ?? ((resData.percentage || 0) >= 40),
        timeSpentSeconds: meta?.timeSpentSeconds || 0,
      });
      setIsExamSubmitted(true);

      toast({
        title: "Exam Submitted Successfully",
        description: `Your assessment has been evaluated. Score: ${resData.score ?? 0} / ${resData.totalMarks ?? 100}`,
      });
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit assessment.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-[#2563EB]" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading Assessment Environment...</p>
      </div>
    );
  }

  if (loadError || !moduleMeta) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white dark:bg-[#18181B] border border-red-200 dark:border-red-900/30 rounded-2xl text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Assessment</h2>
        <p className="text-xs text-slate-500">{loadError || "Assessment not found or access restricted."}</p>
        <Button onClick={() => router.push("/student/assessments")} className="bg-[#2563EB] text-white text-xs font-bold rounded-xl">
          Back to Assessments
        </Button>
      </div>
    );
  }

  if (isExamSubmitted && submissionData) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${submissionData.passed ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
          {submissionData.passed ? <Award className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
        </div>

        <div className="space-y-2">
          <Badge className={`text-xs font-bold uppercase px-3 py-1 ${submissionData.passed ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
            {submissionData.passed ? "Passed Examination" : "Assessment Completed"}
          </Badge>
          <h2 className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">{moduleMeta.title}</h2>
          <p className="text-xs text-[#6B7280]">Your examination submission has been evaluated.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 p-5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase">Score</p>
            <p className="text-xl font-extrabold text-[#111827] dark:text-[#FAFAFA]">
              {submissionData.score} / {submissionData.totalMarks}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase">Percentage</p>
            <p className="text-xl font-extrabold text-[#2563EB]">{submissionData.percentage}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase">Time Spent</p>
            <p className="text-xl font-extrabold text-[#111827] dark:text-[#FAFAFA]">
              {Math.floor(submissionData.timeSpentSeconds / 60)}m {submissionData.timeSpentSeconds % 60}s
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => router.push("/student/assessments")} className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-md">
            Return to Assessments Hub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3 space-y-4 relative">
      {/* Top Bar Back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A] rounded-xl hover:bg-muted"
          onClick={() => router.push("/student/assessments")}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Assessments
        </Button>
      </div>

      {/* Floating Proctoring Camera PIP Overlay */}
      {isCameraActive && (
        <div className="fixed bottom-6 right-6 z-40 bg-black/80 rounded-2xl p-1.5 border border-white/20 shadow-2xl backdrop-blur-md overflow-hidden transition-all">
          <div className="relative w-36 h-28 rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md text-[9px] font-bold text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE PROCTOR
            </div>
          </div>
        </div>
      )}

      {/* Full PracticeRunnerEngine Matching Practice & Track Formats */}
      <PracticeRunnerEngine
        module={moduleMeta}
        questions={formattedQuestions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
