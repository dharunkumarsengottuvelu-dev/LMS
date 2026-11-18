"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SensilearnLogoProps {
  /** Logo display variant: 'mark' (official logo mark only - default), 'full' (mark + clean text) */
  variant?: "full" | "mark";
  /** Logo mark color: 'blue' (default official blue), 'white' (pure white for dark hero panels) */
  color?: "blue" | "white";
  /** Standard size presets or customize with width/height */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Custom pixel height for mark (width auto-calculated from 410:220 aspect ratio) */
  markHeight?: number;
  /** Custom pixel width for mark */
  markWidth?: number;
  /** Optional portal label next to or under mark (e.g., 'Student Portal', 'Enterprise Admin') */
  subtitle?: string;
  /** Optional institutional tagline (e.g. 'SENSI Group') */
  tagline?: string;
  /** Color theme for text: 'auto' (adapts to light/dark mode), 'light' (dark text), 'dark' (white text) */
  theme?: "auto" | "light" | "dark";
  /** Optional destination URL to wrap logo in a Link */
  href?: string;
  /** Next.js image preloading priority */
  priority?: boolean;
  /** Additional wrapper classes */
  className?: string;
  /** Additional image element classes */
  imgClassName?: string;
  /** Extra badge/label element to render next to brand */
  badge?: React.ReactNode;
}

const sizeConfig = {
  xs: {
    markH: 18,
    markW: 34,
    textSize: "text-base",
    subtextSize: "text-[9px]",
    gap: "gap-2",
  },
  sm: {
    markH: 24,
    markW: 45,
    textSize: "text-lg",
    subtextSize: "text-[10px]",
    gap: "gap-2.5",
  },
  md: {
    markH: 30,
    markW: 56,
    textSize: "text-xl",
    subtextSize: "text-xs",
    gap: "gap-3",
  },
  lg: {
    markH: 38,
    markW: 71,
    textSize: "text-2xl",
    subtextSize: "text-sm",
    gap: "gap-3.5",
  },
  xl: {
    markH: 48,
    markW: 89,
    textSize: "text-3xl",
    subtextSize: "text-base",
    gap: "gap-4",
  },
};

export function SensilearnLogo({
  variant = "mark",
  color,
  size = "md",
  markHeight,
  markWidth,
  subtitle,
  tagline,
  theme = "auto",
  href,
  priority = false,
  className,
  imgClassName,
  badge,
}: SensilearnLogoProps) {
  const config = sizeConfig[size] || sizeConfig.md;
  const actualH = markHeight || config.markH;
  const actualW = markWidth || Math.round(actualH * (410 / 220));

  const isWhiteLogo = color === "white" || (color !== "blue" && theme === "dark");
  const markSrc = isWhiteLogo ? "/sensilearn-logo-white-mark.png" : "/sensilearn-logo-mark.png";

  const textThemeClasses =
    theme === "dark"
      ? "text-white"
      : theme === "light"
      ? "text-slate-900"
      : "text-slate-900 dark:text-white";

  const subtextThemeClasses =
    theme === "dark"
      ? "text-slate-400"
      : theme === "light"
      ? "text-slate-500"
      : "text-slate-500 dark:text-slate-400";

  const taglineThemeClasses =
    theme === "dark"
      ? "text-blue-400"
      : theme === "light"
      ? "text-blue-600"
      : "text-blue-600 dark:text-blue-400";

  const renderMark = (
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-center select-none",
        isWhiteLogo && "drop-shadow-[0_2px_10px_rgba(255,255,255,0.12)]",
        !isWhiteLogo && theme === "dark" && "brightness-125 saturate-150 contrast-125 drop-shadow-[0_2px_12px_rgba(37,99,235,0.35)]",
        imgClassName
      )}
      style={{ width: actualW, height: actualH }}
    >
      <Image
        src={markSrc}
        alt="Sensilearn"
        width={isWhiteLogo ? 566 : 410}
        height={isWhiteLogo ? 304 : 220}
        priority={priority}
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  );

  const renderText = (
    <div className="flex flex-col justify-center leading-none">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-extrabold tracking-tight leading-none select-none",
            config.textSize,
            textThemeClasses
          )}
        >
          SensiLearn
        </span>
        {badge}
      </div>
      {subtitle && (
        <span
          className={cn(
            "font-medium tracking-tight mt-1 leading-none select-none",
            config.subtextSize,
            subtextThemeClasses
          )}
        >
          {subtitle}
        </span>
      )}
      {tagline && (
        <span
          className={cn(
            "font-bold tracking-wider uppercase mt-1 leading-none select-none text-[9.5px]",
            taglineThemeClasses
          )}
        >
          {tagline}
        </span>
      )}
    </div>
  );

  const content = (
    <div
      className={cn(
        "inline-flex items-center group transition-opacity hover:opacity-95",
        config.gap,
        className
      )}
    >
      {renderMark}
      {variant === "full" && renderText}
      {variant === "mark" && subtitle && (
        <span
          className={cn(
            "font-medium tracking-tight leading-none select-none px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
            config.subtextSize
          )}
        >
          {subtitle}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}

export default SensilearnLogo;

