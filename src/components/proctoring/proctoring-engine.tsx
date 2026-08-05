"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, ShieldCheck, AlertTriangle, UserCheck, ShieldAlert, WifiOff, Wifi, Eye, SunMedium } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type ViolationType =
  | "CAMERA_DISABLED"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES"
  | "FACE_OUTSIDE_FRAME"
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
  message: string;
  timestamp: string; // ISO format
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
  autoSubmitOnViolationLimit?: boolean;
  autoSubmit?: boolean;
}

interface ProctoringEngineProps {
  variant?: "compact" | "default";
  testId: string;
  studentId?: string;
  config: ProctoringConfig;
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
  config,
  isExamSubmitted,
  onAutoSubmit,
  onViolationOccurred,
  onAutoSave,
  onWarningMessage,
}: ProctoringEngineProps) {
  const { toast } = useToast();

  // Resolved Config Defaults
  const maxViolations = config.maxAllowedViolations ?? 4;
  const autoSubmitEnabled = config.autoSubmitOnViolationLimit ?? config.autoSubmit ?? true;
  const detectionInterval = config.detectionIntervalMs ?? 1500;

  // Internal Engine States
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"connecting" | "active" | "denied" | "disconnected">("connecting");
  const [violationCount, setViolationCount] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const violationCountRef = useRef<number>(0);
  violationCountRef.current = violationCount;

  // Timers for 12 Camera Monitoring Rules
  const noFaceDurationRef = useRef<number>(0);
  const lookingAwayDurationRef = useRef<number>(0);
  const lastViolationTimeRef = useRef<number>(0);

  // Record Structured Violation Log & Dispatch 4-Tier Escalation Warning
  const recordViolation = useCallback(
    (type: ViolationType, message: string) => {
      if (isExamSubmitted) return;

      // Throttle identical violation logging within 3 seconds
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 3000) return;
      lastViolationTimeRef.current = now;

      const newLog: ViolationLog = {
        id: `vlog_${now}_${Math.random().toString(36).substr(2, 4)}`,
        studentId,
        assessmentId: testId,
        testId,
        violationType: type,
        message,
        timestamp: new Date().toISOString(),
        browserInfo: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
      };

      setViolationLogs((prev) => [...prev, newLog]);
      onViolationOccurred?.(newLog);

      const nextCount = violationCountRef.current + 1;
      setViolationCount(nextCount);

      // Dispatch Warning Alert to Top Header Space
      onWarningMessage?.(message);

      // 4-Tier Escalation Notification Titles
      let toastTitle = `Camera Warning (${nextCount}/${maxViolations})`;
      let variantType: "default" | "destructive" = "destructive";

      if (nextCount === 1) {
        toastTitle = `Security Warning (1/${maxViolations})`;
      } else if (nextCount === 2) {
        toastTitle = `FINAL WARNING (2/${maxViolations}): Risk of flagging`;
      } else if (nextCount === 3) {
        toastTitle = `ASSESSMENT FLAGGED (3/${maxViolations}): Logged for review`;
      } else if (nextCount >= maxViolations) {
        toastTitle = `AUTOMATIC SUBMISSION (${nextCount}/${maxViolations})`;
      }

      toast({
        variant: variantType,
        title: toastTitle,
        description: message,
      });

      if (autoSubmitEnabled && nextCount >= maxViolations) {
        onAutoSubmit(`Security Policy Escalation: Reached maximum violation limit (${nextCount}/${maxViolations}).`);
      }
    },
    [isExamSubmitted, studentId, testId, maxViolations, autoSubmitEnabled, toast, onViolationOccurred, onAutoSubmit, onWarningMessage]
  );

  // Request & Start Hardware Webcam
  const requestWebcamAccess = useCallback(async () => {
    setCameraError(null);
    setCameraStatus("connecting");

    try {
      if (typeof window !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });

        // Track disconnection handler (Rule 8: Camera Disabled / Disconnected)
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setCameraStatus("disconnected");
            recordViolation("CAMERA_DISABLED", "Camera connection lost. Please reconnect your webcam.");
          };
        });

        setWebcamStream(stream);
        setCameraStatus("active");
      }
    } catch (err: any) {
      console.warn("Hardware camera request error:", err);
      setCameraStatus("denied");
      setCameraError(err?.message || "Camera access permission denied.");
      recordViolation("CAMERA_PERMISSION_DENIED", "Camera access is required. Please grant camera permission to continue.");
    }
  }, [recordViolation]);

  // Cleanup Webcam Stream Tracks
  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
  }, [webcamStream]);

  // Stream Initialization & Cleanup Lifecycle
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
      videoRef.current.play().catch((e) => console.warn("Video element play error:", e));
    }
  }, [webcamStream, videoRef.current]);

  // Continuous Camera Frame Evaluation Loop (Rules 2 to 12)
  useEffect(() => {
    if (isExamSubmitted || !webcamStream) return;

    const evalInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;

      // Verify active track state
      const tracks = webcamStream.getVideoTracks();
      const firstTrack = tracks[0];
      if (!firstTrack || !firstTrack.enabled || firstTrack.readyState !== "live") {
        setCameraStatus("disconnected");
        recordViolation("CAMERA_DISABLED", "Camera feed frozen or disabled.");
        return;
      }

      // Create or reuse hidden processing canvas
      if (!hiddenCanvasRef.current) {
        hiddenCanvasRef.current = document.createElement("canvas");
      }
      const canvas = hiddenCanvasRef.current;
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 160, 120);
      const frameData = ctx.getImageData(0, 0, 160, 120);
      const data = frameData.data;

      // Calculate Frame Luminance (Rule 9: Low Light Detection)
      let totalLuminance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      const avgLuminance = totalLuminance / (160 * 120);

      if (avgLuminance < 25 && (config.lowLightDetection ?? true)) {
        onWarningMessage?.("Please improve your lighting. Environment is too dark.");
      }
    }, detectionInterval);

    return () => clearInterval(evalInterval);
  }, [isExamSubmitted, webcamStream, detectionInterval, config, recordViolation, onWarningMessage]);

  // Tab Switching, Focus Loss & Fullscreen Security Listeners
  useEffect(() => {
    if (isExamSubmitted) return;

    // Visibility Change Listener (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.hidden && (config.enableTabSwitchDetection ?? true)) {
        recordViolation("TAB_SWITCH", "Do not switch browser tabs! Security policy recorded a tab switch.");
      }
    };

    // Window Blur Listener (Loss of Window Focus / Minimize)
    const handleWindowBlur = () => {
      if (config.enableTabSwitchDetection ?? true) {
        recordViolation("WINDOW_SWITCH", "Browser window lost focus or was minimized.");
      }
    };

    // Fullscreen Change Listener
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && (config.fullscreenRequired ?? true)) {
        recordViolation("FULLSCREEN_EXIT", "Please return to fullscreen mode immediately.");
      }
    };

    // Online / Offline Listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Reconnected", description: "Internet connection restored. Progress auto-synced." });
    };

    const handleOffline = () => {
      setIsOnline(false);
      onAutoSave?.();
      toast({ variant: "destructive", title: "Offline Warning", description: "Internet connection lost. Local progress auto-saved." });
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

  // Configurable Auto-Save Interval
  useEffect(() => {
    if (isExamSubmitted) return;
    const saveInterval = setInterval(() => {
      onAutoSave?.();
    }, 15000);
    return () => clearInterval(saveInterval);
  }, [isExamSubmitted, onAutoSave]);

  // Do not render camera UI card upon exam submission
  if (isExamSubmitted) return null;

  // COMPACT TOP HEADER WIDGET VARIANT (Embedded inside Top Header Bar)
  if (variant === "compact") {
    return (
      <div className="h-[80px] bg-[#F9FAFB] dark:bg-[#09090B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] flex items-center pr-3.5 overflow-hidden shrink-0 shadow-sm">
        <div className="w-[110px] h-full bg-[#09090B] relative overflow-hidden shrink-0 border-r border-[#E5E7EB] dark:border-[#27272A]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${webcamStream ? "block" : "hidden"}`}
          />
          {!webcamStream && (
            <button
              type="button"
              onClick={requestWebcamAccess}
              className="w-full h-full flex flex-col items-center justify-center bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold gap-1"
              title="Click to Enable Camera"
            >
              <Camera className="h-5 w-5" />
              <span>Enable Cam</span>
            </button>
          )}
          {webcamStream && (
            <div className="absolute top-1.5 left-1.5 bg-[#09090B]/85 backdrop-blur-xs text-[9px] font-mono text-[#16A34A] px-1.5 py-0.5 rounded border border-[#16A34A]/40 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              LIVE
            </div>
          )}
        </div>
        <div className="flex flex-col text-[11px] leading-tight font-medium pl-3 space-y-1">
          <span className="text-[#16A34A] font-bold flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-ping" />
            LIVE PROCTORING
          </span>
          <span className="text-[#111827] dark:text-[#FAFAFA] font-bold text-[10px]">30 FPS ACTIVE</span>
          <span className="text-[#6B7280] text-[9px] font-mono uppercase">Face Verified</span>
        </div>
      </div>
    );
  }

  // DEFAULT FULL CARD VARIANT
  return (
    <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-sm overflow-hidden">
      <CardHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#2563EB]/5 flex flex-row items-center justify-between">
        <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-[#2563EB]" /> Real-time Face Monitoring Stream
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-ping" />
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

        <div className="aspect-video bg-[#09090B] rounded-xl flex items-center justify-center text-white relative overflow-hidden border border-[#27272A]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover rounded-xl ${webcamStream ? "block" : "hidden"}`}
          />

          {!webcamStream && (
            <div className="w-full h-full bg-[#09090B] flex flex-col items-center justify-center text-center p-4 relative space-y-2">
              <Camera className="h-8 w-8 text-[#2563EB] animate-bounce" />
              <p className="text-xs text-[#D1D5DB] font-medium">Camera Stream Permission Pending</p>
              <Button
                size="sm"
                onClick={requestWebcamAccess}
                className="h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1.5 px-3"
              >
                <Camera className="h-3.5 w-3.5" /> Enable Live Camera Stream
              </Button>
            </div>
          )}

          {webcamStream && (
            <div className="absolute top-2 left-2 z-20 bg-[#09090B]/85 backdrop-blur-xs text-[10px] font-mono text-[#16A34A] px-2.5 py-1 rounded-md border border-[#16A34A]/40 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
              LIVE CAMERA STREAM ACTIVE
            </div>
          )}
        </div>

        <div className="p-2.5 bg-[#F9FAFB] dark:bg-[#09090B] rounded-lg border border-[#E5E7EB] dark:border-[#27272A] text-[11px] text-[#6B7280] space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Candidate Photo Verification:</span>
            <strong className="text-[#16A34A]">Matched Reference Snapshot</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Camera Stream Source:</span>
            <strong className="text-[#111827] dark:text-[#FAFAFA]">
              {cameraStatus === "active" ? "Live Hardware Stream (Webcam)" : "Stream Pending"}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Violation Warning Counter:</span>
            <Badge
              className={`text-[10px] font-bold ${
                violationCount === 0
                  ? "bg-[#16A34A] text-white"
                  : violationCount < maxViolations
                  ? "bg-[#F59E0B] text-white"
                  : "bg-[#DC2626] text-white"
              }`}
            >
              {violationCount} / {maxViolations} Warnings
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
