"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  WifiOff,
  Wifi,
  Eye,
  SunMedium,
  UserX,
  Users,
  VideoOff,
  Crosshair,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import {
  AIFaceTracker,
  FaceDetectionResult,
  FacePositionState,
  HeadPoseState,
  LightingState,
} from "@/lib/proctoring/ai-face-tracker";

export type SeverityLevel = "INFO" | "WARNING" | "HIGH" | "CRITICAL";

export type ViolationType =
  | "CAMERA_DISABLED"
  | "CAMERA_DISCONNECTED"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES"
  | "FACE_OUTSIDE_FRAME"
  | "FACE_POSITION_UNEVEN"
  | "LOOKING_AWAY"
  | "HEAD_MOVEMENT_EXCESSIVE"
  | "LOW_LIGHT_DETECTED"
  | "FACE_COVERED_OR_BLOCKED"
  | "TAB_SWITCH"
  | "WINDOW_SWITCH"
  | "FULLSCREEN_EXIT"
  | "BROWSER_REFRESH"
  | "CAMERA_PERMISSION_DENIED";

export interface ViolationLog {
  id: string;
  studentId: string;
  assessmentId: string;
  testId: string;
  violationType: ViolationType;
  severity: SeverityLevel;
  message: string;
  warningNumber: number;
  timestamp: string; // ISO format
  durationSeconds?: number;
  resolved: boolean;
  browserInfo: string;
}

export interface ProctoringConfig {
  enableCameraMonitoring?: boolean;
  enableFaceMonitoring?: boolean;
  cameraRequired?: boolean;
  singleFaceDetection?: boolean;
  multipleFaceDetection?: boolean;
  enableMultipleFaceDetection?: boolean;
  faceVisibilityDetection?: boolean;
  enableFaceVisibilityDetection?: boolean;
  lookingAwayDetection?: boolean;
  lowLightDetection?: boolean;
  fullscreenRequired?: boolean;
  enableTabSwitchDetection?: boolean;
  detectionIntervalMs?: number;
  warningTimeoutMs?: number;
  maxAllowedViolations?: number;
  maxAllowedWarnings?: number;
  noFaceGracePeriodSec?: number;
  lookingAwayGracePeriodSec?: number;
  facePositionGracePeriodSec?: number;
  autoSubmitOnViolationLimit?: boolean;
  autoSubmit?: boolean;
}

interface ProctoringEngineProps {
  variant?: "compact" | "default" | "minimal";
  testId: string;
  studentId?: string;
  config?: ProctoringConfig;
  isExamSubmitted: boolean;
  onAutoSubmit: (reason: string) => void;
  onViolationOccurred?: (log: ViolationLog) => void;
  onAutoSave?: () => void;
  onWarningMessage?: (msg: string | null) => void;
}

export function ProctoringEngine({
  variant = "default",
  testId,
  studentId = "STUDENT_DEFAULT",
  config = {},
  isExamSubmitted,
  onAutoSubmit,
  onViolationOccurred,
  onAutoSave,
  onWarningMessage,
}: ProctoringEngineProps) {
  const { toast } = useToast();

  // Resolved Config Defaults
  const maxWarnings =
    config.maxAllowedWarnings ?? config.maxAllowedViolations ?? 3;
  const autoSubmitEnabled =
    config.autoSubmitOnViolationLimit ?? config.autoSubmit ?? true;
  const noFaceGracePeriod = config.noFaceGracePeriodSec ?? 3.0; // seconds before violation
  const lookingAwayGracePeriod = config.lookingAwayGracePeriodSec ?? 3.5; // seconds before violation
  const positionGracePeriod = config.facePositionGracePeriodSec ?? 3.0; // seconds before violation

  // Internal Engine States
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<
    "connecting" | "active" | "denied" | "disconnected"
  >("connecting");
  const [proctoringState, setProctoringState] = useState<{
    faceCount: number;
    positionState: FacePositionState;
    headPoseState: HeadPoseState;
    lightingState: LightingState;
    confidence: number;
    statusText: string;
  }>({
    faceCount: 1,
    positionState: "centered",
    headPoseState: "facing_forward",
    lightingState: "good",
    confidence: 99.4,
    statusText: "Camera Active • Face Verified",
  });

  const [activeAlert, setActiveAlert] = useState<{
    message: string;
    severity: SeverityLevel;
  } | null>(null);

  const [warningCount, setWarningCount] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<AIFaceTracker | null>(null);

  const warningCountRef = useRef<number>(0);
  warningCountRef.current = warningCount;

  // Timers for Grace Periods & Continuous Heuristics
  const noFaceDurationRef = useRef<number>(0);
  const lookingAwayDurationRef = useRef<number>(0);
  const positionOffDurationRef = useRef<number>(0);
  const lastViolationTimeRef = useRef<number>(0);
  const isAutoSubmittedRef = useRef<boolean>(false);

  // Initialize Tracker
  useEffect(() => {
    if (!trackerRef.current) {
      trackerRef.current = new AIFaceTracker();
    }
  }, []);

  // Save / Sync logs in browser storage
  const syncLogsToStorage = useCallback(
    (logs: ViolationLog[]) => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `proctoring_audit_${testId}_${studentId}`,
            JSON.stringify({
              testId,
              studentId,
              warningCount: warningCountRef.current,
              maxWarnings,
              logs,
              lastUpdated: new Date().toISOString(),
            })
          );
        }
      } catch (e) {
        console.warn("Failed to persist proctoring logs:", e);
      }
    },
    [testId, studentId, maxWarnings]
  );

  // Record Structured Violation Log & Dispatch Warning
  const recordViolation = useCallback(
    (type: ViolationType, severity: SeverityLevel, message: string, durationSeconds?: number) => {
      if (isExamSubmitted || isAutoSubmittedRef.current) return;

      const now = Date.now();
      // Debounce identical violations within 3.5 seconds
      if (now - lastViolationTimeRef.current < 3500 && severity !== "CRITICAL") return;
      lastViolationTimeRef.current = now;

      const nextCount = warningCountRef.current + 1;
      setWarningCount(nextCount);

      const newLog: ViolationLog = {
        id: `vlog_${now}_${Math.random().toString(36).substring(2, 6)}`,
        studentId,
        assessmentId: testId,
        testId,
        violationType: type,
        severity,
        message,
        warningNumber: nextCount,
        timestamp: new Date().toISOString(),
        durationSeconds,
        resolved: false,
        browserInfo: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
      };

      setViolationLogs((prev) => {
        const updated = [...prev, newLog];
        syncLogsToStorage(updated);
        return updated;
      });

      onViolationOccurred?.(newLog);

      // Top notification dispatch
      setActiveAlert({ message, severity });
      onWarningMessage?.(message);

      // Notification
      let toastTitle = `Proctoring Warning (${nextCount}/${maxWarnings})`;
      if (severity === "HIGH") {
        toastTitle = `High-Severity Violation (${nextCount}/${maxWarnings})`;
      } else if (severity === "CRITICAL") {
        toastTitle = `Critical Security Alert (${nextCount}/${maxWarnings})`;
      }

      if (nextCount >= maxWarnings) {
        toastTitle = `Security Limit Exceeded (${nextCount}/${maxWarnings})`;
        setShowSecurityModal(true);
      }

      toast({
        variant: severity === "INFO" ? "default" : "destructive",
        title: toastTitle,
        description: message,
      });

      if (autoSubmitEnabled && nextCount >= maxWarnings && !isAutoSubmittedRef.current) {
        isAutoSubmittedRef.current = true;
        onAutoSubmit(
          `Security Policy Escalation: Exceeded maximum allowed proctoring warnings limit (${nextCount}/${maxWarnings}).`
        );
      }
    },
    [
      isExamSubmitted,
      studentId,
      testId,
      maxWarnings,
      autoSubmitEnabled,
      toast,
      onViolationOccurred,
      onAutoSubmit,
      onWarningMessage,
      syncLogsToStorage,
    ]
  );

  // Request & Start Hardware Webcam
  const requestWebcamAccess = useCallback(async () => {
    setCameraError(null);
    setCameraStatus("connecting");

    try {
      if (typeof window !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        // Track disconnection handler (Camera Disconnected)
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setCameraStatus("disconnected");
            recordViolation(
              "CAMERA_DISCONNECTED",
              "CRITICAL",
              "Camera disconnected. Please reconnect your camera to continue the exam."
            );
          };
        });

        setWebcamStream(stream);
        setCameraStatus("active");
        setActiveAlert(null);
        onWarningMessage?.(null);
      }
    } catch (err: unknown) {
      console.warn("Hardware camera access error:", err);
      setCameraStatus("denied");
      setCameraError(getErrorMessage(err));
      recordViolation(
        "CAMERA_PERMISSION_DENIED",
        "CRITICAL",
        "Camera access is required. Please grant camera permission to continue the exam."
      );
    }
  }, [recordViolation, onWarningMessage]);

  // Cleanup Webcam Stream Tracks
  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
  }, [webcamStream]);

  // Stream Lifecycle
  useEffect(() => {
    if (!isExamSubmitted && config.cameraRequired !== false) {
      requestWebcamAccess();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [isExamSubmitted, config.cameraRequired]);

  // Bind MediaStream to Video element upon DOM mount
  useEffect(() => {
    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current
        .play()
        .catch((e) => console.warn("Video element play error:", e));
    }
  }, [webcamStream]);

  // REAL-TIME AI FRAME EVALUATION LOOP (Non-blocking client-side heuristics)
  useEffect(() => {
    if (isExamSubmitted || !webcamStream || cameraStatus !== "active") return;

    const intervalMs = config.detectionIntervalMs ?? 600; // Check every 600ms
    const intervalSec = intervalMs / 1000;

    const loop = setInterval(async () => {
      const video = videoRef.current;
      const tracker = trackerRef.current;
      if (!video || video.paused || video.ended || !tracker) return;

      // Verify active video track
      const tracks = webcamStream.getVideoTracks();
      const firstTrack = tracks[0];
      if (!firstTrack || !firstTrack.enabled || firstTrack.readyState !== "live") {
        setCameraStatus("disconnected");
        recordViolation(
          "CAMERA_DISCONNECTED",
          "CRITICAL",
          "Camera feed was frozen or disconnected."
        );
        return;
      }

      // Execute AI Frame Analysis
      try {
        const result: FaceDetectionResult = await tracker.analyzeFrame(video);

        let statusText = "Camera Active • Face Detected";
        let newWarningMessage: string | null = null;
        let newSeverity: SeverityLevel = "INFO";

        // Condition 1: Face Not Detected (Grace Period)
        if (result.faceCount === 0) {
          noFaceDurationRef.current += intervalSec;
          lookingAwayDurationRef.current = 0;
          positionOffDurationRef.current = 0;

          if (noFaceDurationRef.current >= 1.0) {
            newWarningMessage =
              "Face not detected. Please position yourself in front of the camera.";
            newSeverity = "WARNING";
            statusText = "Face Not Detected";
          }

          if (noFaceDurationRef.current >= noFaceGracePeriod) {
            recordViolation(
              "NO_FACE_DETECTED",
              "WARNING",
              "Face not detected. Please position yourself in front of the camera.",
              Math.round(noFaceDurationRef.current)
            );
          }
        }
        // Condition 2: Multiple Faces Detected (High Severity)
        else if (result.faceCount > 1 && (config.multipleFaceDetection ?? true)) {
          noFaceDurationRef.current = 0;
          newWarningMessage =
            "Multiple faces detected. Only the registered candidate should be visible.";
          newSeverity = "HIGH";
          statusText = "Multiple Faces Detected";

          recordViolation(
            "MULTIPLE_FACES",
            "HIGH",
            "Multiple faces detected. Only the registered candidate should be visible."
          );
        }
        // Condition 3: Single Face Present — Evaluate Position, Attention & Light
        else {
          noFaceDurationRef.current = 0;

          // A. Position Check
          if (
            result.positionState !== "centered" &&
            (config.faceVisibilityDetection ?? true)
          ) {
            positionOffDurationRef.current += intervalSec;

            if (result.positionState === "too_close") {
              newWarningMessage =
                "Please maintain a proper distance from the camera (too close).";
              statusText = "Too Close to Camera";
            } else if (result.positionState === "too_far") {
              newWarningMessage = "Please move closer to the camera.";
              statusText = "Too Far from Camera";
            } else if (result.positionState === "partially_out_of_frame") {
              newWarningMessage = "Please move back into the camera frame.";
              statusText = "Partially Out of Frame";
            } else {
              newWarningMessage = "Please keep your full face visible and centered.";
              statusText = "Face Not Centered";
            }

            newSeverity = "WARNING";

            if (positionOffDurationRef.current >= positionGracePeriod) {
              recordViolation(
                "FACE_POSITION_UNEVEN",
                "WARNING",
                newWarningMessage,
                Math.round(positionOffDurationRef.current)
              );
            }
          } else {
            positionOffDurationRef.current = 0;
          }

          // B. Head Pose & Looking Away
          if (
            result.headPoseState !== "facing_forward" &&
            (config.lookingAwayDetection ?? true)
          ) {
            lookingAwayDurationRef.current += intervalSec;

            if (lookingAwayDurationRef.current >= 1.5) {
              newWarningMessage = "Please keep your face toward the screen.";
              newSeverity = "WARNING";
              statusText = "Looking Away";
            }

            if (lookingAwayDurationRef.current >= lookingAwayGracePeriod) {
              recordViolation(
                "LOOKING_AWAY",
                "WARNING",
                "Please keep your face toward the screen (prolonged look away).",
                Math.round(lookingAwayDurationRef.current)
              );
            }
          } else {
            lookingAwayDurationRef.current = 0;
          }

          // C. Low Light
          if (
            result.lightingState === "low_light" &&
            (config.lowLightDetection ?? true)
          ) {
            if (!newWarningMessage) {
              newWarningMessage =
                "Your face is difficult to detect. Please improve the lighting.";
              newSeverity = "INFO";
              statusText = "Low Light Condition";
            }
          }

          // If everything is normal, clear alerts automatically
          if (!newWarningMessage) {
            statusText = "Camera Active • Face Centered";
          }
        }

        // Update Proctoring State & Alert
        setProctoringState({
          faceCount: result.faceCount,
          positionState: result.positionState,
          headPoseState: result.headPoseState,
          lightingState: result.lightingState,
          confidence: result.confidence,
          statusText,
        });

        if (newWarningMessage) {
          setActiveAlert({ message: newWarningMessage, severity: newSeverity });
          onWarningMessage?.(newWarningMessage);
        } else {
          setActiveAlert(null);
          onWarningMessage?.(null);
        }
      } catch (e) {
        console.warn("AI Frame evaluation tick exception:", e);
      }
    }, intervalMs);

    return () => clearInterval(loop);
  }, [
    isExamSubmitted,
    webcamStream,
    cameraStatus,
    config,
    noFaceGracePeriod,
    lookingAwayGracePeriod,
    positionGracePeriod,
    recordViolation,
    onWarningMessage,
  ]);

  // LIVE CANVAS HUD RETICLE OVERLAY
  useEffect(() => {
    let animId: number;
    let scanY = 0;
    let scanDir = 1;

    const drawHud = () => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (cameraStatus !== "active") return;

      const isWarning = activeAlert !== null;
      const isCritical =
        activeAlert?.severity === "HIGH" ||
        activeAlert?.severity === "CRITICAL" ||
        proctoringState.faceCount === 0 ||
        proctoringState.faceCount > 1;

      const themeColor = isCritical
        ? "#DC2626"
        : isWarning
        ? "#F59E0B"
        : "#16A34A";

      // 1. Moving Laser Scanline
      scanY += scanDir * 1.5;
      if (scanY >= h || scanY <= 0) scanDir *= -1;

      ctx.strokeStyle = isCritical
        ? "rgba(220, 38, 38, 0.45)"
        : isWarning
        ? "rgba(245, 158, 11, 0.4)"
        : "rgba(22, 163, 74, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();

      // 2. Center Face Target Box (HUD Reticle)
      const boxW = Math.min(140, w * 0.55);
      const boxH = Math.min(170, h * 0.72);
      const boxX = (w - boxW) / 2;
      const boxY = (h - boxH) / 2 - 5;
      const bracketLen = 14;

      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2.5;

      // Top-Left Corner
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + bracketLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + bracketLen, boxY);
      ctx.stroke();

      // Top-Right Corner
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - bracketLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + bracketLen);
      ctx.stroke();

      // Bottom-Left Corner
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - bracketLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + bracketLen, boxY + boxH);
      ctx.stroke();

      // Bottom-Right Corner
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - bracketLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - bracketLen);
      ctx.stroke();

      // 3. Eye Tracking Crosshair circles
      const eyeY = boxY + boxH * 0.33;
      const leftEyeX = boxX + boxW * 0.32;
      const rightEyeX = boxX + boxW * 0.68;

      ctx.strokeStyle = isCritical ? "#DC2626" : "#2563EB";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 5, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, 5, 0, 2 * Math.PI);
      ctx.stroke();

      // Status HUD Tag
      ctx.fillStyle = themeColor;
      ctx.font = "bold 9px monospace";
      ctx.fillText(
        `AI ID #PROCTOR • ${proctoringState.confidence}%`,
        boxX,
        Math.max(12, boxY - 6)
      );

      animId = requestAnimationFrame(drawHud);
    };

    animId = requestAnimationFrame(drawHud);
    return () => cancelAnimationFrame(animId);
  }, [cameraStatus, activeAlert, proctoringState]);

  // Tab Switching, Focus Loss & Fullscreen Security Listeners
  useEffect(() => {
    if (isExamSubmitted) return;

    // Visibility Change Listener (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.hidden && (config.enableTabSwitchDetection ?? true)) {
        recordViolation(
          "TAB_SWITCH",
          "HIGH",
          "Tab switch detected! Leaving the exam screen violates security policy."
        );
      }
    };

    // Window Blur Listener (Loss of Window Focus / Minimize)
    const handleWindowBlur = () => {
      if (config.enableTabSwitchDetection ?? true) {
        recordViolation(
          "WINDOW_SWITCH",
          "WARNING",
          "Browser window lost focus or was minimized."
        );
      }
    };

    // Fullscreen Change Listener
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && (config.fullscreenRequired ?? true)) {
        recordViolation(
          "FULLSCREEN_EXIT",
          "WARNING",
          "Fullscreen mode exited. Please return to fullscreen immediately."
        );
      }
    };

    // Online / Offline Listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Reconnected",
        description: "Internet connection restored. Progress auto-synced.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      onAutoSave?.();
      toast({
        variant: "destructive",
        title: "Offline Warning",
        description: "Internet connection lost. Local progress auto-saved.",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isExamSubmitted, config, recordViolation, onAutoSave, toast]);

  // Auto-Save Interval
  useEffect(() => {
    if (isExamSubmitted) return;
    const saveInterval = setInterval(() => {
      onAutoSave?.();
    }, 15000);
    return () => clearInterval(saveInterval);
  }, [isExamSubmitted, onAutoSave]);

  if (isExamSubmitted) return null;

  // COMPACT / HEADER EMBEDDED VARIANT
  if (variant === "compact") {
    return (
      <div className="h-[84px] bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center pr-3.5 overflow-hidden shrink-0 shadow-sm">
        <div className="w-[115px] h-full bg-[#09090B] relative overflow-hidden shrink-0 border-r border-[#E5E7EB] dark:border-[#27272A]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              webcamStream ? "block" : "hidden"
            }`}
          />
          <canvas
            ref={overlayCanvasRef}
            width={160}
            height={120}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {!webcamStream && (
            <button
              type="button"
              onClick={() => requestWebcamAccess()}
              className="w-full h-full flex flex-col items-center justify-center bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold gap-1"
              title="Click to Enable Camera"
            >
              <Camera className="h-4 w-4" />
              <span>Enable Cam</span>
            </button>
          )}

          {webcamStream && (
            <div className="absolute top-1 left-1 bg-[#09090B]/85 backdrop-blur-xs text-[8px] font-mono text-[#16A34A] px-1 py-0.5 rounded border border-[#16A34A]/40 flex items-center gap-1 z-20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              LIVE
            </div>
          )}
        </div>

        <div className="flex flex-col text-[11px] leading-tight font-medium pl-3 space-y-1 min-w-[130px]">
          <div className="flex items-center justify-between gap-1">
            <span
              className={`font-bold text-[10px] flex items-center gap-1 ${
                activeAlert
                  ? activeAlert.severity === "HIGH" || activeAlert.severity === "CRITICAL"
                    ? "text-[#DC2626]"
                    : "text-[#D97706]"
                  : "text-[#16A34A]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  activeAlert
                    ? activeAlert.severity === "HIGH" || activeAlert.severity === "CRITICAL"
                      ? "bg-[#DC2626]"
                      : "bg-[#D97706]"
                    : "bg-[#16A34A] animate-ping"
                }`}
              />
              {activeAlert ? activeAlert.severity : "ACTIVE"}
            </span>

            <span className="text-[10px] font-bold text-[#6B7280]">
              {warningCount}/{maxWarnings}
            </span>
          </div>

          <span className="text-[#111827] dark:text-[#FAFAFA] font-semibold text-[10px] truncate max-w-[140px]">
            {proctoringState.statusText}
          </span>
          <span className="text-[#6B7280] text-[9px] font-mono uppercase">
            AI Face Tracking
          </span>
        </div>
      </div>
    );
  }

  // DEFAULT FULL SIDEBAR CARD VARIANT
  return (
    <div className="space-y-3">
      {/* Top Banner Alert if any active violation */}
      {activeAlert && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 shadow-sm transition-all ${
            activeAlert.severity === "CRITICAL" || activeAlert.severity === "HIGH"
              ? "bg-[#DC2626]/10 border-[#DC2626]/40 text-[#DC2626]"
              : "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#B45309] dark:text-[#FBBF24]"
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="text-xs">{activeAlert.message}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/10">
            {activeAlert.severity}
          </span>
        </div>
      )}

      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#2563EB]/5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
              AI Proctoring Monitor
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                cameraStatus === "active" ? "bg-[#16A34A] animate-ping" : "bg-[#DC2626]"
              }`}
            />
            <span className="text-[10px] font-bold text-[#16A34A]">30 FPS</span>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {!isOnline && (
            <div className="p-2.5 bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-lg text-xs flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Connection Offline. Progress auto-saved locally.</span>
            </div>
          )}

          {/* Live Video with Canvas Reticle */}
          <div className="aspect-video bg-[#09090B] rounded-xl flex items-center justify-center text-white relative overflow-hidden border border-[#27272A]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover rounded-xl ${
                webcamStream ? "block" : "hidden"
              }`}
            />

            <canvas
              ref={overlayCanvasRef}
              width={320}
              height={240}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {!webcamStream && (
              <div className="w-full h-full bg-[#09090B] flex flex-col items-center justify-center text-center p-4 relative space-y-2">
                <Camera className="h-8 w-8 text-[#2563EB] animate-bounce" />
                <p className="text-xs text-[#D1D5DB] font-medium">
                  Camera Permission Required
                </p>
                <Button
                  size="sm"
                  onClick={() => requestWebcamAccess()}
                  className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1.5 px-3 rounded-xl"
                >
                  <Camera className="h-3.5 w-3.5" /> Enable Live Camera Stream
                </Button>
              </div>
            )}

            {webcamStream && (
              <div className="absolute top-2 left-2 z-20 bg-[#09090B]/85 backdrop-blur-xs text-[10px] font-mono text-[#16A34A] px-2 py-0.5 rounded-md border border-[#16A34A]/40 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                LIVE AI PROCTORING
              </div>
            )}
          </div>

          {/* Status Metrics List */}
          <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-xs text-[#6B7280] space-y-2">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <strong className="text-[#111827] dark:text-[#FAFAFA] font-semibold">
                {proctoringState.statusText}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span>Face Position:</span>
              <strong
                className={`capitalize ${
                  proctoringState.positionState === "centered"
                    ? "text-[#16A34A]"
                    : "text-[#D97706]"
                }`}
              >
                {proctoringState.positionState.replace(/_/g, " ")}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span>Head Attention:</span>
              <strong
                className={`capitalize ${
                  proctoringState.headPoseState === "facing_forward"
                    ? "text-[#16A34A]"
                    : "text-[#D97706]"
                }`}
              >
                {proctoringState.headPoseState.replace(/_/g, " ")}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span>Lighting Quality:</span>
              <strong
                className={`capitalize ${
                  proctoringState.lightingState === "good"
                    ? "text-[#16A34A]"
                    : "text-[#D97706]"
                }`}
              >
                {proctoringState.lightingState.replace(/_/g, " ")}
              </strong>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <span>Warning Counter:</span>
              <Badge
                className={`text-[10px] font-bold ${
                  warningCount === 0
                    ? "bg-[#16A34A] text-white"
                    : warningCount < maxWarnings
                    ? "bg-[#F59E0B] text-white"
                    : "bg-[#DC2626] text-white"
                }`}
              >
                {warningCount} / {maxWarnings} Warnings
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
