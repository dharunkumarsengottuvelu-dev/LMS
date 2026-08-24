"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, ShieldCheck, CheckCircle2, Code2,
  ChevronLeft, ChevronRight, Award, Camera, Video, VideoOff,
  AlertTriangle, RotateCcw, Check, X, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { PracticeRunnerEngine, PracticeQuestion } from "@/components/quiz/practice-runner";
import {
  AIFaceTracker,
  FaceDetectionResult,
} from "@/lib/proctoring/ai-face-tracker";

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

  // Unified Proctoring Violation State
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"connecting" | "active" | "denied" | "disabled">("connecting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<{ message: string; severity: "INFO" | "WARNING" | "CRITICAL" } | null>(null);

  // Registered Reference Face Embedding
  const [referenceEmbedding, setReferenceEmbedding] = useState<number[] | null>(null);

  // Clean, user-friendly face state (no technical clutter, never resizes outer card)
  const [simpleFaceStatus, setSimpleFaceStatus] = useState<
    | "verified"
    | "missing"
    | "multiple"
    | "looking_away_left"
    | "looking_away_right"
    | "looking_away_up"
    | "looking_away_down"
    | "looking_away"
    | "mismatch"
    | "fullscreen_exit"
    | "copy_paste"
  >("verified");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<AIFaceTracker | null>(null);

  // Grace period duration timers (in seconds)
  const noFaceDurationRef = useRef<number>(0);
  const multipleFacesDurationRef = useRef<number>(0);
  const lookingAwayDurationRef = useRef<number>(0);
  const extremeLookingAwayDurationRef = useRef<number>(0);
  const mismatchDurationRef = useRef<number>(0);

  // Debounce flag refs: ensure ONE continuous violation generates only ONE flag until cleared
  const noFaceFlaggedRef = useRef<boolean>(false);
  const multipleFacesFlaggedRef = useRef<boolean>(false);
  const lookingAwayFlaggedRef = useRef<boolean>(false);
  const mismatchFlaggedRef = useRef<boolean>(false);

  const maxWarnings = testData?.proctoring?.maxWarningsLimit ?? 3;

  // Unified Violation Handler
  const recordViolation = useCallback((reason: string, status?: typeof simpleFaceStatus) => {
    setViolationsCount((prev) => {
      const next = prev + 1;
      toast({
        variant: "destructive",
        title: `Proctoring Alert (${next}/${maxWarnings})`,
        description: reason,
      });
      return next;
    });
    if (status) {
      setSimpleFaceStatus(status);
    }
  }, [maxWarnings, toast]);

  // Initialize AI Face Tracker
  useEffect(() => {
    if (typeof window !== "undefined" && !trackerRef.current) {
      trackerRef.current = new AIFaceTracker();
    }
  }, []);

  // Load registered reference face representation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedEmb = sessionStorage.getItem("candidate_reference_embedding");
    if (savedEmb) {
      try {
        const parsed = JSON.parse(savedEmb);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReferenceEmbedding(parsed);
          return;
        }
      } catch {}
    }

    // Fallback: extract embedding from candidate reference photo if available
    const refPhoto = sessionStorage.getItem("candidate_reference_photo");
    if (refPhoto) {
      const tracker = trackerRef.current || new AIFaceTracker();
      tracker.extractFaceEmbedding(refPhoto).then((emb) => {
        if (emb) {
          setReferenceEmbedding(emb);
          sessionStorage.setItem("candidate_reference_embedding", JSON.stringify(emb));
        }
      });
    }
  }, []);

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

  // Request & Start Hardware Webcam with error handling
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraStatus("connecting");

    try {
      if (typeof window !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480 },
            height: { ideal: 360 },
            facingMode: "user",
          },
          audio: false,
        });

        // Listen for track disconnects
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setCameraStatus("denied");
            setCameraError("Webcam disconnected unexpectedly.");
          };
        });

        setCameraStream(stream);
        setCameraStatus("active");
        setCameraError(null);

        // Immediate video element bind
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        setCameraStatus("denied");
        setCameraError("Webcam not supported by this browser.");
      }
    } catch (err: any) {
      console.warn("Proctoring webcam permission error:", err);
      setCameraStatus("denied");
      setCameraError(err?.message || "Webcam access denied. Please allow camera permissions.");
    }
  }, []);

  // Handle Hardware Camera for Proctoring if enabled
  useEffect(() => {
    if (testData?.proctoring?.webcamTracking && !isExamSubmitted) {
      startCamera();
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      setCameraStatus("disabled");
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [testData?.proctoring?.webcamTracking, isExamSubmitted, startCamera]);

  // Dynamic Callback ref for Video element
  const setVideoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && cameraStream) {
      node.srcObject = cameraStream;
      node.onloadedmetadata = () => {
        node.play().catch((e) => console.warn("Video play error:", e));
      };
      node.play().catch((e) => console.warn("Video play error:", e));
    }
  }, [cameraStream]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((e) => console.warn("Video play effect error:", e));
    }
  }, [cameraStream]);

  // Fullscreen Lockdown Monitoring (if enabled by Admin)
  useEffect(() => {
    if (!testData?.proctoring?.fullscreenLock || isExamSubmitted) return;

    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      if (!isFull && !isExamSubmitted) {
        recordViolation("Exited required fullscreen mode during examination.", "fullscreen_exit");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [testData?.proctoring?.fullscreenLock, isExamSubmitted, recordViolation]);

  // Clipboard and Context Menu Protection (if enabled by Admin)
  useEffect(() => {
    if (!testData?.proctoring?.copyPasteRestricted || isExamSubmitted) return;

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("Clipboard actions (copy/paste) are restricted.", "copy_paste");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("copy", handleCopyPaste);
    window.addEventListener("paste", handleCopyPaste);
    window.addEventListener("cut", handleCopyPaste);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("copy", handleCopyPaste);
      window.removeEventListener("paste", handleCopyPaste);
      window.removeEventListener("cut", handleCopyPaste);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [testData?.proctoring?.copyPasteRestricted, isExamSubmitted, recordViolation]);

  // Tab Switch Monitoring (if enabled by Admin)
  useEffect(() => {
    if (!testData?.proctoring?.tabSwitchLock || isExamSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isExamSubmitted) {
        recordViolation("Tab switched or browser minimized during examination.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [testData?.proctoring?.tabSwitchLock, isExamSubmitted, recordViolation]);

  // Auto-Submit on violation limit (if enabled by Admin)
  useEffect(() => {
    if (
      testData?.proctoring?.autoSubmitOnWarning &&
      violationsCount >= maxWarnings &&
      !isExamSubmitted &&
      formattedQuestions.length > 0
    ) {
      toast({
        variant: "destructive",
        title: "Exam Auto-Submitted",
        description: `Maximum allowed security warnings (${maxWarnings}) exceeded. Submitting examination...`,
      });
      handleSubmit({});
    }
  }, [violationsCount, maxWarnings, testData?.proctoring?.autoSubmitOnWarning, isExamSubmitted, formattedQuestions.length]);

  // Real-Time AI Face Monitoring Loop with Reference Face Matching & Grace Periods (500ms Interval)
  useEffect(() => {
    if (isExamSubmitted || !cameraStream || cameraStatus !== "active") return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const tracker = trackerRef.current;
      if (!video || video.paused || video.ended || !tracker) return;

      try {
        const result: FaceDetectionResult = await tracker.analyzeFrame(video, referenceEmbedding);
        let currentStatus: typeof simpleFaceStatus = "verified";
        let alertMsg: string | null = null;
        let alertLevel: "INFO" | "WARNING" | "CRITICAL" = "INFO";

        // Condition 1: Face Missing
        if (result.faceCount === 0) {
          noFaceDurationRef.current += 0.5;
          multipleFacesDurationRef.current = 0;
          multipleFacesFlaggedRef.current = false;
          lookingAwayDurationRef.current = 0;
          extremeLookingAwayDurationRef.current = 0;
          lookingAwayFlaggedRef.current = false;
          mismatchDurationRef.current = 0;
          mismatchFlaggedRef.current = false;

          // Grace period: show "No Face" status after 2.5 seconds of sustained absence
          if (noFaceDurationRef.current >= 2.5) {
            currentStatus = "missing";
            alertMsg = "Please position your face in the camera frame.";
            alertLevel = "WARNING";
          }

          // Confirmed violation: generate exactly ONE flag after 5.0 seconds of continuous absence
          if (noFaceDurationRef.current >= 5.0 && !noFaceFlaggedRef.current) {
            noFaceFlaggedRef.current = true;
            recordViolation("Candidate face was not visible in camera for a sustained period.", "missing");
          }
        }
        // Condition 2: Multiple Faces
        else if (result.faceCount > 1 && (testData?.proctoring?.multipleFacesAlert ?? true)) {
          noFaceDurationRef.current = 0;
          noFaceFlaggedRef.current = false;
          multipleFacesDurationRef.current += 0.5;
          lookingAwayDurationRef.current = 0;
          extremeLookingAwayDurationRef.current = 0;
          lookingAwayFlaggedRef.current = false;
          mismatchDurationRef.current = 0;
          mismatchFlaggedRef.current = false;

          if (multipleFacesDurationRef.current >= 2.0) {
            currentStatus = "multiple";
            alertMsg = "Multiple faces detected. Only candidate should be present.";
            alertLevel = "CRITICAL";
          }

          // Confirmed violation: generate exactly ONE flag after 4.0 seconds of continuous multiple faces
          if (multipleFacesDurationRef.current >= 4.0 && !multipleFacesFlaggedRef.current) {
            multipleFacesFlaggedRef.current = true;
            recordViolation("Multiple people detected in candidate proctor stream.", "multiple");
          }
        }
        // Condition 3: Single Face Present
        else {
          noFaceDurationRef.current = 0;
          noFaceFlaggedRef.current = false;
          multipleFacesDurationRef.current = 0;
          multipleFacesFlaggedRef.current = false;

          // Check A: Reference Photo vs Live Face Identity Match
          if (result.isIdentityMatched === false && referenceEmbedding) {
            mismatchDurationRef.current += 0.5;

            // Show mismatch warning after 3.0s of continuous low similarity across multiple frames
            if (mismatchDurationRef.current >= 3.0) {
              currentStatus = "mismatch";
              alertMsg = "Face verification mismatch detected.";
              alertLevel = "WARNING";
            }

            // Confirmed violation: generate exactly ONE flag after 6.0s of sustained mismatch
            if (mismatchDurationRef.current >= 6.0 && !mismatchFlaggedRef.current) {
              mismatchFlaggedRef.current = true;
              recordViolation("Live camera face does not match the registered candidate reference photo.", "mismatch");
            }
          } else {
            // Identity matches reference photo -> reset mismatch timers and debounce flags
            mismatchDurationRef.current = 0;
            mismatchFlaggedRef.current = false;

            // Check B: Direction / Looking Away Check (Separate event from identity)
            if (
              result.headPoseState !== "facing_forward" &&
              (testData?.proctoring?.lookingAwayAlert ?? true)
            ) {
              lookingAwayDurationRef.current += 0.5;

              if (lookingAwayDurationRef.current >= 3.0) {
                currentStatus = result.headPoseState;
                alertMsg =
                  result.headPoseState === "looking_away_left"
                    ? "Looking Left detected. Please focus on the screen."
                    : result.headPoseState === "looking_away_right"
                    ? "Looking Right detected. Please focus on the screen."
                    : result.headPoseState === "looking_away_up"
                    ? "Looking Up detected. Please focus on the screen."
                    : result.headPoseState === "looking_away_down"
                    ? "Looking Down detected. Please focus on the screen."
                    : "Please focus on your examination screen.";
                alertLevel = "WARNING";
              }

              // Confirmed violation: generate exactly ONE flag after 6.0 seconds of continuous EXTREME look away
              if (result.isExtremeHeadPose) {
                extremeLookingAwayDurationRef.current += 0.5;
                if (extremeLookingAwayDurationRef.current >= 6.0 && !lookingAwayFlaggedRef.current) {
                  lookingAwayFlaggedRef.current = true;
                  const reasonText =
                    result.headPoseState === "looking_away_left"
                      ? "Looking Left detected."
                      : result.headPoseState === "looking_away_right"
                      ? "Looking Right detected."
                      : result.headPoseState === "looking_away_up"
                      ? "Looking Up detected."
                      : result.headPoseState === "looking_away_down"
                      ? "Looking Down detected."
                      : "Looking away from screen detected.";
                  recordViolation(reasonText, result.headPoseState);
                }
              } else {
                extremeLookingAwayDurationRef.current = 0;
              }
            } else {
              lookingAwayDurationRef.current = 0;
              extremeLookingAwayDurationRef.current = 0;
              lookingAwayFlaggedRef.current = false;
              currentStatus = "verified";
            }
          }
        }

        setSimpleFaceStatus(currentStatus);

        if (alertMsg) {
          setActiveAlert({ message: alertMsg, severity: alertLevel });
        } else {
          setActiveAlert(null);
        }
      } catch (err) {
        console.warn("Proctoring frame tick error:", err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [cameraStream, cameraStatus, isExamSubmitted, testData, referenceEmbedding, recordViolation]);

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
          violationsCount: violationsCount,
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

      // Stop camera stream tracks on submit
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }

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

  // UI status label text and color
  const statusConfig = {
    verified: { text: "Face Verified", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    looking_away_left: { text: "Looking Left", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    looking_away_right: { text: "Looking Right", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    looking_away_up: { text: "Looking Up", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    looking_away_down: { text: "Looking Down", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    looking_away: { text: "Looking Away", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    multiple: { text: "Multiple Faces Detected", color: "text-red-600 dark:text-red-400", dot: "bg-red-500 animate-pulse" },
    missing: { text: "No Face Detected", color: "text-red-600 dark:text-red-400", dot: "bg-red-500 animate-pulse" },
    mismatch: { text: "Face Mismatch", color: "text-red-600 dark:text-red-400", dot: "bg-red-500 animate-pulse" },
    fullscreen_exit: { text: "Fullscreen Exited", color: "text-red-600 dark:text-red-400", dot: "bg-red-500 animate-pulse" },
    copy_paste: { text: "Copy/Paste Violation", color: "text-red-600 dark:text-red-400", dot: "bg-red-500 animate-pulse" },
  }[simpleFaceStatus] || { text: "Face Verified", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" };

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

        {/* Real-time Proctoring Alert Ribbon */}
        {activeAlert && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
            activeAlert.severity === "CRITICAL"
              ? "bg-red-500 text-white"
              : activeAlert.severity === "WARNING"
              ? "bg-amber-500 text-white"
              : "bg-blue-500 text-white"
          }`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{activeAlert.message}</span>
          </div>
        )}
      </div>

      {/* Full PracticeRunnerEngine with Integrated Live Proctor in the Header Card */}
      <PracticeRunnerEngine
        module={moduleMeta}
        questions={formattedQuestions}
        extraHeaderContent={
          testData?.proctoring?.webcamTracking ? (
            <div className="w-[156px] h-auto rounded-xl border border-[#E5E7EB] dark:border-[#27272A] shadow-xs bg-white dark:bg-[#18181B] p-1.5 flex flex-col gap-1.5 select-none shrink-0">
              {/* Header (Above Video) */}
              <div className="flex items-center justify-between px-0.5 shrink-0 pointer-events-none">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  <span className="text-[9px] font-bold text-[#111827] dark:text-[#FAFAFA] tracking-tight">LIVE PROCTOR</span>
                </div>
                <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 leading-none">
                  {violationsCount}/{maxWarnings}
                </span>
              </div>

              {/* Camera Video (Middle, Restored to original size) */}
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-black flex items-center justify-center shrink-0">
                {cameraStatus === "active" ? (
                  <video
                    ref={setVideoCallbackRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="p-1 text-center space-y-1 w-full">
                    <VideoOff className="h-4 w-4 text-red-500 mx-auto animate-pulse" />
                    <Button
                      size="sm"
                      onClick={startCamera}
                      className="h-5 text-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-2 rounded"
                    >
                      Enable
                    </Button>
                  </div>
                )}
              </div>

              {/* Warning / Status (Below Video) */}
              <div className="flex items-center justify-center px-1 py-0.5 h-[18px] shrink-0 bg-slate-50 dark:bg-[#09090B] rounded-sm pointer-events-none overflow-hidden">
                <span className={cn("text-[9px] font-bold truncate text-center w-full block", statusConfig.color)}>
                  {statusConfig.text}
                </span>
              </div>
            </div>
          ) : undefined
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
