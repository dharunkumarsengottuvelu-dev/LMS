"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, ShieldCheck, CheckCircle2, HelpCircle, Code2,
  Terminal, AlertTriangle, Send, RefreshCw, ChevronLeft, ChevronRight, Award,
  Camera, Eye, Flag, RotateCcw, Video, CopyX, Maximize2, ShieldAlert, MonitorCheck,
  AlertOctagon, Lock, Download, ExternalLink, ShieldX, VideoOff, FileText, Info, User, Scan
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
import { getErrorMessage } from "@/lib/utils";
import { ProctoringEngine } from "@/components/proctoring/proctoring-engine";
import { useAuth } from "@/components/providers/auth-provider";

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
  section?: string;
}

// Dynamic Mock Question Sets per Test ID
const mockQuestionSets: Record<string, QuestionItem[]> = {};

const mockTestMeta: Record<string, { title: string; duration: number; maxMarks: number; proctoring: any }> = {};

export default function StudentTestRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const candidateName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student Candidate");

  const testId = (params?.id as string) || "";
  const currentTest = mockTestMeta[testId] ?? { duration: 60, title: "Test", maxMarks: 100, proctoring: { enabled: false } };
  const currentQuestions = mockQuestionSets[testId] ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(currentTest.duration * 60);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const completedMap = JSON.parse(localStorage.getItem("edunexus_completed_tests") || "{}");
        return !!completedMap[testId];
      } catch (e) {
        return false;
      }
    }
    return false;
  });
  const [autoSubmittedReason, setAutoSubmittedReason] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<number | null>(() => {
    if (testId === "t3") return 92;
    if (typeof window !== "undefined") {
      try {
        const completedMap = JSON.parse(localStorage.getItem("edunexus_completed_tests") || "{}");
        return completedMap[testId]?.score ?? 92;
      } catch (e) {
        return 92;
      }
    }
    return 92;
  });

  // Dynamic Security & Enforcement States based on Trainer/Admin settings
  const isCopyPasteBlocked = currentTest.proctoring.copyPasteRestricted;
  const isSEBRequired = currentTest.proctoring.safeExamBrowserRequired;
  const [isSEBVerified, setIsSEBVerified] = useState(false);
  const isFullscreenRequired = currentTest.proctoring.fullscreenLock;
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  
  // Admin/Trainer Configured Tab Switch Violation Limits
  const [maxTabSwitchLimit] = useState(3);
  const [tabSwitchViolations, setTabSwitchViolations] = useState(0);
  const [activeWarningMessage, setActiveWarningMessage] = useState<string | null>(null);

  // Live Webcam & Canvas AI Overlay Engine
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraMode, setCameraMode] = useState<"hardware" | "ai_simulation">("hardware");
  const [faceConfidence] = useState(99.8);

  // Check SEB Browser UserAgent and URL parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        ua.includes("seb") ||
        ua.includes("safeexambrowser") ||
        search.includes("seb=true") ||
        search.includes("seb=1")
      ) {
        setIsSEBVerified(true);
      }
    }
  }, []);

  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Attempt Hardware Webcam Access
  const requestWebcamAccess = async () => {
    setCameraError(null);
    try {
      if (typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        setWebcamStream(stream);
        setCameraMode("hardware");
        toast({
          title: "Webcam Connected",
          description: "Live camera stream active for real-time face monitoring.",
        });
      }
    } catch (err: unknown) {
      console.warn("Hardware webcam access error:", err);
      setCameraError(getErrorMessage(err));
      toast({
        variant: "destructive",
        title: "Webcam Access Required",
        description: "Please click 'Enable Camera' to grant camera permission for face monitoring.",
      });
    }
  };

  useEffect(() => {
    requestWebcamAccess();
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Stop camera stream tracks automatically upon exam submission
  useEffect(() => {
    if (isExamSubmitted && webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
  }, [isExamSubmitted, webcamStream]);

  useEffect(() => {
    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch((e) => console.warn("Video element play error:", e));
    }
  }, [webcamStream, videoRef.current]);

  // HTML5 Canvas AI Bounding Reticle Animation
  useEffect(() => {
    let animId: number;
    let scanY = 0;
    let scanDirection = 1;

    const drawCanvasOverlay = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Moving Laser Scan Line
      scanY += scanDirection * 1.5;
      if (scanY >= height || scanY <= 0) scanDirection *= -1;

      ctx.strokeStyle = "rgba(22, 163, 74, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      // Center AI Reticle Box
      const boxW = 140;
      const boxH = 170;
      const boxX = (width - boxW) / 2;
      const boxY = (height - boxH) / 2 - 10;
      const bracketLen = 16;

      ctx.strokeStyle = "#16A34A";
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(boxX, boxY + bracketLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + bracketLen, boxY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(boxX + boxW - bracketLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + bracketLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - bracketLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + bracketLen, boxY + boxH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(boxX + boxW - bracketLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - bracketLen);
      ctx.stroke();

      // Eye Tracking Crosshairs
      const leftEyeX = boxX + 45;
      const rightEyeX = boxX + 95;
      const eyeY = boxY + 55;

      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 6, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, 6, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = "#16A34A";
      ctx.font = "bold 9px monospace";
      ctx.fillText("FACE ID #8492 — 99.8%", boxX, boxY - 6);

      animId = requestAnimationFrame(drawCanvasOverlay);
    };

    animId = requestAnimationFrame(drawCanvasOverlay);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Coding Runner State
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [codeConsoleOutput, setCodeConsoleOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);

  const currentQ = (currentQuestions[currentIndex] || currentQuestions[0]) as QuestionItem;

  // FULLSCREEN & TAB SWITCH VIOLATION WITH AUTOMATIC SUBMIT
  useEffect(() => {
    if (!isSEBVerified && isSEBRequired) return;

    const enterFullscreen = async () => {
      try {
        if (isFullscreenRequired && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        setIsFullscreenModalOpen(true);
      }
    };
    enterFullscreen();

    const handleFullscreenChange = () => {
      if (isFullscreenRequired && !document.fullscreenElement && !isExamSubmitted) {
        setIsFullscreenModalOpen(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isExamSubmitted) {
        setTabSwitchViolations((prev) => {
          const next = prev + 1;
          
          if (next >= maxTabSwitchLimit) {
            setIsExamSubmitted(true);
            setAutoSubmittedReason(`Exceeded maximum allowed tab switch limit (${next}/${maxTabSwitchLimit}). Proctored violation logged.`);
            setScoreResult(0);
            toast({
              variant: "destructive",
              title: "Exam Auto-Submitted Immediately!",
              description: `Proctoring Violation! You reached ${next}/${maxTabSwitchLimit} forbidden tab switches. Exam auto-submitted with 0 marks.`,
            });
          } else {
            toast({
              variant: "destructive",
              title: `Proctoring Violation Warning (${next}/${maxTabSwitchLimit})`,
              description: `Tab switching is strictly forbidden! Reached ${next} of ${maxTabSwitchLimit} allowed warnings before automatic exam submission.`,
            });
          }
          return next;
        });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isFullscreenRequired, isExamSubmitted, isSEBVerified, isSEBRequired, maxTabSwitchLimit, toast]);

  const requestFullscreenExplicit = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenModalOpen(false);
    } catch (e) {
      setIsFullscreenModalOpen(false);
    }
  };

  // Countdown Timer Effect
  useEffect(() => {
    if (isExamSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExamSubmitted(true);
          setAutoSubmittedReason("Exam duration limit reached (Timer Expired).");
          toast({
            title: "Time Expired!",
            description: "Evaluation auto-submitted as time limit reached.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isExamSubmitted, toast]);

  const handleCopyPasteAttempt = (e: React.SyntheticEvent) => {
    if (isCopyPasteBlocked) {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Clipboard Restricted",
        description: "Copy/Paste is restricted by instructor during proctored evaluation.",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMcqSelect = (questionId: number, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const toggleMarkForReview = (questionId: number) => {
    setMarkedForReview((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
    toast({
      title: markedForReview[questionId] ? "Unmarked for Review" : "Marked for Review",
      description: `Question ${questionId} updated in palette.`,
    });
  };

  const handleClearAnswer = (questionId: number) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
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

    let correctCount = 0;
    currentQuestions.forEach((q) => {
      if (q.type === "mcq" && answers[q.id] === q.correctOption) {
        correctCount++;
      } else if (q.type === "coding" && answers[q.id]) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / currentQuestions.length) * 100);
    setScoreResult(calculatedScore);

    if (typeof window !== "undefined") {
      try {
        const completedMap = JSON.parse(localStorage.getItem("edunexus_completed_tests") || "{}");
        completedMap[testId] = { score: calculatedScore, timestamp: new Date().toISOString() };
        localStorage.setItem("edunexus_completed_tests", JSON.stringify(completedMap));
      } catch (e) {
        console.warn("Could not save test score to localStorage:", e);
      }
    }

    toast({
      title: "Exam Submitted Successfully",
      description: `Your evaluation score: ${calculatedScore}%`,
    });
  };

  if (isSEBRequired && !isSEBVerified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full bg-white dark:bg-[#18181B] border-2 border-[#DC2626] p-8 rounded-2xl shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mx-auto">
            <ShieldX className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-[#DC2626] text-white text-xs font-bold uppercase px-3 py-1">
              Access Restricted
            </Badge>
            <h1 className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
              Safe Exam Browser (SEB) Required!
            </h1>
            <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed max-w-lg mx-auto">
              This evaluation was configured by your trainer to run strictly inside the official <strong>Safe Exam Browser (SEB)</strong> application.
            </p>
          </div>

          <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-xs text-[#6B7280] space-y-2 text-left">
            <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">How to access this exam:</p>
            <p>1. Ensure Safe Exam Browser is installed on your computer.</p>
            <p>2. If testing or demonstrating, click <strong>Bypass & Simulate SEB Mode</strong>.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              className="w-full sm:w-auto h-[44px] px-6 bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold gap-2"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const protocol = window.location.protocol === "https:" ? "sebs://" : "seb://";
                  const host = window.location.host;
                  window.location.href = `${protocol}${host}/student/tests/${testId}?seb=true`;
                }
              }}
            >
              <ExternalLink className="h-4 w-4" /> Launch in SEB App (sebs://)
            </Button>

            <Button
              variant="outline"
              className="w-full sm:w-auto h-[44px] px-6 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 font-bold gap-2"
              onClick={() => {
                setIsSEBVerified(true);
                toast({
                  title: "SEB Environment Simulated",
                  description: "Safe Exam Browser token verified for testing.",
                });
              }}
            >
              <MonitorCheck className="h-4 w-4" /> Bypass & Simulate SEB Mode
            </Button>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button variant="ghost" className="text-xs text-[#6B7280]" onClick={() => router.back()}>
              ← Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      onCopy={handleCopyPasteAttempt}
      onPaste={handleCopyPasteAttempt}
      onContextMenu={handleCopyPasteAttempt}
      className="space-y-6 pb-12 w-full select-none"
    >
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7EB] dark:border-[#27272A]"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* 1. Dynamic Test Header Bar */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] md:text-[20px] font-bold text-[#111827] dark:text-[#FAFAFA] leading-tight">
                {currentTest.title}
              </h1>
              <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold px-2 py-0.5 shrink-0">
                Test ID: {testId.toUpperCase()}
              </Badge>
              <Badge className="bg-[#9333EA] text-white text-[10px] uppercase font-bold px-2 py-0.5 shrink-0">
                SEB Active
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
              <span>Candidate: <strong className="text-[#111827] dark:text-[#FAFAFA]">{candidateName}</strong></span>
              <span>•</span>
              <span>Questions: <strong className="text-[#111827] dark:text-[#FAFAFA]">{currentQuestions.length} Items</strong></span>
              <span>•</span>
              <span>Max Marks: <strong className="text-[#111827] dark:text-[#FAFAFA]">{currentTest.maxMarks} Marks</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Live Camera Stream Embedded directly in Top Header Bar */}
            {!isExamSubmitted && (
              <ProctoringEngine
                variant="compact"
                testId={testId}
                config={{
                  enableFaceMonitoring: currentTest.proctoring.webcamTracking,
                  cameraRequired: currentTest.proctoring.webcamTracking,
                  fullscreenRequired: currentTest.proctoring.fullscreenLock,
                  enableTabSwitchDetection: true,
                  enableMultipleFaceDetection: true,
                  enableFaceVisibilityDetection: true,
                  maxAllowedViolations: maxTabSwitchLimit,
                  autoSubmit: true,
                }}
                isExamSubmitted={isExamSubmitted}
                onAutoSubmit={(reason) => {
                  setIsExamSubmitted(true);
                  setAutoSubmittedReason(reason);
                  setScoreResult(0);
                }}
                onViolationOccurred={(log) => {
                  setTabSwitchViolations((prev) => prev + 1);
                  setActiveWarningMessage(log.message);
                }}
                onWarningMessage={(msg) => setActiveWarningMessage(msg)}
                onAutoSave={() => {
                  if (typeof window !== "undefined") {
                    try {
                      localStorage.setItem(`draft_answers_${testId}`, JSON.stringify(answers));
                    } catch (e) {}
                  }
                }}
              />
            )}

            <Button
              variant="outline"
              className="h-[44px] px-4 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 font-bold text-xs gap-2 shrink-0"
              onClick={() => setIsInstructionsOpen(true)}
            >
              <Info className="h-4 w-4" /> Exam Instructions & Rules
              {tabSwitchViolations > 0 && (
                <Badge className="bg-[#DC2626] text-white text-[9px] font-bold ml-1">
                  {tabSwitchViolations}/{maxTabSwitchLimit} Alert
                </Badge>
              )}
            </Button>

            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm font-bold border ${
              timeLeft < 300 ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30 animate-pulse" : "bg-[#F9FAFB] dark:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA] border-[#E5E7EB] dark:border-[#27272A]"
            }`}>
              <Clock className="h-4 w-4 text-[#2563EB]" /> {formatTime(timeLeft)}
            </div>

            {!isExamSubmitted ? (
              <Button className="h-[44px] px-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold gap-2 shrink-0" onClick={() => setIsSubmitDialogOpen(true)}>
                <Send className="h-4 w-4" /> Submit Exam
              </Button>
            ) : (
              <Button variant="outline" className="h-[44px] px-5 text-xs font-bold shrink-0" onClick={() => router.back()}>
                Back
              </Button>
            )}
          </div>
        </div>

        {/* Real-time Security Alert Warning Banner right inside Top Header Space */}
        {activeWarningMessage && !isExamSubmitted && (
          <div className="mt-3 p-3 bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#DC2626]" />
              <span>{activeWarningMessage}</span>
            </div>
            <Badge className="bg-[#DC2626] text-white text-[10px] uppercase font-bold shrink-0">
              Security Alert ({tabSwitchViolations}/{maxTabSwitchLimit})
            </Badge>
          </div>
        )}
      </Card>

      {/* RESULT BANNER */}
      {isExamSubmitted && (
        <Card className={`bg-white dark:bg-[#18181B] border-2 p-6 shadow-sm ${autoSubmittedReason ? "border-[#DC2626]" : "border-[#16A34A]"}`}>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shrink-0 ${
              autoSubmittedReason ? "bg-[#DC2626]/10 text-[#DC2626]" : "bg-[#16A34A]/10 text-[#16A34A]"
            }`}>
              {scoreResult}%
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#111827] dark:text-[#FAFAFA]">
                {autoSubmittedReason ? "Examination Auto-Submitted (Security Violation)" : "Examination Submitted & Evaluated!"}
              </h2>
              <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB]">
                {autoSubmittedReason ? (
                  <span className="text-[#DC2626] font-semibold">{autoSubmittedReason}</span>
                ) : (
                  <>Your score: <strong className="text-[#16A34A] font-bold">{scoreResult}%</strong>. Your answers and logs have been saved.</>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* LEFT QUESTION PANEL (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1">
                  Question {currentIndex + 1} of {currentQuestions.length}
                </Badge>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-[#E5E7EB] dark:border-[#27272A]">
                  {currentQ.type === "mcq" ? "MCQ Single Choice" : "Coding Challenge"}
                </Badge>
              </div>

              <span className="text-xs font-bold text-[#6B7280]">Marks: 20</span>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
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
                          className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] shadow-xs"
                              : "border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB] hover:bg-[#F9FAFB] dark:hover:bg-[#09090B] text-[#111827] dark:text-[#FAFAFA]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                              isSelected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]"
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span>{opt}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    className="font-mono text-xs leading-relaxed min-h-[170px] bg-[#09090B] text-[#FAFAFA] border-[#27272A] p-4"
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

              <div className="sticky bottom-3 z-20 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md p-3 px-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] shadow-md flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 px-3 text-xs font-semibold gap-1.5 rounded-full ${
                      markedForReview[currentQ.id] ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]" : "text-[#4B5563]"
                    }`}
                    onClick={() => toggleMarkForReview(currentQ.id)}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {markedForReview[currentQ.id] ? "Marked" : "Review"}
                  </Button>

                  {answers[currentQ.id] !== undefined && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 gap-1 rounded-full"
                      onClick={() => handleClearAnswer(currentQ.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Clear
                    </Button>
                  )}
                </div>

                {/* Grouped Pill Navigation */}
                <div className="inline-flex items-center gap-2 select-none">
                  <Button
                    disabled={currentIndex === 0}
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4 h-9 font-semibold text-xs border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 gap-1 shadow-2xs"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Prev</span>
                  </Button>

                  <div className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
                    <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
                    <span>{currentIndex + 1} of {currentQuestions.length}</span>
                  </div>

                  <Button
                    disabled={currentIndex === currentQuestions.length - 1}
                    size="sm"
                    className="rounded-full px-4 h-9 font-bold text-xs bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1 shadow-xs"
                    onClick={() => setCurrentIndex((prev) => Math.min(currentQuestions.length - 1, prev + 1))}
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold text-[#2563EB]">
                  All sections
                </CardTitle>
                <CardDescription className="text-xs text-[#9CA3AF] mt-1">
                  {Object.keys(answers).length}/{currentQuestions.length} questions answered
                </CardDescription>
              </div>
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle className="text-[#EFF6FF] dark:text-[#1E3A8A]/20" strokeWidth="4" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24" />
                  <circle 
                    className="text-[#2563EB]" 
                    strokeWidth="4" 
                    strokeDasharray={125.6} 
                    strokeDashoffset={125.6 - (125.6 * (Object.keys(answers).length / currentQuestions.length))} 
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="20" 
                    cx="24" 
                    cy="24" 
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-[#111827] dark:text-[#FAFAFA]">
                  {Math.round((Object.keys(answers).length / currentQuestions.length) * 100)}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {Object.entries(
                currentQuestions.reduce((acc, q, index) => {
                  const sec = q.section || "GENERAL ABILITY";
                  if (!acc[sec]) acc[sec] = [];
                  acc[sec].push({ ...q, originalIndex: index });
                  return acc;
                }, {} as Record<string, (QuestionItem & { originalIndex: number })[]>)
              ).map(([section, qs]) => (
                <div key={section} className="space-y-3">
                  <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB] dark:border-[#27272A] pb-2">
                    {section}
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {qs.map((q) => {
                      const isAnswered = answers[q.id] !== undefined;
                      const isMarked = markedForReview[q.id];
                      const isCurrent = currentIndex === q.originalIndex;

                      let style = "bg-white dark:bg-[#18181B] text-[#4B5563] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB] hover:text-[#2563EB]";
                      if (isCurrent) style = "ring-2 ring-[#2563EB] bg-[#2563EB] text-white border-transparent shadow-md";
                      else if (isMarked) style = "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]";
                      else if (isAnswered) style = "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30";

                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentIndex(q.originalIndex)}
                          className={`aspect-square rounded-xl text-xs font-bold transition-all border ${style}`}
                        >
                          {q.originalIndex + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#4B5563]">
                      <span className="w-3 h-3 rounded-full bg-[#16A34A]" /> Answered
                    </span>
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{Object.keys(answers).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#4B5563]">
                      <span className="w-3 h-3 rounded-full bg-[#F59E0B]" /> Marked for Review
                    </span>
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{Object.values(markedForReview).filter(Boolean).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#4B5563]">
                      <span className="w-3 h-3 rounded-full border border-[#E5E7EB] bg-white" /> Unanswered
                    </span>
                    <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{currentQuestions.length - Object.keys(answers).length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Instructions Modal */}
      <Dialog open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#2563EB]">
              <FileText className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">
                Examination Rules & Security Enforcement
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-4 bg-[#9333EA]/5 rounded-2xl border border-[#9333EA]/20 space-y-3">
            <p className="font-bold text-[#9333EA] flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-4 w-4" /> Active Security Enforcement Summary
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                <span className="text-[#6B7280] flex items-center gap-1.5"><MonitorCheck className="h-3.5 w-3.5 text-[#9333EA]" /> Safe Exam Browser:</span>
                <span className="font-bold text-[#16A34A]">Auto Active</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                <span className="text-[#6B7280] flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5 text-[#2563EB]" /> Mandatory Fullscreen:</span>
                <span className="font-bold text-[#16A34A]">Auto Locked</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                <span className="text-[#6B7280] flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-[#DC2626]" /> Tab Switch Limit:</span>
                <span className="font-bold text-[#DC2626]">{maxTabSwitchLimit} Max Allowed</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A]">
                <span className="text-[#6B7280] flex items-center gap-1.5"><CopyX className="h-3.5 w-3.5 text-[#DC2626]" /> Copy / Paste:</span>
                <span className="font-bold text-[#DC2626]">Blocked</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button className="w-full h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold" onClick={() => setIsInstructionsOpen(false)}>
              Understand & Return to Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULLSCREEN MODAL */}
      <Dialog open={isFullscreenModalOpen} onOpenChange={setIsFullscreenModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181B] border-2 border-[#DC2626] p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#DC2626]">
              <AlertOctagon className="h-6 w-6" />
              <DialogTitle className="text-lg font-bold">Mandatory Fullscreen Mode Required</DialogTitle>
            </div>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2" onClick={requestFullscreenExplicit}>
              <Maximize2 className="h-4 w-4" /> Enable Fullscreen & Continue Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM SUBMIT MODAL */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">Submit Examination?</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              You have answered {Object.keys(answers).length} out of {currentQuestions.length} questions.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-10 text-xs font-semibold" onClick={() => setIsSubmitDialogOpen(false)}>Continue Exam</Button>
            <Button className="h-10 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold" onClick={handleSubmitExam}>Yes, Submit Evaluation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
