"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, MessageSquare, Users,
  PhoneOff, Maximize2, Minimize2, AlertCircle, ShieldAlert,
  Send, Sparkles, Check, ChevronRight, X, Clock, LayoutGrid,
  Presentation, Hand, Smile, Settings, Edit3, Trash2, Download,
  Volume2, Wifi, ShieldCheck, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useLiveClassWebRTC, PeerInfo, WhiteboardStroke } from "@/hooks/use-live-class-webrtc";

interface LiveClassDetails {
  id: string;
  title: string;
  description?: string;
  courseName?: string;
  trainerName?: string;
  trainerId?: string;
  platform?: string;
  meetingUrl?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  status?: string;
}

interface FalconLiveClassroomProps {
  classDetails: LiveClassDetails;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: "trainer" | "student" | "admin";
  };
  backUrl: string;
}

const EMOJI_REACTIONS = ["👏", "❤️", "🔥", "🎉", "👍", "💡"];

export function FalconLiveClassroom({
  classDetails,
  currentUser,
  backUrl,
}: FalconLiveClassroomProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"spotlight" | "grid" | "whiteboard">("spotlight");
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "participants" | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Whiteboard drawing tools
  const [wbColor, setWbColor] = useState("#3B82F6");
  const [wbSize, setWbSize] = useState(4);
  const [wbTool, setWbTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const classroomContainerRef = useRef<HTMLDivElement | null>(null);

  const isTrainerOrAdmin = currentUser.role === "trainer" || currentUser.role === "admin";
  const isExternalPlatform = Boolean(classDetails.platform && classDetails.platform !== "falcon_webrtc" && classDetails.meetingUrl);

  // WebRTC Hook
  const {
    localStream,
    screenStream,
    peers,
    messages,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    audioLevel,
    activeSpeakerId,
    connectionStatus,
    mediaError,
    reactions,
    whiteboardStrokes,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    toggleRaiseHand,
    sendReaction,
    addWhiteboardStroke,
    clearWhiteboard,
    sendMessage,
    endClass,
  } = useLiveClassWebRTC({
    classId: classDetails.id,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    onClassEnded: () => {
      if (currentUser.role === "student") {
        fetch("/api/student/live-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave_session", liveClassId: classDetails.id }),
        }).finally(() => {
          router.push(backUrl);
        });
      } else {
        router.push(backUrl);
      }
    },
  });

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Session elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Student Attendance Heartbeat
  useEffect(() => {
    if (currentUser.role !== "student" || !classDetails.id) return;

    fetch("/api/student/live-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join_session", liveClassId: classDetails.id }),
    }).catch(() => {});

    const heartbeatInterval = setInterval(() => {
      fetch("/api/student/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", liveClassId: classDetails.id, seconds: 30 }),
      }).catch(() => {});
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      fetch("/api/student/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave_session", liveClassId: classDetails.id }),
      }).catch(() => {});
    };
  }, [currentUser.role, classDetails.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeSideTab === "chat") {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadChatCount(0);
    } else if (messages.length > 0) {
      setUnreadChatCount((prev) => prev + 1);
    }
  }, [messages, activeSideTab]);

  // Whiteboard Canvas Render
  useEffect(() => {
    if (viewMode !== "whiteboard" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Render strokes
    whiteboardStrokes.forEach((stroke) => {
      if (stroke.points.length < 2 || !stroke.points[0]) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        if (pt) {
          ctx.lineTo(pt.x, pt.y);
        }
      }

      ctx.strokeStyle = stroke.tool === "eraser" ? "#0F172A" : stroke.color;
      ctx.lineWidth = stroke.tool === "eraser" ? stroke.size * 3 : stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (stroke.tool === "highlighter") {
        ctx.globalAlpha = 0.4;
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [viewMode, whiteboardStrokes]);

  // Keyboard Shortcuts (M: Mute, V: Video, H: Hand)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") {
        toggleMute();
      } else if (e.key === "v" || e.key === "V") {
        toggleCamera();
      } else if (e.key === "h" || e.key === "H") {
        toggleRaiseHand();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMute, toggleCamera, toggleRaiseHand]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (classroomContainerRef.current?.requestFullscreen) {
          await classroomContainerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {}
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput("");
  };

  const handleLeaveClass = async () => {
    if (currentUser.role === "student") {
      try {
        await fetch("/api/student/live-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave_session", liveClassId: classDetails.id }),
        });
      } catch {}
    }
    router.push(backUrl);
  };

  const handleEndClassByTrainer = async () => {
    endClass();
    try {
      await fetch("/api/trainer/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end_session", liveClassId: classDetails.id }),
      });
    } catch {}
    router.push(backUrl);
  };

  // Whiteboard Canvas Mouse handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    currentStrokeRef.current = [{ x, y }];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
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
        ctx.strokeStyle = wbTool === "eraser" ? "#0F172A" : wbColor;
        ctx.lineWidth = wbTool === "eraser" ? wbSize * 3 : wbSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (wbTool === "highlighter") ctx.globalAlpha = 0.4;
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 1) {
      const newStroke: WhiteboardStroke = {
        id: `stroke_${Date.now()}`,
        tool: wbTool,
        color: wbColor,
        size: wbSize,
        points: currentStrokeRef.current,
      };
      addWhiteboardStroke(newStroke);
    }
    currentStrokeRef.current = [];
  };

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Raised hands count and notification
  const handRaisedPeers = peers.filter((p) => p.isHandRaised);
  const trainerPeer = peers.find((p) => p.role === "trainer" || p.role === "admin");
  const screenSharingPeer = peers.find((p) => p.isScreenSharing);

  const spotlightStream = isScreenSharing
    ? screenStream
    : screenSharingPeer?.stream
    ? screenSharingPeer.stream
    : isTrainerOrAdmin
    ? localStream
    : trainerPeer?.stream || null;

  return (
    <div
      ref={classroomContainerRef}
      className="relative flex flex-col h-screen w-full bg-[#090D16] text-white overflow-hidden select-none font-sans"
    >
      {/* 1. TOP MNC CLASSROOM HEADER */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-[#0E1524]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveClass}
            className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg gap-1.5 shrink-0"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="hidden sm:inline font-medium">Leave</span>
          </Button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex flex-col truncate">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-xs sm:text-sm text-white truncate">{classDetails.title}</span>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] font-bold px-2 py-0.5 animate-pulse shrink-0">
                🔴 LIVE
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] font-mono px-1.5 py-0 hidden md:inline-flex">
                HD 1080p
              </Badge>
            </div>
            <span className="text-[10px] sm:text-xs text-zinc-400 truncate">
              {classDetails.courseName || "Enterprise Training"} • Trainer: {classDetails.trainerName || "Host"}
            </span>
          </div>
        </div>

        {/* View Mode Switcher & Stats */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Layout Mode Toggles */}
          <div className="hidden sm:flex items-center bg-white/5 border border-white/10 p-0.5 rounded-xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("spotlight")}
              className={cn(
                "h-7 px-2.5 text-xs rounded-lg font-medium",
                viewMode === "spotlight" ? "bg-blue-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
            >
              <Presentation className="h-3.5 w-3.5 mr-1" />
              Spotlight
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-7 px-2.5 text-xs rounded-lg font-medium",
                viewMode === "grid" ? "bg-blue-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              Grid
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("whiteboard")}
              className={cn(
                "h-7 px-2.5 text-xs rounded-lg font-medium",
                viewMode === "whiteboard" ? "bg-blue-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1" />
              Whiteboard
            </Button>
          </div>

          {/* Session Timer */}
          <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Connected Participants Count */}
          <div className="hidden md:flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-zinc-300">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-semibold">{peers.length + 1}</span>
          </div>
        </div>
      </header>

      {/* 2. HAND RAISE & ALERT BANNERS */}
      {handRaisedPeers.length > 0 && isTrainerOrAdmin && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0 z-20 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">✋</span>
            <span className="font-semibold text-amber-300">
              {handRaisedPeers.map((p) => p.name).join(", ")} {handRaisedPeers.length === 1 ? "has raised hand" : "have raised hands"}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveSideTab("participants")}
            className="h-6 text-[10px] bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-md px-2"
          >
            View Participants
          </Button>
        </div>
      )}

      {mediaError && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{mediaError}</span>
          </div>
        </div>
      )}

      {/* 3. MAIN INTERACTIVE STAGE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIDEO & CANVAS WORKSPACE */}
        <div className="flex-1 flex flex-col p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden relative">
          {/* FLOATING EMOJI REACTION PARTICLES */}
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {reactions.slice(-8).map((r, idx) => (
              <div
                key={r.id}
                className="absolute bottom-16 right-16 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-base animate-bounce shadow-2xl transition-all"
                style={{
                  transform: `translateY(-${idx * 45}px)`,
                  opacity: 1 - idx * 0.12,
                }}
              >
                <span>{r.emoji}</span>
                <span className="text-[11px] font-bold text-white">{r.senderName}</span>
              </div>
            ))}
          </div>

          {/* VIEW MODE 1: SPOTLIGHT / PRESENTATION VIEW */}
          {viewMode === "spotlight" && (
            <div className="flex-1 flex flex-col gap-2 sm:gap-3 overflow-hidden">
              {/* Central Large Spotlight Frame */}
              <div className="flex-1 relative bg-black/80 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl min-h-[240px]">
                {isExternalPlatform ? (
                  <div className="flex flex-col items-center justify-center gap-4 text-center p-6 max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <Video className="h-8 w-8" />
                    </div>
                    <div>
                      <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/40 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wide">
                        {classDetails.platform?.toUpperCase() || "EXTERNAL"}
                      </Badge>
                      <h3 className="text-base font-bold text-white mt-2">{classDetails.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Session launched on external platform. Keep this tab open for chat, whiteboard, and attendance logging.
                      </p>
                    </div>
                    <Button
                      onClick={() => window.open(classDetails.meetingUrl, "_blank", "noopener,noreferrer")}
                      className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl gap-2 shadow-lg cursor-pointer"
                    >
                      <Video className="h-4 w-4" />
                      <span>Launch External Meeting</span>
                    </Button>
                  </div>
                ) : spotlightStream ? (
                  <SpotlightVideoPlayer stream={spotlightStream} isLocalStream={spotlightStream === localStream || spotlightStream === screenStream} />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
                    <Avatar className="h-20 w-20 border-2 border-blue-500/40 bg-blue-600/20 text-blue-300">
                      <AvatarFallback className="text-2xl font-bold bg-transparent">
                        {classDetails.trainerName?.charAt(0) || "T"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm text-white">{classDetails.trainerName || "Host"}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Stream is active in audio mode or initializing video feed</p>
                    </div>
                  </div>
                )}

                {/* Spotlight Badge */}
                <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 z-10">
                  <span className="font-semibold text-white">
                    {isScreenSharing ? "You (Screen Share)" : isTrainerOrAdmin ? "You (Host Presenter)" : classDetails.trainerName || "Trainer"}
                  </span>
                  {isScreenSharing && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-[9px] px-1.5">
                      Screen
                    </Badge>
                  )}
                </div>
              </div>

              {/* Bottom Participant Filmstrip */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
                {/* Local User Tile */}
                <div className={cn(
                  "relative w-36 sm:w-44 h-24 sm:h-28 bg-[#131B2E] rounded-xl border overflow-hidden shrink-0 flex items-center justify-center transition-all",
                  audioLevel > 20 && !isMuted ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-white/10"
                )}>
                  {!isCameraOff && localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Avatar className="h-10 w-10 bg-blue-600 text-white font-bold text-xs">
                        <AvatarFallback className="bg-transparent">{currentUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-zinc-400">Camera Off</span>
                    </div>
                  )}

                  {isHandRaised && (
                    <div className="absolute top-1.5 right-1.5 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-md shadow-md animate-bounce">
                      ✋
                    </div>
                  )}

                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px]">
                    <span className="font-medium truncate text-white">You</span>
                    <span className="shrink-0">{isMuted ? <MicOff className="h-3 w-3 text-red-400" /> : <Mic className="h-3 w-3 text-emerald-400" />}</span>
                  </div>
                </div>

                {/* Remote Peer Tiles */}
                {peers.map((peer) => (
                  <RemotePeerTile key={peer.peerId} peer={peer} />
                ))}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: MNC RESPONSIVE DYNAMIC GRID VIEW */}
          {viewMode === "grid" && (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto p-1">
              {/* Local User Card in Grid */}
              <div className={cn(
                "relative bg-[#131B2E] rounded-2xl border overflow-hidden flex items-center justify-center aspect-video min-h-[160px] transition-all",
                audioLevel > 20 && !isMuted ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl" : "border-white/10"
              )}>
                {!isCameraOff && localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Avatar className="h-14 w-14 bg-blue-600 text-white font-bold text-lg">
                      <AvatarFallback className="bg-transparent">{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-zinc-400 font-medium">{currentUser.name} (You)</span>
                  </div>
                )}

                {isHandRaised && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-black text-sm font-bold px-2 py-0.5 rounded-lg shadow-lg animate-bounce">
                    ✋ Hand Raised
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs">
                  <span className="font-semibold truncate text-white">{currentUser.name} (You)</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isMuted ? <MicOff className="h-3.5 w-3.5 text-red-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
                    {isCameraOff ? <VideoOff className="h-3.5 w-3.5 text-red-400" /> : <Video className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                </div>
              </div>

              {/* Remote Peers in Grid */}
              {peers.map((peer) => (
                <div
                  key={peer.peerId}
                  className={cn(
                    "relative bg-[#131B2E] rounded-2xl border overflow-hidden flex items-center justify-center aspect-video min-h-[160px] transition-all",
                    peer.peerId === activeSpeakerId ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl" : "border-white/10"
                  )}
                >
                  {peer.hasVideo && peer.stream ? (
                    <RemoteVideoPlayer stream={peer.stream} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Avatar className="h-14 w-14 bg-zinc-700 text-white font-bold text-lg">
                        <AvatarFallback className="bg-transparent">{peer.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-zinc-400 font-medium">{peer.name}</span>
                    </div>
                  )}

                  {peer.isHandRaised && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-black text-sm font-bold px-2 py-0.5 rounded-lg shadow-lg animate-bounce">
                      ✋ Hand Raised
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs">
                    <span className="font-semibold truncate text-white">{peer.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!peer.hasAudio ? <MicOff className="h-3.5 w-3.5 text-red-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
                      {!peer.hasVideo ? <VideoOff className="h-3.5 w-3.5 text-red-400" /> : <Video className="h-3.5 w-3.5 text-emerald-400" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW MODE 3: INTERACTIVE COLLABORATIVE WHITEBOARD */}
          {viewMode === "whiteboard" && (
            <div className="flex-1 flex flex-col bg-[#0F172A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
              {/* Whiteboard Toolbar */}
              <div className="h-12 bg-[#1E293B] border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setWbTool("pen")}
                    className={cn("h-8 px-2.5 text-xs rounded-lg", wbTool === "pen" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white")}
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" /> Pen
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setWbTool("highlighter")}
                    className={cn("h-8 px-2.5 text-xs rounded-lg", wbTool === "highlighter" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white")}
                  >
                    Highlighter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setWbTool("eraser")}
                    className={cn("h-8 px-2.5 text-xs rounded-lg", wbTool === "eraser" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white")}
                  >
                    Eraser
                  </Button>

                  <div className="h-4 w-px bg-white/10 mx-1" />

                  {/* Colors */}
                  {["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#FFFFFF"].map((c) => (
                    <button
                      key={c}
                      onClick={() => { setWbColor(c); setWbTool("pen"); }}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition-transform",
                        wbColor === c && wbTool !== "eraser" ? "scale-125 border-white" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearWhiteboard}
                    className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                </div>
              </div>

              {/* Whiteboard Canvas */}
              <div className="flex-1 relative cursor-crosshair overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={1400}
                  height={800}
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

        {/* 4. COLLAPSIBLE SIDE DRAWER (Chat & Participants) */}
        {activeSideTab && (
          <aside className="w-80 sm:w-96 bg-[#0E1524] border-l border-white/10 flex flex-col shrink-0 z-30 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSideTab("chat")}
                  className={cn("h-8 text-xs font-bold rounded-lg px-3", activeSideTab === "chat" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white")}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Chat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSideTab("participants")}
                  className={cn("h-8 text-xs font-bold rounded-lg px-3", activeSideTab === "participants" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white")}
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" /> People ({peers.length + 1})
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSideTab(null)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Tab */}
            {activeSideTab === "chat" ? (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
                      <MessageSquare className="h-8 w-8 mb-2 opacity-40 text-blue-400" />
                      <p className="font-semibold text-zinc-400">Classroom Chat is Live</p>
                      <p className="mt-1">Messages are synced with zero delay.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{msg.senderName}</span>
                            {msg.senderRole === "trainer" && (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[9px] px-1 py-0">
                                Trainer
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                        </div>
                        <div className="text-xs bg-white/5 border border-white/5 p-2.5 rounded-xl text-zinc-200 break-words">
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#090D16] flex items-center gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send message to class..."
                    className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-blue-500"
                  />
                  <Button type="submit" size="sm" className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0 font-bold">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            ) : (
              /* Participants Tab */
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <Avatar className="h-8 w-8 bg-blue-600 text-white font-bold text-xs">
                      <AvatarFallback className="bg-transparent">{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{currentUser.name} (You)</p>
                      <p className="text-[10px] text-zinc-400 capitalize">{currentUser.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isHandRaised && <span className="text-xs">✋</span>}
                    {isMuted ? <MicOff className="h-3.5 w-3.5 text-red-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
                    {isCameraOff ? <VideoOff className="h-3.5 w-3.5 text-red-400" /> : <Video className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                </div>

                {peers.map((p) => (
                  <div key={p.peerId} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      <Avatar className="h-8 w-8 bg-zinc-700 text-white font-bold text-xs">
                        <AvatarFallback className="bg-transparent">{p.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <p className="font-bold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-zinc-400 capitalize">{p.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.isHandRaised && <span className="text-xs animate-bounce">✋</span>}
                      {!p.hasAudio ? <MicOff className="h-3.5 w-3.5 text-red-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
                      {!p.hasVideo ? <VideoOff className="h-3.5 w-3.5 text-red-400" /> : <Video className="h-3.5 w-3.5 text-emerald-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 5. BOTTOM MNC MEETING CONTROL BAR */}
      <footer className="h-16 sm:h-20 bg-[#0E1524]/95 backdrop-blur-md border-t border-white/10 px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Device / Connection state */}
        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
          <span className={cn("h-2.5 w-2.5 rounded-full", connectionStatus === "connected" ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
          <span className="capitalize">{connectionStatus}</span>
          <span className="text-[10px] text-zinc-500 font-mono">| Press &apos;M&apos; for mic, &apos;V&apos; for cam</span>
        </div>

        {/* Center: Core Meeting Controls */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto relative">
          {/* Mute Toggle */}
          <Button
            size="sm"
            onClick={toggleMute}
            title="Toggle Microphone (M)"
            className={cn(
              "h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md relative",
              isMuted ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {audioLevel > 20 && !isMuted && (
              <span className="absolute -bottom-1 h-1 w-6 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </Button>

          {/* Camera Toggle */}
          <Button
            size="sm"
            onClick={toggleCamera}
            title="Toggle Camera (V)"
            className={cn(
              "h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md",
              isCameraOff ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          {/* Screen Share (Host / Trainer) */}
          {isTrainerOrAdmin && (
            <Button
              size="sm"
              onClick={toggleScreenShare}
              title="Share Screen"
              className={cn(
                "h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md hidden sm:flex",
                isScreenSharing ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              <ScreenShare className="h-5 w-5" />
            </Button>
          )}

          {/* Raise Hand ✋ */}
          <Button
            size="sm"
            onClick={toggleRaiseHand}
            title="Raise Hand (H)"
            className={cn(
              "h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md",
              isHandRaised ? "bg-amber-500 hover:bg-amber-600 text-black font-bold" : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            <Hand className="h-5 w-5" />
          </Button>

          {/* Live Reactions Emojis */}
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setShowReactionsMenu((prev) => !prev)}
              title="Send Live Reaction"
              className="h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all shadow-md"
            >
              <Smile className="h-5 w-5" />
            </Button>

            {showReactionsMenu && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#1A2234] border border-white/20 p-2 rounded-2xl flex items-center gap-1.5 shadow-2xl z-50 animate-in zoom-in-90 duration-150">
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      sendReaction(emoji);
                      setShowReactionsMenu(false);
                    }}
                    className="h-9 w-9 text-lg hover:scale-125 transition-transform rounded-xl hover:bg-white/10 flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Toggle */}
          <Button
            size="sm"
            onClick={() => setActiveSideTab((prev) => (prev === "chat" ? null : "chat"))}
            className={cn(
              "relative h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md",
              activeSideTab === "chat" ? "bg-blue-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            <MessageSquare className="h-5 w-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </Button>

          {/* Participants Toggle */}
          <Button
            size="sm"
            onClick={() => setActiveSideTab((prev) => (prev === "participants" ? null : "participants"))}
            className={cn(
              "h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md",
              activeSideTab === "participants" ? "bg-blue-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            <Users className="h-5 w-5" />
          </Button>

          {/* Fullscreen */}
          <Button
            size="sm"
            onClick={toggleFullscreen}
            className="h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl bg-white/10 hover:bg-white/20 text-white hidden sm:flex"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>

        {/* Right: Leave / End Class Action */}
        <div className="flex items-center gap-2">
          {isTrainerOrAdmin ? (
            <Button
              size="sm"
              onClick={() => setConfirmEndOpen(true)}
              className="h-9 sm:h-11 px-3 sm:px-5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl gap-2 shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">End Class</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleLeaveClass}
              className="h-9 sm:h-11 px-3 sm:px-5 bg-red-600/90 hover:bg-red-700 text-white font-bold text-xs rounded-xl gap-2 shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          )}
        </div>
      </footer>

      {/* Confirmation Dialog for Trainer End Class */}
      {confirmEndOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181F2E] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <ShieldAlert className="h-10 w-10 text-red-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white">End Live Classroom Session?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This will disconnect all student participants, calculate final attendance duration, and mark this class as COMPLETED.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmEndOpen(false)}
                className="h-9 text-xs font-semibold rounded-xl border-white/10 text-zinc-300 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEndClassByTrainer}
                className="h-9 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, End Class Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Spotlight Video Player (Safely mutes local playback to avoid feedback)
function SpotlightVideoPlayer({ stream, isLocalStream }: { stream: MediaStream; isLocalStream?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={Boolean(isLocalStream)}
      className="w-full h-full object-contain"
    />
  );
}

// Sub-component: Remote Video Player
function RemoteVideoPlayer({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
}

// Sub-component: Remote Peer Tile in filmstrip
function RemotePeerTile({ peer }: { peer: PeerInfo }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [peer.stream]);

  return (
    <div className="relative w-36 sm:w-44 h-24 sm:h-28 bg-[#131B2E] rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
      {peer.hasVideo && peer.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1">
          <Avatar className="h-10 w-10 bg-zinc-700 text-white font-bold text-xs">
            <AvatarFallback className="bg-transparent">{peer.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-zinc-400">Camera Off</span>
        </div>
      )}

      {peer.isHandRaised && (
        <div className="absolute top-1.5 right-1.5 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-md shadow-md animate-bounce">
          ✋
        </div>
      )}

      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px]">
        <span className="font-medium truncate text-white">{peer.name}</span>
        <span className="shrink-0">{!peer.hasAudio ? <MicOff className="h-3 w-3 text-red-400" /> : <Mic className="h-3 w-3 text-emerald-400" />}</span>
      </div>
    </div>
  );
}
