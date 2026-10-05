"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text displayed beneath the logo (e.g., "Loading...", "Loading practice...") */
  text?: string;
  /** Optional secondary subtitle */
  subtext?: string;
  /** Size variant for the animated logo */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether this is a full-page centered loader */
  fullScreen?: boolean;
  /** Whether to show the subtle surrounding pulse ring */
  ring?: boolean;
  /** Whether to render the loading text */
  showText?: boolean;
}

const sizeMap = {
  sm: {
    container: "w-10 h-10",
    image: 40,
    ring: "w-14 h-14",
    text: "text-xs font-semibold",
    subtext: "text-[11px]",
    gap: "gap-2",
  },
  md: {
    container: "w-14 h-14",
    image: 56,
    ring: "w-20 h-20",
    text: "text-sm font-semibold",
    subtext: "text-xs",
    gap: "gap-3",
  },
  lg: {
    container: "w-18 h-18 sm:w-20 sm:h-20",
    image: 76,
    ring: "w-26 h-26 sm:w-30 sm:h-30",
    text: "text-base font-bold",
    subtext: "text-xs text-muted-foreground",
    gap: "gap-3.5",
  },
  xl: {
    container: "w-24 h-24 sm:w-28 sm:h-28",
    image: 104,
    ring: "w-36 h-36 sm:w-42 sm:h-42",
    text: "text-lg font-bold",
    subtext: "text-sm text-muted-foreground",
    gap: "gap-4",
  },
};

export function Loading({
  text = "Loading...",
  subtext,
  size = "md",
  fullScreen = false,
  ring = true,
  showText = true,
  className,
  ...props
}: LoadingProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const config = sizeMap[size] || sizeMap.md;

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={text}
      className={cn(
        "flex flex-col items-center justify-center text-center select-none",
        fullScreen
          ? "fixed inset-0 z-[9999] h-screen h-[100dvh] w-screen w-[100dvw] bg-background/95 backdrop-blur-xs flex flex-col items-center justify-center m-0 p-4"
          : size === "sm"
          ? "w-full flex-1 flex flex-col items-center justify-center py-6"
          : "w-full flex-1 min-h-[50vh] flex flex-col items-center justify-center py-12",
        config.gap,
        className
      )}
      {...props}
    >
      {/* Self-contained CSS Animation to guarantee it always runs */}
      <style>{`
        @keyframes sensilPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
            filter: drop-shadow(0 0 0 rgba(37, 99, 235, 0));
          }
          50% {
            transform: scale(1.06);
            opacity: 0.88;
            filter: drop-shadow(0 6px 20px rgba(37, 99, 235, 0.35));
          }
        }
        @keyframes sensilRing {
          0%, 100% {
            transform: scale(0.92);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.18);
            opacity: 0.12;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .sensil-anim-logo, .sensil-anim-ring {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Animated Logo Container with Optional Aura Ring */}
      <div className="relative flex items-center justify-center">
        {ring && (
          <div
            aria-hidden="true"
            className={cn(
              "absolute rounded-full pointer-events-none sensil-anim-ring",
              "bg-blue-500/15 dark:bg-blue-400/20 ring-1 ring-blue-500/30 dark:ring-blue-400/30",
              config.ring
            )}
            style={{
              animation: "sensilRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        )}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full sensil-anim-logo",
            config.container
          )}
          style={{
            animation: "sensilPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon.png"
            alt="SensilLearn"
            width={config.image}
            height={config.image}
            className="w-full h-full object-contain rounded-full drop-shadow-sm select-none"
          />
        </div>
      </div>

      {/* Loading Text & Subtitle */}
      {showText && (
        <div className="space-y-1 max-w-xs mx-auto px-4">
          <p className={cn("tracking-tight text-foreground", config.text)}>
            {text}
          </p>
          {subtext && (
            <p className={cn("text-muted-foreground leading-relaxed", config.subtext)}>
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen && mounted && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}

export default Loading;
