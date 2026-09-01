"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "trainer" | "student" | "admin";
  text: string;
  timestamp: string;
  createdAt?: string;
}

export interface PeerInfo {
  peerId: string;
  userId: string;
  name: string;
  role: "trainer" | "student" | "admin";
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream;
}

interface UseLiveClassWebRTCOptions {
  classId: string;
  userId: string;
  userName: string;
  userRole: "trainer" | "student" | "admin";
  onClassEnded?: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useLiveClassWebRTC({
  classId,
  userId,
  userName,
  userRole,
  onClassEnded,
}: UseLiveClassWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const myPeerIdRef = useRef<string>(userId || `peer_${Math.random().toString(36).slice(2, 9)}`);

  // Update localStreamRef when localStream state changes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Load message history on initial load
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
      } catch (err) {
        console.warn("Could not load past chat messages:", err);
      }
    }

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [classId]);

  // 1. Initialize Local Media (Camera & Mic)
  const initLocalMedia = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      setMediaError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err: any) {
        console.warn("Full media access failed, trying audio only:", err);
        // Fallback to audio only if camera is unavailable or denied
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsCameraOff(true);
        } catch (audioErr: any) {
          console.warn("Audio access also failed, trying video only:", audioErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setIsMuted(true);
          } catch (vidErr: any) {
            console.warn("No media devices accessible:", vidErr);
            // Create an empty stream so user can still listen and chat
            stream = new MediaStream();
            setMediaError("Camera or Microphone permission was not granted. You can still listen and chat in the classroom.");
            setIsMuted(true);
            setIsCameraOff(true);
          }
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;
      setConnectionStatus("connected");
      return stream;
    } catch (err: any) {
      console.error("Failed to initialize media devices:", err);
      setMediaError("Could not access media devices.");
      setConnectionStatus("error");
      return null;
    }
  }, []);

  // 2. Create Peer Connection Helper
  const createPeerConnection = useCallback((remotePeerId: string, remoteInfo: Partial<PeerInfo>) => {
    if (peerConnectionsRef.current.has(remotePeerId)) {
      return peerConnectionsRef.current.get(remotePeerId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current.set(remotePeerId, pc);

    // Add local media tracks to peer connection
    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, currentStream);
        } catch {}
      });
    }

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      const [remoteMediaStream] = event.streams;
      if (remoteMediaStream) {
        setPeers((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(remotePeerId) || {
            peerId: remotePeerId,
            userId: remoteInfo.userId || remotePeerId,
            name: remoteInfo.name || "Participant",
            role: remoteInfo.role || "student",
            hasAudio: true,
            hasVideo: true,
          };
          updated.set(remotePeerId, {
            ...existing,
            stream: remoteMediaStream,
          });
          return updated;
        });
      }
    };

    // Handle ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            fromPeerId: myPeerIdRef.current,
            toPeerId: remotePeerId,
            candidate: event.candidate,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        setPeers((prev) => {
          const updated = new Map(prev);
          updated.delete(remotePeerId);
          return updated;
        });
        peerConnectionsRef.current.delete(remotePeerId);
      }
    };

    return pc;
  }, []);

  // 3. Setup Supabase Realtime Signaling & Presence Channel
  useEffect(() => {
    if (!classId) return;

    let isSubscribed = true;
    const channelName = `live-classroom:${classId}`;
    const channel = supabaseRef.current.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: myPeerIdRef.current },
      },
    });
    channelRef.current = channel;

    const setupSignaling = async () => {
      await initLocalMedia();

      channel
        // Presence Sync (ensures 100% accurate participant roster without ghosts)
        .on("presence", { event: "sync" }, () => {
          if (!isSubscribed) return;
          const presenceState = channel.presenceState();
          const presentPeerIds = new Set<string>();

          setPeers((prev) => {
            const updated = new Map(prev);

            Object.values(presenceState).forEach((presences: any) => {
              presences.forEach((p: any) => {
                if (p.userId && p.userId !== userId) {
                  const key = p.peerId || p.userId;
                  presentPeerIds.add(key);
                  const existing = updated.get(key) || {
                    peerId: key,
                    userId: p.userId,
                    name: p.name || "Participant",
                    role: p.role || "student",
                    hasAudio: p.hasAudio ?? true,
                    hasVideo: p.hasVideo ?? true,
                    isScreenSharing: p.isScreenSharing ?? false,
                  };
                  updated.set(key, {
                    ...existing,
                    name: p.name || existing.name,
                    role: p.role || existing.role,
                    hasAudio: p.hasAudio ?? existing.hasAudio,
                    hasVideo: p.hasVideo ?? existing.hasVideo,
                    isScreenSharing: p.isScreenSharing ?? existing.isScreenSharing,
                  });
                }
              });
            });

            // Clean up left peers
            for (const [key] of updated.entries()) {
              if (!presentPeerIds.has(key)) {
                updated.delete(key);
                const pc = peerConnectionsRef.current.get(key);
                if (pc) {
                  pc.close();
                  peerConnectionsRef.current.delete(key);
                }
              }
            }

            return updated;
          });
        })

        // Peer Joined via Broadcast
        .on("broadcast", { event: "peer-join" }, async ({ payload }) => {
          if (!isSubscribed || payload.peerId === myPeerIdRef.current) return;

          setPeers((prev) => {
            const updated = new Map(prev);
            updated.set(payload.peerId, {
              peerId: payload.peerId,
              userId: payload.userId,
              name: payload.name,
              role: payload.role,
              hasAudio: payload.hasAudio ?? true,
              hasVideo: payload.hasVideo ?? true,
              isScreenSharing: payload.isScreenSharing ?? false,
            });
            return updated;
          });

          // Trainer creates offer to new joiner
          if (userRole === "trainer" || userRole === "admin") {
            const pc = createPeerConnection(payload.peerId, payload);
            try {
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(offer);

              channel.send({
                type: "broadcast",
                event: "webrtc-offer",
                payload: {
                  fromPeerId: myPeerIdRef.current,
                  toPeerId: payload.peerId,
                  offer,
                  senderInfo: {
                    userId,
                    name: userName,
                    role: userRole,
                    hasAudio: !isMuted,
                    hasVideo: !isCameraOff,
                    isScreenSharing,
                  },
                },
              });
            } catch (err) {
              console.error("Error creating WebRTC offer:", err);
            }
          }
        })

        // WebRTC Offer received
        .on("broadcast", { event: "webrtc-offer" }, async ({ payload }) => {
          if (!isSubscribed || payload.toPeerId !== myPeerIdRef.current) return;

          const pc = createPeerConnection(payload.fromPeerId, payload.senderInfo || {});
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: "broadcast",
              event: "webrtc-answer",
              payload: {
                fromPeerId: myPeerIdRef.current,
                toPeerId: payload.fromPeerId,
                answer,
              },
            });
          } catch (err) {
            console.error("Error handling WebRTC offer / creating answer:", err);
          }
        })

        // WebRTC Answer received
        .on("broadcast", { event: "webrtc-answer" }, async ({ payload }) => {
          if (!isSubscribed || payload.toPeerId !== myPeerIdRef.current) return;

          const pc = peerConnectionsRef.current.get(payload.fromPeerId);
          if (pc && pc.signalingState !== "stable") {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            } catch (err) {
              console.error("Error setting remote description from answer:", err);
            }
          }
        })

        // ICE Candidate received
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (!isSubscribed || payload.toPeerId !== myPeerIdRef.current) return;

          const pc = peerConnectionsRef.current.get(payload.fromPeerId);
          if (pc && payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
          }
        })

        // Peer Left
        .on("broadcast", { event: "peer-leave" }, ({ payload }) => {
          if (!isSubscribed) return;
          const remotePeerId = payload.peerId;
          const pc = peerConnectionsRef.current.get(remotePeerId);
          if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(remotePeerId);
          }
          setPeers((prev) => {
            const updated = new Map(prev);
            updated.delete(remotePeerId);
            return updated;
          });
        })

        // Media track state change (mute / camera toggle)
        .on("broadcast", { event: "track-state-change" }, ({ payload }) => {
          if (!isSubscribed) return;
          setPeers((prev) => {
            const updated = new Map(prev);
            const peer = updated.get(payload.peerId);
            if (peer) {
              updated.set(payload.peerId, {
                ...peer,
                hasAudio: payload.hasAudio ?? peer.hasAudio,
                hasVideo: payload.hasVideo ?? peer.hasVideo,
                isScreenSharing: payload.isScreenSharing ?? peer.isScreenSharing,
              });
            }
            return updated;
          });
        })

        // Realtime Chat Message
        .on("broadcast", { event: "chat-message" }, ({ payload }) => {
          if (!isSubscribed) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        })

        // Trainer Ended Class
        .on("broadcast", { event: "class-ended" }, () => {
          if (!isSubscribed) return;
          if (onClassEnded) onClassEnded();
        })

        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            // Track Presence
            try {
              await channel.track({
                peerId: myPeerIdRef.current,
                userId,
                name: userName,
                role: userRole,
                hasAudio: !isMuted,
                hasVideo: !isCameraOff,
                isScreenSharing: false,
                joinedAt: new Date().toISOString(),
              });
            } catch {}

            // Announce join to other peers
            channel.send({
              type: "broadcast",
              event: "peer-join",
              payload: {
                peerId: myPeerIdRef.current,
                userId,
                name: userName,
                role: userRole,
                hasAudio: !isMuted,
                hasVideo: !isCameraOff,
                isScreenSharing: false,
              },
            });
          }
        });
    };

    setupSignaling();

    return () => {
      isSubscribed = false;
      // Untrack and Broadcast leave
      try {
        channel.untrack();
        channel.send({
          type: "broadcast",
          event: "peer-leave",
          payload: { peerId: myPeerIdRef.current, userId },
        });
        supabaseRef.current.removeChannel(channel);
      } catch {}

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [classId, userId, userName, userRole, initLocalMedia, createPeerConnection, onClassEnded]);

  // 4. Toggle Microphone
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    const nextMuted = !isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "track-state-change",
        payload: {
          peerId: myPeerIdRef.current,
          hasAudio: !nextMuted,
          hasVideo: !isCameraOff,
          isScreenSharing,
        },
      });
      try {
        channelRef.current.track({
          peerId: myPeerIdRef.current,
          userId,
          name: userName,
          role: userRole,
          hasAudio: !nextMuted,
          hasVideo: !isCameraOff,
          isScreenSharing,
        });
      } catch {}
    }
  }, [isMuted, isCameraOff, isScreenSharing, userId, userName, userRole]);

  // 5. Toggle Video Camera
  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    const nextCameraOff = !isCameraOff;
    videoTracks.forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "track-state-change",
        payload: {
          peerId: myPeerIdRef.current,
          hasAudio: !isMuted,
          hasVideo: !nextCameraOff,
          isScreenSharing,
        },
      });
      try {
        channelRef.current.track({
          peerId: myPeerIdRef.current,
          userId,
          name: userName,
          role: userRole,
          hasAudio: !isMuted,
          hasVideo: !nextCameraOff,
          isScreenSharing,
        });
      } catch {}
    }
  }, [isMuted, isCameraOff, isScreenSharing, userId, userName, userRole]);

  // 6. Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop Screen Share and restore camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setIsScreenSharing(false);

      // Replace track on all peer connections back to camera video
      const localVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localVideoTrack) {
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(localVideoTrack);
          }
        });
      }

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "track-state-change",
          payload: {
            peerId: myPeerIdRef.current,
            hasAudio: !isMuted,
            hasVideo: !isCameraOff,
            isScreenSharing: false,
          },
        });
      }
    } else {
      // Start Screen Share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: true,
        });

        const screenTrack = stream.getVideoTracks()[0] ?? null;
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        // When user stops screen sharing from browser UI bar
        if (screenTrack) {
          screenTrack.onended = () => {
            toggleScreenShare();
          };
        }

        // Replace track on all peer connections to screen track
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          } else if (screenTrack) {
            pc.addTrack(screenTrack, stream);
          }
        });

        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "track-state-change",
            payload: {
              peerId: myPeerIdRef.current,
              hasAudio: !isMuted,
              hasVideo: true,
              isScreenSharing: true,
            },
          });
        }
      } catch (err) {
        console.warn("Screen sharing cancelled or denied:", err);
      }
    }
  }, [isScreenSharing, isMuted, isCameraOff]);

  // 7. Send Chat Message (Persists via API + Broadcasts via Realtime Channel)
  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || !channelRef.current) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
    };

    // Append to local state instantly
    setMessages((prev) => [...prev, message]);

    // Broadcast to classroom channel for 0ms latency to other peers
    channelRef.current.send({
      type: "broadcast",
      event: "chat-message",
      payload: message,
    });

    // Persist to server in background
    fetch("/api/live-classes/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        text: text.trim(),
        senderName: userName,
        senderRole: userRole,
      }),
    }).catch((err) => console.warn("Chat message persist warning:", err));
  }, [classId, userId, userName, userRole]);

  // 8. End Class Broadcast (Trainer only)
  const endClass = useCallback(() => {
    if (channelRef.current && (userRole === "trainer" || userRole === "admin")) {
      channelRef.current.send({
        type: "broadcast",
        event: "class-ended",
        payload: { byUserId: userId, timestamp: new Date().toISOString() },
      });
    }
  }, [userId, userRole]);

  return {
    localStream,
    screenStream,
    peers: Array.from(peers.values()),
    messages,
    isMuted,
    isCameraOff,
    isScreenSharing,
    connectionStatus,
    mediaError,
    activeSpeakerId,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    sendMessage,
    endClass,
  };
}
