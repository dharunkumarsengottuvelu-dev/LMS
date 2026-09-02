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
  isHandRaised?: boolean;
  stream?: MediaStream;
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

// Web Audio API Sound Synthesizer (Zero external dependencies)
function playSoundEffect(type: "join" | "leave" | "hand" | "message") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "message") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === "hand") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } else if (type === "join") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } else if (type === "leave") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    }
  } catch {}
}

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
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const myPeerIdRef = useRef<string>(userId || `peer_${Math.random().toString(36).slice(2, 9)}`);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Safe Broadcast Helper - Never crashes on unready socket or drops
  const safeBroadcast = useCallback((event: string, payload: any) => {
    if (!channelRef.current || !isSubscribedRef.current) return;
    try {
      const res = channelRef.current.send({
        type: "broadcast",
        event,
        payload,
      });
      if (res && typeof res.catch === "function") {
        res.catch(() => {});
      }
    } catch {}
  }, []);

  // Update localStreamRef
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Audio energy analyzer for mic meter and active speaker
  useEffect(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
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

        if (avg > 25 && !isMuted) {
          setActiveSpeakerId(myPeerIdRef.current);
        }

        animFrameRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch {}

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [localStream, isMuted]);

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
      } catch {}
    }

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [classId]);

  // 1. Initialize Local Media (Camera & Mic with crystal-clear fallback)
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
        console.warn("Full camera+audio request failed, trying audio only:", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsCameraOff(true);
        } catch (audioErr: any) {
          console.warn("Audio access also failed, creating virtual track:", audioErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setIsMuted(true);
          } catch {
            stream = new MediaStream();
            setMediaError("Camera or Microphone permission was not granted. You can still listen, participate in chat, whiteboard, and reactions.");
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

    // Add local tracks
    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, currentStream);
        } catch {}
      });
    }

    // Remote Track Receiver
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
            isHandRaised: false,
          };
          updated.set(remotePeerId, {
            ...existing,
            stream: remoteMediaStream,
          });
          return updated;
        });
      }
    };

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        safeBroadcast("ice-candidate", {
          fromPeerId: myPeerIdRef.current,
          toPeerId: remotePeerId,
          candidate: event.candidate,
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
  }, [safeBroadcast]);

  // 3. Setup Supabase Realtime Signaling & Presence Channel
  useEffect(() => {
    if (!classId) return;

    let active = true;
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
        // Presence Sync (Roster)
        .on("presence", { event: "sync" }, () => {
          if (!active) return;
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
                    isHandRaised: p.isHandRaised ?? false,
                  };
                  updated.set(key, {
                    ...existing,
                    name: p.name || existing.name,
                    role: p.role || existing.role,
                    hasAudio: p.hasAudio ?? existing.hasAudio,
                    hasVideo: p.hasVideo ?? existing.hasVideo,
                    isScreenSharing: p.isScreenSharing ?? existing.isScreenSharing,
                    isHandRaised: p.isHandRaised ?? existing.isHandRaised,
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
          if (!active || payload.peerId === myPeerIdRef.current) return;
          playSoundEffect("join");

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
              isHandRaised: payload.isHandRaised ?? false,
            });
            return updated;
          });

          // Trainer / Admin initiates WebRTC offer
          if (userRole === "trainer" || userRole === "admin") {
            const pc = createPeerConnection(payload.peerId, payload);
            try {
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
              await pc.setLocalDescription(offer);

              safeBroadcast("webrtc-offer", {
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
              });
            } catch (err) {
              console.error("Error creating WebRTC offer:", err);
            }
          }
        })

        // WebRTC Offer received
        .on("broadcast", { event: "webrtc-offer" }, async ({ payload }) => {
          if (!active || payload.toPeerId !== myPeerIdRef.current) return;

          const pc = createPeerConnection(payload.fromPeerId, payload.senderInfo || {});
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            safeBroadcast("webrtc-answer", {
              fromPeerId: myPeerIdRef.current,
              toPeerId: payload.fromPeerId,
              answer,
            });
          } catch (err) {
            console.error("Error answering WebRTC offer:", err);
          }
        })

        // WebRTC Answer received
        .on("broadcast", { event: "webrtc-answer" }, async ({ payload }) => {
          if (!active || payload.toPeerId !== myPeerIdRef.current) return;

          const pc = peerConnectionsRef.current.get(payload.fromPeerId);
          if (pc && pc.signalingState !== "stable") {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            } catch (err) {
              console.error("Error setting answer remote description:", err);
            }
          }
        })

        // ICE Candidate received
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (!active || payload.toPeerId !== myPeerIdRef.current) return;

          const pc = peerConnectionsRef.current.get(payload.fromPeerId);
          if (pc && payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {}
          }
        })

        // Peer Left
        .on("broadcast", { event: "peer-leave" }, ({ payload }) => {
          if (!active) return;
          playSoundEffect("leave");
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

        // Media track state change
        .on("broadcast", { event: "track-state-change" }, ({ payload }) => {
          if (!active) return;
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

        // Hand Raise Toggle
        .on("broadcast", { event: "hand-raise" }, ({ payload }) => {
          if (!active) return;
          if (payload.isHandRaised) {
            playSoundEffect("hand");
          }
          setPeers((prev) => {
            const updated = new Map(prev);
            const peer = updated.get(payload.peerId);
            if (peer) {
              updated.set(payload.peerId, {
                ...peer,
                isHandRaised: payload.isHandRaised,
              });
            }
            return updated;
          });
        })

        // Live Reaction (Emoji)
        .on("broadcast", { event: "reaction" }, ({ payload }) => {
          if (!active) return;
          setReactions((prev) => [...prev.slice(-15), payload]);
        })

        // Whiteboard Stroke Sync
        .on("broadcast", { event: "whiteboard-stroke" }, ({ payload }) => {
          if (!active) return;
          if (payload.action === "clear") {
            setWhiteboardStrokes([]);
          } else if (payload.stroke) {
            setWhiteboardStrokes((prev) => [...prev, payload.stroke]);
          }
        })

        // Realtime Chat Message
        .on("broadcast", { event: "chat-message" }, ({ payload }) => {
          if (!active) return;
          playSoundEffect("message");
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        })

        // Trainer Ended Class
        .on("broadcast", { event: "class-ended" }, () => {
          if (!active) return;
          if (onClassEnded) onClassEnded();
        })

        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            isSubscribedRef.current = true;
            try {
              await channel.track({
                peerId: myPeerIdRef.current,
                userId,
                name: userName,
                role: userRole,
                hasAudio: !isMuted,
                hasVideo: !isCameraOff,
                isScreenSharing: false,
                isHandRaised: false,
                joinedAt: new Date().toISOString(),
              });
            } catch {}

            safeBroadcast("peer-join", {
              peerId: myPeerIdRef.current,
              userId,
              name: userName,
              role: userRole,
              hasAudio: !isMuted,
              hasVideo: !isCameraOff,
              isScreenSharing: false,
              isHandRaised: false,
            });
          }
        });
    };

    setupSignaling();

    return () => {
      active = false;
      isSubscribedRef.current = false;
      try {
        channel.untrack();
        safeBroadcast("peer-leave", { peerId: myPeerIdRef.current, userId });
        supabaseRef.current.removeChannel(channel);
      } catch {}

      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [classId, userId, userName, userRole, initLocalMedia, createPeerConnection, onClassEnded, safeBroadcast]);

  // 4. Toggle Microphone
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    const nextMuted = !isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);

    safeBroadcast("track-state-change", {
      peerId: myPeerIdRef.current,
      hasAudio: !nextMuted,
      hasVideo: !isCameraOff,
      isScreenSharing,
    });

    try {
      channelRef.current?.track({
        peerId: myPeerIdRef.current,
        userId,
        name: userName,
        role: userRole,
        hasAudio: !nextMuted,
        hasVideo: !isCameraOff,
        isScreenSharing,
        isHandRaised,
      });
    } catch {}
  }, [isMuted, isCameraOff, isScreenSharing, isHandRaised, userId, userName, userRole, safeBroadcast]);

  // 5. Toggle Video Camera
  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    const nextCameraOff = !isCameraOff;
    videoTracks.forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);

    safeBroadcast("track-state-change", {
      peerId: myPeerIdRef.current,
      hasAudio: !isMuted,
      hasVideo: !nextCameraOff,
      isScreenSharing,
    });

    try {
      channelRef.current?.track({
        peerId: myPeerIdRef.current,
        userId,
        name: userName,
        role: userRole,
        hasAudio: !isMuted,
        hasVideo: !nextCameraOff,
        isScreenSharing,
        isHandRaised,
      });
    } catch {}
  }, [isMuted, isCameraOff, isScreenSharing, isHandRaised, userId, userName, userRole, safeBroadcast]);

  // 6. Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setIsScreenSharing(false);

      const localVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localVideoTrack) {
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(localVideoTrack);
          }
        });
      }

      safeBroadcast("track-state-change", {
        peerId: myPeerIdRef.current,
        hasAudio: !isMuted,
        hasVideo: !isCameraOff,
        isScreenSharing: false,
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: true,
        });

        const screenTrack = stream.getVideoTracks()[0] ?? null;
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        if (screenTrack) {
          screenTrack.onended = () => {
            toggleScreenShare();
          };
        }

        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          } else if (screenTrack) {
            pc.addTrack(screenTrack, stream);
          }
        });

        safeBroadcast("track-state-change", {
          peerId: myPeerIdRef.current,
          hasAudio: !isMuted,
          hasVideo: true,
          isScreenSharing: true,
        });
      } catch (err) {
        console.warn("Screen sharing cancelled:", err);
      }
    }
  }, [isScreenSharing, isMuted, isCameraOff, safeBroadcast]);

  // 7. Toggle Raise Hand
  const toggleRaiseHand = useCallback(() => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    if (nextHand) {
      playSoundEffect("hand");
    }

    safeBroadcast("hand-raise", {
      peerId: myPeerIdRef.current,
      userId,
      name: userName,
      isHandRaised: nextHand,
    });
  }, [isHandRaised, userId, userName, safeBroadcast]);

  // 8. Send Live Reaction (Emoji)
  const sendReaction = useCallback((emoji: string) => {
    const reaction: LiveReaction = {
      id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      senderName: userName,
      timestamp: Date.now(),
    };

    setReactions((prev) => [...prev.slice(-15), reaction]);
    safeBroadcast("reaction", reaction);
  }, [userName, safeBroadcast]);

  // 9. Whiteboard Broadcast & Local Append
  const addWhiteboardStroke = useCallback((stroke: WhiteboardStroke) => {
    setWhiteboardStrokes((prev) => [...prev, stroke]);
    safeBroadcast("whiteboard-stroke", { action: "draw", stroke });
  }, [safeBroadcast]);

  const clearWhiteboard = useCallback(() => {
    setWhiteboardStrokes([]);
    safeBroadcast("whiteboard-stroke", { action: "clear" });
  }, [safeBroadcast]);

  // 10. Send Chat Message
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, message]);
    safeBroadcast("chat-message", message);

    fetch("/api/live-classes/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        text: text.trim(),
        senderName: userName,
        senderRole: userRole,
      }),
    }).catch(() => {});
  }, [classId, userId, userName, userRole, safeBroadcast]);

  // 11. End Class (Host only)
  const endClass = useCallback(() => {
    if (userRole === "trainer" || userRole === "admin") {
      safeBroadcast("class-ended", { byUserId: userId, timestamp: new Date().toISOString() });
    }
  }, [userId, userRole, safeBroadcast]);

  return {
    localStream,
    screenStream,
    peers: Array.from(peers.values()),
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
  };
}
