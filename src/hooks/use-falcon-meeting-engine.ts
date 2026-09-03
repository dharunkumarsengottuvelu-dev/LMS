"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Room,
  RoomEvent,
  ConnectionState as LKConnectionState,
  LocalVideoTrack,
  LocalAudioTrack,
} from "livekit-client";

export type MeetingLifecycle =
  | "PREJOIN"
  | "WAITING_APPROVAL"
  | "DENIED"
  | "REQUESTING_TOKEN"
  | "CONNECTING_SFU"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "ENDED"
  | "ERROR";

export interface ParticipantModel {
  id: string;
  userId: string;
  name: string;
  role: "trainer" | "student" | "admin";
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  connectionQuality?: "excellent" | "good" | "poor";
  stream?: MediaStream;
}

export interface JoinRequestItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "trainer" | "student" | "admin";
  text: string;
  timestamp: string;
  createdAt?: string;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
}

export interface WhiteboardStroke {
  id: string;
  tool: "pen" | "highlighter" | "eraser" | "line" | "rect" | "circle";
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export interface DeviceInfo {
  deviceId: string;
  label: string;
}

export interface HostMeetingPermissions {
  allowScreenShare: boolean;
  allowChat: boolean;
  allowMic: boolean;
  allowCamera: boolean;
  allowAnnotation: boolean;
  isLocked: boolean;
}

interface UseFalconMeetingEngineOptions {
  classId: string;
  userId: string;
  userName: string;
  userRole: "trainer" | "student" | "admin";
  initialAudio?: boolean;
  initialVideo?: boolean;
  onMeetingEnded?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

function log(section: string, ...args: any[]) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`%c[${section}]`, "color: #1A73E8; font-weight: bold;", ...args);
  }
}

// Deterministic Offerer Role (Prevents WebRTC Offer Glare/Collision)
function shouldInitiateOffer(myUserId: string, myRole: string, targetUserId: string, targetRole: string): boolean {
  if (myRole === "trainer" || myRole === "admin") {
    if (targetRole === "student") return true;
    return myUserId < targetUserId;
  }
  if (targetRole === "trainer" || targetRole === "admin") {
    return false;
  }
  return myUserId < targetUserId;
}

export function useFalconMeetingEngine({
  classId,
  userId,
  userName,
  userRole,
  initialAudio = true,
  initialVideo = true,
  onMeetingEnded,
}: UseFalconMeetingEngineOptions) {
  // Lifecycle & Status
  const [lifecycle, setLifecycle] = useState<MeetingLifecycle>("PREJOIN");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Hardware Devices
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

  // Remote Participants (Map: userId -> ParticipantModel)
  const [remoteParticipantsMap, setRemoteParticipantsMap] = useState<Map<string, ParticipantModel>>(new Map());

  // Join Requests Queue (Host only)
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);

  // Application State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([]);

  // Host Meeting Permissions
  const [hostPermissions, setHostPermissions] = useState<HostMeetingPermissions>({
    allowScreenShare: true,
    allowChat: true,
    allowMic: true,
    allowCamera: true,
    allowAnnotation: true,
    isLocked: false,
  });

  // Refs for stable lifecycle management
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const isChannelSubscribedRef = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // WebRTC Peer Connections & Candidate Queues
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  // Event Deduplication Cache
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  // Safe Realtime Broadcast with Event ID
  const safeBroadcast = useCallback((event: string, payload: any) => {
    if (!channelRef.current || !isChannelSubscribedRef.current) return;
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullPayload = {
        ...payload,
        eventId,
        senderId: userId,
        timestamp: Date.now(),
      };
      const res = channelRef.current.send({
        type: "broadcast",
        event,
        payload: fullPayload,
      });
      if (res && typeof res.catch === "function") {
        res.catch((err: any) => log("REALTIME", `Broadcast error for ${event}:`, err));
      }
    } catch (err) {
      log("REALTIME", `Failed to send broadcast ${event}:`, err);
    }
  }, [userId]);

  // 1. Hardware Device Enumeration
  const refreshDevices = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();

      const mics = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
      const cams = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));

      setAudioDevices(mics);
      setVideoDevices(cams);

      if (mics.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(mics[0]?.deviceId ?? "");
      }
      if (cams.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(cams[0]?.deviceId ?? "");
      }
    } catch (err) {
      log("MEDIA", "Enumerate devices warning:", err);
    }
  }, [selectedAudioDevice, selectedVideoDevice]);

  // 2. Pre-Join Preview Stream
  const initPreviewMedia = useCallback(async (audioDeviceId?: string, videoDeviceId?: string) => {
    try {
      log("MEDIA", "Initializing local media preview");

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      const audioConstraints: boolean | MediaTrackConstraints = audioDeviceId
        ? { deviceId: { exact: audioDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

      const videoConstraints: boolean | MediaTrackConstraints = videoDeviceId
        ? { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isCameraOff ? false : videoConstraints,
          audio: isMuted ? false : audioConstraints,
        });
      } catch (err: any) {
        log("MEDIA", "Full media access failed, trying audio-only fallback:", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: isMuted ? false : audioConstraints,
          });
          setIsCameraOff(true);
        } catch (audioErr) {
          log("MEDIA", "Audio fallback also failed:", audioErr);
          stream = new MediaStream();
          setIsCameraOff(true);
          setIsMuted(true);
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Setup audio analyzer
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && typeof window !== "undefined") {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
              audioContextRef.current.close().catch(() => {});
            }
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            src.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkAudio = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] ?? 0;
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(checkAudio);
            };
            checkAudio();
          }
        } catch {}
      }

      await refreshDevices();
      return stream;
    } catch (err: any) {
      log("MEDIA", "Preview media error:", err);
      return null;
    }
  }, [isCameraOff, isMuted, refreshDevices]);

  // Initial Pre-join trigger
  useEffect(() => {
    initPreviewMedia();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [initPreviewMedia]);

  // Load chat message history from DB
  useEffect(() => {
    if (!classId) return;
    let isCancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/live-classes/messages?classId=${classId}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.messages) {
            setMessages(data.messages);
          }
        }
      } catch {}
    }

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [classId]);

  // 3. WebRTC Peer Connection Helper with Per-Peer Recovery
  const createPeerConnection = useCallback((remoteUserId: string, remoteUserName: string, remoteRole: any) => {
    if (peerConnectionsRef.current.has(remoteUserId)) {
      return peerConnectionsRef.current.get(remoteUserId)!;
    }

    log("SIGNALING", `Creating RTCPeerConnection for ${remoteUserId} (${remoteUserName})`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(remoteUserId, pc);
    iceCandidateQueuesRef.current.set(remoteUserId, []);

    // Add local tracks (Audio & Video)
    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        safeBroadcast("ice-candidate", {
          targetUserId: remoteUserId,
          senderUserId: userId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      log("SIGNALING", `Received remote track from ${remoteUserId}: kind=${event.track.kind}, id=${event.track.id}`);

      let stream = remoteStreamsRef.current.get(remoteUserId);
      if (!stream) {
        stream = new MediaStream();
        remoteStreamsRef.current.set(remoteUserId, stream);
      }

      const existingSameKind = stream.getTracks().find((t) => t.kind === event.track.kind);
      if (existingSameKind && existingSameKind.id !== event.track.id) {
        stream.removeTrack(existingSameKind);
      }
      if (!stream.getTracks().some((t) => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }

      setRemoteParticipantsMap((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(remoteUserId) || {
          id: remoteUserId,
          userId: remoteUserId,
          name: remoteUserName || "Participant",
          role: remoteRole || "student",
          hasAudio: true,
          hasVideo: true,
          isScreenSharing: false,
          isHandRaised: false,
        };
        updated.set(remoteUserId, {
          ...existing,
          stream,
        });
        return updated;
      });
    };

    // Connection state change with targeted per-peer recovery
    pc.onconnectionstatechange = () => {
      log("SIGNALING", `Peer ${remoteUserId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === "failed") {
        log("SIGNALING", `Attempting recovery for failed peer: ${remoteUserId}`);
        try {
          pc.close();
        } catch {}
        peerConnectionsRef.current.delete(remoteUserId);
        iceCandidateQueuesRef.current.delete(remoteUserId);

        // If I am designated offerer, retry connection
        if (shouldInitiateOffer(userId, userRole, remoteUserId, remoteRole)) {
          setTimeout(() => {
            const newPc = createPeerConnection(remoteUserId, remoteUserName, remoteRole);
            newPc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
              .then((offer) => newPc.setLocalDescription(offer).then(() => offer))
              .then((offer) => {
                safeBroadcast("webrtc-offer", {
                  targetUserId: remoteUserId,
                  senderUserId: userId,
                  senderName: userName,
                  senderRole: userRole,
                  sdp: offer,
                });
              })
              .catch(() => {});
          }, 1000);
        }
      } else if (pc.connectionState === "closed") {
        peerConnectionsRef.current.delete(remoteUserId);
        iceCandidateQueuesRef.current.delete(remoteUserId);
      }
    };

    return pc;
  }, [userId, userName, userRole, safeBroadcast]);

  // 4. Join SFU Room & Connect Supabase Realtime Channel
  const joinMeetingRoom = useCallback(async () => {
    try {
      setLifecycle("REQUESTING_TOKEN");
      setErrorMessage(null);
      log("AUTH", `Requesting session token for class ${classId}`);

      const tokenRes = await fetch("/api/live-classes/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, userName, userRole }),
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to authenticate meeting session.");
      }

      const tokenData = await tokenRes.json();
      setLifecycle("CONNECTING_SFU");

      // Mode A: LiveKit SFU (if configured in environment)
      if (tokenData.sfuConfigured && tokenData.serverUrl && tokenData.token) {
        log("SFU", "Connecting to LiveKit SFU Server:", tokenData.serverUrl);
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          if (speakers.length > 0 && speakers[0]) {
            setActiveSpeakerId(speakers[0].identity);
          }
        });

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          log("SFU", `Connection state changed: ${state}`);
          if (state === LKConnectionState.Connected) {
            setLifecycle("CONNECTED");
          } else if (state === LKConnectionState.Reconnecting) {
            setLifecycle("RECONNECTING");
          } else if (state === LKConnectionState.Disconnected) {
            setLifecycle("DISCONNECTED");
          }
        });

        await room.connect(tokenData.serverUrl, tokenData.token);

        if (!isCameraOff && localStreamRef.current?.getVideoTracks()[0]) {
          const videoTrack = new LocalVideoTrack(localStreamRef.current.getVideoTracks()[0]!);
          await room.localParticipant.publishTrack(videoTrack);
        }
        if (!isMuted && localStreamRef.current?.getAudioTracks()[0]) {
          const audioTrack = new LocalAudioTrack(localStreamRef.current.getAudioTracks()[0]!);
          await room.localParticipant.publishTrack(audioTrack);
        }
      }

      // Mode B / Realtime Sync: Supabase Realtime Channel
      const channelName = `live-classroom:${classId}`;
      log("REALTIME", `Subscribing to Realtime channel: ${channelName}`);

      const channel = supabaseRef.current.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: userId },
        },
      });
      channelRef.current = channel;

      channel
        // Presence Sync
        .on("presence", { event: "sync" }, () => {
          if (!isChannelSubscribedRef.current) return;
          const presenceState = channel.presenceState();
          const presentIds = new Set<string>();

          setRemoteParticipantsMap((prev) => {
            const updated = new Map(prev);

            Object.values(presenceState).forEach((presences: any) => {
              presences.forEach((p: any) => {
                if (p.userId && p.userId !== userId) {
                  presentIds.add(p.userId);
                  const existingStream = remoteStreamsRef.current.get(p.userId);
                  const existing = updated.get(p.userId) || {
                    id: p.userId,
                    userId: p.userId,
                    name: p.name || "Participant",
                    role: p.role || "student",
                    hasAudio: p.hasAudio ?? true,
                    hasVideo: p.hasVideo ?? true,
                    isScreenSharing: p.isScreenSharing ?? false,
                    isHandRaised: p.isHandRaised ?? false,
                    stream: existingStream,
                  };
                  updated.set(p.userId, {
                    ...existing,
                    name: p.name || existing.name,
                    role: p.role || existing.role,
                    hasAudio: p.hasAudio ?? existing.hasAudio,
                    hasVideo: p.hasVideo ?? existing.hasVideo,
                    isScreenSharing: p.isScreenSharing ?? existing.isScreenSharing,
                    isHandRaised: p.isHandRaised ?? existing.isHandRaised,
                    stream: existingStream || existing.stream,
                  });

                  // Deterministic Offerer check
                  if (!peerConnectionsRef.current.has(p.userId) && shouldInitiateOffer(userId, userRole, p.userId, p.role)) {
                    log("SIGNALING", `Initiating WebRTC offer to ${p.name} (${p.userId})`);
                    const pc = createPeerConnection(p.userId, p.name, p.role);
                    pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                      .then((offer) => pc.setLocalDescription(offer).then(() => offer))
                      .then((offer) => {
                        safeBroadcast("webrtc-offer", {
                          targetUserId: p.userId,
                          senderUserId: userId,
                          senderName: userName,
                          senderRole: userRole,
                          sdp: offer,
                        });
                      })
                      .catch((err) => log("SIGNALING", "Presence sync offer error:", err));
                  }
                }
              });
            });

            // Cleanup disconnected peers
            for (const [key] of updated.entries()) {
              if (!presentIds.has(key)) {
                const pc = peerConnectionsRef.current.get(key);
                if (pc) {
                  pc.close();
                  peerConnectionsRef.current.delete(key);
                }
                iceCandidateQueuesRef.current.delete(key);
                remoteStreamsRef.current.delete(key);
                updated.delete(key);
              }
            }

            return updated;
          });
        })

        // Broadcast: Peer Joined
        .on("broadcast", { event: "peer-join" }, async ({ payload }) => {
          if (payload.userId === userId) return;
          log("SIGNALING", `Peer joined room: ${payload.name} (${payload.userId})`);

          setRemoteParticipantsMap((prev) => {
            const updated = new Map(prev);
            const existingStream = remoteStreamsRef.current.get(payload.userId);
            updated.set(payload.userId, {
              id: payload.userId,
              userId: payload.userId,
              name: payload.name,
              role: payload.role,
              hasAudio: payload.hasAudio ?? true,
              hasVideo: payload.hasVideo ?? true,
              isScreenSharing: payload.isScreenSharing ?? false,
              isHandRaised: payload.isHandRaised ?? false,
              stream: existingStream,
            });
            return updated;
          });

          if (shouldInitiateOffer(userId, userRole, payload.userId, payload.role)) {
            try {
              log("SIGNALING", `Sending WebRTC offer to joined peer ${payload.name}`);
              const pc = createPeerConnection(payload.userId, payload.name, payload.role);
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(offer);

              safeBroadcast("webrtc-offer", {
                targetUserId: payload.userId,
                senderUserId: userId,
                senderName: userName,
                senderRole: userRole,
                sdp: offer,
              });
            } catch (err) {
              log("SIGNALING", "Failed to create WebRTC offer:", err);
            }
          }
        })

        // Broadcast: WebRTC Offer Received
        .on("broadcast", { event: "webrtc-offer" }, async ({ payload }) => {
          if (payload.targetUserId !== userId) return;
          log("SIGNALING", `Received WebRTC offer from ${payload.senderName} (${payload.senderUserId})`);

          try {
            const pc = createPeerConnection(payload.senderUserId, payload.senderName, payload.senderRole);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            const queue = iceCandidateQueuesRef.current.get(payload.senderUserId) || [];
            while (queue.length > 0) {
              const cand = queue.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            safeBroadcast("webrtc-answer", {
              targetUserId: payload.senderUserId,
              senderUserId: userId,
              sdp: answer,
            });
          } catch (err) {
            log("SIGNALING", "Failed to process WebRTC offer:", err);
          }
        })

        // Broadcast: WebRTC Answer Received
        .on("broadcast", { event: "webrtc-answer" }, async ({ payload }) => {
          if (payload.targetUserId !== userId) return;
          log("SIGNALING", `Received WebRTC answer from ${payload.senderUserId}`);

          const pc = peerConnectionsRef.current.get(payload.senderUserId);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

              const queue = iceCandidateQueuesRef.current.get(payload.senderUserId) || [];
              while (queue.length > 0) {
                const cand = queue.shift();
                if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
            } catch (err) {
              log("SIGNALING", "Failed to set remote description on answer:", err);
            }
          }
        })

        // Broadcast: ICE Candidate Received
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.targetUserId !== userId) return;

          const pc = peerConnectionsRef.current.get(payload.senderUserId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
              log("SIGNALING", "Failed to add ICE candidate:", err);
            }
          } else {
            const queue = iceCandidateQueuesRef.current.get(payload.senderUserId) || [];
            queue.push(payload.candidate);
            iceCandidateQueuesRef.current.set(payload.senderUserId, queue);
          }
        })

        // Broadcast: Track State Changed
        .on("broadcast", { event: "track-state-change" }, ({ payload }) => {
          setRemoteParticipantsMap((prev) => {
            const updated = new Map(prev);
            const peer = updated.get(payload.userId);
            if (peer) {
              updated.set(payload.userId, {
                ...peer,
                hasAudio: payload.hasAudio ?? peer.hasAudio,
                hasVideo: payload.hasVideo ?? peer.hasVideo,
                isScreenSharing: payload.isScreenSharing ?? peer.isScreenSharing,
              });
            }
            return updated;
          });
        })

        // Broadcast: Hand Raise
        .on("broadcast", { event: "hand-raise" }, ({ payload }) => {
          setRemoteParticipantsMap((prev) => {
            const updated = new Map(prev);
            const peer = updated.get(payload.userId);
            if (peer) {
              updated.set(payload.userId, {
                ...peer,
                isHandRaised: payload.isHandRaised,
              });
            }
            return updated;
          });
        })

        // Broadcast: Floating Reaction
        .on("broadcast", { event: "reaction" }, ({ payload }) => {
          setReactions((prev) => [...prev.slice(-15), payload]);
        })

        // Broadcast: Whiteboard Sync
        .on("broadcast", { event: "whiteboard-stroke" }, ({ payload }) => {
          if (payload.action === "clear") {
            setWhiteboardStrokes([]);
          } else if (payload.stroke) {
            setWhiteboardStrokes((prev) => [...prev, payload.stroke]);
          }
        })

        // Broadcast: Chat Message Received
        .on("broadcast", { event: "chat-message" }, ({ payload }) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        })

        // Broadcast: Join Request Received (Host only)
        .on("broadcast", { event: "join-requested" }, ({ payload }) => {
          if (userRole === "trainer" || userRole === "admin") {
            log("JOIN", `Student submitted join request: ${payload.userName}`);
            setJoinRequests((prev) => {
              if (prev.some((r) => r.userId === payload.userId)) return prev;
              return [...prev, payload];
            });
          }
        })

        // Broadcast: Join Request Cancelled (Host only)
        .on("broadcast", { event: "join-cancelled" }, ({ payload }) => {
          if (userRole === "trainer" || userRole === "admin") {
            setJoinRequests((prev) => prev.filter((r) => r.userId !== payload.userId));
          }
        })

        // Broadcast: Join Response Received (Student only)
        .on("broadcast", { event: "join-response" }, async ({ payload }) => {
          if (payload.targetUserId === userId) {
            if (payload.status === "approved") {
              log("JOIN", "Host approved admission! Connecting...");
              await joinMeetingRoom();
            } else if (payload.status === "rejected") {
              log("JOIN", "Host rejected join request.");
              setLifecycle("DENIED");
              setErrorMessage("The host has denied your request to join this session.");
            }
          }
        })

        // Broadcast: Join Response All (Student only)
        .on("broadcast", { event: "join-response-all" }, async ({ payload }) => {
          if (userRole === "student" && lifecycle === "WAITING_APPROVAL") {
            if (payload.status === "approved") {
              await joinMeetingRoom();
            } else if (payload.status === "rejected") {
              setLifecycle("DENIED");
              setErrorMessage("The host has denied your request to join this session.");
            }
          }
        })

        // Broadcast: Host Permissions Updated
        .on("broadcast", { event: "host-permissions-update" }, ({ payload }) => {
          log("PERMISSIONS", "Host updated meeting permissions:", payload);
          setHostPermissions(payload);

          if (userRole === "student") {
            if (payload.allowMic === false) {
              const audioTrack = localStreamRef.current?.getAudioTracks()[0];
              if (audioTrack) audioTrack.enabled = false;
              setIsMuted(true);
            }
            if (payload.allowCamera === false) {
              const videoTrack = localStreamRef.current?.getVideoTracks()[0];
              if (videoTrack) videoTrack.enabled = false;
              setIsCameraOff(true);
            }
            if (payload.allowScreenShare === false && screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach((t) => t.stop());
              screenStreamRef.current = null;
              setScreenStream(null);
              setIsScreenSharing(false);
            }
          }
        })

        // Broadcast: Mute Specific Participant
        .on("broadcast", { event: "mute-participant" }, ({ payload }) => {
          if (payload.targetUserId === userId) {
            const audioTrack = localStreamRef.current?.getAudioTracks()[0];
            if (audioTrack) audioTrack.enabled = false;
            setIsMuted(true);
          }
        })

        // Broadcast: Remove Participant
        .on("broadcast", { event: "remove-participant" }, ({ payload }) => {
          if (payload.targetUserId === userId) {
            log("CLEANUP", "Removed by host");
            setErrorMessage("You have been removed from this meeting by the host.");
            setLifecycle("ENDED");
            if (onMeetingEnded) onMeetingEnded();
          }
        })

        // Broadcast: Host Mute All
        .on("broadcast", { event: "mute-all" }, () => {
          if (userRole === "student") {
            const audioTrack = localStreamRef.current?.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = false;
              setIsMuted(true);
            }
          }
        })

        // Broadcast: Class Ended
        .on("broadcast", { event: "class-ended" }, () => {
          log("REALTIME", "Meeting ended by host");
          setLifecycle("ENDED");
          if (onMeetingEnded) onMeetingEnded();
        })

        // Channel Subscription Gate (Only track presence and broadcast after SUBSCRIBED)
        .subscribe(async (status) => {
          log("REALTIME", `Channel subscription status: ${status}`);

          if (status === "SUBSCRIBED") {
            isChannelSubscribedRef.current = true;
            setLifecycle("CONNECTED");

            try {
              await channel.track({
                userId,
                name: userName,
                role: userRole,
                hasAudio: !isMuted,
                hasVideo: !isCameraOff,
                isScreenSharing: false,
                isHandRaised: false,
                joinedAt: new Date().toISOString(),
              });
            } catch (err) {
              log("PRESENCE", "Track error:", err);
            }

            safeBroadcast("peer-join", {
              userId,
              name: userName,
              role: userRole,
              hasAudio: !isMuted,
              hasVideo: !isCameraOff,
              isScreenSharing: false,
              isHandRaised: false,
            });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            isChannelSubscribedRef.current = false;
            setLifecycle("RECONNECTING");
          }
        });
    } catch (err: any) {
      log("SFU", "Join meeting error:", err);
      setLifecycle("ERROR");
      setErrorMessage(err.message || "Could not connect to meeting room.");
    }
  }, [classId, userId, userName, userRole, isMuted, isCameraOff, safeBroadcast, onMeetingEnded, createPeerConnection]);

  // Host: Load initial pending join requests & poll periodically
  useEffect(() => {
    if (userRole !== "trainer" && userRole !== "admin") return;
    if (!classId) return;

    let isMounted = true;
    async function loadPendingRequests() {
      try {
        const res = await fetch(`/api/live-classes/join-requests?classId=${classId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.requests) {
            setJoinRequests(data.requests);
          }
        }
      } catch {}
    }

    loadPendingRequests();
    const interval = setInterval(loadPendingRequests, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [classId, userRole]);

  // Student: Poll request status while WAITING_APPROVAL
  useEffect(() => {
    if (lifecycle !== "WAITING_APPROVAL" || !classId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-classes/join-requests?classId=${classId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.request) {
            if (data.request.status === "approved") {
              clearInterval(interval);
              joinMeetingRoom();
            } else if (data.request.status === "rejected") {
              clearInterval(interval);
              setLifecycle("DENIED");
              setErrorMessage("The host has denied your request to join.");
            }
          }
        }
      } catch {}
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lifecycle, classId, joinMeetingRoom]);

  // Student: Request to Join (from Pre-Join lobby)
  const requestToJoin = useCallback(async () => {
    try {
      setLifecycle("REQUESTING_TOKEN");
      setErrorMessage(null);

      const res = await fetch("/api/live-classes/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", classId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit join request");
      }

      const data = await res.json();
      if (data.status === "approved") {
        await joinMeetingRoom();
      } else {
        setLifecycle("WAITING_APPROVAL");
        safeBroadcast("join-requested", {
          id: data.requestId || `req_${Date.now()}`,
          userId,
          userName,
          userRole,
          status: "pending",
          requestedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setLifecycle("ERROR");
      setErrorMessage(err.message || "Failed to submit join request");
    }
  }, [classId, joinMeetingRoom, safeBroadcast, userId, userName, userRole]);

  // Student: Cancel Join Request
  const cancelJoinRequest = useCallback(async () => {
    try {
      await fetch("/api/live-classes/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", classId }),
      });
      safeBroadcast("join-cancelled", { userId });
    } catch {}
    setLifecycle("PREJOIN");
  }, [classId, safeBroadcast, userId]);

  // Host: Admit Student
  const admitStudent = useCallback(async (requestId: string, targetUserId: string) => {
    try {
      await fetch("/api/live-classes/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admit", classId, requestId, targetUserId }),
      });
      safeBroadcast("join-response", { targetUserId, status: "approved" });
      setJoinRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
    } catch (err) {
      console.error("Admit error:", err);
    }
  }, [classId, safeBroadcast]);

  // Host: Deny Student
  const denyStudent = useCallback(async (requestId: string, targetUserId: string) => {
    try {
      await fetch("/api/live-classes/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny", classId, requestId, targetUserId }),
      });
      safeBroadcast("join-response", { targetUserId, status: "rejected" });
      setJoinRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
    } catch (err) {
      console.error("Deny error:", err);
    }
  }, [classId, safeBroadcast]);

  // Host: Admit All
  const admitAllStudents = useCallback(async () => {
    try {
      await fetch("/api/live-classes/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admit_all", classId }),
      });
      safeBroadcast("join-response-all", { status: "approved" });
      setJoinRequests([]);
    } catch (err) {
      console.error("Admit all error:", err);
    }
  }, [classId, safeBroadcast]);

  // Host: Deny All
  const denyAllStudents = useCallback(async () => {
    try {
      await fetch("/api/live-classes/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny_all", classId }),
      });
      safeBroadcast("join-response-all", { status: "rejected" });
      setJoinRequests([]);
    } catch (err) {
      console.error("Deny all error:", err);
    }
  }, [classId, safeBroadcast]);

  // 5. Toggle Microphone
  const toggleMute = useCallback(() => {
    if (userRole === "student" && !hostPermissions.allowMic) return;
    const nextMuted = !isMuted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    if (roomRef.current?.localParticipant) {
      roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted).catch(() => {});
    }
    setIsMuted(nextMuted);

    safeBroadcast("track-state-change", {
      userId,
      hasAudio: !nextMuted,
      hasVideo: !isCameraOff,
      isScreenSharing,
    });

    if (isChannelSubscribedRef.current && channelRef.current) {
      channelRef.current
        .track({
          userId,
          name: userName,
          role: userRole,
          hasAudio: !nextMuted,
          hasVideo: !isCameraOff,
          isScreenSharing,
          isHandRaised,
        })
        .catch(() => {});
    }
  }, [isMuted, isCameraOff, isScreenSharing, isHandRaised, userRole, hostPermissions.allowMic, userId, userName, safeBroadcast]);

  // 6. Toggle Camera
  const toggleCamera = useCallback(async () => {
    if (userRole === "student" && !hostPermissions.allowCamera) return;
    const nextCameraOff = !isCameraOff;

    if (!nextCameraOff) {
      let videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState === "ended") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && localStreamRef.current) {
            localStreamRef.current.addTrack(videoTrack);
            peerConnectionsRef.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === "video");
              if (sender) {
                sender.replaceTrack(videoTrack!).catch(() => {});
              } else {
                pc.addTrack(videoTrack!, localStreamRef.current!);
              }
            });
          }
        } catch (err) {
          log("MEDIA", "Camera re-acquisition error:", err);
        }
      } else {
        videoTrack.enabled = true;
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    }

    if (roomRef.current?.localParticipant) {
      roomRef.current.localParticipant.setCameraEnabled(!nextCameraOff).catch(() => {});
    }
    setIsCameraOff(nextCameraOff);

    safeBroadcast("track-state-change", {
      userId,
      hasAudio: !isMuted,
      hasVideo: !nextCameraOff,
      isScreenSharing,
    });

    if (isChannelSubscribedRef.current && channelRef.current) {
      channelRef.current
        .track({
          userId,
          name: userName,
          role: userRole,
          hasAudio: !isMuted,
          hasVideo: !nextCameraOff,
          isScreenSharing,
          isHandRaised,
        })
        .catch(() => {});
    }
  }, [isCameraOff, isMuted, isScreenSharing, isHandRaised, userRole, hostPermissions.allowCamera, selectedVideoDevice, userId, userName, safeBroadcast]);

  // 7. Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (userRole === "student" && !hostPermissions.allowScreenShare) return;

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (roomRef.current?.localParticipant) {
        roomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {});
      }

      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(videoTrack).catch(() => {});
          });
        }
      }

      setScreenStream(null);
      setIsScreenSharing(false);

      safeBroadcast("track-state-change", {
        userId,
        hasAudio: !isMuted,
        hasVideo: !isCameraOff,
        isScreenSharing: false,
      });

      if (isChannelSubscribedRef.current && channelRef.current) {
        channelRef.current
          .track({
            userId,
            name: userName,
            role: userRole,
            hasAudio: !isMuted,
            hasVideo: !isCameraOff,
            isScreenSharing: false,
            isHandRaised,
          })
          .catch(() => {});
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: true,
        });

        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.onended = () => {
            toggleScreenShare();
          };

          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(screenTrack).catch(() => {});
          });
        }

        if (roomRef.current?.localParticipant) {
          roomRef.current.localParticipant.setScreenShareEnabled(true).catch(() => {});
        }

        safeBroadcast("track-state-change", {
          userId,
          hasAudio: !isMuted,
          hasVideo: true,
          isScreenSharing: true,
        });

        if (isChannelSubscribedRef.current && channelRef.current) {
          channelRef.current
            .track({
              userId,
              name: userName,
              role: userRole,
              hasAudio: !isMuted,
              hasVideo: true,
              isScreenSharing: true,
              isHandRaised,
            })
            .catch(() => {});
        }
      } catch (err) {
        log("MEDIA", "Screen sharing cancelled or denied:", err);
      }
    }
  }, [isScreenSharing, isMuted, isCameraOff, isHandRaised, userRole, hostPermissions.allowScreenShare, userId, userName, safeBroadcast]);

  // 8. Toggle Hand Raise
  const toggleRaiseHand = useCallback(() => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);

    safeBroadcast("hand-raise", {
      userId,
      isHandRaised: nextHand,
    });

    if (isChannelSubscribedRef.current && channelRef.current) {
      channelRef.current
        .track({
          userId,
          name: userName,
          role: userRole,
          hasAudio: !isMuted,
          hasVideo: !isCameraOff,
          isScreenSharing,
          isHandRaised: nextHand,
        })
        .catch(() => {});
    }
  }, [isHandRaised, isMuted, isCameraOff, isScreenSharing, userId, userName, userRole, safeBroadcast]);

  // 9. Send Reaction
  const sendReaction = useCallback((emoji: string) => {
    const reactionObj: LiveReaction = {
      id: `rx_${Date.now()}_${Math.random()}`,
      emoji,
      senderName: userName,
      timestamp: Date.now(),
    };
    setReactions((prev) => [...prev.slice(-15), reactionObj]);
    safeBroadcast("reaction", reactionObj);
  }, [userName, safeBroadcast]);

  // 10. Whiteboard Actions
  const addWhiteboardStroke = useCallback((stroke: WhiteboardStroke) => {
    setWhiteboardStrokes((prev) => [...prev, stroke]);
    safeBroadcast("whiteboard-stroke", { stroke });
  }, [safeBroadcast]);

  const clearWhiteboard = useCallback(() => {
    setWhiteboardStrokes([]);
    safeBroadcast("whiteboard-stroke", { action: "clear" });
  }, [safeBroadcast]);

  // 11. Send In-Call Chat Message
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, msg]);
    safeBroadcast("chat-message", msg);

    // Persist to database in background
    fetch("/api/live-classes/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        message: text.trim(),
      }),
    }).catch(() => {});
  }, [userId, userName, userRole, classId, safeBroadcast]);

  // 12. Host Moderation: Mute All
  const muteAll = useCallback(() => {
    if (userRole !== "trainer" && userRole !== "admin") return;
    safeBroadcast("mute-all", {});
  }, [userRole, safeBroadcast]);

  // 13. Host Moderation: Mute Specific Participant
  const muteParticipant = useCallback((targetUserId: string) => {
    if (userRole !== "trainer" && userRole !== "admin") return;
    safeBroadcast("mute-participant", { targetUserId });
  }, [userRole, safeBroadcast]);

  // 14. Host Moderation: Remove Participant
  const removeParticipant = useCallback((targetUserId: string) => {
    if (userRole !== "trainer" && userRole !== "admin") return;
    safeBroadcast("remove-participant", { targetUserId });
    setRemoteParticipantsMap((prev) => {
      const updated = new Map(prev);
      const pc = peerConnectionsRef.current.get(targetUserId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(targetUserId);
      }
      iceCandidateQueuesRef.current.delete(targetUserId);
      remoteStreamsRef.current.delete(targetUserId);
      updated.delete(targetUserId);
      return updated;
    });
  }, [userRole, safeBroadcast]);

  // 15. Host Moderation: Update Permissions
  const updateHostPermissions = useCallback((updated: Partial<HostMeetingPermissions>) => {
    if (userRole !== "trainer" && userRole !== "admin") return;
    setHostPermissions((prev) => {
      const merged = { ...prev, ...updated };
      safeBroadcast("host-permissions-update", merged);
      return merged;
    });
  }, [userRole, safeBroadcast]);

  // 16. Cleanup all tracks and peer connections
  const stopAllMediaTracks = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current.clear();
    iceCandidateQueuesRef.current.clear();
    remoteStreamsRef.current.clear();
  }, []);

  const leaveMeeting = useCallback(() => {
    log("CLEANUP", "Leaving meeting session");
    stopAllMediaTracks();

    if (roomRef.current) {
      roomRef.current.disconnect().catch(() => {});
      roomRef.current = null;
    }

    if (channelRef.current) {
      try {
        channelRef.current.untrack().catch(() => {});
        supabaseRef.current.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
      isChannelSubscribedRef.current = false;
    }

    setLifecycle("DISCONNECTED");
  }, [stopAllMediaTracks]);

  const endMeeting = useCallback(() => {
    if (userRole !== "trainer" && userRole !== "admin") return;
    safeBroadcast("class-ended", {});
    leaveMeeting();
  }, [userRole, safeBroadcast, leaveMeeting]);

  // Window beforeunload cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopAllMediaTracks();
      if (channelRef.current) {
        channelRef.current.untrack().catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stopAllMediaTracks();
    };
  }, [stopAllMediaTracks]);

  const remoteParticipants = Array.from(remoteParticipantsMap.values());

  return {
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
  };
}
