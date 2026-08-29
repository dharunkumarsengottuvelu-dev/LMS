"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CustomVideoPlayerProps {
  src?: string;
  title?: string;
  instructor?: string;
  poster?: string;
  autoPlay?: boolean;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onNextLesson?: () => void;
  hasNextLesson?: boolean;
  className?: string;
}

// Extract YouTube Video ID
function extractYouTubeId(url?: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) return ytMatch[1];

  const generic = trimmed.match(/([a-zA-Z0-9_-]{11})/);
  if ((trimmed.includes("youtube") || trimmed.includes("youtu.be")) && generic && generic[1]) {
    return generic[1];
  }
  return null;
}

// Extract Vimeo Video ID
function extractVimeoId(url?: string): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match && match[1] ? match[1] : null;
}

// Check if direct video file
function isDirectVideoUrl(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed) ||
    trimmed.startsWith("blob:") ||
    trimmed.includes("supabase.co/storage/v1/object/public/") ||
    trimmed.includes("firebasestorage.googleapis.com") ||
    trimmed.includes("commondatastorage.googleapis.com") ||
    trimmed.includes("cloudinary.com") ||
    trimmed.includes("mux.com")
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  if (h > 0) {
    const hh = h < 10 ? `0${h}` : `${h}`;
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

const LESSON_CAPTION_CUES: CaptionCue[] = [
  { start: 0, end: 5, text: "Welcome to this lesson on Core Software Architecture & Concepts." },
  { start: 5, end: 11, text: "In this module, we will explore why you should master this stack and review key principles." },
  { start: 11, end: 17, text: "This technology is one of the most widely used and reliable in enterprise software." },
  { start: 17, end: 24, text: "Target Audience: Software engineers, developers, and students building scalable systems." },
  { start: 24, end: 32, text: "We will cover fundamental syntax, memory management, and structured problem solving." },
  { start: 32, end: 40, text: "You will also build real-world applications and solve practical coding problems." },
  { start: 40, end: 48, text: "Let's begin by understanding runtime architecture and setting up our development environment." },
  { start: 48, end: 58, text: "Follow along closely with the attached lesson notes and interactive coding exercises." },
  { start: 58, end: 68, text: "In the next topic, we will write our first program and verify test cases." },
];

function getCaptionForTime(seconds: number): string {
  if (seconds < 0) return "";
  const match = LESSON_CAPTION_CUES.find((c) => seconds >= c.start && seconds < c.end);
  if (match) return match.text;
  if (seconds >= 68) {
    const cycle = Math.floor((seconds - 68) / 8);
    const continuousSubtitles = [
      "Let's walk through the core programming concepts for this module.",
      "Pay attention to the syntax rules and best practice design patterns.",
      "Remember to test edge cases and verify runtime complexity.",
      "Notice how functions and objects interact cleanly in this architecture.",
      "You can pause at any time to try writing this code in your editor.",
      "Review the key takeaways and test cases in the notes below."
    ];
    return continuousSubtitles[cycle % continuousSubtitles.length] || "";
  }
  return "";
}

export function CustomVideoPlayer({
  src = "",
  title = "Course Video Lesson",
  instructor = "Lead Instructor",
  poster,
  autoPlay = false,
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  onNextLesson,
  hasNextLesson = true,
  className = "",
}: CustomVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingSeekRef = useRef(false);

  const rawId = useId();
  const iframeId = `lms_yt_frame_${rawId.replace(/[:]/g, "_")}`;

  const trimmedSrc = src?.trim() || "";
  const ytVideoId = extractYouTubeId(trimmedSrc);
  const vimeoId = extractVimeoId(trimmedSrc);
  const isDirect = isDirectVideoUrl(trimmedSrc);
  const isYouTube = !isDirect && !!ytVideoId;
  const isVimeo = !isDirect && !isYouTube && !!vimeoId;

  // Fallback high-res poster
  const computedPoster =
    poster ||
    (ytVideoId
      ? `https://i.ytimg.com/vi/${ytVideoId}/maxresdefault.jpg`
      : "");

  // Playback State
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState("1080p Full HD");
  const [showCaptions, setShowCaptions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPosition, setHoverSeekPosition] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "speed" | "quality" | "captions">("main");
  const [clickRipple, setClickRipple] = useState<"play" | "pause" | null>(null);

  // Send message command to YouTube iframe
  const sendYTCommand = useCallback((func: string, args: any[] = []) => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current[func] === "function") {
      try {
        ytPlayerRef.current[func](...args);
        return;
      } catch {}
    }
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: func,
            args: args,
          }),
          "*"
        );
      } catch {}
    }
  }, []);

  // Clear auto-hide timer
  const clearHideTimer = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  };

  // Start auto-hide timer (smooth 3s delay when playing)
  const startHideTimer = useCallback(() => {
    clearHideTimer();
    if (isPlaying && !showSettings && !isDraggingSeek) {
      hideControlsTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying, showSettings, isDraggingSeek]);

  // Handle user activity over player
  const handleUserActivity = useCallback(() => {
    setIsControlsVisible(true);
    startHideTimer();
  }, [startHideTimer]);

  // Ensure YouTube Iframe API is loaded in document
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!(window as any).YT) {
      const existing = document.getElementById("lms_yt_api_script");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "lms_yt_api_script";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }
  }, []);

  // Bind YouTube Player API instance
  useEffect(() => {
    if (!isYouTube || !hasStarted || !ytVideoId) return;

    let isSubscribed = true;

    const bindYT = () => {
      if (!isSubscribed) return;
      const YT = (window as any).YT;
      if (YT && YT.Player && iframeRef.current) {
        try {
          ytPlayerRef.current = new YT.Player(iframeId, {
            events: {
              onReady: (e: any) => {
                if (!isSubscribed) return;
                try {
                  // Turn off default YouTube captions
                  e.target.unloadModule?.("captions");
                  e.target.setOption?.("captions", "track", {});
                  e.target.setOption?.("captions", "fontSize", 0);
                } catch {}

                const dur = e.target.getDuration?.() || 0;
                if (dur > 0) setDuration(dur);
                e.target.playVideo();
                setIsPlaying(true);
                setIsEnded(false);
                setIsLoading(false);
              },
              onStateChange: (e: any) => {
                if (!isSubscribed) return;
                const state = e.data;
                if (state === 1) { // PLAYING
                  setIsPlaying(true);
                  setIsEnded(false);
                  setIsLoading(false);
                  startHideTimer();
                } else if (state === 2) { // PAUSED
                  setIsPlaying(false);
                  setIsControlsVisible(true);
                  clearHideTimer();
                } else if (state === 3) { // BUFFERING
                  setIsLoading(true);
                } else if (state === 0) { // ENDED
                  setIsPlaying(false);
                  setIsEnded(true);
                  setIsControlsVisible(true);
                  clearHideTimer();
                  if (onEnded) onEnded();
                }
              },
            },
          });
        } catch (err) {
          console.warn("YT bind error:", err);
        }
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      bindYT();
    } else {
      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        bindYT();
      };
    }

    return () => {
      isSubscribed = false;
    };
  }, [iframeId, isYouTube, hasStarted, ytVideoId, onEnded, startHideTimer]);

  // YouTube postMessage Listener for time and player state
  useEffect(() => {
    if (!isYouTube) return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data);
          if (data.event === "infoDelivery" && data.info) {
            if (data.info.currentTime !== undefined && !isDraggingSeekRef.current) {
              const cur = data.info.currentTime;
              setCurrentTime(cur);
              if (onTimeUpdate) {
                onTimeUpdate(cur, duration);
              }
            }
            if (data.info.duration !== undefined && data.info.duration > 0) {
              setDuration(data.info.duration);
            }
            if (data.info.videoLoadedFraction !== undefined) {
              setBufferedPercent(data.info.videoLoadedFraction * 100);
            }
            if (data.info.playerState !== undefined) {
              if (data.info.playerState === 1) { // PLAYING
                setIsPlaying(true);
                setIsEnded(false);
                setIsLoading(false);
                startHideTimer();
              } else if (data.info.playerState === 2) { // PAUSED
                setIsPlaying(false);
              } else if (data.info.playerState === 0) { // ENDED
                setIsPlaying(false);
                setIsEnded(true);
                if (onEnded) onEnded();
              }
            }
          }
        }
      } catch {}
    };

    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [isYouTube, duration, onEnded, onTimeUpdate, startHideTimer]);

  // Continuous polling loop for YouTube timeline synchronization
  useEffect(() => {
    if (!isYouTube || !hasStarted) return;

    const interval = setInterval(() => {
      // 1. Query YT.Player API directly if available
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        try {
          const cur = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = ytPlayerRef.current.getDuration() || 0;
          const loaded = ytPlayerRef.current.getVideoLoadedFraction?.() || 0;

          if (!isDraggingSeekRef.current && cur >= 0) {
            setCurrentTime(cur);
            if (onTimeUpdate) onTimeUpdate(cur, dur);
          }
          if (dur > 0 && dur !== duration) {
            setDuration(dur);
          }
          if (loaded > 0) {
            setBufferedPercent(loaded * 100);
          }
        } catch {}
      }

      // 2. Also send postMessage request for fallback
      sendYTCommand("getCurrentTime");
      sendYTCommand("getDuration");
      sendYTCommand("getPlayerState");
    }, 250);

    return () => clearInterval(interval);
  }, [isYouTube, hasStarted, duration, onTimeUpdate, sendYTCommand]);

  // HTML5 Native Video Events
  useEffect(() => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsEnded(false);
      setHasStarted(true);
      startHideTimer();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsControlsVisible(true);
      clearHideTimer();
    };

    const handleTimeUpdate = () => {
      if (!isDraggingSeekRef.current) {
        const cur = video.currentTime || 0;
        const dur = video.duration || 0;
        setCurrentTime(cur);
        if (dur > 0 && dur !== duration) {
          setDuration(dur);
        }
        if (onTimeUpdate) {
          onTimeUpdate(cur, dur);
        }
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const pct = Math.min(100, (bufferedEnd / video.duration) * 100);
        setBufferedPercent(pct);
      }
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setIsEnded(true);
      setIsControlsVisible(true);
      clearHideTimer();
      if (onEnded) onEnded();
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
    };
  }, [duration, initialTime, isYouTube, onEnded, onTimeUpdate, startHideTimer]);

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleSeekOffset(-5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleSeekOffset(5);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        handleVolumeOffset(0.1);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        handleVolumeOffset(-0.1);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        toggleCaptions();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying, volume, isMuted, isYouTube]);

  // Handle Play Click (Starts video immediately)
  const handleStartPlay = () => {
    setHasStarted(true);
    setIsPlaying(true);
    setIsEnded(false);
    if (isYouTube) {
      sendYTCommand("playVideo");
      // Turn off native YouTube captions
      sendYTCommand("unloadModule", ["captions"]);
      sendYTCommand("setOption", ["captions", "track", {}]);
      sendYTCommand("setOption", ["captions", "fontSize", 0]);
    } else {
      videoRef.current?.play().catch(() => {});
    }
    setClickRipple("play");
    setTimeout(() => setClickRipple(null), 600);
  };

  // Toggle Play/Pause
  const togglePlay = () => {
    if (!hasStarted) {
      handleStartPlay();
      return;
    }

    if (isEnded) {
      handleReplay();
      return;
    }

    if (isYouTube) {
      if (isPlaying) {
        sendYTCommand("pauseVideo");
        setIsPlaying(false);
        setClickRipple("pause");
      } else {
        sendYTCommand("playVideo");
        setIsPlaying(true);
        setClickRipple("play");
      }
    } else {
      const video = videoRef.current;
      if (!video) return;
      if (isPlaying) {
        video.pause();
        setClickRipple("pause");
      } else {
        video.play().catch(() => {});
        setClickRipple("play");
      }
    }

    setTimeout(() => {
      setClickRipple(null);
    }, 600);
  };

  // Seek Function
  const seekToTime = (time: number) => {
    const target = Math.max(0, Math.min(duration || 1000, time));
    setCurrentTime(target);
    if (isYouTube) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        try {
          ytPlayerRef.current.seekTo(target, true);
        } catch {}
      }
      sendYTCommand("seekTo", [target, true]);
    } else if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
    if (onTimeUpdate) {
      onTimeUpdate(target, duration);
    }
  };

  const handleSeekOffset = (delta: number) => {
    seekToTime(currentTime + delta);
    handleUserActivity();
  };

  const handleVolumeOffset = (delta: number) => {
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    if (isYouTube) {
      sendYTCommand("setVolume", [Math.round(newVol * 100)]);
      if (newVol === 0) sendYTCommand("mute");
      else sendYTCommand("unMute");
    } else if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    handleUserActivity();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (isYouTube) {
      if (nextMuted) sendYTCommand("mute");
      else sendYTCommand("unMute");
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = nextMuted ? 0 : volume > 0 ? volume : 0.7;
    }
    handleUserActivity();
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const muted = val === 0;
    setIsMuted(muted);
    if (isYouTube) {
      sendYTCommand("setVolume", [Math.round(val * 100)]);
      if (muted) sendYTCommand("mute");
      else sendYTCommand("unMute");
    } else if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = muted;
    }
  };

  // Toggle Closed Captions
  const toggleCaptions = () => {
    setShowCaptions((prev) => {
      const next = !prev;
      if (!next && isYouTube) {
        sendYTCommand("unloadModule", ["captions"]);
        sendYTCommand("setOption", ["captions", "track", {}]);
      }
      return next;
    });
    handleUserActivity();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Seekbar Logic
  const calculateSeekTime = (clientX: number): number => {
    if (!progressBarRef.current || duration <= 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * duration;
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverSeekPosition(pos * 100);
    setHoverSeekTime(pos * duration);

    if (isDraggingSeek) {
      const seekTime = pos * duration;
      seekToTime(seekTime);
    }
  };

  const handleProgressBarMouseLeave = () => {
    setHoverSeekTime(null);
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingSeek(true);
    isDraggingSeekRef.current = true;
    const seekTime = calculateSeekTime(e.clientX);
    seekToTime(seekTime);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const time = calculateSeekTime(moveEvent.clientX);
      seekToTime(time);
    };

    const onMouseUp = () => {
      setIsDraggingSeek(false);
      isDraggingSeekRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      handleUserActivity();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isYouTube) {
      sendYTCommand("setPlaybackRate", [speed]);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setSettingsView("main");
    setShowSettings(false);
    handleUserActivity();
  };

  const handleQualitySelect = (q: string) => {
    setQuality(q);
    setSettingsView("main");
    setShowSettings(false);
    handleUserActivity();
  };

  const handleReplay = () => {
    setCurrentTime(0);
    setIsEnded(false);
    if (isYouTube) {
      sendYTCommand("seekTo", [0, true]);
      sendYTCommand("playVideo");
      setIsPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    handleUserActivity();
  };

  const playedPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const currentSubtitle = showCaptions ? getCaptionForTime(currentTime) : "";

  // YouTube embed URL with cc_load_policy=0 to turn off default YouTube captions
  const ytEmbedUrl = ytVideoId
    ? `https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0&disablekb=1&fs=0&playsinline=1&cc_load_policy=0`
    : "";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onMouseEnter={handleUserActivity}
      className={cn(
        "relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none group font-sans",
        isFullscreen ? "rounded-none border-none max-w-none w-screen h-screen" : "",
        className
      )}
    >
      {/* 1. MEDIA LAYER */}
      {isYouTube ? (
        hasStarted ? (
          <div className="relative w-full h-full overflow-hidden pointer-events-none">
            <iframe
              ref={iframeRef}
              id={iframeId}
              src={ytEmbedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full h-full border-0 pointer-events-none scale-105"
            />
          </div>
        ) : (
          <div
            onClick={handleStartPlay}
            className="relative w-full h-full cursor-pointer overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: computedPoster ? `url(${computedPoster})` : "none",
              backgroundColor: "#09090b",
            }}
          >
            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/75 flex flex-col justify-between p-6 z-10">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-extrabold tracking-wider uppercase shadow-lg">
                  <GraduationCap className="h-4 w-4" />
                  <span>FALCON LMS</span>
                </div>
              </div>

              <div className="space-y-2 max-w-xl">
                <Badge className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 uppercase shadow-md">
                  Video Lesson
                </Badge>
                <h3 className="text-white text-xl sm:text-2xl md:text-3xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
                  {title}
                </h3>
                <p className="text-xs sm:text-sm text-white font-semibold drop-shadow-md">
                  Instructor: <span className="text-white font-extrabold">{instructor}</span>
                </p>
              </div>
            </div>
          </div>
        )
      ) : (
        <video
          ref={videoRef}
          src={trimmedSrc || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
          poster={poster}
          playsInline
          preload="metadata"
          className="w-full h-full object-contain cursor-pointer"
        />
      )}

      {/* Transparent Click Surface when video is started */}
      {hasStarted && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        />
      )}

      {/* 2. TOP INFORMATION BAR */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 p-4 md:p-5 bg-gradient-to-b from-black/95 via-black/60 to-transparent z-20 transition-opacity duration-300 pointer-events-auto flex items-center justify-between gap-4",
          isControlsVisible || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-extrabold tracking-wider uppercase shadow-md backdrop-blur-md">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>FALCON LMS</span>
          </div>
          <h2 className="text-white text-sm sm:text-base font-extrabold truncate drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
            {title}
          </h2>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0 text-xs text-white font-semibold">
          <span>Instructor:</span>
          <span className="text-white font-extrabold">{instructor}</span>
        </div>
      </div>

      {/* 3. CENTER PLAYBACK AREA */}
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-xs">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin drop-shadow-lg" />
        </div>
      )}

      {/* Center Big Circular Play Button */}
      {!isPlaying && !isLoading && !isEnded && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer bg-black/20 transition-all"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600 text-white shadow-2xl backdrop-blur-md flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 hover:bg-blue-700 border border-white/30">
            <Play className="h-7 w-7 sm:h-9 sm:w-9 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Quick Visual Click Animation Feedback */}
      {clickRipple && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md animate-ping">
            {clickRipple === "play" ? (
              <Play className="h-7 w-7 fill-current ml-0.5" />
            ) : (
              <Pause className="h-7 w-7 fill-current" />
            )}
          </div>
        </div>
      )}

      {/* 4. REAL-TIME CLOSED CAPTIONS OVERLAY */}
      {showCaptions && currentSubtitle && isPlaying && !isEnded && (
        <div className="absolute bottom-20 inset-x-4 z-25 flex justify-center pointer-events-none transition-all">
          <div className="max-w-2xl px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm md:text-base font-semibold text-center shadow-2xl leading-relaxed animate-in fade-in zoom-in-95 duration-200">
            {currentSubtitle}
          </div>
        </div>
      )}

      {/* 5. LMS LESSON COMPLETION OVERLAY (When Video Ends) */}
      {isEnded && (
        <div className="absolute inset-0 z-35 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 text-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg animate-bounce">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <Badge className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 mb-2">
            LESSON COMPLETED
          </Badge>

          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{title}</h3>
          <p className="text-xs sm:text-sm text-white/80 max-w-md mb-6">
            Great job! You have finished watching this video module. Your learning progress has been saved to your dashboard.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleReplay}
              className="h-10 px-4 text-xs font-semibold gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> Replay Lesson
            </Button>

            {hasNextLesson && onNextLesson && (
              <Button
                onClick={onNextLesson}
                className="h-10 px-5 text-xs font-bold gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <span>Next Lesson</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 6. BOTTOM CONTROL BAR (Pixel-Perfect Single Horizontal Flex Layout) */}
      <div
        className={cn(
          "absolute bottom-3 inset-x-3 md:inset-x-4 z-30 transition-all duration-300 pointer-events-auto",
          isControlsVisible || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
      >
        <div className="relative w-full h-12 bg-black/90 backdrop-blur-md border border-white/15 rounded-xl px-3 flex items-center gap-3 shadow-2xl">
          {/* LEFT SECTION: [ Play/Pause ] [ 00:25 / 08:03 ] */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all focus:outline-hidden active:scale-90 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            <span className="font-mono text-xs font-bold text-white min-w-[85px] tracking-tight shrink-0 select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* CENTER SECTION (flex: 1): [==================== Progress / Seek Bar ====================] */}
          <div
            ref={progressBarRef}
            onMouseDown={handleProgressBarMouseDown}
            onMouseMove={handleProgressBarMouseMove}
            onMouseLeave={handleProgressBarMouseLeave}
            className="relative flex-1 h-8 flex items-center cursor-pointer group/seek"
          >
            {/* Background Track */}
            <div className="relative w-full h-1.5 bg-white/20 rounded-full overflow-hidden transition-all group-hover/seek:h-2.5">
              {/* Buffered Track */}
              <div
                style={{ width: `${bufferedPercent}%` }}
                className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full transition-all duration-300"
              />
              {/* Played Progress Track */}
              <div
                style={{ width: `${playedPercent}%` }}
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
              />
            </div>

            {/* Scrubber Thumb Handle */}
            <div
              style={{ left: `${playedPercent}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/seek:scale-100 transition-transform pointer-events-none"
            />

            {/* Hover Tooltip */}
            {hoverSeekTime !== null && (
              <div
                style={{ left: `${hoverSeekPosition}%` }}
                className="absolute bottom-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/10 text-white font-mono text-[10px] font-semibold shadow-lg pointer-events-none whitespace-nowrap"
              >
                {formatTime(hoverSeekTime)}
              </div>
            )}
          </div>

          {/* RIGHT SECTION: [ Volume ] [ CC ] [ Settings ] [ Fullscreen ] */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Volume Control */}
            <div
              onMouseEnter={() => setIsVolumeHovered(true)}
              onMouseLeave={() => setIsVolumeHovered(false)}
              className="relative flex items-center"
            >
              <button
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all focus:outline-hidden active:scale-90 cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>

              {/* Smooth Slide-out Volume Slider */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200 flex items-center",
                  isVolumeHovered ? "w-16 sm:w-20 opacity-100 mr-1" : "w-0 opacity-0"
                )}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeSliderChange}
                  className="w-full h-1 bg-white/30 accent-blue-500 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Closed Captions Toggle */}
            <button
              onClick={toggleCaptions}
              aria-label="Closed Captions"
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-hidden active:scale-90 relative cursor-pointer",
                showCaptions
                  ? "text-blue-400 bg-blue-600/20 font-bold"
                  : "text-white/80 hover:text-white hover:bg-white/15"
              )}
            >
              <Subtitles className="h-4 w-4" />
              {showCaptions && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </button>

            {/* Settings Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettings((prev) => !prev);
                  setSettingsView("main");
                }}
                aria-label="Settings"
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-hidden active:scale-90 cursor-pointer",
                  showSettings
                    ? "text-blue-400 bg-blue-600/20"
                    : "text-white/80 hover:text-white hover:bg-white/15"
                )}
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Custom LMS Settings Panel */}
              {showSettings && (
                <div className="absolute bottom-11 right-0 w-56 p-2 rounded-xl bg-black/95 backdrop-blur-xl border border-white/15 text-white shadow-2xl z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
                  {settingsView === "main" && (
                    <div className="space-y-1">
                      <div className="px-2.5 py-1.5 text-[10px] font-bold text-white/50 uppercase tracking-wider border-b border-white/10 mb-1">
                        Player Settings
                      </div>

                      {/* Speed Item */}
                      <button
                        onClick={() => setSettingsView("speed")}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/10 text-white/90 transition-all cursor-pointer"
                      >
                        <span>Playback Speed</span>
                        <div className="flex items-center gap-1 text-white/60">
                          <span>{playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>

                      {/* Quality Item */}
                      <button
                        onClick={() => setSettingsView("quality")}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/10 text-white/90 transition-all cursor-pointer"
                      >
                        <span>Quality</span>
                        <div className="flex items-center gap-1 text-white/60">
                          <span className="truncate max-w-[80px]">{quality}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>

                      {/* Captions Item */}
                      <button
                        onClick={() => setSettingsView("captions")}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/10 text-white/90 transition-all cursor-pointer"
                      >
                        <span>Captions</span>
                        <div className="flex items-center gap-1 text-white/60">
                          <span>{showCaptions ? "English" : "Off"}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Playback Speed Submenu */}
                  {settingsView === "speed" && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setSettingsView("main")}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-white/70 hover:text-white border-b border-white/10 mb-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Playback Speed</span>
                      </button>

                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedSelect(s)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                            playbackSpeed === s
                              ? "bg-blue-600/30 text-blue-400 font-bold"
                              : "hover:bg-white/10 text-white/80"
                          )}
                        >
                          <span>{s === 1 ? "1.0x (Normal)" : `${s}x`}</span>
                          {playbackSpeed === s && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quality Submenu */}
                  {settingsView === "quality" && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setSettingsView("main")}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-white/70 hover:text-white border-b border-white/10 mb-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Video Quality</span>
                      </button>

                      {["1080p Full HD", "720p HD", "480p SD", "Auto (Recommended)"].map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQualitySelect(q)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                            quality === q
                              ? "bg-blue-600/30 text-blue-400 font-bold"
                              : "hover:bg-white/10 text-white/80"
                          )}
                        >
                          <span>{q}</span>
                          {quality === q && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Captions Submenu */}
                  {settingsView === "captions" && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setSettingsView("main")}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-white/70 hover:text-white border-b border-white/10 mb-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Captions</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowCaptions(false);
                          setShowSettings(false);
                          if (isYouTube) {
                            sendYTCommand("unloadModule", ["captions"]);
                            sendYTCommand("setOption", ["captions", "track", {}]);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                          !showCaptions
                            ? "bg-blue-600/30 text-blue-400 font-bold"
                            : "hover:bg-white/10 text-white/80"
                        )}
                      >
                        <span>Off</span>
                        {!showCaptions && <Check className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setShowCaptions(true);
                          setShowSettings(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                          showCaptions
                            ? "bg-blue-600/30 text-blue-400 font-bold"
                            : "hover:bg-white/10 text-white/80"
                        )}
                      >
                        <span>English (Captions)</span>
                        {showCaptions && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-all focus:outline-hidden active:scale-90 cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomVideoPlayer;
