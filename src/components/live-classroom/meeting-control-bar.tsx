"use client";

import React, { useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare,
  Smile, PhoneOff, MessageSquare, Users, ShieldCheck,
  MoreVertical, Settings, Maximize2, Minimize2, Hand,
  PenTool, Eye, EyeOff, LayoutTemplate
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HostMeetingPermissions } from "@/hooks/use-falcon-meeting-engine";
import { LayoutSelectorPopover, MeetingLayoutMode } from "./layout-selector-popover";

interface MeetingControlBarProps {
  meetingTitle: string;
  elapsedSeconds: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  audioLevel: number;
  unreadChatCount: number;
  participantCount: number;
  activeSideTab: "chat" | "participants" | "info" | "host_controls" | null;
  viewMode?: MeetingLayoutMode | "whiteboard";
  isHost: boolean;
  hostPermissions: HostMeetingPermissions;
  isAnnotating?: boolean;
  selfViewMode?: "floating" | "in_grid" | "hidden";
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleRaiseHand: () => void;
  onSendReaction: (emoji: string) => void;
  onToggleSideTab: (tab: "chat" | "participants" | "info" | "host_controls") => void;
  onChangeViewMode: (mode: MeetingLayoutMode) => void;
  onToggleAnnotate?: () => void;
  onToggleSelfView?: () => void;
  onOpenSettings: () => void;
  onLeaveOrEnd: () => void;
}

const EMOJI_REACTIONS = ["👍", "👏", "❤️", "🎉", "😂", "😮"];

export function MeetingControlBar({
  meetingTitle,
  elapsedSeconds,
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHandRaised,
  audioLevel,
  unreadChatCount,
  participantCount,
  activeSideTab,
  viewMode = "auto",
  isHost,
  hostPermissions,
  isAnnotating,
  selfViewMode = "floating",
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleRaiseHand,
  onSendReaction,
  onToggleSideTab,
  onChangeViewMode,
  onToggleAnnotate,
  onToggleSelfView,
  onOpenSettings,
  onLeaveOrEnd,
}: MeetingControlBarProps) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [layoutPopoverOpen, setLayoutPopoverOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isMicAllowed = isHost || hostPermissions.allowMic;
  const isCameraAllowed = isHost || hostPermissions.allowCamera;
  const isScreenShareAllowed = isHost || hostPermissions.allowScreenShare;
  const isAnnotationAllowed = isHost || hostPermissions.allowAnnotation;
  const isSelfHidden = selfViewMode === "hidden";

  return (
    <footer
      aria-label="Meeting Controls Toolbar"
      className="h-20 bg-white border-t border-[#DADCE0] px-4 sm:px-6 flex items-center justify-between z-30 select-none shadow-xs"
    >
      {/* 1. LEFT: Meeting Title & Timer */}
      <div className="hidden md:flex items-center gap-3 w-1/4">
        <div className="max-w-[220px] truncate">
          <p className="text-sm font-bold text-[#202124] truncate leading-tight">{meetingTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-[#1E8E3E] animate-pulse" />
            <span className="text-xs font-semibold text-[#5F6368] font-mono">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Main Control Actions */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-1 md:flex-initial">
        {/* Microphone */}
        <div className="relative">
          <button
            onClick={isMicAllowed ? onToggleMute : undefined}
            disabled={!isMicAllowed}
            aria-label={isMuted ? "Turn on microphone (M)" : "Turn off microphone (M)"}
            title={!isMicAllowed ? "Host has disabled microphone" : isMuted ? "Turn on microphone (M)" : "Turn off microphone (M)"}
            className={cn(
              "h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs",
              isMuted
                ? "bg-[#D93025] hover:bg-[#B3261E] text-white"
                : "bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0]"
            )}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {!isMuted && audioLevel > 15 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#1E8E3E] ring-2 ring-white animate-pulse" />
          )}
        </div>

        {/* Camera */}
        <button
          onClick={isCameraAllowed ? onToggleCamera : undefined}
          disabled={!isCameraAllowed}
          aria-label={isCameraOff ? "Turn on camera (V)" : "Turn off camera (V)"}
          title={!isCameraAllowed ? "Host has disabled camera" : isCameraOff ? "Turn on camera (V)" : "Turn off camera (V)"}
          className={cn(
            "h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs",
            isCameraOff
              ? "bg-[#D93025] hover:bg-[#B3261E] text-white"
              : "bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0]"
          )}
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>

        {/* Screen Share / Present */}
        <button
          onClick={isScreenShareAllowed ? onToggleScreenShare : undefined}
          disabled={!isScreenShareAllowed}
          aria-label={isScreenSharing ? "Stop presenting" : "Present now"}
          title={!isScreenShareAllowed ? "Host disabled screen sharing" : isScreenSharing ? "Stop presenting" : "Present now"}
          className={cn(
            "h-11 w-11 sm:h-12 sm:w-12 rounded-full hidden sm:flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs",
            isScreenSharing
              ? "bg-[#1A73E8] hover:bg-[#185ABC] text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-400/40"
              : "bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0]"
          )}
        >
          <ScreenShare className="h-5 w-5" />
        </button>

        {/* Layout Selector Trigger & Anchored Dropdown (Desktop) */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => {
              setLayoutPopoverOpen((prev) => !prev);
              setMoreMenuOpen(false);
              setReactionsOpen(false);
            }}
            aria-label="Change layout"
            title="Change Layout"
            className={cn(
              "h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0] flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs",
              layoutPopoverOpen && "bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]"
            )}
          >
            <LayoutTemplate className="h-5 w-5" />
          </button>

          {layoutPopoverOpen && (
            <LayoutSelectorPopover
              isOpen={layoutPopoverOpen}
              currentLayout={viewMode === "whiteboard" ? "auto" : viewMode}
              onSelectLayout={(m) => {
                onChangeViewMode(m);
                setLayoutPopoverOpen(false);
              }}
              onClose={() => setLayoutPopoverOpen(false)}
            />
          )}
        </div>

        {/* Board / Annotate (Contextual - only active when presenting & allowed) */}
        {(isScreenSharing || isHost) && isAnnotationAllowed && onToggleAnnotate && (
          <button
            onClick={onToggleAnnotate}
            aria-label={isAnnotating ? "Close board" : "Board / Annotate"}
            title={isAnnotating ? "Close Board" : "Board / Annotate"}
            className={cn(
              "h-11 w-11 sm:h-12 sm:w-12 rounded-full hidden sm:flex items-center justify-center transition-all duration-150 cursor-pointer animate-in zoom-in-90 shadow-xs",
              isAnnotating
                ? "bg-[#9334E8] hover:bg-[#7E22CE] text-white shadow-md shadow-purple-500/20"
                : "bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0]"
            )}
          >
            <PenTool className="h-5 w-5" />
          </button>
        )}

        {/* Raise Hand */}
        <button
          onClick={onToggleRaiseHand}
          aria-label={isHandRaised ? "Lower hand (H)" : "Raise hand (H)"}
          title={isHandRaised ? "Lower hand (H)" : "Raise hand (H)"}
          className={cn(
            "h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs",
            isHandRaised
              ? "bg-[#FBBC04] hover:bg-[#F29900] text-[#202124] shadow-md shadow-yellow-500/20 ring-2 ring-yellow-400/40"
              : "bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0]"
          )}
        >
          <Hand className="h-5 w-5" />
        </button>

        {/* Reactions Picker */}
        <div className="relative">
          <button
            onClick={() => {
              setReactionsOpen((prev) => !prev);
              setLayoutPopoverOpen(false);
              setMoreMenuOpen(false);
            }}
            aria-label="Send a reaction"
            title="Send a reaction"
            className={cn(
              "h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0] flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs",
              reactionsOpen && "bg-[#E8EAED]"
            )}
          >
            <Smile className="h-5 w-5" />
          </button>

          {reactionsOpen && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white border border-[#DADCE0] p-1.5 rounded-full flex items-center gap-1 shadow-xl z-50 animate-in zoom-in-95 duration-100">
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setReactionsOpen(false);
                  }}
                  className="h-9 w-9 flex items-center justify-center text-lg hover:bg-[#F1F3F4] rounded-full transition-transform hover:scale-125 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* More Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setMoreMenuOpen((prev) => !prev);
              setLayoutPopoverOpen(false);
              setReactionsOpen(false);
            }}
            aria-label="More options"
            title="More options"
            className={cn(
              "h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0] flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs",
              moreMenuOpen && "bg-[#E8EAED]"
            )}
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {moreMenuOpen && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white border border-[#DADCE0] p-1.5 rounded-2xl flex flex-col gap-1 shadow-xl z-50 w-56 animate-in zoom-in-95 duration-100 text-xs text-[#3C4043]">
              <button
                onClick={() => {
                  setLayoutPopoverOpen(true);
                  setMoreMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer transition-colors"
              >
                <LayoutTemplate className="h-4 w-4 text-[#5F6368]" />
                <span>Change layout</span>
              </button>

              {onToggleSelfView && (
                <button
                  onClick={() => {
                    onToggleSelfView();
                    setMoreMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer transition-colors"
                >
                  {isSelfHidden ? <Eye className="h-4 w-4 text-[#5F6368]" /> : <EyeOff className="h-4 w-4 text-[#5F6368]" />}
                  <span>{isSelfHidden ? "Show Self View" : "Hide Self View"}</span>
                </button>
              )}

              <button
                onClick={() => {
                  toggleFullscreen();
                  setMoreMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer transition-colors"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4 text-[#5F6368]" /> : <Maximize2 className="h-4 w-4 text-[#5F6368]" />}
                <span>{isFullscreen ? "Exit Fullscreen" : "Full screen"}</span>
              </button>

              <button
                onClick={() => {
                  onOpenSettings();
                  setMoreMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[#F1F3F4] hover:text-[#202124] cursor-pointer transition-colors"
              >
                <Settings className="h-4 w-4 text-[#5F6368]" />
                <span>Audio & Video Settings</span>
              </button>
            </div>
          )}

          {/* Mobile Fallback Anchor for Layout Dropdown */}
          {layoutPopoverOpen && (
            <div className="sm:hidden">
              <LayoutSelectorPopover
                isOpen={layoutPopoverOpen}
                currentLayout={viewMode === "whiteboard" ? "auto" : viewMode}
                onSelectLayout={(m) => {
                  onChangeViewMode(m);
                  setLayoutPopoverOpen(false);
                }}
                onClose={() => setLayoutPopoverOpen(false)}
              />
            </div>
          )}
        </div>

        {/* End Call / Leave Button */}
        <button
          onClick={onLeaveOrEnd}
          aria-label={isHost ? "End call for everyone" : "Leave call"}
          title={isHost ? "End call for everyone" : "Leave call"}
          className="h-11 px-5 sm:h-12 sm:px-6 rounded-full bg-[#D93025] hover:bg-[#B3261E] text-white flex items-center justify-center gap-2 font-bold text-xs transition-all duration-150 cursor-pointer shadow-md shadow-red-500/20 active:scale-95"
        >
          <PhoneOff className="h-5 w-5" />
          <span className="hidden md:inline">{isHost ? "End Class" : "Leave"}</span>
        </button>
      </div>

      {/* 3. RIGHT: Side Panel Toggles */}
      <div className="hidden md:flex items-center justify-end gap-1.5 w-1/4">
        {/* People Tab Toggle */}
        <button
          onClick={() => onToggleSideTab("participants")}
          aria-label={`Participants (${participantCount})`}
          title={`Participants (${participantCount})`}
          className={cn(
            "h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-colors cursor-pointer relative",
            activeSideTab === "participants"
              ? "bg-[#E8F0FE] text-[#1A73E8]"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
          )}
        >
          <Users className="h-5 w-5" />
          {participantCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#1A73E8] text-white font-bold text-[9px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
              {participantCount}
            </span>
          )}
        </button>

        {/* In-Call Chat Toggle */}
        <button
          onClick={() => onToggleSideTab("chat")}
          aria-label="In-call chat"
          title="In-call chat"
          className={cn(
            "h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-colors cursor-pointer relative",
            activeSideTab === "chat"
              ? "bg-[#E8F0FE] text-[#1A73E8]"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#1A73E8] text-white font-bold text-[9px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Host Controls Toggle (Host Only) */}
        {isHost && (
          <button
            onClick={() => onToggleSideTab("host_controls")}
            aria-label="Host controls"
            title="Host controls"
            className={cn(
              "h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              activeSideTab === "host_controls"
                ? "bg-[#E8F0FE] text-[#1A73E8]"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            )}
          >
            <ShieldCheck className="h-5 w-5" />
          </button>
        )}
      </div>
    </footer>
  );
}
