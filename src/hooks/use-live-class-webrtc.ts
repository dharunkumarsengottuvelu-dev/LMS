"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type JoinState =
  | "IDLE"
  | "INITIALIZING"
  | "REQUESTING_MEDIA"
  | "MEDIA_READY"
  | "CHANNEL_CONNECTING"
  | "CHANNEL_SUBSCRIBED"
  | "PRESENCE_READY"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "ERROR";

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
    { urls: "stun:stun3.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

// Structured Diagnostic Logger
function log(tag: "MEETING" | "REALTIME" | "PRESENCE" | "SIGNALING" | "WEBRTC" | "MEDIA" | "RECONNECT" | "CLEANUP", ...args: any[]) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`%c[${tag}]`, "color: #38bdf8; font-weight: bold;", ...args);
  }
}

// Web Audio API Sound Synthesizer (Native, zero dependencies)
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === "hand") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } else if (type === "join") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
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
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
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
  const [joinState, setJoinState] = useState<JoinState>("IDLE");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const myPeerIdRef = useRef<string>(userId || `peer_${Math.random().toString(36).slice(2, 9)}`);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safe Broadcast - Guarantees channel is subscribed and handles promise safety
  const safeBroadcast = useCallback((event: string, payload: any) => {
    if (!channelRef.current || !isSubscribedRef.current) {
      log("SIGNALING", `Skipping broadcast ${event} (channel not subscribed)`);
      return;
    }
    try {
      const res = channelRef.current.send({
        type: "broadcast",
        event,
        payload,
      });
      if (res && typeof res.catch === "function") {
        res.catch((err: any) => log("SIGNALING", `Broadcast error for ${event}:`, err));
      }
    } catch (err) {
      log("SIGNALING", `Failed to send broadcast ${event}:`, err);
    }
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
    } catch (err) {
      log("MEDIA", "Audio analyzer setup error:", err);
    }

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
      } catch (err) {
        log("MEETING", "History load warning:", err);
      }
    }

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [classId]);

  // 1. Initialize Local Media (Camera & Mic with clean graceful fallback)
  const initLocalMedia = useCallback(async () => {
    setJoinState("REQUESTING_MEDIA");
    setMediaError(null);

    let stream: MediaStream;
    try {
      log("MEDIA", "Requesting user media (video + audio)");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      log("MEDIA", "User media granted");
    } catch (err: any) {
      log("MEDIA", "Camera+mic request denied/unavailable, attempting audio only:", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsCameraOff(true);
      } catch (audioErr: any) {
        log("MEDIA", "Audio also unavailable, attempting video only:", audioErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setIsMuted(true);
        } catch {
          log("MEDIA", "No media hardware accessible; creating empty stream for listener mode");
          stream = new MediaStream();
          setMediaError("Camera or Microphone permission was not granted. You can still listen and participate in chat, whiteboard, and reactions.");
          setIsMuted(true);
          setIsCameraOff(true);
        }
      }
    }

    setLocalStream(stream);
    localStreamRef.current = stream;
    setJoinState("MEDIA_READY");
    return stream;
  }, []);

  // 2. Create RTCPeerConnection with ICE Candidate Queuing & State Handling
  const createPeerConnection = useCallback((remotePeerId: string, remoteInfo: Partial<PeerInfo>) => {
    if (peerConnectionsRef.current.has(remotePeerId)) {
      return peerConnectionsRef.current.get(remotePeerId)!;
    }

    log("WEBRTC", `Creating RTCPeerConnection for ${remotePeerId}`);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current.set(remotePeerId, pc);
    iceCandidateQueuesRef.current.set(remotePeerId, []);

    // Add local media tracks
    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, currentStream);
        } catch (err) {
          log("WEBRTC", "addTrack warning:", err);
        }
      });
    }

    // Remote Track Handler
    pc.ontrack = (event) => {
      const [remoteMediaStream] = event.streams;
      log("WEBRTC", `Remote track received from ${remotePeerId}`, event.track.kind);
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

    // ICE Candidate Generation
    pc.onicecandidate = (event) => {
      if (event.candidate && isSubscribedRef.current) {
        safeBroadcast("ice-candidate", {
          fromPeerId: myPeerIdRef.current,
          toPeerId: remotePeerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection State Handling
    pc.onconnectionstatechange = () => {
      log("WEBRTC", `Peer ${remotePeerId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        setPeers((prev) => {
          const updated = new Map(prev);
          updated.delete(remotePeerId);
          return updated;
        });
        peerConnectionsRef.current.delete(remotePeerId);
        iceCandidateQueuesRef.current.delete(remotePeerId);
      }
    };

    return pc;
  }, [safeBroadcast]);

  // Drain buffered ICE candidates after setting remote description
  const drainIceCandidates = useCallback(async (remotePeerId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateQueuesRef.current.get(remotePeerId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          log("WEBRTC", `Error adding queued ICE candidate for ${remotePeerId}:`, err);
        }
      }
    }
    iceCandidateQueuesRef.current.set(remotePeerId, []);
  }, []);

  // 3. Supabase Realtime Channel Lifecycle with strict SUBSCRIBED gate
  useEffect(() => {
    if (!classId) return;

    let isDestroyed = false;
    const channelName = `live-classroom:${classId}`;
    log("REALTIME", `Initializing channel ${channelName}`);
    setJoinState("CHANNEL_CONNECTING");

    const channel = supabaseRef.current.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: myPeerIdRef.current },
      },
    });
    channelRef.current = channel;

    const setupSignaling = async () => {
      await initLocalMedia();
      if (isDestroyed) return;

      channel
        // Presence Sync
        .on("presence", { event: "sync" }, () => {
          if (isDestroyed || !isSubscribedRef.current) return;
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
                  iceCandidateQueuesRef.current.delete(key);
                }
              }
            }

            return updated;
          });
        })

        // Broadcast: Peer Joined
        .on("broadcast", { event: "peer-join" }, async ({ payload }) => {
          if (isDestroyed || payload.peerId === myPeerIdRef.current) return;
          log("SIGNALING", `Peer joined broadcast received: ${payload.name} (${payload.peerId})`);
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

          // Trainer or Admin initiates offer to new participant
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
              log("WEBRTC", `Sent WebRTC offer to ${payload.peerId}`);
            } catch (err) {
              log("WEBRTC", "Error creating WebRTC offer:", err);
            }
          }
        })

        // Broadcast: WebRTC Offer received
        .on("broadcast", { event: "webrtc-offer" }, async ({ payload }) => {
          if (isDestroyed || payload.toPeerId !== myPeerIdRef.current) return;
          log("WEBRTC", `Received WebRTC offer from ${payload.fromPeerId}`);

          const pc = createPeerConnection(payload.fromPeerId, payload.senderInfo || {});
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            await drainIceCandidates(payload.fromPeerId, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            safeBroadcast("webrtc-answer", {
              fromPeerId: myPeerIdRef.current,
              toPeerId: payload.fromPeerId,
              answer,
            });
            log("WEBRTC", `Sent WebRTC answer to ${payload.fromPeerId}`);
          } catch (err) {
            log("WEBRTC", "Error handling WebRTC offer / creating answer:", err);
          }
        })

        // Broadcast: WebRTC Answer received
        .on("broadcast", { event: "webrtc-answer" }, async ({ payload }) => {
          if (isDestroyed || payload.toPeerId !== myPeerIdRef.current) return;
          log("WEBRTC", `Received WebRTC answer from ${payload.fromPeerId}`);

          const pc = peerConnectionsRef.current.get(payload.fromPeerId);
          if (pc && pc.signalingState !== "stable") {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              await drainIceCandidates(payload.fromPeerId, pc);
            } catch (err) {
              log("WEBRTC", "Error setting remote description from answer:", err);
            }
          }
        })

        // Broadcast: ICE Candidate received
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (isDestroyed || payload.toPeerId !== myPeerIdRef.current) return;

          const pc = peerConnectionsRef.current.get(payload.fromPeerId);
          if (pc && payload.candidate) {
            if (!pc.remoteDescription) {
              // Buffer candidate until remote description is set
              const queue = iceCandidateQueuesRef.current.get(payload.fromPeerId) || [];
              queue.push(payload.candidate);
              iceCandidateQueuesRef.current.set(payload.fromPeerId, queue);
            } else {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (err) {
                log("WEBRTC", "Error adding ICE candidate:", err);
              }
            }
          }
        })

        // Broadcast: Peer Left
        .on("broadcast", { event: "peer-leave" }, ({ payload }) => {
          if (isDestroyed) return;
          playSoundEffect("leave");
          const remotePeerId = payload.peerId;
          const pc = peerConnectionsRef.current.get(remotePeerId);
          if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(remotePeerId);
            iceCandidateQueuesRef.current.delete(remotePeerId);
          }
          setPeers((prev) => {
            const updated = new Map(prev);
            updated.delete(remotePeerId);
            return updated;
          });
        })

        // Broadcast: Track State Changed
        .on("broadcast", { event: "track-state-change" }, ({ payload }) => {
          if (isDestroyed) return;
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

        // Broadcast: Hand Raise
        .on("broadcast", { event: "hand-raise" }, ({ payload }) => {
          if (isDestroyed) return;
          if (payload.isHandRaised) playSoundEffect("hand");

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

        // Broadcast: Live Emoji Reaction
        .on("broadcast", { event: "reaction" }, ({ payload }) => {
          if (isDestroyed) return;
          setReactions((prev) => [...prev.slice(-15), payload]);
        })

        // Broadcast: Whiteboard Sync
        .on("broadcast", { event: "whiteboard-stroke" }, ({ payload }) => {
          if (isDestroyed) return;
          if (payload.action === "clear") {
            setWhiteboardStrokes([]);
          } else if (payload.stroke) {
            setWhiteboardStrokes((prev) => [...prev, payload.stroke]);
          }
        })

        // Broadcast: Chat Message
        .on("broadcast", { event: "chat-message" }, ({ payload }) => {
          if (isDestroyed) return;
          playSoundEffect("message");
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        })

        // Broadcast: Trainer Ended Class
        .on("broadcast", { event: "class-ended" }, () => {
          if (isDestroyed) return;
          log("MEETING", "Host ended classroom session");
          if (onClassEnded) onClassEnded();
        })

        // Channel Subscription Lifecycle
        .subscribe(async (status) => {
          log("REALTIME", `Channel status: ${status}`);

          if (status === "SUBSCRIBED") {
            isSubscribedRef.current = true;
            setJoinState("CHANNEL_SUBSCRIBED");

            // ONLY track presence after status === "SUBSCRIBED"
            try {
              const trackStatus = await channel.track({
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
              if (trackStatus === "ok") {
                setJoinState("CONNECTED");
                log("PRESENCE", "User successfully tracked in presence");
              }
            } catch (trackErr) {
              log("PRESENCE", "Presence track error:", trackErr);
            }

            // Announce join to peers
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
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            isSubscribedRef.current = false;
            setJoinState("RECONNECTING");
            log("REALTIME", `Channel connection dropped (${status}). Scheduling recovery...`);

            if (!reconnectTimeoutRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                if (!isDestroyed) {
                  log("RECONNECT", "Attempting channel reconnect");
                  channel.subscribe();
                }
              }, 3000);
            }
          }
        });
    };

    setupSignaling();

    // Clean unmount
    return () => {
      isDestroyed = true;
      log("CLEANUP", "Cleaning up live classroom WebRTC & Realtime channel");

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (isSubscribedRef.current && channelRef.current) {
        try {
          channelRef.current.untrack().catch(() => {});
          safeBroadcast("peer-leave", { peerId: myPeerIdRef.current, userId });
        } catch {}
      }

      isSubscribedRef.current = false;

      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current).catch(() => {});
        channelRef.current = null;
      }

      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      iceCandidateQueuesRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [classId, userId, userName, userRole, initLocalMedia, createPeerConnection, drainIceCandidates, onClassEnded, safeBroadcast]);

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

    if (isSubscribedRef.current && channelRef.current) {
      channelRef.current
        .track({
          peerId: myPeerIdRef.current,
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

    if (isSubscribedRef.current && channelRef.current) {
      channelRef.current
        .track({
          peerId: myPeerIdRef.current,
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
            sender.replaceTrack(localVideoTrack).catch(() => {});
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
            sender.replaceTrack(screenTrack).catch(() => {});
          } else if (screenTrack) {
            try {
              pc.addTrack(screenTrack, stream);
            } catch {}
          }
        });

        safeBroadcast("track-state-change", {
          peerId: myPeerIdRef.current,
          hasAudio: !isMuted,
          hasVideo: true,
          isScreenSharing: true,
        });
      } catch (err) {
        log("MEDIA", "Screen sharing cancelled:", err);
      }
    }
  }, [isScreenSharing, isMuted, isCameraOff, safeBroadcast]);

  // 7. Toggle Raise Hand
  const toggleRaiseHand = useCallback(() => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    if (nextHand) playSoundEffect("hand");

    safeBroadcast("hand-raise", {
      peerId: myPeerIdRef.current,
      userId,
      name: userName,
      isHandRaised: nextHand,
    });
  }, [isHandRaised, userId, userName, safeBroadcast]);

  // 8. Live Reaction (Emoji)
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
    joinState,
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
