"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface SensilearnLoaderProps {
  /**
   * Whether the loading state is actively running.
   * When this turns from true -> false, the 250ms completion fade-out executes before unmounting.
   */
  isLoading?: boolean;
  /**
   * Optional callback fired once the completion fade-out finishes and component unmounts.
   */
  onFinish?: () => void;
  /**
   * Visual variant: 'fullscreen' (fixed white overlay) or 'inline' (contained in parent)
   */
  variant?: "fullscreen" | "inline";
  /**
   * Size variant: 'sm' | 'md' | 'lg'
   */
  size?: "sm" | "md" | "lg";
  /**
   * Optional text displayed beneath the logo
   */
  text?: string;
  /**
   * Optional custom classes for the container
   */
  className?: string;
  /**
   * Optional accessible status label for screen readers
   */
  ariaLabel?: string;
}

const sizeConfig = {
  sm: "w-[56px] sm:w-[64px]",
  md: "w-[72px] sm:w-[84px] md:w-[92px]",
  lg: "w-[96px] sm:w-[112px]",
};

export function SensilearnLoader({
  isLoading = true,
  onFinish,
  variant = "fullscreen",
  size = "md",
  text,
  className,
  ariaLabel = "Loading Sensilearn",
}: SensilearnLoaderProps) {
  const [mounted, setMounted] = useState(false);
  // Phase state: 'entering' (0-300ms) -> 'breathing' -> 'exiting' (250ms) -> 'unmounted'
  const [phase, setPhase] = useState<"entering" | "breathing" | "exiting" | "unmounted">(
    isLoading ? "entering" : "unmounted"
  );
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!isLoading) {
      setPhase("unmounted");
      return;
    }
    // Transition from Phase 1 (Appearance, 300ms) to Phase 2 (Breathing)
    const timer = setTimeout(() => {
      setPhase((prev) => (prev === "entering" ? "breathing" : prev));
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && phase !== "unmounted" && phase !== "exiting") {
      // Phase 3: Loading Completion (250ms fade-out)
      setPhase("exiting");
      exitTimerRef.current = setTimeout(() => {
        setPhase("unmounted");
        onFinish?.();
      }, 250);
    }

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [isLoading, onFinish, phase]);

  // Hard maximum safety watchdog: Fullscreen loaders must NEVER freeze or trap the page
  useEffect(() => {
    if (variant !== "fullscreen") return;
    const watchdog = setTimeout(() => {
      setPhase("unmounted");
      onFinish?.();
    }, 1500);
    return () => clearTimeout(watchdog);
  }, [variant, onFinish]);

  if (phase === "unmounted") {
    return null;
  }

  const isFullscreen = variant === "fullscreen";

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn(
        "select-none overflow-hidden flex flex-col items-center justify-center",
        isFullscreen
          ? "fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] bg-white m-0 p-0"
          : "relative w-full h-full min-h-[140px] bg-white/80 py-8",
        phase === "exiting" ? "sensil-exit" : "",
        className
      )}
    >
      {/* Self-contained CSS Animation Rules */}
      <style>{`
        /* Phase 1: Logo Appearance (0ms to 300ms) */
        @keyframes sensilEntrance {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Phase 2: Subtle Breathing Animation (1800ms loop) */
        @keyframes sensilBreathing {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.04);
            opacity: 0.85;
          }
        }

        /* Phase 3: Loading Completion Fade-Out (250ms) */
        .sensil-exit {
          opacity: 0 !important;
          transition: opacity 250ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          pointer-events: none !important;
        }

        .sensil-logo-entering {
          animation: sensilEntrance 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: transform, opacity;
        }

        .sensil-logo-breathing {
          animation: sensilBreathing 1800ms cubic-bezier(0.4, 0, 0.2, 1) infinite;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .sensil-logo-entering,
          .sensil-logo-breathing {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
          .sensil-exit {
            transition: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Centered Logo Asset */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          phase === "entering" && "sensil-logo-entering",
          phase === "breathing" && "sensil-logo-breathing",
          sizeConfig[size] || sizeConfig.md
        )}
        style={{
          aspectRatio: "410 / 220",
        }}
      >
        <Image
          src="/sensilearn-logo-mark.png"
          alt="Sensilearn"
          width={410}
          height={220}
          priority
          className="w-full h-full object-contain pointer-events-none drop-shadow-none"
        />
      </div>

      {text && (
        <p className="mt-3 text-xs font-medium tracking-wide text-slate-500 animate-pulse">
          {text}
        </p>
      )}

      <span className="sr-only">{ariaLabel}</span>
    </div>
  );

  // Portal to body only in fullscreen mode on client
  if (isFullscreen && mounted && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}

export default SensilearnLoader;

