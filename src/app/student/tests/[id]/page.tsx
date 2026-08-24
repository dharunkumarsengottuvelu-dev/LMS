"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, ShieldCheck, CheckCircle2, Code2,
  ChevronLeft, ChevronRight, Award, Camera, Video, VideoOff, Maximize2, Minimize2,
  AlertTriangle, RotateCcw, Check, X, RefreshCw, GripHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
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

  // Proctoring States
  const [tabSwitchViolations, setTabSwitchViolations] = useState(0);
  const [faceViolations, setFaceViolations] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"connecting" | "active" | "denied" | "disabled">("connecting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraCollapsed, setIsCameraCollapsed] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{ message: string; severity: "INFO" | "WARNING" | "CRITICAL" } | null>(null);

  // Registered Reference Face Embedding
  const [referenceEmbedding, setReferenceEmbedding] = useState<number[] | null>(null);

  // Clean, user-friendly face state (no technical clutter)
  const [simpleFaceStatus, setSimpleFaceStatus] = useState<
    "verified" | "missing" | "multiple" | "looking_away" | "mismatch"
  >("verified");

  // Draggable Window Position State
  const [pipPosition, setPipPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<AIFaceTracker | null>(null);

  // Grace period duration timers (in seconds)
  const noFaceDurationRef = useRef<number>(0);
  const multipleFacesDurationRef = useRef<number>(0);
  const lookingAwayDurationRef = useRef<number>(0);
  const mismatchDurationRef = useRef<number>(0);

  const totalViolations = tabSwitchViolations + faceViolations;
  const maxWarnings = testData?.proctoring?.maxWarningsLimit ?? 3;

  // Initialize AI Face Tracker
  useEffect(() => {
    if (typeof window !== "undefined" && !trackerRef.current) {
      trackerRef.current = new AIFaceTracker();
    }
  }, []);

  // Initialize and persist draggable position
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = sessionStorage.getItem("proctor_pip_position");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const clampedX = Math.max(10, Math.min(window.innerWidth - 200, parsed.x));
        const clampedY = Math.max(10, Math.min(window.innerHeight - 170, parsed.y));
        setPipPosition({ x: clampedX, y: clampedY });
        return;
      } catch {}
    }

    // Default to bottom-right position
    const defX = Math.max(10, window.innerWidth - 210);
    const defY = Math.max(10, window.innerHeight - 180);
    setPipPosition({ x: defX, y: defY });
  }, []);

  // Keep draggable popup inside viewport on window resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setPipPosition((prev) => {
        if (!prev) return prev;
        const clampedX = Math.max(10, Math.min(window.innerWidth - 200, prev.x));
        const clampedY = Math.max(10, Math.min(window.innerHeight - 170, prev.y));
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  // Dragging event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return; // Do not drag on button clicks
    isDraggingRef.current = true;
    const currentX = pipPosition?.x ?? 20;
    const currentY = pipPosition?.y ?? 20;
    dragOffsetRef.current = {
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const popupWidth = isCameraCollapsed ? 150 : 190;
    const popupHeight = isCameraCollapsed ? 44 : 170;

    const newX = Math.max(8, Math.min(window.innerWidth - popupWidth, e.clientX - dragOffsetRef.current.x));
    const newY = Math.max(8, Math.min(window.innerHeight - popupHeight, e.clientY - dragOffsetRef.current.y));
    const newPos = { x: newX, y: newY };
    setPipPosition(newPos);

    if (typeof window !== "undefined") {
      sessionStorage.setItem("proctor_pip_position", JSON.stringify(newPos));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

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
  }, [cameraStream, isCameraCollapsed]);

  // Fullscreen and Tab Switch Monitoring
  useEffect(() => {
    if (!testData?.proctoring?.tabSwitchLock || isExamSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isExamSubmitted) {
        setTabSwitchViolations((prev) => {
          const next = prev + 1;
          toast({
            variant: "destructive",
            title: `Tab Switch Warning (${next + faceViolations}/${maxWarnings})`,
            description: "Tab switching is not allowed during the exam.",
          });
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [testData?.proctoring?.tabSwitchLock, isExamSubmitted, faceViolations, maxWarnings, toast]);

  // Real-Time AI Face Monitoring Loop with Reference Face Matching & Grace Periods (500ms Interval)
  useEffect(() => {
    if (isExamSubmitted || !cameraStream || cameraStatus !== "active") return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const tracker = trackerRef.current;
      if (!video || video.paused || video.ended || !tracker) return;

      try {
        const result: FaceDetectionResult = await tracker.analyzeFrame(video, referenceEmbedding);
        let currentStatus: "verified" | "missing" | "multiple" | "looking_away" | "mismatch" = "verified";
        let alertMsg: string | null = null;
        let alertLevel: "INFO" | "WARNING" | "CRITICAL" = "INFO";

        // Condition 1: Face Missing (Requires sustained absence before warning/flag)
        if (result.faceCount === 0) {
          noFaceDurationRef.current += 0.5;
          multipleFacesDurationRef.current = 0;
          lookingAwayDurationRef.current = 0;
          mismatchDurationRef.current = 0;

          // Grace period: only show "No Face" after 3.5 seconds of sustained absence
          if (noFaceDurationRef.current >= 3.5) {
            currentStatus = "missing";
            alertMsg = "Please position your face in the camera frame.";
            alertLevel = "WARNING";
          }

          // Flag violation only after 8.0 seconds of continuous absence
          if (noFaceDurationRef.current >= 8.0) {
            setFaceViolations((prev) => {
              const next = prev + 1;
              toast({
                variant: "destructive",
                title: `Proctoring Alert: Face Missing (${tabSwitchViolations + next}/${maxWarnings})`,
                description: "Face was not visible in camera for a sustained period.",
              });
              return next;
            });
            noFaceDurationRef.current = 0;
          }
        }
        // Condition 2: Multiple Faces (Requires sustained presence to filter transient noise)
        else if (result.faceCount > 1 && (testData?.proctoring?.multipleFacesAlert ?? true)) {
          noFaceDurationRef.current = 0;
          multipleFacesDurationRef.current += 0.5;
          lookingAwayDurationRef.current = 0;
          mismatchDurationRef.current = 0;

          if (multipleFacesDurationRef.current >= 2.5) {
            currentStatus = "multiple";
            alertMsg = "Multiple faces detected. Only candidate should be present.";
            alertLevel = "CRITICAL";
          }

          // Flag only after 5.0 seconds of continuous multiple faces
          if (multipleFacesDurationRef.current >= 5.0) {
            setFaceViolations((prev) => {
              const next = prev + 1;
              toast({
                variant: "destructive",
                title: `Security Alert: Multiple Faces (${tabSwitchViolations + next}/${maxWarnings})`,
                description: "Multiple people detected in candidate proctor stream.",
              });
              return next;
            });
            multipleFacesDurationRef.current = 0;
          }
        }
        // Condition 3: Single Face Present
        else {
          noFaceDurationRef.current = 0;
          multipleFacesDurationRef.current = 0;

          // Check A: Reference Photo vs Live Face Identity Match
          if (result.isIdentityMatched === false && referenceEmbedding) {
            mismatchDurationRef.current += 0.5;

            // Only show mismatch warning after 4.0s of continuous low similarity across multiple frames
            if (mismatchDurationRef.current >= 4.0) {
              currentStatus = "mismatch";
              alertMsg = "Face verification mismatch detected.";
              alertLevel = "WARNING";
            }

            // Flag violation only after 8.0s of sustained mismatch
            if (mismatchDurationRef.current >= 8.0) {
              setFaceViolations((prev) => {
                const next = prev + 1;
                toast({
                  variant: "destructive",
                  title: `Identity Mismatch Alert (${tabSwitchViolations + next}/${maxWarnings})`,
                  description: "Live camera face does not match the registered candidate reference photo.",
                });
                return next;
              });
              mismatchDurationRef.current = 0;
            }
          } else {
            // Identity matches reference photo -> immediately reset mismatch timer
            mismatchDurationRef.current = 0;

            // Check B: Direction / Looking Away Check (Separate event from identity)
            if (
              result.headPoseState !== "facing_forward" &&
              (testData?.proctoring?.lookingAwayAlert ?? true)
            ) {
              lookingAwayDurationRef.current += 0.5;

              if (lookingAwayDurationRef.current >= 4.5) {
                currentStatus = "looking_away";
                alertMsg = "Please focus on your examination screen.";
                alertLevel = "WARNING";
              }

              // Flag only after 9.0 seconds of continuous look away
              if (lookingAwayDurationRef.current >= 9.0) {
                setFaceViolations((prev) => {
                  const next = prev + 1;
                  toast({
                    variant: "destructive",
                    title: `Attention Alert (${tabSwitchViolations + next}/${maxWarnings})`,
                    description: "Prolonged look away from screen detected.",
                  });
                  return next;
                });
                lookingAwayDurationRef.current = 0;
              }
            } else {
              lookingAwayDurationRef.current = 0;
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
  }, [cameraStream, cameraStatus, isExamSubmitted, testData, referenceEmbedding, tabSwitchViolations, maxWarnings, toast]);

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
          violationsCount: totalViolations,
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
    verified: { text: "Face Verified", color: "text-emerald-400", dot: "bg-emerald-500" },
    missing: { text: "No Face Detected", color: "text-red-400", dot: "bg-red-500 animate-pulse" },
    multiple: { text: "Multiple Faces Detected", color: "text-red-400", dot: "bg-red-500 animate-pulse" },
    looking_away: { text: "Looking Away", color: "text-amber-400", dot: "bg-amber-500" },
    mismatch: { text: "Face Verification Failed", color: "text-red-400", dot: "bg-red-500 animate-pulse" },
  }[simpleFaceStatus];

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

      {/* Floating Proctoring Camera PIP Overlay - Completely Draggable Window */}
      {testData?.proctoring?.webcamTracking && pipPosition && (
        <div
          style={{
            left: `${pipPosition.x}px`,
            top: `${pipPosition.y}px`,
          }}
          className="fixed z-50 bg-[#09090B]/95 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-2xl overflow-hidden transition-shadow select-none touch-none"
        >
          {/* Draggable Header Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="flex items-center justify-between mb-1.5 px-1 gap-2 cursor-grab active:cursor-grabbing hover:bg-white/5 py-1 rounded-lg transition-colors"
            title="Drag to move live proctor window"
          >
            <div className="flex items-center gap-1.5 pointer-events-none">
              <GripHorizontal className="h-3 w-3 text-white/40" />
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraStatus === "active" ? statusConfig.dot : "bg-red-500"
                }`}
              />
              <span className="text-[10px] font-bold tracking-wider text-white">LIVE PROCTOR</span>
            </div>

            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 h-4 border pointer-events-none ${
                  totalViolations > 0
                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                }`}
              >
                {totalViolations}/{maxWarnings} Flags
              </Badge>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCameraCollapsed(!isCameraCollapsed);
                }}
                className="text-white/70 hover:text-white p-0.5 rounded transition"
                title={isCameraCollapsed ? "Expand Camera" : "Collapse Camera"}
              >
                {isCameraCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Clean Camera View (No red corner brackets, no eye markers, no technical clutter) */}
          {!isCameraCollapsed ? (
            <div className="relative w-44 h-32 rounded-xl overflow-hidden bg-[#09090B] border border-white/10 flex items-center justify-center">
              {cameraStatus === "active" ? (
                <>
                  <video
                    ref={setVideoCallbackRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />

                  {/* Clean Bottom Status Tag */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-semibold text-white z-20">
                    <span className={statusConfig.color}>
                      {statusConfig.text}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 text-center space-y-1.5 w-full">
                  <VideoOff className="h-6 w-6 text-red-400 mx-auto animate-pulse" />
                  <p className="text-[10px] text-red-200 font-medium">Camera Offline</p>
                  <Button
                    size="sm"
                    onClick={startCamera}
                    className="h-6 text-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-2 rounded-lg"
                  >
                    Enable Camera
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="px-1 py-0.5 text-[10px] text-white/80 flex items-center gap-2">
              <span className={`font-semibold ${statusConfig.color}`}>
                {statusConfig.text}
              </span>
            </div>
          )}
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
