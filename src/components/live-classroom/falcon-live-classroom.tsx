"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, MessageSquare, Users,
  PhoneOff, Maximize2, Minimize2, AlertCircle, ShieldAlert,
  Send, Sparkles, Check, ChevronRight, X, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useLiveClassWebRTC, PeerInfo } from "@/hooks/use-live-class-webrtc";

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

export function FalconLiveClassroom({
  classDetails,
  currentUser,
  backUrl,
}: FalconLiveClassroomProps) {
  const router = useRouter();
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "participants" | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const spotlightVideoRef = useRef<HTMLVideoElement | null>(null);
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
    connectionStatus,
    mediaError,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    sendMessage,
    endClass,
  } = useLiveClassWebRTC({
    classId: classDetails.id,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    onClassEnded: () => {
      // Finalize student attendance and redirect
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

    // Join Session
    fetch("/api/student/live-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join_session", liveClassId: classDetails.id }),
    }).catch((err) => console.warn("Join session attendance record warning:", err));

    // Periodic Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      fetch("/api/student/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", liveClassId: classDetails.id, seconds: 30 }),
      }).catch((err) => console.warn("Attendance heartbeat warning:", err));
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      // Leave Session
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

  // Handle Fullscreen & Landscape Orientation Lock
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (classroomContainerRef.current?.requestFullscreen) {
          await classroomContainerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
        // Request landscape on mobile if supported
        if (typeof window !== "undefined" && "screen" in window && (window.screen as any)?.orientation?.lock) {
          try {
            await (window.screen as any).orientation.lock("landscape");
          } catch {}
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle warning:", err);
    }
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

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Find trainer peer or screen share for spotlight
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
      className="relative flex flex-col h-screen w-full bg-[#0B0F19] text-white overflow-hidden select-none font-sans"
    >
      {/* 1. TOP CLASSROOM NAVBAR */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-[#111827]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20">
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
            </div>
            <span className="text-[10px] sm:text-xs text-zinc-400 truncate">
              {classDetails.courseName || "Interactive Session"} • Trainer: {classDetails.trainerName || "Lead Instructor"}
            </span>
          </div>
        </div>

        {/* Status Indicators & Clock */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-zinc-300">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-semibold">{peers.length + 1} Connected</span>
          </div>
        </div>
      </header>

      {/* 2. MEDIA ERROR ALERT BANNER */}
      {mediaError && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{mediaError}</span>
          </div>
          <button onClick={() => {}} className="text-amber-300 hover:text-white text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. MAIN VIDEO & INTERACTIVE WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIDEO AREA */}
        <div className="flex-1 flex flex-col p-2 sm:p-4 gap-2 sm:gap-4 overflow-y-auto">
          {/* A. Spotlight View (Trainer Camera, Screen Share, or External Meeting Workspace) */}
          <div className="flex-1 relative bg-black/60 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl min-h-[220px]">
            {isExternalPlatform ? (
              <div className="flex flex-col items-center justify-center gap-4 text-center p-6 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Video className="h-8 w-8" />
                </div>
                <div>
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/40 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wide">
                    {classDetails.platform === "google_meet"
                      ? "Google Meet"
                      : classDetails.platform === "zoom"
                      ? "Zoom Meeting"
                      : classDetails.platform === "teams"
                      ? "Microsoft Teams"
                      : "External Meeting"}
                  </Badge>
                  <h3 className="text-base font-bold text-white mt-2">{classDetails.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    This session is hosted on an external video platform. Launch the meeting below while keeping this FALCON tab open for Live Chat, Q&A, and automated attendance logging.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <Button
                    onClick={() => window.open(classDetails.meetingUrl, "_blank", "noopener,noreferrer")}
                    className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
                  >
                    <Video className="h-4 w-4" />
                    <span>Launch {classDetails.platform === "google_meet" ? "Google Meet" : classDetails.platform === "zoom" ? "Zoom" : classDetails.platform === "teams" ? "Teams" : "Meeting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSideTab("chat")}
                    className="h-10 px-4 text-xs font-semibold rounded-xl border-white/10 text-white hover:bg-white/10 gap-2"
                  >
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                    <span>Open Live Chat</span>
                  </Button>
                </div>
              </div>
            ) : spotlightStream ? (
              <SpotlightVideoPlayer stream={spotlightStream} isMuted={isTrainerOrAdmin && isScreenSharing} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
                <Avatar className="h-20 w-20 border-2 border-blue-500/40 bg-blue-600/20 text-blue-300">
                  <AvatarFallback className="text-2xl font-bold bg-transparent">
                    {classDetails.trainerName?.charAt(0) || "T"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm text-white">{classDetails.trainerName || "Lead Trainer"}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Host stream is initializing or audio-only mode</p>
                </div>
              </div>
            )}

            {/* Spotlight Label Badge */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
              <span className="font-semibold text-white">
                {isExternalPlatform
                  ? `External Video Platform (${classDetails.platform?.toUpperCase()})`
                  : isScreenSharing
                  ? "You (Screen Share)"
                  : isTrainerOrAdmin
                  ? "You (Host)"
                  : classDetails.trainerName || "Trainer"}
              </span>
              {isScreenSharing && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-[9px] px-1.5">
                  Screen
                </Badge>
              )}
            </div>
          </div>

          {/* B. Participant Grid / Filmstrip */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
            {/* Local User Tile */}
            <div className="relative w-36 sm:w-44 h-24 sm:h-28 bg-[#181F2E] rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
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

        {/* C. COLLAPSIBLE SIDE DRAWER (Chat & Participants) */}
        {activeSideTab && (
          <aside className="w-80 sm:w-96 bg-[#111827] border-l border-white/10 flex flex-col shrink-0 z-30 animate-in slide-in-from-right duration-200">
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

            {/* Drawer Body */}
            {activeSideTab === "chat" ? (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
                      <MessageSquare className="h-8 w-8 mb-2 opacity-40 text-blue-400" />
                      <p className="font-semibold text-zinc-400">Classroom Chat is live</p>
                      <p className="mt-1">Ask questions and collaborate with your instructor in real time.</p>
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

                {/* Input Box */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#0B0F19] flex items-center gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message to class..."
                    className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-blue-500"
                  />
                  <Button type="submit" size="sm" className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0 font-bold">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            ) : (
              /* Participants List */
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                {/* Local user */}
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
                    {isMuted ? <MicOff className="h-3.5 w-3.5 text-red-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
                    {isCameraOff ? <VideoOff className="h-3.5 w-3.5 text-red-400" /> : <Video className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                </div>

                {/* Remote Peers */}
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

      {/* 4. BOTTOM MEETING CONTROL BAR */}
      <footer className="h-16 sm:h-20 bg-[#111827]/95 backdrop-blur-md border-t border-white/10 px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Device / Connection state */}
        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
          <span className={cn("h-2.5 w-2.5 rounded-full", connectionStatus === "connected" ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
          <span className="capitalize">{connectionStatus}</span>
        </div>

        {/* Center: Core Call Controls */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto">
          {/* Mute Toggle */}
          <Button
            size="sm"
            onClick={toggleMute}
            className={cn(
              "h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md",
              isMuted ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Camera Toggle */}
          <Button
            size="sm"
            onClick={toggleCamera}
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
              className={cn(
                "h-10 sm:h-12 w-10 sm:w-12 p-0 rounded-2xl transition-all shadow-md hidden sm:flex",
                isScreenSharing ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              <ScreenShare className="h-5 w-5" />
            </Button>
          )}

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

          {/* Fullscreen / Landscape */}
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
              <h3 className="text-base font-bold text-white">End Classroom Session?</h3>
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

// Sub-component: Spotlight Video Player
function SpotlightVideoPlayer({ stream, isMuted }: { stream: MediaStream; isMuted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className="w-full h-full object-contain"
    />
  );
}

// Sub-component: Remote Peer Tile in filmstrip
function RemotePeerTile({ peer }: { peer: PeerInfo }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative w-36 sm:w-44 h-24 sm:h-28 bg-[#181F2E] rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
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

      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px]">
        <span className="font-medium truncate text-white">{peer.name}</span>
        <span className="shrink-0">{!peer.hasAudio ? <MicOff className="h-3 w-3 text-red-400" /> : <Mic className="h-3 w-3 text-emerald-400" />}</span>
      </div>
    </div>
  );
}
