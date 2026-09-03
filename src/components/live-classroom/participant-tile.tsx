"use client";

import React, { useRef, useEffect } from "react";
import { Mic, MicOff, VideoOff, Pin, PictureInPicture2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ParticipantModel } from "@/hooks/use-falcon-meeting-engine";

interface ParticipantTileProps {
  participant: ParticipantModel;
  isLocal?: boolean;
  isSpotlight?: boolean;
  onPin?: () => void;
  onRemoveFromTile?: () => void;
  className?: string;
}

export function ParticipantTile({
  participant,
  isLocal = false,
  isSpotlight = false,
  onPin,
  onRemoveFromTile,
  className,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bind video stream
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [participant.stream, participant.hasVideo, participant.isScreenSharing]);

  // Bind audio stream for remote peers
  useEffect(() => {
    if (!isLocal && audioRef.current && participant.stream) {
      if (audioRef.current.srcObject !== participant.stream) {
        audioRef.current.srcObject = participant.stream;
      }
      audioRef.current.play().catch(() => {});
    }
  }, [isLocal, participant.stream, participant.hasAudio]);

  // Dynamic track update listeners
  useEffect(() => {
    if (!participant.stream) return;
    const stream = participant.stream;

    const handleTrackAdded = () => {
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (!isLocal && audioRef.current && audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(() => {});
      }
    };

    stream.addEventListener("addtrack", handleTrackAdded);
    stream.addEventListener("removetrack", handleTrackAdded);

    return () => {
      stream.removeEventListener("addtrack", handleTrackAdded);
      stream.removeEventListener("removetrack", handleTrackAdded);
    };
  }, [participant.stream, isLocal]);

  const hasVideoStream =
    (participant.hasVideo || participant.isScreenSharing) &&
    participant.stream &&
    participant.stream.getVideoTracks().length > 0;

  return (
    <div
      className={cn(
        "relative bg-[#202124] rounded-2xl border border-[#DADCE0] overflow-hidden flex items-center justify-center transition-all duration-200 shadow-sm group",
        participant.isSpeaking
          ? "border-[#1E8E3E] ring-3 ring-[#1E8E3E]/50 shadow-md"
          : "border-[#DADCE0]",
        className
      )}
    >
      {/* Remote Audio Playback Element */}
      {!isLocal && (
        <audio
          ref={(el) => {
            audioRef.current = el;
            if (el && participant.stream && el.srcObject !== participant.stream) {
              el.srcObject = participant.stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
        />
      )}

      {/* Video Stream Element */}
      {hasVideoStream ? (
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el && participant.stream && el.srcObject !== participant.stream) {
              el.srcObject = participant.stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          muted={Boolean(isLocal)}
          className={cn(
            "w-full h-full object-cover",
            isLocal && !participant.isScreenSharing && "scale-x-[-1]"
          )}
        />
      ) : (
        /* Camera Off Avatar Fallback */
        <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center">
          <Avatar
            className={cn(
              "bg-[#1A73E8] border-2 border-white/20 text-white font-bold shadow-md",
              isSpotlight ? "h-20 w-20 text-2xl" : "h-12 w-12 text-base"
            )}
          >
            <AvatarFallback className="bg-transparent">{participant.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold text-white truncate max-w-[140px]">
            {isLocal ? "You" : participant.name}
          </span>
          <span className="text-[10px] text-zinc-400">Camera Off</span>
        </div>
      )}

      {/* Hand Raised Floating Badge */}
      {participant.isHandRaised && (
        <div className="absolute top-2.5 right-2.5 bg-[#F9AB00] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md animate-bounce flex items-center gap-1 z-10">
          <span>✋</span>
          <span className="hidden sm:inline text-[10px]">Raised</span>
        </div>
      )}

      {/* Pin / Spotlight Button */}
      {onPin && (
        <button
          onClick={onPin}
          title={isSpotlight ? "Unpin participant" : "Pin to main stage"}
          className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-white/95 backdrop-blur-xs text-[#5F6368] hover:text-[#1A73E8] hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer border border-[#DADCE0] shadow-sm"
        >
          <Pin className={cn("h-3.5 w-3.5", isSpotlight && "text-[#1A73E8] rotate-45")} />
        </button>
      )}

      {/* Remove This Tile (Return to Floating Self-View) */}
      {isLocal && onRemoveFromTile && (
        <button
          onClick={onRemoveFromTile}
          title="Remove this tile and return to floating self-view"
          aria-label="Remove this tile"
          className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[#3C4043] hover:text-[#1A73E8] hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer border border-[#DADCE0] shadow-sm flex items-center gap-1 text-[10px] font-bold"
        >
          <PictureInPicture2 className="h-3 w-3" />
          <span>Remove tile</span>
        </button>
      )}

      {/* Bottom Info Bar */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 max-w-[85%] border border-[#DADCE0] shadow-sm">
          <span className="text-[11px] font-bold text-[#202124] truncate">
            {isLocal ? "You" : participant.name}
            {participant.isScreenSharing ? " (Screen Share)" : ""}
          </span>
          {participant.isScreenSharing && (
            <span className="bg-[#1A73E8] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md">
              Screen
            </span>
          )}
          {participant.role === "trainer" && !participant.isScreenSharing && (
            <span className="bg-[#E8F0FE] text-[#1A73E8] text-[9px] font-bold px-1.5 py-0.2 rounded-md border border-[#D2E3FC]">
              Host
            </span>
          )}
        </div>

        <div className="bg-white/95 backdrop-blur-xs p-1 rounded-lg flex items-center gap-1 border border-[#DADCE0] shadow-sm">
          {!participant.hasAudio ? (
            <MicOff className="h-3.5 w-3.5 text-[#D93025]" />
          ) : (
            <Mic className="h-3.5 w-3.5 text-[#1E8E3E]" />
          )}
          {!participant.hasVideo && !participant.isScreenSharing && (
            <VideoOff className="h-3.5 w-3.5 text-[#D93025]" />
          )}
        </div>
      </div>
    </div>
  );
}
