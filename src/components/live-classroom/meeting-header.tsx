"use client";

import React from "react";
import { Clock, Users, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetingHeaderProps {
  title: string;
  courseName?: string;
  trainerName?: string;
  isLive?: boolean;
  elapsedSeconds: number;
  participantCount: number;
  connectionState: "CONNECTED" | "RECONNECTING" | "CONNECTING" | "DISCONNECTED";
  onOpenPeople: () => void;
  onLeave: () => void;
}

export function MeetingHeader({
  title,
  courseName,
  trainerName,
  isLive = true,
  elapsedSeconds,
  participantCount,
  connectionState,
  onOpenPeople,
  onLeave,
}: MeetingHeaderProps) {
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-[#DADCE0] flex items-center justify-between shrink-0 z-30 select-none shadow-xs">
      {/* Left: Leave button + Meeting Title & Subtitle */}
      <div className="flex items-center gap-3.5 overflow-hidden">
        <button
          onClick={onLeave}
          aria-label="Leave meeting"
          className="px-3 py-1.5 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <ChevronLeft className="h-4 w-4 text-[#5F6368]" />
          <span>Leave</span>
        </button>

        <div className="flex flex-col truncate">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm sm:text-base text-[#202124] truncate tracking-tight">
              {title}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FCE8E6] text-[#D93025] border border-[#FAD2CF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D93025] animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#5F6368] truncate font-normal">
            {courseName || "Interactive Classroom"} {trainerName ? `• Trainer: ${trainerName}` : ""}
          </span>
        </div>
      </div>

      {/* Right: Timer Pill & Connected Count Pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Timer Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F8F9FA] border border-[#DADCE0] text-xs font-mono font-semibold text-[#3C4043] shadow-xs">
          <Clock className="h-3.5 w-3.5 text-[#5F6368]" />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Connected Participant Count Pill */}
        <button
          onClick={onOpenPeople}
          aria-label={`Open participant list, ${participantCount} connected`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8F9FA] hover:bg-[#F1F3F4] border border-[#DADCE0] text-xs font-semibold text-[#3C4043] transition-colors cursor-pointer shadow-xs"
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              connectionState === "CONNECTED"
                ? "bg-[#1E8E3E] shadow-[0_0_8px_rgba(30,142,62,0.4)]"
                : connectionState === "RECONNECTING"
                ? "bg-[#F9AB00] animate-ping"
                : "bg-[#1A73E8] animate-pulse"
            )}
          />
          <Users className="h-3.5 w-3.5 text-[#5F6368]" />
          <span>
            {participantCount} {connectionState === "CONNECTED" ? "Connected" : "Connecting"}
          </span>
        </button>
      </div>
    </header>
  );
}
