"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useFalconMeetingEngine,
  ParticipantModel,
  WhiteboardStroke,
} from "@/hooks/use-falcon-meeting-engine";
import { MeetingHeader } from "./meeting-header";
import { VideoStage } from "./video-stage";
import { MeetingControlBar } from "./meeting-control-bar";
import { SidePanel } from "./side-panel";
import { DeviceSettingsModal } from "./device-settings-modal";
import { MeetingPrejoinScreen } from "./meeting-prejoin-screen";
import { MeetingLayoutMode } from "./layout-selector-popover";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  startAt?: string;
  started_at?: string;
  screenShareEnabled?: boolean;
  chatEnabled?: boolean;
  reactionsEnabled?: boolean;
  raiseHandEnabled?: boolean;
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

  // View & UI State
  const [viewMode, setViewMode] = useState<MeetingLayoutMode | "whiteboard">("auto");
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "participants" | "info" | "host_controls" | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [selfViewMode, setSelfViewMode] = useState<"floating" | "in_grid" | "hidden">("floating");

  // Whiteboard drawing tools
  const [wbColor, setWbColor] = useState("#1A73E8");
  const [wbSize, setWbSize] = useState(4);
  const [wbTool, setWbTool] = useState<"pen" | "highlighter" | "eraser">("pen");

  const isHost = currentUser.role === "trainer" || currentUser.role === "admin";
  const isExternalPlatform = Boolean(
    classDetails.platform &&
    classDetails.platform !== "falcon_webrtc" &&
    classDetails.meetingUrl
  );

  // Core Meeting Engine
  const {
    lifecycle,
    errorMessage,
    localStream,
    screenStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    audioLevel,
    activeSpeakerId,
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    remoteParticipants,
    joinRequests,
    messages,
    reactions,
    whiteboardStrokes,
    hostPermissions,
    updateHostPermissions,
    muteParticipant,
    removeParticipant,
    admitStudent,
    denyStudent,
    admitAllStudents,
    denyAllStudents,
    requestToJoin,
    cancelJoinRequest,
    initPreviewMedia,
    joinMeetingRoom,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    toggleRaiseHand,
    sendReaction,
    addWhiteboardStroke,
    clearWhiteboard,
    sendMessage,
    muteAll,
    endMeeting,
    leaveMeeting,
  } = useFalconMeetingEngine({
    classId: classDetails.id,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    initialAudio: true,
    initialVideo: true,
    onMeetingEnded: () => {
      leaveMeeting();
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

  // Session elapsed timer (Synchronized with backend started_at / startAt)
  useEffect(() => {
    if (lifecycle === "PREJOIN" || lifecycle === "WAITING_APPROVAL" || lifecycle === "DENIED") return;

    const calculateInitialSeconds = () => {
      const startTimeVal = classDetails.started_at || classDetails.startAt;
      if (startTimeVal) {
        const startMs = new Date(startTimeVal).getTime();
        const nowMs = Date.now();
        if (nowMs > startMs) {
          return Math.floor((nowMs - startMs) / 1000);
        }
      }
      return 0;
    };

    setElapsedSeconds(calculateInitialSeconds());

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [classDetails.startAt, classDetails.started_at, lifecycle]);

  // Student Attendance Tracking
  useEffect(() => {
    if (currentUser.role !== "student" || !classDetails.id || lifecycle === "PREJOIN" || lifecycle === "WAITING_APPROVAL") return;

    fetch("/api/student/live-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join_session", liveClassId: classDetails.id }),
    }).catch(() => {});

    const heartbeat = setInterval(() => {
      fetch("/api/student/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", liveClassId: classDetails.id, seconds: 30 }),
      }).catch(() => {});
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      fetch("/api/student/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave_session", liveClassId: classDetails.id }),
      }).catch(() => {});
    };
  }, [currentUser.role, classDetails.id, lifecycle]);

  // Automatically clear annotation mode and reset viewMode if screen sharing stops for student
  useEffect(() => {
    if (!isScreenSharing) {
      setIsAnnotating(false);
      if (!isHost && viewMode === "whiteboard") {
        setViewMode("auto");
      }
    }
  }, [isScreenSharing, isHost, viewMode]);

  // Track unread messages
  useEffect(() => {
    if (activeSideTab === "chat") {
      setUnreadChatCount(0);
    } else if (messages.length > 0) {
      setUnreadChatCount((prev) => prev + 1);
    }
  }, [messages, activeSideTab]);

  // Keyboard Shortcuts (M: Mute, V: Video, H: Hand, C: Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        toggleCamera();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        toggleRaiseHand();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setActiveSideTab((prev) => (prev === "chat" ? null : "chat"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMute, toggleCamera, toggleRaiseHand]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput("");
  };

  const handleLeaveClass = async () => {
    leaveMeeting();
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
    endMeeting();
    try {
      await fetch("/api/trainer/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end_session", liveClassId: classDetails.id }),
      });
    } catch {}
    router.push(backUrl);
  };

  // Local participant model
  const localParticipant: ParticipantModel = {
    id: currentUser.id,
    userId: currentUser.id,
    name: currentUser.name,
    role: currentUser.role,
    hasAudio: !isMuted,
    hasVideo: !isCameraOff,
    isScreenSharing,
    isHandRaised,
    isSpeaking: audioLevel > 18 && !isMuted,
    stream: isScreenSharing ? (screenStream || undefined) : (localStream || undefined),
  };

  // 1. PRE-JOIN / WAITING APPROVAL / DENIED SCREEN EXPERIENCE
  if (lifecycle === "PREJOIN" || lifecycle === "WAITING_APPROVAL" || lifecycle === "DENIED") {
    return (
      <MeetingPrejoinScreen
        meetingTitle={classDetails.title}
        courseName={classDetails.courseName}
        trainerName={classDetails.trainerName}
        userName={currentUser.name}
        userRole={currentUser.role}
        localStream={localStream}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        audioLevel={audioLevel}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioDevice={selectedAudioDevice}
        selectedVideoDevice={selectedVideoDevice}
        lifecycle={lifecycle}
        errorMessage={errorMessage}
        isJoining={false}
        onSelectAudioDevice={(id) => {
          setSelectedAudioDevice(id);
          initPreviewMedia(id, selectedVideoDevice);
        }}
        onSelectVideoDevice={(id) => {
          setSelectedVideoDevice(id);
          initPreviewMedia(selectedAudioDevice, id);
        }}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onJoin={joinMeetingRoom}
        onRequestJoin={requestToJoin}
        onCancelRequest={cancelJoinRequest}
        onReturnToClasses={() => router.push(backUrl)}
        onJoinAudioOnly={() => {
          if (!isCameraOff) toggleCamera();
          if (isHost) joinMeetingRoom();
          else requestToJoin();
        }}
      />
    );
  }

  // 2. MAIN MEETING ROOM STAGE
  return (
    <div className="flex flex-col h-screen w-full bg-[#F8F9FA] text-[#202124] overflow-hidden select-none font-sans">
      {/* 1. TOP BAR */}
      <MeetingHeader
        title={classDetails.title}
        courseName={classDetails.courseName}
        trainerName={classDetails.trainerName}
        isLive={true}
        elapsedSeconds={elapsedSeconds}
        participantCount={remoteParticipants.length + 1}
        connectionState={
          lifecycle === "CONNECTED"
            ? "CONNECTED"
            : lifecycle === "RECONNECTING"
            ? "RECONNECTING"
            : lifecycle === "DISCONNECTED"
            ? "DISCONNECTED"
            : "CONNECTING"
        }
        onOpenPeople={() => setActiveSideTab((prev) => (prev === "participants" ? null : "participants"))}
        onLeave={isHost ? () => setConfirmEndOpen(true) : handleLeaveClass}
      />

      {/* 2. MAIN STAGE & SIDE PANEL */}
      <div className="flex-1 flex overflow-hidden relative">
        <VideoStage
          viewMode={viewMode}
          localParticipant={localParticipant}
          remoteParticipants={remoteParticipants}
          pinnedParticipantId={pinnedParticipantId}
          activeSpeakerId={activeSpeakerId}
          isScreenSharing={isScreenSharing}
          screenStream={screenStream}
          isAnnotating={isAnnotating}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          audioLevel={audioLevel}
          selfViewMode={selfViewMode}
          onSetSelfViewMode={setSelfViewMode}
          reactions={reactions}
          whiteboardStrokes={whiteboardStrokes}
          wbTool={wbTool}
          wbColor={wbColor}
          wbSize={wbSize}
          onSetWbTool={setWbTool}
          onSetWbColor={setWbColor}
          onAddWhiteboardStroke={addWhiteboardStroke}
          onClearWhiteboard={clearWhiteboard}
          onCloseAnnotation={() => setIsAnnotating(false)}
          onPinParticipant={setPinnedParticipantId}
          isExternalPlatform={isExternalPlatform}
          classTitle={classDetails.title}
          externalMeetingUrl={classDetails.meetingUrl}
        />

        {activeSideTab && (
          <SidePanel
            activeTab={activeSideTab}
            localParticipant={localParticipant}
            remoteParticipants={remoteParticipants}
            messages={messages}
            chatInput={chatInput}
            isHost={isHost}
            joinRequests={joinRequests}
            meetingDetails={{
              id: classDetails.id,
              title: classDetails.title,
              courseName: classDetails.courseName,
              trainerName: classDetails.trainerName,
              scheduledDate: classDetails.scheduledDate,
              startTime: classDetails.startTime,
            }}
            hostPermissions={hostPermissions}
            onSetChatInput={setChatInput}
            onSendMessage={handleSendMessage}
            onSelectTab={setActiveSideTab}
            onClose={() => setActiveSideTab(null)}
            onMuteAll={muteAll}
            onMuteParticipant={muteParticipant}
            onRemoveParticipant={removeParticipant}
            onUpdateHostPermissions={updateHostPermissions}
            onAdmitStudent={admitStudent}
            onDenyStudent={denyStudent}
            onAdmitAllStudents={admitAllStudents}
            onDenyAllStudents={denyAllStudents}
          />
        )}
      </div>

      {/* 3. BOTTOM CONTROL BAR */}
      <MeetingControlBar
        meetingTitle={classDetails.title}
        elapsedSeconds={elapsedSeconds}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        audioLevel={audioLevel}
        unreadChatCount={unreadChatCount}
        participantCount={remoteParticipants.length + 1}
        activeSideTab={activeSideTab}
        viewMode={viewMode}
        isHost={isHost}
        hostPermissions={hostPermissions}
        isAnnotating={isAnnotating}
        selfViewMode={selfViewMode}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleRaiseHand={toggleRaiseHand}
        onSendReaction={sendReaction}
        onToggleSideTab={(tab) => setActiveSideTab((prev) => (prev === tab ? null : tab))}
        onChangeViewMode={setViewMode}
        onToggleAnnotate={() => setIsAnnotating((prev) => !prev)}
        onToggleSelfView={() => setSelfViewMode((prev) => (prev === "hidden" ? "floating" : "hidden"))}
        onOpenSettings={() => setSettingsOpen(true)}
        onLeaveOrEnd={isHost ? () => setConfirmEndOpen(true) : handleLeaveClass}
      />

      {/* 4. SETTINGS MODAL */}
      <DeviceSettingsModal
        isOpen={settingsOpen}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioDevice={selectedAudioDevice}
        selectedVideoDevice={selectedVideoDevice}
        audioLevel={audioLevel}
        onSelectAudioDevice={(id) => {
          setSelectedAudioDevice(id);
          initPreviewMedia(id, selectedVideoDevice);
        }}
        onSelectVideoDevice={(id) => {
          setSelectedVideoDevice(id);
          initPreviewMedia(selectedAudioDevice, id);
        }}
        onClose={() => setSettingsOpen(false)}
      />

      {/* 5. END MEETING CONFIRMATION MODAL (Host Only) */}
      {confirmEndOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DADCE0] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <ShieldAlert className="h-10 w-10 text-[#D93025] mx-auto" />
            <div>
              <h3 className="text-base font-bold text-[#202124]">End Classroom Session?</h3>
              <p className="text-xs text-[#5F6368] mt-1">
                This will disconnect all student participants, calculate final attendance duration, and mark this class as COMPLETED.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmEndOpen(false)}
                className="h-9 text-xs font-semibold rounded-full border-[#DADCE0] text-[#3C4043] hover:bg-[#F1F3F4] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEndClassByTrainer}
                className="h-9 text-xs font-bold rounded-full bg-[#D93025] hover:bg-[#B3261E] text-white cursor-pointer shadow-sm"
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
