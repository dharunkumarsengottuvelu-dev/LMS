"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { SensilearnLoader } from "@/components/brand/sensilearn-loader";

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text displayed beneath the logo (e.g., "Loading...", "Loading practice...") */
  text?: string;
  /** Optional secondary subtitle */
  subtext?: string;
  /** Size variant for the animated logo */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether this is a full-page centered loader */
  fullScreen?: boolean;
  /** Optional surrounding pulse ring */
  ring?: boolean;
  /** Whether to render the loading text */
  showText?: boolean;
}

const sizeMap = {
  sm: {
    width: 44,
    height: 24,
    text: "text-xs font-semibold",
    subtext: "text-[11px]",
    gap: "gap-2",
  },
  md: {
    width: 64,
    height: 34,
    text: "text-sm font-semibold",
    subtext: "text-xs",
    gap: "gap-3",
  },
  lg: {
    width: 80,
    height: 43,
    text: "text-base font-bold",
    subtext: "text-xs text-muted-foreground",
    gap: "gap-3.5",
  },
  xl: {
    width: 96,
    height: 52,
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
  ring = false,
  showText = true,
  className,
  ...props
}: LoadingProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When fullScreen is requested, render the official centered loader with white background
  if (fullScreen) {
    return <SensilearnLoader variant="fullscreen" ariaLabel={text} text={showText ? text : undefined} />;
  }

  const config = sizeMap[size] || sizeMap.md;

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={text}
      className={cn(
        "flex flex-col items-center justify-center text-center select-none",
        size === "sm"
          ? "w-full flex-1 flex flex-col items-center justify-center py-4"
          : "w-full flex-1 min-h-[40vh] flex flex-col items-center justify-center py-10",
        config.gap,
        className
      )}
      {...props}
    >
      <style>{`
        @keyframes sensilInlinePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.04);
            opacity: 0.85;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .sensil-inline-anim {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Official Sensilearn Logo Mark */}
      <div
        className="relative flex items-center justify-center sensil-inline-anim"
        style={{
          width: config.width,
          height: config.height,
          animation: "sensilInlinePulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
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

  return content;
}

export default Loading;
