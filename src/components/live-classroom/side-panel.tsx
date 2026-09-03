"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X, MessageSquare, Users, Info, ShieldCheck, Copy,
  Check, Mic, MicOff, Video, VideoOff, Send,
  Lock, Unlock, ShieldAlert, UserX, Search, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ParticipantModel, ChatMessage, HostMeetingPermissions, JoinRequestItem } from "@/hooks/use-falcon-meeting-engine";

interface SidePanelProps {
  activeTab: "chat" | "participants" | "info" | "host_controls";
  localParticipant: ParticipantModel;
  remoteParticipants: ParticipantModel[];
  messages: ChatMessage[];
  chatInput: string;
  isHost: boolean;
  joinRequests?: JoinRequestItem[];
  meetingDetails: {
    id: string;
    title: string;
    courseName?: string;
    trainerName?: string;
    scheduledDate?: string;
    startTime?: string;
  };
  hostPermissions: HostMeetingPermissions;
  onSetChatInput: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSelectTab: (tab: "chat" | "participants" | "info" | "host_controls") => void;
  onClose: () => void;
  onMuteAll?: () => void;
  onMuteParticipant?: (userId: string) => void;
  onRemoveParticipant?: (userId: string) => void;
  onUpdateHostPermissions?: (updated: Partial<HostMeetingPermissions>) => void;
  onAdmitStudent?: (requestId: string, userId: string) => void;
  onDenyStudent?: (requestId: string, userId: string) => void;
  onAdmitAllStudents?: () => void;
  onDenyAllStudents?: () => void;
}

export function SidePanel({
  activeTab,
  localParticipant,
  remoteParticipants,
  messages,
  chatInput,
  isHost,
  joinRequests = [],
  meetingDetails,
  hostPermissions,
  onSetChatInput,
  onSendMessage,
  onSelectTab,
  onClose,
  onMuteAll,
  onMuteParticipant,
  onRemoveParticipant,
  onUpdateHostPermissions,
  onAdmitStudent,
  onDenyStudent,
  onAdmitAllStudents,
  onDenyAllStudents,
}: SidePanelProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allConnectedParticipants = [localParticipant, ...remoteParticipants];
  const filteredParticipants = allConnectedParticipants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      aria-label="Meeting sidebar panel"
      className="w-80 sm:w-96 bg-white border-l border-[#DADCE0] flex flex-col h-full z-20 select-none shadow-sm transition-all duration-200"
    >
      {/* SIDEBAR HEADER TABS */}
      <div className="h-16 px-4 border-b border-[#DADCE0] flex items-center justify-between shrink-0 bg-[#F8F9FA]">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {/* Chat Tab */}
          <button
            onClick={() => onSelectTab("chat")}
            aria-label="Chat tab"
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              activeTab === "chat" ? "bg-[#1A73E8] text-white shadow-xs" : "text-[#5F6368] hover:text-[#202124]"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </button>

          {/* People Tab */}
          <button
            onClick={() => onSelectTab("participants")}
            aria-label={`People tab (${allConnectedParticipants.length})`}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              activeTab === "participants" ? "bg-[#1A73E8] text-white shadow-xs" : "text-[#5F6368] hover:text-[#202124]"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>People ({allConnectedParticipants.length})</span>
            {isHost && joinRequests.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-[#1A73E8] ring-2 ring-white" />
            )}
          </button>

          {/* Info Tab (Host Only) */}
          {isHost && (
            <button
              onClick={() => onSelectTab("info")}
              aria-label="Meeting Info tab"
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                activeTab === "info" ? "bg-[#1A73E8] text-white shadow-xs" : "text-[#5F6368] hover:text-[#202124]"
              )}
            >
              <Info className="h-3.5 w-3.5" />
              <span>Info</span>
            </button>
          )}

          {/* Host Controls Tab (Host Only) */}
          {isHost && (
            <button
              onClick={() => onSelectTab("host_controls")}
              aria-label="Host Controls tab"
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                activeTab === "host_controls" ? "bg-[#1A73E8] text-white shadow-xs" : "text-[#5F6368] hover:text-[#202124]"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Host</span>
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="h-8 w-8 rounded-full flex items-center justify-center text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* TAB 1: REALTIME CHAT */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5F6368] text-xs">
                <MessageSquare className="h-8 w-8 mb-2 opacity-30 text-[#1A73E8]" />
                <p className="font-bold text-[#202124]">In-Call Messages</p>
                <p className="mt-1 text-[#5F6368]">Messages are visible to everyone in the room.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#202124]">{msg.senderName}</span>
                      {msg.senderRole === "trainer" && (
                        <span className="bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] text-[9px] font-bold px-1.5 py-0 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#5F6368]">{msg.timestamp}</span>
                  </div>
                  <div className="text-xs bg-[#F1F3F4] border border-[#E8EAED] p-2.5 rounded-2xl text-[#202124] break-words leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={onSendMessage} className="p-3 border-t border-[#DADCE0] bg-[#F8F9FA] flex items-center gap-2">
            <Input
              value={chatInput}
              onChange={(e) => onSetChatInput(e.target.value)}
              disabled={!hostPermissions.allowChat && !isHost}
              placeholder={!hostPermissions.allowChat && !isHost ? "Host has turned off chat" : "Send a message..."}
              aria-label="Type message"
              className="h-10 text-xs bg-white border-[#DADCE0] text-[#202124] placeholder:text-[#80868B] rounded-full focus-visible:ring-[#1A73E8] disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!hostPermissions.allowChat && !isHost}
              aria-label="Send"
              className="h-10 px-3.5 bg-[#1A73E8] hover:bg-[#185ABC] text-white rounded-full shrink-0 font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* TAB 2: PEOPLE / PARTICIPANTS */}
      {activeTab === "participants" && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
          {/* 1. HOST ONLY: WAITING TO JOIN QUEUE */}
          {isHost && joinRequests && joinRequests.length > 0 && (
            <div className="space-y-2.5 pb-4 border-b border-[#E8EAED]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Waiting to join ({joinRequests.length})</span>
                </span>

                {joinRequests.length > 1 && onAdmitAllStudents && onDenyAllStudents && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onAdmitAllStudents}
                      className="text-[11px] font-bold text-[#1A73E8] hover:underline cursor-pointer"
                    >
                      Admit all
                    </button>
                    <span className="text-[#DADCE0]">•</span>
                    <button
                      onClick={onDenyAllStudents}
                      className="text-[11px] font-bold text-[#D93025] hover:underline cursor-pointer"
                    >
                      Deny all
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {joinRequests.map((req) => (
                  <div
                    key={req.id || req.userId}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8F9FA] border border-[#DADCE0]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 bg-[#1A73E8] text-white text-xs font-bold shrink-0">
                        <AvatarFallback className="bg-transparent">{req.userName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <p className="text-xs font-bold text-[#202124] truncate">{req.userName}</p>
                        <p className="text-[10px] text-[#5F6368] truncate">{req.userEmail || "Student"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => onDenyStudent && onDenyStudent(req.id, req.userId)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold text-[#D93025] hover:bg-[#FCE8E6] border border-[#FAD2CF] cursor-pointer transition-colors"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => onAdmitStudent && onAdmitStudent(req.id, req.userId)}
                        className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#1A73E8] hover:bg-[#185ABC] cursor-pointer transition-colors shadow-xs"
                      >
                        Admit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host Mute All action */}
          {isHost && onMuteAll && (
            <div className="pb-2 border-b border-[#E8EAED] flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Host Actions</span>
              <button
                onClick={onMuteAll}
                className="h-7 px-3 text-[11px] font-semibold bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#3C4043] border border-[#DADCE0] rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MicOff className="h-3 w-3 text-[#D93025]" />
                <span>Mute All</span>
              </button>
            </div>
          )}

          {/* Search participant */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#80868B]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for people"
              aria-label="Search people"
              className="h-9 pl-9 text-xs bg-[#F8F9FA] border-[#DADCE0] text-[#202124] placeholder:text-[#80868B] rounded-full focus-visible:ring-[#1A73E8]"
            />
          </div>

          {/* In-Call Active List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider block">
              In Call ({allConnectedParticipants.length})
            </span>

            {filteredParticipants.map((p) => {
              const isMe = p.userId === localParticipant.userId;
              return (
                <div
                  key={p.userId}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8F9FA] border border-[#DADCE0] hover:border-[#BDC1C6] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 bg-[#1A73E8] text-white text-xs font-bold shrink-0">
                      <AvatarFallback className="bg-transparent">{p.name.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-semibold text-[#202124] truncate">
                          {isMe ? `${p.name} (You)` : p.name}
                        </span>
                        {p.role === "trainer" && (
                          <span className="bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] text-[9px] font-bold px-1.5 py-0 rounded-full shrink-0">
                            Host
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#5F6368]">
                        {p.isSpeaking ? (
                          <span className="text-[#1E8E3E] font-medium">Speaking...</span>
                        ) : (
                          "Connected"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isHandRaised && (
                      <span className="text-xs mr-0.5 animate-bounce" title="Hand Raised">
                        ✋
                      </span>
                    )}

                    {p.hasAudio ? (
                      <Mic className="h-3.5 w-3.5 text-[#1E8E3E]" />
                    ) : (
                      <MicOff className="h-3.5 w-3.5 text-[#D93025]" />
                    )}

                    {p.hasVideo ? (
                      <Video className="h-3.5 w-3.5 text-[#1E8E3E]" />
                    ) : (
                      <VideoOff className="h-3.5 w-3.5 text-[#D93025]" />
                    )}

                    {/* Host Actions on peer */}
                    {isHost && !isMe && (
                      <div className="flex items-center gap-1 ml-1 border-l border-[#DADCE0] pl-1.5">
                        {p.hasAudio && onMuteParticipant && (
                          <button
                            onClick={() => onMuteParticipant(p.userId)}
                            title="Mute participant"
                            aria-label={`Mute ${p.name}`}
                            className="p-1 text-[#5F6368] hover:text-[#D93025] hover:bg-[#FCE8E6] rounded-md cursor-pointer transition-colors"
                          >
                            <MicOff className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onRemoveParticipant && (
                          <button
                            onClick={() => onRemoveParticipant(p.userId)}
                            title="Remove from call"
                            aria-label={`Remove ${p.name}`}
                            className="p-1 text-[#5F6368] hover:text-[#D93025] hover:bg-[#FCE8E6] rounded-md cursor-pointer transition-colors"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MEETING DETAILS / INFO (Host Only) */}
      {isHost && activeTab === "info" && (
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-white text-xs">
          <div>
            <h3 className="text-sm font-bold text-[#202124] mb-1">{meetingDetails.title}</h3>
            <p className="text-[#5F6368]">{meetingDetails.courseName || "Interactive Classroom"}</p>
          </div>

          <div className="bg-[#F8F9FA] border border-[#DADCE0] p-4 rounded-2xl space-y-3">
            <span className="font-bold text-[#202124] block">Joining info</span>
            <p className="text-[#5F6368] break-all select-all font-mono text-[11px] bg-white p-2 rounded-xl border border-[#DADCE0]">
              {typeof window !== "undefined" ? window.location.href : ""}
            </p>
            <Button
              size="sm"
              onClick={handleCopyLink}
              className="w-full bg-[#1A73E8] hover:bg-[#185ABC] text-white text-xs font-semibold h-9 rounded-full gap-2 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Link Copied!" : "Copy joining info"}</span>
            </Button>
          </div>

          <div className="space-y-2 border-t border-[#E8EAED] pt-3 text-[11px] text-[#5F6368]">
            {meetingDetails.scheduledDate && (
              <p>
                <strong className="text-[#202124]">Scheduled:</strong> {meetingDetails.scheduledDate} {meetingDetails.startTime}
              </p>
            )}
            <p>
              <strong className="text-[#202124]">Encryption:</strong> WebRTC DTLS-SRTP (SFU)
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: HOST CONTROLS (Host Only) */}
      {isHost && activeTab === "host_controls" && (
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-white text-xs">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#1A73E8]" />
              <span>Host Controls</span>
            </h3>
            <p className="text-[#5F6368] mt-1 text-[11px]">
              Use these settings to keep control of your classroom session.
            </p>
          </div>

          {/* Meeting Lock Toggle */}
          <div className="bg-[#F8F9FA] border border-[#DADCE0] p-4 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <span className="font-bold text-[#202124] flex items-center gap-1.5">
                {hostPermissions.isLocked ? <Lock className="h-3.5 w-3.5 text-[#D93025]" /> : <Unlock className="h-3.5 w-3.5 text-[#1E8E3E]" />}
                <span>Lock Meeting</span>
              </span>
              <p className="text-[11px] text-[#5F6368]">
                Prevent new participants from joining this meeting.
              </p>
            </div>
            <input
              type="checkbox"
              checked={hostPermissions.isLocked}
              onChange={(e) => onUpdateHostPermissions?.({ isLocked: e.target.checked })}
              className="h-4 w-4 accent-[#1A73E8] cursor-pointer"
            />
          </div>

          {/* Participant Permissions */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider block">
              Let Students
            </span>

            {/* Share screen */}
            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]">
              <span className="text-[#3C4043] font-medium">Share their screen</span>
              <input
                type="checkbox"
                checked={hostPermissions.allowScreenShare}
                onChange={(e) => onUpdateHostPermissions?.({ allowScreenShare: e.target.checked })}
                className="h-4 w-4 accent-[#1A73E8] cursor-pointer"
              />
            </div>

            {/* Send chat messages */}
            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]">
              <span className="text-[#3C4043] font-medium">Send chat messages</span>
              <input
                type="checkbox"
                checked={hostPermissions.allowChat}
                onChange={(e) => onUpdateHostPermissions?.({ allowChat: e.target.checked })}
                className="h-4 w-4 accent-[#1A73E8] cursor-pointer"
              />
            </div>

            {/* Turn on microphone */}
            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]">
              <span className="text-[#3C4043] font-medium">Turn on their microphone</span>
              <input
                type="checkbox"
                checked={hostPermissions.allowMic}
                onChange={(e) => onUpdateHostPermissions?.({ allowMic: e.target.checked })}
                className="h-4 w-4 accent-[#1A73E8] cursor-pointer"
              />
            </div>

            {/* Turn on video */}
            <div className="flex items-center justify-between py-2 border-b border-[#E8EAED]">
              <span className="text-[#3C4043] font-medium">Turn on their video</span>
              <input
                type="checkbox"
                checked={hostPermissions.allowCamera}
                onChange={(e) => onUpdateHostPermissions?.({ allowCamera: e.target.checked })}
                className="h-4 w-4 accent-[#1A73E8] cursor-pointer"
              />
            </div>

            {/* Use Whiteboard / Annotations */}
            <div className="flex items-center justify-between py-2">
              <span className="text-[#3C4043] font-medium">Use interactive whiteboard</span>
              <input
                type="checkbox"
                checked={hostPermissions.allowAnnotation}
                onChange={(e) => onUpdateHostPermissions?.({ allowAnnotation: e.target.checked })}
                className="h-4 w-4 accent-[#1A73E8] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
