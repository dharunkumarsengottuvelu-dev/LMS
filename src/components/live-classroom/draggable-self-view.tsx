"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Mic, MicOff, VideoOff, GripHorizontal, Minimize2, Maximize2,
  EyeOff, MoreVertical, LayoutGrid, Check
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ParticipantModel } from "@/hooks/use-falcon-meeting-engine";

export type SelfViewSize = "small" | "medium" | "large";

interface DraggableSelfViewProps {
  localParticipant: ParticipantModel;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  audioLevel: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onShowInTile?: () => void;
  onHide?: () => void;
  className?: string;
}

const SIZE_MAP: Record<SelfViewSize, { w: number; h: number; className: string }> = {
  small: { w: 180, h: 112, className: "w-[180px] h-[112px]" },
  medium: { w: 224, h: 140, className: "w-[224px] h-[140px]" },
  large: { w: 280, h: 175, className: "w-[280px] h-[175px]" },
};

export function DraggableSelfView({
  localParticipant,
  isMuted,
  isCameraOff,
  isScreenSharing,
  audioLevel,
  containerRef,
  onShowInTile,
  onHide,
  className,
}: DraggableSelfViewProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState<SelfViewSize>("medium");
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const selfViewRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Attach local media stream
  useEffect(() => {
    if (videoRef.current && localParticipant.stream) {
      if (videoRef.current.srcObject !== localParticipant.stream) {
        videoRef.current.srcObject = localParticipant.stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [localParticipant.stream, isCameraOff]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Set default initial position to Bottom-Right of the meeting container
  useEffect(() => {
    if (position === null && containerRef?.current) {
      const container = containerRef.current;
      const curSize = SIZE_MAP[size];
      const initialX = Math.max(16, container.clientWidth - curSize.w - 16);
      const initialY = Math.max(16, container.clientHeight - curSize.h - 16);
      setPosition({ x: initialX, y: initialY });
    }
  }, [containerRef, size, position]);

  // Snap to nearest corner helper
  const snapToNearestCorner = (currentX: number, currentY: number, elWidth: number, elHeight: number): { x: number; y: number } => {
    const container = containerRef?.current || selfViewRef.current?.parentElement;
    if (!container) return { x: currentX, y: currentY };

    const pad = 16;
    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;

    const leftX = pad;
    const rightX = Math.max(pad, cWidth - elWidth - pad);
    const topY = pad;
    const bottomY = Math.max(pad, cHeight - elHeight - pad);

    const corners: { x: number; y: number }[] = [
      { x: leftX, y: topY },
      { x: rightX, y: topY },
      { x: leftX, y: bottomY },
      { x: rightX, y: bottomY },
    ];

    let closest: { x: number; y: number } = { x: rightX, y: bottomY };
    let minDistance = Infinity;

    for (const c of corners) {
      const dist = Math.hypot(currentX - c.x, currentY - c.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = c;
      }
    }

    return closest;
  };

  // Handle pointer down (drag start)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".prevent-drag")) return;

    const selfViewEl = selfViewRef.current;
    if (!selfViewEl) return;

    const currentX = position ? position.x : selfViewEl.offsetLeft;
    const currentY = position ? position.y : selfViewEl.offsetTop;

    dragOffsetRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    };

    setIsDragging(true);
    setMenuOpen(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragOffsetRef.current.startX;
    const deltaY = e.clientY - dragOffsetRef.current.startY;

    const newX = dragOffsetRef.current.posX + deltaX;
    const newY = dragOffsetRef.current.posY + deltaY;

    // Constraint within container
    const selfViewEl = selfViewRef.current;
    const container = containerRef?.current || selfViewEl?.parentElement;

    let boundedX = newX;
    let boundedY = newY;

    if (container && selfViewEl) {
      const cWidth = container.clientWidth;
      const cHeight = container.clientHeight;
      const elWidth = selfViewEl.offsetWidth;
      const elHeight = selfViewEl.offsetHeight;

      boundedX = Math.max(8, Math.min(newX, cWidth - elWidth - 8));
      boundedY = Math.max(8, Math.min(newY, cHeight - elHeight - 8));
    }

    setPosition({ x: boundedX, y: boundedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}

      // Snap intelligently to nearest corner
      const selfViewEl = selfViewRef.current;
      if (selfViewEl && position) {
        const snapped = snapToNearestCorner(position.x, position.y, selfViewEl.offsetWidth, selfViewEl.offsetHeight);
        setPosition(snapped);
      }
    }
  };

  const hasVideoStream = !isCameraOff && localParticipant.stream && localParticipant.stream.getVideoTracks().length > 0;
  const currentDimensions = SIZE_MAP[size];

  // 1. MINIMIZED STATE: Google Meet Style Compact Pill
  if (isMinimized) {
    return (
      <div
        ref={selfViewRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
        className={cn(
          "absolute z-40 cursor-grab active:cursor-grabbing select-none touch-none animate-in zoom-in-90 duration-150",
          !position && "bottom-5 right-5",
          className
        )}
      >
        <button
          onClick={() => setIsMinimized(false)}
          title="Restore self-view"
          aria-label="Restore self-view"
          className="h-10 px-3.5 rounded-full bg-white/95 backdrop-blur-md border border-[#DADCE0] shadow-lg flex items-center gap-2.5 cursor-pointer hover:bg-[#F1F3F4] hover:border-[#BDC1C6] transition-all hover:scale-105"
        >
          <Avatar className="h-6 w-6 bg-[#1A73E8] text-white font-bold text-[10px]">
            <AvatarFallback className="bg-transparent">{localParticipant.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold text-[#202124]">You</span>
          <div className="h-3 w-px bg-[#DADCE0]" />
          {isMuted ? (
            <MicOff className="h-3.5 w-3.5 text-[#D93025]" />
          ) : (
            <Mic className="h-3.5 w-3.5 text-[#1E8E3E]" />
          )}
          <Maximize2 className="h-3.5 w-3.5 text-[#5F6368] ml-0.5" />
        </button>
      </div>
    );
  }

  // 2. NORMAL EXPANDED FLOATING SELF-VIEW
  return (
    <div
      ref={selfViewRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!menuOpen) setMenuOpen(false);
      }}
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
      className={cn(
        "absolute z-40 touch-none select-none",
        !position && "bottom-5 right-5",
        !isDragging && "transition-all duration-200 ease-out",
        isDragging && "cursor-grabbing opacity-95 scale-102",
        className
      )}
    >
      <div
        className={cn(
          "bg-[#202124] rounded-2xl border overflow-hidden relative shadow-xl flex items-center justify-center transition-all duration-150 group",
          currentDimensions.className,
          audioLevel > 18 && !isMuted
            ? "border-[#1E8E3E] ring-3 ring-[#1E8E3E]/40"
            : "border-[#DADCE0] hover:border-[#BDC1C6]"
        )}
      >
        {/* Top Control Bar on Hover */}
        <div
          className={cn(
            "absolute top-2 left-2 right-2 flex items-center justify-between z-20 transition-opacity duration-150 pointer-events-none",
            isHovered || menuOpen ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Drag Handle Button */}
          <div
            title="Drag to move"
            className="bg-white/95 backdrop-blur-md px-1.5 py-1 rounded-lg border border-[#DADCE0] text-[#3C4043] cursor-grab active:cursor-grabbing flex items-center pointer-events-auto shadow-xs"
          >
            <GripHorizontal className="h-3.5 w-3.5" />
          </div>

          {/* Actions & More Options */}
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-0.5 rounded-lg border border-[#DADCE0] pointer-events-auto shadow-xs relative">
            <button
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize self-view"
              title="Minimize"
              className="p-1 text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] rounded-md cursor-pointer transition-colors"
            >
              <Minimize2 className="h-3 w-3" />
            </button>

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="More self-view options"
              title="More options"
              className={cn(
                "p-1 text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] rounded-md cursor-pointer transition-colors",
                menuOpen && "bg-[#E8EAED] text-[#202124]"
              )}
            >
              <MoreVertical className="h-3 w-3" />
            </button>

            {/* Google Meet Style Self-View Popover Menu */}
            {menuOpen && (
              <div
                ref={menuRef}
                className="prevent-drag absolute top-8 right-0 bg-white border border-[#DADCE0] p-1.5 rounded-2xl shadow-xl z-50 w-48 text-xs text-[#3C4043] space-y-1 animate-in zoom-in-95 duration-100"
              >
                {/* Show in a tile */}
                {onShowInTile && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onShowInTile();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer transition-colors"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 text-[#5F6368]" />
                    <span>Show in a tile</span>
                  </button>
                )}

                {/* Minimize self-view */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsMinimized(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer transition-colors"
                >
                  <Minimize2 className="h-3.5 w-3.5 text-[#5F6368]" />
                  <span>Minimize</span>
                </button>

                {/* Size options */}
                <div className="border-t border-[#E8EAED] pt-1 mt-1">
                  <span className="text-[10px] font-bold text-[#5F6368] px-2.5 py-0.5 block uppercase tracking-wider">
                    Size
                  </span>
                  {(["small", "medium", "large"] as SelfViewSize[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSize(s);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer capitalize text-[11px]"
                    >
                      <span>{s}</span>
                      {size === s && <Check className="h-3 w-3 text-[#1A73E8]" />}
                    </button>
                  ))}
                </div>

                {/* Hide self-view */}
                {onHide && (
                  <div className="border-t border-[#E8EAED] pt-1 mt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onHide();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5 text-[#5F6368]" />
                      <span>Hide self-view</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Video stream */}
        {hasVideoStream ? (
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && localParticipant.stream) {
                if (el.srcObject !== localParticipant.stream) {
                  el.srcObject = localParticipant.stream;
                }
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              !isScreenSharing && "scale-x-[-1]"
            )}
          />
        ) : (
          /* Camera Off Avatar Fallback */
          <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            <Avatar className="h-11 w-11 bg-[#1A73E8] border border-white/20 text-white font-bold text-sm shadow-md">
              <AvatarFallback className="bg-transparent">{localParticipant.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
              You
            </span>
          </div>
        )}

        {/* Bottom Info & Status Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <div className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1 border border-[#DADCE0] shadow-xs">
            <span className="text-[10px] font-bold text-[#202124]">
              {isScreenSharing ? "You (Screen)" : "You"}
            </span>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-1 rounded-lg flex items-center gap-1 border border-[#DADCE0] shadow-xs">
            {isMuted ? (
              <MicOff className="h-3 w-3 text-[#D93025]" />
            ) : (
              <Mic className="h-3 w-3 text-[#1E8E3E]" />
            )}
            {isCameraOff && !isScreenSharing && (
              <VideoOff className="h-3 w-3 text-[#D93025]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
