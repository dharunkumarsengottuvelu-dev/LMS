"use client";

import React, { useRef, useEffect } from "react";
import {
  Mic, MicOff, Video, VideoOff, Volume2, ShieldCheck,
  ChevronRight, Loader2, Headphones, ShieldAlert, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DeviceInfo, MeetingLifecycle } from "@/hooks/use-falcon-meeting-engine";

interface MeetingPrejoinScreenProps {
  meetingTitle: string;
  courseName?: string;
  trainerName?: string;
  userName: string;
  userRole: string;
  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  audioLevel: number;
  audioDevices: DeviceInfo[];
  videoDevices: DeviceInfo[];
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  lifecycle?: MeetingLifecycle;
  errorMessage?: string | null;
  isJoining: boolean;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onJoin: () => void;
  onRequestJoin?: () => void;
  onCancelRequest?: () => void;
  onReturnToClasses?: () => void;
  onJoinAudioOnly: () => void;
}

export function MeetingPrejoinScreen({
  meetingTitle,
  courseName,
  trainerName,
  userName,
  userRole,
  localStream,
  isMuted,
  isCameraOff,
  audioLevel,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  lifecycle = "PREJOIN",
  errorMessage,
  isJoining,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onToggleMute,
  onToggleCamera,
  onJoin,
  onRequestJoin,
  onCancelRequest,
  onReturnToClasses,
  onJoinAudioOnly,
}: MeetingPrejoinScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      if (videoRef.current.srcObject !== localStream) {
        videoRef.current.srcObject = localStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [localStream, isCameraOff]);

  const isHost = userRole === "trainer" || userRole === "admin";

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] text-[#202124] flex flex-col items-center justify-center p-4 sm:p-8 select-none font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch justify-center">
        {/* LEFT CARD: Video & Audio Hardware Preview */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-[#DADCE0] rounded-3xl p-5 shadow-sm space-y-4">
          {/* Main Video Viewport (high contrast viewport for true camera clarity) */}
          <div className="relative aspect-video w-full bg-[#202124] rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            {!isCameraOff && localStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
                <Avatar className="h-20 w-20 bg-[#1A73E8] border-2 border-white/20 text-white font-bold text-2xl shadow-md">
                  <AvatarFallback className="bg-transparent">{userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm text-white">{userName}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Camera is off</p>
                </div>
              </div>
            )}

            {/* Floating Quick Media Controls */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-[#DADCE0] px-3.5 py-1.5 rounded-full shadow-lg z-10">
              <button
                onClick={onToggleMute}
                aria-label={isMuted ? "Turn on microphone" : "Turn off microphone"}
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm",
                  isMuted
                    ? "bg-[#D93025] hover:bg-[#B3261E] text-white"
                    : "bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043]"
                )}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                onClick={onToggleCamera}
                aria-label={isCameraOff ? "Turn on camera" : "Turn off camera"}
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm",
                  isCameraOff
                    ? "bg-[#D93025] hover:bg-[#B3261E] text-white"
                    : "bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043]"
                )}
              >
                {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </button>
            </div>

            {/* Live Audio Meter */}
            {!isMuted && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-white shadow-md">
                <Volume2 className="h-3.5 w-3.5 text-[#1E8E3E]" />
                <div className="w-14 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1E8E3E] transition-all duration-75 rounded-full"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hardware Device Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2.5 rounded-2xl">
              <label className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block mb-1">
                Microphone
              </label>
              <select
                value={selectedAudioDevice}
                onChange={(e) => onSelectAudioDevice(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-[#202124] font-medium rounded-lg focus:outline-hidden cursor-pointer"
              >
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-white text-[#202124]">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2.5 rounded-2xl">
              <label className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block mb-1">
                Camera
              </label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => onSelectVideoDevice(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-[#202124] font-medium rounded-lg focus:outline-hidden cursor-pointer"
              >
                {videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-white text-[#202124]">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Session Info & Dynamic Lifecycle Action Area */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-[#DADCE0] p-6 sm:p-7 rounded-3xl shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wide">
                {isHost ? "HOST ROOM" : "STUDENT CLASSROOM"}
              </Badge>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight leading-snug">
                {meetingTitle}
              </h1>
              <p className="text-xs text-[#5F6368] mt-1">
                {courseName || "Interactive Session"} • {isHost ? `Host: ${userName}` : `Trainer: ${trainerName || "Lead Instructor"}`}
              </p>
            </div>

            <div className="space-y-2.5 border-t border-[#E8EAED] pt-4">
              <div className="flex items-center gap-2.5 text-xs text-[#3C4043]">
                <ShieldCheck className="h-4 w-4 text-[#1E8E3E] shrink-0" />
                <span>WebRTC End-to-End Encrypted Session</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#3C4043]">
                <Headphones className="h-4 w-4 text-[#1A73E8] shrink-0" />
                <span>Real-Time Attendance & Audio/Video Sync</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC ACTION STATE */}
          {lifecycle === "WAITING_APPROVAL" ? (
            /* Waiting for Host Admission State */
            <div className="space-y-4 bg-[#F8F9FA] p-5 rounded-2xl border border-[#DADCE0] text-center">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-[#1A73E8] animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#202124]">Waiting for the host to let you in...</h4>
                <p className="text-xs text-[#5F6368]">Someone in the call will review and approve your request shortly.</p>
              </div>
              {onCancelRequest && (
                <Button
                  variant="outline"
                  onClick={onCancelRequest}
                  className="rounded-full border-[#DADCE0] text-[#5F6368] hover:text-[#202124] text-xs font-semibold px-6 cursor-pointer"
                >
                  Cancel Request
                </Button>
              )}
            </div>
          ) : lifecycle === "DENIED" ? (
            /* Denied / Kicked State */
            <div className="space-y-4 bg-[#FCE8E6] p-5 rounded-2xl border border-[#FAD2CF] text-center">
              <ShieldAlert className="h-8 w-8 text-[#D93025] mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#D93025]">You cannot join this call</h4>
                <p className="text-xs text-[#5F6368]">{errorMessage || "The meeting host has denied your request to join."}</p>
              </div>
              {onReturnToClasses && (
                <Button
                  onClick={onReturnToClasses}
                  className="rounded-full bg-[#1A73E8] hover:bg-[#185ABC] text-white text-xs font-semibold px-6 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Return to Live Classes
                </Button>
              )}
            </div>
          ) : (
            /* Normal Pre-Join Action Buttons */
            <div className="space-y-3 pt-2">
              <Button
                onClick={isHost ? onJoin : (onRequestJoin || onJoin)}
                disabled={isJoining}
                className="w-full h-12 bg-[#1A73E8] hover:bg-[#185ABC] text-white font-bold text-sm rounded-full shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : isHost ? (
                  <>
                    <span>Start Classroom Now</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Ask to Join</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={onJoinAudioOnly}
                disabled={isJoining}
                className="w-full h-11 border-[#DADCE0] text-xs font-semibold text-[#3C4043] hover:text-[#1A73E8] hover:bg-[#F1F3F4] rounded-full cursor-pointer"
              >
                Join with Audio Only
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
