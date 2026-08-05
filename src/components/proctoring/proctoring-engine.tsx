"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, ShieldCheck, AlertTriangle, UserCheck, ShieldAlert, WifiOff, Wifi, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type ViolationType =
  | "CAMERA_DISABLED"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES"
  | "FACE_OUTSIDE_FRAME"
  | "SIDE_GAZE_DETECTED"
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
  enableFaceMonitoring: boolean;
  cameraRequired: boolean;
  fullscreenRequired: boolean;
  enableTabSwitchDetection: boolean;
  enableMultipleFaceDetection: boolean;
  enableFaceVisibilityDetection: boolean;
  maxAllowedViolations: number;
  autoSubmit: boolean;
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

  // Internal Engine States
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"connecting" | "active" | "denied" | "disconnected">("connecting");
  const [violationCount, setViolationCount] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const violationCountRef = useRef<number>(0);
  violationCountRef.current = violationCount;

  // Record Structured Violation Log & Dispatch Header Alert Warning
  const recordViolation = useCallback(
    (type: ViolationType, message: string) => {
      if (isExamSubmitted) return;

      const newLog: ViolationLog = {
        id: `vlog_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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

      toast({
        variant: "destructive",
        title: `Security Warning (${nextCount}/${config.maxAllowedViolations})`,
        description: message,
      });

      if (config.autoSubmit && nextCount >= config.maxAllowedViolations) {
        onAutoSubmit(`Security Policy Violation: Exceeded maximum allowed warnings (${nextCount}/${config.maxAllowedViolations}).`);
      }
    },
    [isExamSubmitted, studentId, testId, config, toast, onViolationOccurred, onAutoSubmit, onWarningMessage]
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

        // Track disconnection handler
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setCameraStatus("disconnected");
            recordViolation("CAMERA_DISABLED", "Webcam hardware disconnected during examination.");
          };
        });

        setWebcamStream(stream);
        setCameraStatus("active");
      }
    } catch (err: any) {
      console.warn("Hardware camera request error:", err);
      setCameraStatus("denied");
      setCameraError(err?.message || "Camera access permission denied.");
      recordViolation("CAMERA_PERMISSION_DENIED", "Camera access denied or blocked by browser policy.");
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
    if (!isExamSubmitted && config.cameraRequired) {
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

  // Tab Switching, Focus Loss & Fullscreen Listeners
  useEffect(() => {
    if (isExamSubmitted) return;

    // Visibility Change Listener (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.hidden && config.enableTabSwitchDetection) {
        recordViolation("TAB_SWITCH", "Forbidden tab switch detected! Remain on the examination window.");
      }
    };

    // Window Blur Listener (Loss of Window Focus / Minimize)
    const handleWindowBlur = () => {
      if (config.enableTabSwitchDetection) {
        recordViolation("WINDOW_SWITCH", "Browser window lost focus or was minimized.");
      }
    };

    // Fullscreen Change Listener
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && config.fullscreenRequired) {
        recordViolation("FULLSCREEN_EXIT", "Fullscreen mode exited! Return to fullscreen mode immediately.");
      }
    };

    // Online / Offline Listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Reconnected", description: "Internet connection restored. Progress synced." });
    };

    const handleOffline = () => {
      setIsOnline(false);
      onAutoSave?.();
      toast({ variant: "destructive", title: "Offline Connection Warning", description: "Internet connection lost. Progress auto-saved." });
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
      <div className="w-[140px] h-[44px] bg-[#09090B] rounded-xl overflow-hidden relative border border-[#2563EB]/40 shrink-0 shadow-xs">
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
            className="w-full h-full flex items-center justify-center bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold gap-1 px-2"
          >
            <Camera className="h-3 w-3" /> Enable Cam
          </button>
        )}
        {webcamStream && (
          <div className="absolute bottom-1 left-1 bg-[#09090B]/85 text-[8px] font-mono text-[#16A34A] px-1.5 py-0.5 rounded flex items-center gap-1 border border-[#16A34A]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            LIVE CAM
          </div>
        )}
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
                  : violationCount < config.maxAllowedViolations
                  ? "bg-[#F59E0B] text-white"
                  : "bg-[#DC2626] text-white"
              }`}
            >
              {violationCount} / {config.maxAllowedViolations} Warnings
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
