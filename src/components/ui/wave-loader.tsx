"use client";

import React from "react";

interface WaveLoaderProps {
  label?: string;
  subLabel?: string;
  size?: "sm" | "md" | "lg" | "fullscreen";
}

export function WaveLoader({
  label = "Loading Assessment Environment...",
  subLabel = "Please wait while we prepare your questions & test cases",
  size = "md",
}: WaveLoaderProps) {
  const isFullscreen = size === "fullscreen";

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        isFullscreen ? "fixed inset-0 z-50 bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-md" : "py-12 px-4 w-full"
      }`}
    >
      {/* Wave Container Circle / Orb */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-2xl border-4 border-white dark:border-[#27272A] bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-[#18181B] dark:to-[#09090B]">
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse" />

        {/* Liquid Water Waves */}
        <div className="absolute inset-x-0 bottom-0 w-full h-[65%] overflow-hidden">
          {/* Wave 1: Back Wave (Indigo/Purple) */}
          <div className="absolute -bottom-1 left-0 w-[200%] h-full opacity-60 animate-wave-slow">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-[#9333EA]">
              <path d="M0,0 C150,90 350,-40 500,50 C650,140 900,10 1200,60 L1200,120 L0,120 Z" />
            </svg>
          </div>

          {/* Wave 2: Middle Wave (Cyan / Blue) */}
          <div className="absolute -bottom-0.5 left-0 w-[200%] h-full opacity-75 animate-wave-medium">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-[#06B6D4]">
              <path d="M0,40 C300,100 450,0 600,60 C750,120 1050,10 1200,50 L1200,120 L0,120 Z" />
            </svg>
          </div>

          {/* Wave 3: Front Wave (Primary Electric Blue) */}
          <div className="absolute bottom-0 left-0 w-[200%] h-full opacity-90 animate-wave-fast">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-[#2563EB]">
              <path d="M0,20 C150,80 350,10 500,60 C650,110 900,20 1200,50 L1200,120 L0,120 Z" />
            </svg>
          </div>

          {/* Floating Liquid Bubbles */}
          <div className="absolute bottom-1 left-1/4 w-2 h-2 rounded-full bg-white/70 animate-bubble-1" />
          <div className="absolute bottom-2 left-1/2 w-1.5 h-1.5 rounded-full bg-white/60 animate-bubble-2" />
          <div className="absolute bottom-1 left-3/4 w-2.5 h-2.5 rounded-full bg-white/50 animate-bubble-3" />
        </div>

        {/* Center Circular Glass Overlay */}
        <div className="absolute inset-0 rounded-full border border-white/40 dark:border-white/10 pointer-events-none" />
      </div>

      {/* Modern Wave Loading Typography */}
      {label && (
        <div className="mt-6 text-center space-y-1.5 max-w-sm">
          <h3 className="text-sm font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA] flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
            {label}
          </h3>
          {subLabel && (
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
              {subLabel}
            </p>
          )}
        </div>
      )}

      {/* Wave CSS keyframes injection */}
      <style jsx>{`
        @keyframes waveSlow {
          0% { transform: translateX(0); }
          50% { transform: translateX(-25%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveMedium {
          0% { transform: translateX(-50%); }
          50% { transform: translateX(-25%); }
          100% { transform: translateX(0); }
        }
        @keyframes waveFast {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes bubble {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        .animate-wave-slow {
          animation: waveSlow 6s ease-in-out infinite alternate;
        }
        .animate-wave-medium {
          animation: waveMedium 4s ease-in-out infinite alternate;
        }
        .animate-wave-fast {
          animation: waveFast 3s linear infinite;
        }
        .animate-bubble-1 {
          animation: bubble 2.5s ease-in infinite;
        }
        .animate-bubble-2 {
          animation: bubble 3.2s ease-in infinite 0.8s;
        }
        .animate-bubble-3 {
          animation: bubble 2.8s ease-in infinite 1.4s;
        }
      `}</style>
    </div>
  );
}
