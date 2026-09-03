"use client";

import React, { useRef, useEffect } from "react";
import { ParticipantModel, WhiteboardStroke } from "@/hooks/use-falcon-meeting-engine";
import { ParticipantTile } from "./participant-tile";
import { DraggableSelfView } from "./draggable-self-view";
import { MeetingLayoutMode } from "./layout-selector-popover";
import { Trash2, ScreenShare, PenTool, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoStageProps {
  viewMode: MeetingLayoutMode | "whiteboard";
  localParticipant: ParticipantModel;
  remoteParticipants: ParticipantModel[];
  pinnedParticipantId: string | null;
  activeSpeakerId: string | null;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  isAnnotating: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  audioLevel: number;
  selfViewMode?: "floating" | "in_grid" | "hidden";
  onSetSelfViewMode?: (mode: "floating" | "in_grid" | "hidden") => void;
  reactions: { id: string; emoji: string; senderName: string }[];
  whiteboardStrokes: WhiteboardStroke[];
  wbTool: "pen" | "highlighter" | "eraser";
  wbColor: string;
  wbSize: number;
  onSetWbTool: (tool: "pen" | "highlighter" | "eraser") => void;
  onSetWbColor: (color: string) => void;
  onAddWhiteboardStroke: (stroke: WhiteboardStroke) => void;
  onClearWhiteboard: () => void;
  onCloseAnnotation?: () => void;
  onPinParticipant: (userId: string | null) => void;
  isExternalPlatform?: boolean;
  classTitle?: string;
  externalMeetingUrl?: string;
}

export function VideoStage({
  viewMode,
  localParticipant,
  remoteParticipants,
  pinnedParticipantId,
  activeSpeakerId,
  isScreenSharing,
  screenStream,
  isAnnotating,
  isMuted,
  isCameraOff,
  audioLevel,
  selfViewMode = "floating",
  onSetSelfViewMode,
  reactions,
  whiteboardStrokes,
  wbTool,
  wbColor,
  wbSize,
  onSetWbTool,
  onSetWbColor,
  onAddWhiteboardStroke,
  onClearWhiteboard,
  onCloseAnnotation,
  onPinParticipant,
  isExternalPlatform,
  classTitle,
  externalMeetingUrl,
}: VideoStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  // All participants in meeting
  const allParticipants = [localParticipant, ...remoteParticipants];

  // Remote screen sharer
  const remoteScreenSharer = remoteParticipants.find((p) => p.isScreenSharing);
  const activePresenter = isScreenSharing
    ? localParticipant
    : remoteScreenSharer || null;

  // Spotlight participant selection
  const pinnedPeer = allParticipants.find((p) => p.userId === pinnedParticipantId);
  const activeSpeakerPeer = allParticipants.find((p) => p.userId === activeSpeakerId);
  const hostPeer = allParticipants.find((p) => p.role === "trainer" || p.role === "admin");

  // Choose spotlight: Pinned > Presenter > Active Speaker > Remote Peer > Host > Local
  const spotlightPeer =
    pinnedPeer ||
    activePresenter ||
    activeSpeakerPeer ||
    remoteParticipants[0] ||
    hostPeer ||
    localParticipant;

  // Effective layout calculation
  let effectiveLayout: "spotlight" | "tiled" | "sidebar" | "whiteboard" = "spotlight";

  if (viewMode === "whiteboard") {
    effectiveLayout = "whiteboard";
  } else if (viewMode === "auto") {
    if (activePresenter) {
      effectiveLayout = allParticipants.length > 1 ? "sidebar" : "spotlight";
    } else if (allParticipants.length > 1) {
      effectiveLayout = "tiled";
    } else {
      effectiveLayout = "spotlight";
    }
  } else {
    effectiveLayout = viewMode;
  }

  // Canvas Whiteboard rendering
  useEffect(() => {
    if ((effectiveLayout !== "whiteboard" && !isAnnotating) || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (effectiveLayout === "whiteboard") {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    whiteboardStrokes.forEach((stroke) => {
      if (stroke.points.length < 2 || !stroke.points[0]) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        if (pt) ctx.lineTo(pt.x, pt.y);
      }

      ctx.strokeStyle = stroke.tool === "eraser" ? (effectiveLayout === "whiteboard" ? "#FFFFFF" : "rgba(0,0,0,1)") : stroke.color;
      if (stroke.tool === "eraser" && isAnnotating) {
        ctx.globalCompositeOperation = "destination-out";
      }
      ctx.lineWidth = stroke.tool === "eraser" ? stroke.size * 4 : stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (stroke.tool === "highlighter") ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.restore();
    });
  }, [effectiveLayout, isAnnotating, whiteboardStrokes]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    isDrawingRef.current = true;
    currentStrokeRef.current = [{ x, y }];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current.push({ x, y });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    const pts = currentStrokeRef.current;
    if (pts.length >= 2) {
      const prevPt = pts[pts.length - 2];
      const curPt = pts[pts.length - 1];
      if (prevPt && curPt) {
        ctx.moveTo(prevPt.x, prevPt.y);
        ctx.lineTo(curPt.x, curPt.y);
        ctx.strokeStyle = wbTool === "eraser" ? (effectiveLayout === "whiteboard" ? "#FFFFFF" : "rgba(0,0,0,1)") : wbColor;
        if (wbTool === "eraser" && isAnnotating) {
          ctx.globalCompositeOperation = "destination-out";
        }
        ctx.lineWidth = wbTool === "eraser" ? wbSize * 4 : wbSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (wbTool === "highlighter") ctx.globalAlpha = 0.35;
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 1) {
      const newStroke: WhiteboardStroke = {
        id: `stroke_${Date.now()}`,
        tool: wbTool,
        color: wbColor,
        size: wbSize,
        points: currentStrokeRef.current,
      };
      onAddWhiteboardStroke(newStroke);
    }
    currentStrokeRef.current = [];
  };

  // Other peers for sidebar filmstrip
  const sidebarPeers = allParticipants.filter((p) => p.userId !== spotlightPeer.userId);

  return (
    <main
      ref={stageContainerRef}
      className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden relative bg-[#F8F9FA]"
    >
      {/* Floating Reactions overlay */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.slice(-6).map((r, idx) => (
          <div
            key={r.id}
            className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#DADCE0] px-3.5 py-1.5 rounded-full text-base shadow-xl animate-in slide-in-from-bottom duration-200"
            style={{
              transform: `translateY(-${idx * 44}px)`,
              opacity: 1 - idx * 0.15,
            }}
          >
            <span className="text-xl">{r.emoji}</span>
            <span className="text-xs font-bold text-[#202124]">{r.senderName}</span>
          </div>
        ))}
      </div>

      {/* FLOATING SELF-VIEW (Shown in Spotlight and Sidebar modes, or when explicitly floating) */}
      {selfViewMode === "floating" && effectiveLayout !== "tiled" && (
        <DraggableSelfView
          localParticipant={localParticipant}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          audioLevel={audioLevel}
          containerRef={stageContainerRef}
          onShowInTile={onSetSelfViewMode ? () => onSetSelfViewMode("in_grid") : undefined}
          onHide={onSetSelfViewMode ? () => onSetSelfViewMode("hidden") : undefined}
        />
      )}

      {/* External Platform Embed */}
      {isExternalPlatform ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white border border-[#DADCE0] rounded-3xl shadow-sm">
          <div className="max-w-md space-y-4">
            <h3 className="text-lg font-bold text-[#202124]">{classTitle || "External Live Session"}</h3>
            <p className="text-xs text-[#5F6368]">
              This session is configured to run on an external conferencing platform.
            </p>
            {externalMeetingUrl && (
              <a
                href={externalMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#1A73E8] hover:bg-[#185ABC] text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/20"
              >
                Launch External Meeting Platform
              </a>
            )}
          </div>
        </div>
      ) : effectiveLayout === "whiteboard" ? (
        /* WHITEBOARD FULL CANVAS STAGE */
        <div className="flex-1 bg-white border border-[#DADCE0] rounded-3xl overflow-hidden flex flex-col shadow-sm relative">
          <div className="h-12 px-4 border-b border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                <PenTool className="h-3.5 w-3.5 text-[#1A73E8]" /> Interactive Whiteboard
              </span>

              <div className="h-4 w-px bg-[#DADCE0] mx-1.5" />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSetWbTool("pen")}
                className={cn("h-8 px-3 text-xs rounded-full cursor-pointer", wbTool === "pen" ? "bg-[#1A73E8] text-white font-bold" : "text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED]")}
              >
                Pen
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSetWbTool("highlighter")}
                className={cn("h-8 px-3 text-xs rounded-full cursor-pointer", wbTool === "highlighter" ? "bg-[#1A73E8] text-white font-bold" : "text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED]")}
              >
                Highlighter
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSetWbTool("eraser")}
                className={cn("h-8 px-3 text-xs rounded-full cursor-pointer", wbTool === "eraser" ? "bg-[#1A73E8] text-white font-bold" : "text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED]")}
              >
                Eraser
              </Button>

              <div className="h-4 w-px bg-[#DADCE0] mx-1.5" />

              {["#1A73E8", "#D93025", "#1E8E3E", "#F9AB00", "#202124"].map((c) => (
                <button
                  key={c}
                  onClick={() => { onSetWbColor(c); onSetWbTool("pen"); }}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-transform cursor-pointer shadow-xs",
                    wbColor === c && wbTool !== "eraser" ? "scale-125 border-[#1A73E8]" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearWhiteboard}
              className="h-8 text-xs text-[#D93025] hover:bg-[#FCE8E6] rounded-full cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>

          <div className="flex-1 relative cursor-crosshair overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={1600}
              height={900}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      ) : effectiveLayout === "tiled" ? (
        /* 1. TILED LAYOUT: Responsive Equal Participant Grid of Everyone in Call */
        <div
          className={cn(
            "flex-1 grid gap-3 overflow-y-auto p-1 items-center justify-center",
            allParticipants.length === 1
              ? "grid-cols-1 max-w-4xl mx-auto w-full"
              : allParticipants.length === 2
              ? "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto w-full"
              : allParticipants.length <= 4
              ? "grid-cols-2 max-w-5xl mx-auto w-full"
              : allParticipants.length <= 9
              ? "grid-cols-2 sm:grid-cols-3 w-full"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full"
          )}
        >
          {allParticipants.map((p) => (
            <ParticipantTile
              key={p.userId}
              participant={p}
              isLocal={p.userId === localParticipant.userId}
              onPin={() => onPinParticipant(pinnedParticipantId === p.userId ? null : p.userId)}
              className={cn("w-full h-full min-h-[220px]", allParticipants.length <= 4 && "aspect-video")}
            />
          ))}
        </div>
      ) : effectiveLayout === "sidebar" ? (
        /* 2. SIDEBAR LAYOUT: Hero Main Stage on Left + Vertical Side Filmstrip on Right */
        <div className="flex-1 flex gap-3 overflow-hidden">
          {/* Hero Main Stage */}
          <div className="flex-1 relative bg-[#202124] rounded-3xl border border-[#DADCE0] overflow-hidden flex items-center justify-center shadow-md">
            {activePresenter && (
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#DADCE0] flex items-center gap-2 z-20 text-xs font-bold text-[#1A73E8] shadow-sm">
                <ScreenShare className="h-3.5 w-3.5" />
                <span>{activePresenter.name} is presenting</span>
              </div>
            )}

            <ParticipantTile
              participant={spotlightPeer}
              isLocal={spotlightPeer.userId === localParticipant.userId}
              isSpotlight={true}
              onPin={() => onPinParticipant(null)}
              className="w-full h-full rounded-none border-none bg-transparent"
            />
          </div>

          {/* Right-Side Vertical Filmstrip with other participants */}
          {sidebarPeers.length > 0 && (
            <div className="w-48 sm:w-60 flex flex-col gap-2.5 overflow-y-auto pr-1 shrink-0 scrollbar-thin">
              {sidebarPeers.map((p) => (
                <ParticipantTile
                  key={p.userId}
                  participant={p}
                  isLocal={p.userId === localParticipant.userId}
                  onPin={() => onPinParticipant(pinnedParticipantId === p.userId ? null : p.userId)}
                  className="w-full h-32 shrink-0 rounded-2xl"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 3. SPOTLIGHT LAYOUT (DEFAULT): Hero Main Stage (No Filmstrip) */
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 relative bg-[#202124] rounded-3xl border border-[#DADCE0] overflow-hidden flex items-center justify-center shadow-md">
            {activePresenter && (
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#DADCE0] flex items-center gap-2 z-20 text-xs font-bold text-[#1A73E8] shadow-sm">
                <ScreenShare className="h-3.5 w-3.5" />
                <span>{activePresenter.name} is presenting</span>
              </div>
            )}

            {/* Main Spotlight Video or Screen Share */}
            <ParticipantTile
              participant={spotlightPeer}
              isLocal={spotlightPeer.userId === localParticipant.userId}
              isSpotlight={true}
              onPin={() => onPinParticipant(null)}
              className="w-full h-full rounded-none border-none bg-transparent"
            />

            {/* Floating Annotation Overlay (when annotating) */}
            {isAnnotating && (
              <div className="absolute inset-0 z-30 flex flex-col pointer-events-none">
                <div className="self-center mt-3 bg-white/95 backdrop-blur-md border border-[#DADCE0] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl pointer-events-auto animate-in slide-in-from-top duration-150">
                  <span className="text-[11px] font-bold text-[#9334E8] flex items-center gap-1 mr-1">
                    <PenTool className="h-3.5 w-3.5" /> Annotate
                  </span>

                  <button
                    onClick={() => onSetWbTool("pen")}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors",
                      wbTool === "pen" ? "bg-[#9334E8] text-white" : "text-[#5F6368] hover:text-[#202124]"
                    )}
                  >
                    Pen
                  </button>

                  <button
                    onClick={() => onSetWbTool("highlighter")}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors",
                      wbTool === "highlighter" ? "bg-[#9334E8] text-white" : "text-[#5F6368] hover:text-[#202124]"
                    )}
                  >
                    Highlighter
                  </button>

                  <button
                    onClick={() => onSetWbTool("eraser")}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors",
                      wbTool === "eraser" ? "bg-[#9334E8] text-white" : "text-[#5F6368] hover:text-[#202124]"
                    )}
                  >
                    Eraser
                  </button>

                  <div className="h-4 w-px bg-[#DADCE0] mx-1" />

                  {["#1A73E8", "#D93025", "#1E8E3E", "#F9AB00", "#202124"].map((c) => (
                    <button
                      key={c}
                      onClick={() => { onSetWbColor(c); onSetWbTool("pen"); }}
                      className={cn(
                        "h-4 w-4 rounded-full border transition-transform cursor-pointer shadow-xs",
                        wbColor === c && wbTool !== "eraser" ? "scale-125 border-[#1A73E8]" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}

                  <div className="h-4 w-px bg-[#DADCE0] mx-1" />

                  <button
                    onClick={onClearWhiteboard}
                    title="Clear annotations"
                    className="p-1 text-[#D93025] hover:bg-[#FCE8E6] rounded-full cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {onCloseAnnotation && (
                    <button
                      onClick={onCloseAnnotation}
                      title="Close annotation"
                      className="p-1 text-[#5F6368] hover:text-[#202124] rounded-full hover:bg-[#F1F3F4] cursor-pointer ml-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 relative cursor-crosshair pointer-events-auto">
                  <canvas
                    ref={canvasRef}
                    width={1600}
                    height={900}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
