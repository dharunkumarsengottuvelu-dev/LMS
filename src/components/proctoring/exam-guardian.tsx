"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Lock, Eye, MonitorX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/lib/security/audit-logger";

export interface ExamGuardianProps {
  children: React.ReactNode;
  isActive: boolean;
  testTitle?: string;
  studentId?: string;
  maxViolationsAllowed?: number;
  onViolation?: (reason: string, violationCount: number) => void;
  onAutoSubmit?: () => void;
}

export function ExamGuardian({
  children,
  isActive,
  testTitle = "Proctored Assessment",
  studentId = "std_current",
  maxViolationsAllowed = 3,
  onViolation,
  onAutoSubmit,
}: ExamGuardianProps) {
  const [violationCount, setViolationCount] = useState(0);
  const [lastViolationReason, setLastViolationReason] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const { toast } = useToast();

  const handleViolation = useCallback(
    (reason: string) => {
      if (!isActive) return;

      setViolationCount((prev) => {
        const nextCount = prev + 1;
        setLastViolationReason(reason);

        // Audit Log
        logSecurityEvent(
          "EXAM_PROCTORING_ALERT",
          { testTitle, reason, count: nextCount, maxAllowed: maxViolationsAllowed },
          { userId: studentId, role: "student" }
        );

        toast({
          title: "Security Violation Detected",
          description: `${reason}. Warning ${nextCount}/${maxViolationsAllowed}. Repeated violations will auto-submit your test.`,
          variant: "destructive",
        });

        if (onViolation) {
          onViolation(reason, nextCount);
        }

        if (nextCount >= maxViolationsAllowed) {
          logSecurityEvent(
            "EXAM_TERMINATED",
            { testTitle, reason: "Max violation limit exceeded" },
            { userId: studentId, role: "student" }
          );

          toast({
            title: "Exam Auto-Submitted",
            description: `Test terminated due to ${maxViolationsAllowed} security violations. Your responses have been saved.`,
            variant: "destructive",
          });

          if (onAutoSubmit) {
            onAutoSubmit();
          }
        }

        return nextCount;
      });
    },
    [isActive, testTitle, studentId, maxViolationsAllowed, onViolation, onAutoSubmit, toast]
  );

  useEffect(() => {
    if (!isActive) return;

    // 1. Disable Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation("Right-click context menu is disabled during proctored exams");
    };

    // 2. Disable Copy, Paste, Cut
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation(`Clipboard action (${e.type}) is restricted during proctored exams`);
    };

    // 3. Tab Switching / Window Blur Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab switched or browser minimized during exam");
      }
    };

    const handleBlur = () => {
      handleViolation("Window focus lost (switched to another app)");
    };

    // 4. DevTools & Inspection Keybindings Detection
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === "F12") {
        e.preventDefault();
        handleViolation("F12 Developer Tools keypress detected");
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.shiftKey ? ["I", "J", "C", "i", "j", "c"].includes(e.key) : ["U", "u", "S", "s"].includes(e.key))
      ) {
        e.preventDefault();
        handleViolation("Developer Tools / View Source key combination detected");
      }
    };

    // 5. Fullscreen Exit Detection
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull) {
        handleViolation("Exited required fullscreen mode during exam");
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopyPaste);
    window.addEventListener("paste", handleCopyPaste);
    window.addEventListener("cut", handleCopyPaste);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopyPaste);
      window.removeEventListener("paste", handleCopyPaste);
      window.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isActive, handleViolation]);

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen select-none">
      {/* ── Floating Proctoring Status Banner ── */}
      <div className="fixed top-2 right-4 z-[9999] flex items-center gap-3 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#E5E7EB] dark:border-[#27272A] px-4 py-2 rounded-xl shadow-lg">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#16A34A] animate-pulse" />
          <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">PROCTORING ACTIVE</span>
        </div>

        <div className="h-4 w-[1px] bg-[#E5E7EB] dark:bg-[#27272A]" />

        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Eye className="h-3.5 w-3.5 text-[#2563EB]" />
          <span className="text-[#6B7280]">AI Vision Monitoring</span>
        </div>

        {violationCount > 0 && (
          <Badge className="bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30 text-[10px] font-bold gap-1 px-2 py-0.5">
            <AlertTriangle className="h-3 w-3" />
            Violations: {violationCount}/{maxViolationsAllowed}
          </Badge>
        )}
      </div>

      {/* ── Main Exam View ── */}
      <div className="w-full h-full">{children}</div>
    </div>
  );
}
