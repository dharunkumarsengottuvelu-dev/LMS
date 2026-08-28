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
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CustomVideoPlayerProps {
  src?: string;
  title?: string;
  instructor?: string;
  poster?: string;
  autoPlay?: boolean;
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
    trimmed.includes("firebasestorage.googleapis.com")
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
  { start: 0, end: 5, text: "Welcome to this lesson on Core Programming & Development." },
  { start: 5, end: 11, text: "In this module, we will explore why you should learn this stack and review key concepts." },
  { start: 11, end: 17, text: "This technology is one of the most widely used and reliable in enterprise software." },
  { start: 17, end: 24, text: "Target Audience: Students, engineers, and anyone building production systems." },
  { start: 24, end: 32, text: "We will cover fundamental syntax, memory management, and structured problem solving." },
  { start: 32, end: 40, text: "You will also build real-world applications and solve practical coding problems." },
  { start: 40, end: 48, text: "Let's begin by understanding runtime architecture and setting up the environment." },
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
  onEnded,
  onNextLesson,
  hasNextLesson = true,
  className = "",
}: CustomVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const rawId = useId();
  const iframeId = `lms_yt_frame_${rawId.replace(/[:]/g, "_")}`;

  const trimmedSrc = src?.trim() || "";
  const ytVideoId = extractYouTubeId(trimmedSrc);
  const vimeoId = extractVimeoId(trimmedSrc);
  const isDirect = isDirectVideoUrl(trimmedSrc);
  const isYouTube = !isDirect && !!ytVideoId;
  const isVimeo = !isDirect && !isYouTube && !!vimeoId;

  // High-def YouTube poster fallback
  const youtubePoster = ytVideoId
    ? `https://img.youtube.com/vi/${ytVideoId}/maxresdefault.jpg`
    : undefined;
  const activePoster = poster || youtubePoster;

  // Player States
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "speed" | "quality" | "captions">("main");
  const [selectedQuality, setSelectedQuality] = useState("1080p Full HD");
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [seekHoverTime, setSeekHoverTime] = useState<number | null>(null);
  const [seekHoverPosition, setSeekHoverPosition] = useState<number>(0);
  const [centerAnimation, setCenterAnimation] = useState<"play" | "pause" | null>(null);

  // -------------------------------------------------------------
  // YouTube Command Sender
  // -------------------------------------------------------------
  const sendYTCommand = useCallback((func: string, args: any = "") => {
    if (!isYouTube) return;
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current[func] === "function") {
        if (Array.isArray(args)) {
          ytPlayerRef.current[func](...args);
        } else if (args !== "") {
          ytPlayerRef.current[func](args);
        } else {
          ytPlayerRef.current[func]();
        }
      }

      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: func,
            args: args === "" ? "" : Array.isArray(args) ? args : [args],
          }),
          "*"
        );
      }
    } catch (e) {}
  }, [isYouTube]);

  // -------------------------------------------------------------
  // YouTube IFrame API Initialization
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isYouTube || !ytVideoId) return;

    let isSubscribed = true;

    function initYTPlayer() {
      if (typeof window === "undefined" || !(window as any).YT || !(window as any).YT.Player) return;
      if (!iframeRef.current) return;

      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === "function") {
          ytPlayerRef.current.destroy();
        }

        ytPlayerRef.current = new (window as any).YT.Player(iframeId, {
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return;
              try {
                const dur = event.target.getDuration();
                if (dur && dur > 0) setDuration(dur);
                event.target.setVolume(volume * 100);
                if (isMuted) event.target.mute();
              } catch (e) {}
              if (hasStarted || autoPlay) {
                try {
                  event.target.playVideo();
                  setIsPlaying(true);
                } catch (e) {}
              }
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
              if (event.data === 1) {
                setIsPlaying(true);
                setHasStarted(true);
                setIsEnded(false);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                setIsEnded(true);
                setShowControls(true);
                if (onEnded) onEnded();
              }
            },
            onError: () => {},
          },
        });
      } catch (err) {}
    }

    if (typeof window !== "undefined") {
      if (!(window as any).YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        (window as any).onYouTubeIframeAPIReady = () => {
          if (isSubscribed) initYTPlayer();
        };
      } else {
        initYTPlayer();
      }
    }

    return () => {
      isSubscribed = false;
    };
  }, [isYouTube, ytVideoId, iframeId, autoPlay]);

  // -------------------------------------------------------------
  // YouTube postMessage Listener & Time Poller
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isYouTube) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data) return;

        if (data.event === "infoDelivery" && data.info) {
          const info = data.info;
          if (typeof info.currentTime === "number" && info.currentTime >= 0) {
            setCurrentTime(info.currentTime);
          }
          if (typeof info.duration === "number" && info.duration > 0) {
            setDuration(info.duration);
          }
          if (typeof info.videoLoadedFraction === "number") {
            setBuffered(info.videoLoadedFraction * 100);
          }
          if (info.playerState === 1) {
            setIsPlaying(true);
            setHasStarted(true);
            setIsEnded(false);
          } else if (info.playerState === 2) {
            setIsPlaying(false);
          } else if (info.playerState === 0) {
            setIsPlaying(false);
            setIsEnded(true);
            setShowControls(true);
            if (onEnded) onEnded();
          }
        }
      } catch (err) {}
    };

    window.addEventListener("message", handleMessage);

    const pollInterval = setInterval(() => {
      if (hasStarted && !isEnded) {
        try {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
            const curr = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            const buf = ytPlayerRef.current.getVideoLoadedFraction();
            if (typeof curr === "number" && curr >= 0) setCurrentTime(curr);
            if (typeof dur === "number" && dur > 0) setDuration(dur);
            if (typeof buf === "number") setBuffered(buf * 100);
          } else {
            sendYTCommand("getCurrentTime");
            sendYTCommand("getDuration");
            sendYTCommand("getVideoLoadedFraction");
          }
        } catch (e) {}
      }
    }, 250);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(pollInterval);
    };
  }, [isYouTube, hasStarted, isEnded, sendYTCommand, onEnded]);

  // -------------------------------------------------------------
  // HTML5 Video Event Handlers
  // -------------------------------------------------------------
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length > 0 && videoRef.current.duration > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered((bufferedEnd / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setIsEnded(true);
    setShowControls(true);
    if (onEnded) onEnded();
  };

  // -------------------------------------------------------------
  // Controls Auto-Hide Behavior (Smooth & Consistent Position)
  // -------------------------------------------------------------
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !isEnded) {
      hideControlsTimerRef.current = setTimeout(() => {
        if (!showSettings && !isHoveringVolume) {
          setShowControls(false);
        }
      }, 3500);
    }
  }, [isPlaying, isEnded, showSettings, isHoveringVolume]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying, isEnded, resetControlsTimeout]);

  // -------------------------------------------------------------
  // Playback Control Actions
  // -------------------------------------------------------------
  const triggerCenterAnimation = (type: "play" | "pause") => {
    setCenterAnimation(type);
    setTimeout(() => setCenterAnimation(null), 500);
  };

  const handleStartPlay = () => {
    setHasStarted(true);
    setIsEnded(false);
    setIsPlaying(true);
    triggerCenterAnimation("play");

    if (isYouTube) {
      sendYTCommand("playVideo");
    } else if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

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
        triggerCenterAnimation("pause");
      } else {
        sendYTCommand("playVideo");
        setIsPlaying(true);
        triggerCenterAnimation("play");
      }
      return;
    }

    if (videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        triggerCenterAnimation("play");
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        triggerCenterAnimation("pause");
      }
    }
  };

  const handleReplay = () => {
    setIsEnded(false);
    setIsPlaying(true);
    triggerCenterAnimation("play");

    if (isYouTube) {
      sendYTCommand("seekTo", [0, true]);
      sendYTCommand("playVideo");
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (percentage: number) => {
    const totalDuration = duration > 0 ? duration : (videoRef.current?.duration || 0);
    if (totalDuration <= 0) return;

    const targetTime = (percentage / 100) * totalDuration;
    setCurrentTime(targetTime);
    if (isEnded) setIsEnded(false);

    if (isYouTube) {
      sendYTCommand("seekTo", [targetTime, true]);
      if (!isPlaying) {
        sendYTCommand("playVideo");
        setIsPlaying(true);
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    const muted = clamped === 0;
    setIsMuted(muted);

    if (isYouTube) {
      sendYTCommand("setVolume", [clamped * 100]);
      if (muted) sendYTCommand("mute");
      else sendYTCommand("unMute");
    } else if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = muted;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (isYouTube) {
      if (nextMuted) sendYTCommand("mute");
      else {
        sendYTCommand("unMute");
        sendYTCommand("setVolume", [(volume || 0.8) * 100]);
      }
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSettings(false);

    if (isYouTube) {
      sendYTCommand("setPlaybackRate", speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!elem || typeof document === "undefined") return;

    const isCurrentlyFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFs) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleFsChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      if (!containerRef.current?.contains(target) && document.activeElement !== containerRef.current) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          resetControlsTimeout();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          handleSeek(Math.max(0, ((currentTime - 5) / (duration || 1)) * 100));
          resetControlsTimeout();
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          handleSeek(Math.min(100, ((currentTime + 5) / (duration || 1)) * 100));
          resetControlsTimeout();
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          resetControlsTimeout();
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          resetControlsTimeout();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          resetControlsTimeout();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          resetControlsTimeout();
          break;
        case "c":
          e.preventDefault();
          setCaptionsEnabled((prev) => !prev);
          resetControlsTimeout();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [volume, isMuted, isPlaying, duration, currentTime, resetControlsTimeout, isEnded]);

  // Timeline Hover
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSeekHoverPosition(pos * 100);
    setSeekHoverTime(pos * (duration || 0));
  };

  const handleTimelineMouseLeave = () => {
    setSeekHoverTime(null);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const directVideoSource = isDirect
    ? trimmedSrc
    : !isYouTube && !isVimeo && trimmedSrc
    ? trimmedSrc
    : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative w-full aspect-video bg-[#07090E] rounded-2xl overflow-hidden shadow-2xl select-none group border border-slate-800/80 outline-none transition-all ${
        !showControls && isPlaying && !isEnded ? "cursor-none" : "cursor-default"
      } ${className}`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. MEDIA LAYER (Chromeless Background Stream / HTML5 Video) */}
      {/* ------------------------------------------------------------- */}
      {isYouTube ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none">
          <iframe
            ref={iframeRef}
            id={iframeId}
            src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?enablejsapi=1&autoplay=${hasStarted ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0&playsinline=1&disablekb=1&autohide=1`}
            title={title}
            className="w-full h-full border-0 pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onLoad={() => {
              try {
                if (iframeRef.current?.contentWindow) {
                  iframeRef.current.contentWindow.postMessage('{"event":"listening","id":1}', '*');
                  if (hasStarted) {
                    iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                  }
                }
              } catch (e) {}
            }}
          />
        </div>
      ) : isVimeo ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0&portrait=0`}
            title={title}
            className="w-full h-full border-0 pointer-events-none"
            allow="autoplay; fullscreen; picture-in-picture"
          />
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={directVideoSource}
            poster={activePoster}
            playsInline
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain bg-black"
          />
        </div>
      )}

      {/* Transparent Click Surface: Intercepts all clicks & double-clicks */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* ------------------------------------------------------------- */}
      {/* 2. INITIAL STATE (BEFORE VIDEO STARTS) */}
      {/* ------------------------------------------------------------- */}
      {!hasStarted && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 bg-gradient-to-t from-black/95 via-black/60 to-black/85 backdrop-blur-[2px] transition-all duration-300">
          {/* Top Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
                  Enterprise LMS Video
                </span>
                <h3 className="text-sm font-bold text-white truncate max-w-md drop-shadow-md">
                  {title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-white/10 hover:bg-white/15 text-white border-white/15 backdrop-blur-md text-[10px] font-semibold px-3 py-1">
                1080p Full HD
              </Badge>
              <Badge className="bg-blue-600 text-white border-none text-[10px] font-bold uppercase tracking-wider px-3 py-1 shadow-md shadow-blue-600/30">
                LMS Player
              </Badge>
            </div>
          </div>

          {/* Center Glowing Play Button */}
          <div className="flex flex-col items-center justify-center space-y-4 my-auto">
            <button
              type="button"
              onClick={handleStartPlay}
              className="group/btn relative w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white flex items-center justify-center shadow-2xl shadow-blue-600/60 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer border-2 border-white/20"
              title="Start Lesson"
            >
              <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-25 pointer-events-none" />
              <Play className="h-9 w-9 fill-current translate-x-0.5 drop-shadow-md" />
            </button>
            <div className="text-center space-y-1">
              <button
                type="button"
                onClick={handleStartPlay}
                className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold tracking-wider uppercase border border-white/15 shadow-xl backdrop-blur-md transition-all cursor-pointer hover:border-blue-400/50"
              >
                Click to Start Lesson
              </button>
              <p className="text-[11px] text-white/60 font-medium">
                Instructor: {instructor}
              </p>
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div className="flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-3">
            <span className="text-[11px]">
              High-definition audio & video stream
            </span>
            <span className="text-[11px] font-mono">
              Space (Play) • F (Fullscreen) • M (Mute)
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. CENTER PLAY BUTTON (WHEN PAUSED) */}
      {/* ------------------------------------------------------------- */}
      {hasStarted && !isPlaying && !isEnded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[1px] transition-all pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl shadow-blue-600/50 border border-white/20 animate-in zoom-in-90 duration-200">
            <Play className="h-7 w-7 fill-current translate-x-0.5" />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. CENTER FEEDBACK PULSE ANIMATION */}
      {/* ------------------------------------------------------------- */}
      {hasStarted && centerAnimation && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/75 backdrop-blur-md text-white flex items-center justify-center shadow-2xl animate-in zoom-in-75 fade-in duration-200 border border-white/15">
            {centerAnimation === "play" ? (
              <Play className="h-7 w-7 fill-current translate-x-0.5" />
            ) : (
              <Pause className="h-7 w-7 fill-current" />
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. COMPLETED / END-SCREEN STATE */}
      {/* ------------------------------------------------------------- */}
      {isEnded && (
        <div className="absolute inset-0 z-25 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-black/95 via-black/85 to-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>

          <div className="text-center space-y-1.5 max-w-md mb-6">
            <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5">
              Lesson Complete
            </Badge>
            <h3 className="text-base font-bold text-white tracking-wide">
              {title}
            </h3>
            <p className="text-xs text-white/60">
              Great job! You have completed this lesson. Proceed to the next module or replay.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleReplay}
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Replay Lesson</span>
            </Button>

            {onNextLesson && hasNextLesson && (
              <Button
                onClick={onNextLesson}
                size="sm"
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/40 transition-all cursor-pointer hover:scale-105"
              >
                <span>Next Lesson</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. ON-SCREEN REAL-TIME CLOSED CAPTION (CC) DISPLAY */}
      {/* ------------------------------------------------------------- */}
      {hasStarted && !isEnded && captionsEnabled && (() => {
        const currentCaption = getCaptionForTime(currentTime);
        if (!currentCaption) return null;
        return (
          <div className="absolute bottom-16 sm:bottom-18 inset-x-0 z-25 flex justify-center px-6 pointer-events-none transition-all duration-200">
            <div className="bg-black/90 text-white font-medium text-xs sm:text-sm px-4 py-1.5 rounded-xl border border-white/20 shadow-2xl backdrop-blur-md text-center max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-150 leading-relaxed tracking-wide drop-shadow-md">
              {currentCaption}
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 7. SINGLE HORIZONTAL BOTTOM CONTROL BAR (PIXEL-PERFECT ALIGNED) */}
      {/* ┌──────────────────────────────────────────────────────────┐ */}
      {/* │ ▶  00:25 / 08:03   ────────────────●────────  🔊  CC ⚙ ⛶ │ */}
      {/* └──────────────────────────────────────────────────────────┘ */}
      {/* ------------------------------------------------------------- */}
      {hasStarted && !isEnded && (
        <div
          className={`absolute bottom-3 inset-x-3 z-30 transition-all duration-300 ${
            showControls || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 w-full h-12 px-3 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 shadow-2xl text-white select-none">
            
            {/* LEFT SECTION: [ Play/Pause ] [ 00:25 / 08:03 ] */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-lg hover:bg-white/15 active:bg-white/25 flex items-center justify-center transition-all cursor-pointer text-white hover:scale-105"
                title={isPlaying ? "Pause (Space / k)" : "Play (Space / k)"}
              >
                {isPlaying ? (
                  <Pause className="h-4.5 w-4.5 fill-current" />
                ) : (
                  <Play className="h-4.5 w-4.5 fill-current translate-x-0.5" />
                )}
              </button>

              <div className="font-mono text-xs font-medium text-white/90 tracking-tight whitespace-nowrap min-w-[85px]">
                <span>{formatTime(currentTime)}</span>
                <span className="text-white/40 mx-1">/</span>
                <span className="text-white/60">{formatTime(duration)}</span>
              </div>
            </div>

            {/* CENTER SECTION: [================ Progress / Seek Bar ================] */}
            <div
              className="relative flex-1 h-full flex items-center group/seek cursor-pointer mx-1"
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={handleTimelineMouseLeave}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleSeek(pos * 100);
              }}
            >
              {/* Hover Timestamp Tooltip */}
              {seekHoverTime !== null && (
                <div
                  className="absolute -top-7 px-2 py-0.5 bg-black/95 text-white text-[10px] font-mono font-bold rounded-md border border-white/20 shadow-lg transform -translate-x-1/2 pointer-events-none backdrop-blur-md"
                  style={{ left: `${seekHoverPosition}%` }}
                >
                  {formatTime(seekHoverTime)}
                </div>
              )}

              {/* Progress Rail */}
              <div className="w-full h-1.5 group-hover/seek:h-2 bg-white/20 rounded-full overflow-hidden transition-all relative">
                {/* Buffered Bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-200"
                  style={{ width: `${buffered}%` }}
                />
                {/* Played Progress Bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-75 shadow-sm shadow-blue-500/50"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Thumb */}
              <div
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md shadow-black/50 border-2 border-blue-500 transform -translate-x-1/2 scale-0 group-hover/seek:scale-100 transition-transform duration-150 pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            {/* RIGHT SECTION: [ Volume ] [ CC ] [ Settings ] [ Fullscreen ] */}
            <div className="flex items-center gap-1 shrink-0 relative">
              
              {/* Volume Button with Hover Slider */}
              <div
                className="flex items-center group/vol relative"
                onMouseEnter={() => setIsHoveringVolume(true)}
                onMouseLeave={() => setIsHoveringVolume(false)}
              >
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer text-white/80 hover:text-white"
                  title={isMuted ? "Unmute (m)" : "Mute (m)"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <div className={`transition-all duration-300 flex items-center ${
                  isHoveringVolume ? "w-18 px-1 opacity-100" : "w-0 px-0 opacity-0 overflow-hidden"
                }`}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : Math.round(volume * 100)}
                    onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
                    className="w-16 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:bg-white/40 transition-all"
                  />
                </div>
              </div>

              {/* Closed Captions (CC) */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !captionsEnabled;
                  setCaptionsEnabled(nextState);
                  if (isYouTube) {
                    if (nextState) {
                      sendYTCommand("loadModule", "captions");
                      sendYTCommand("setOption", ["captions", "track", { languageCode: "en" }]);
                    } else {
                      sendYTCommand("unloadModule", "captions");
                    }
                  }
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  captionsEnabled
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-white/80 hover:text-white hover:bg-white/15"
                }`}
                title="Closed Captions (c)"
              >
                <Subtitles className="h-4 w-4" />
              </button>

              {/* Settings Menu Button & Popup */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings((prev) => !prev);
                    setSettingsView("main");
                  }}
                  className={`w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer ${
                    showSettings ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
                  }`}
                  title="Player Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {showSettings && (
                  <div
                    className="absolute bottom-11 right-0 z-50 w-52 bg-[#12141A] border border-[#27272A] rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* View 1: Main Settings Menu */}
                    {settingsView === "main" && (
                      <div className="space-y-1">
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-[#27272A] mb-1">
                          Player Settings
                        </div>

                        {/* Speed Submenu */}
                        <button
                          type="button"
                          onClick={() => setSettingsView("speed")}
                          className="w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <span className="font-medium">Playback Speed</span>
                          <div className="flex items-center gap-1 text-white font-bold">
                            <span>{playbackRate === 1 ? "Normal" : `${playbackRate}x`}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-white/50" />
                          </div>
                        </button>

                        {/* Quality Submenu */}
                        <button
                          type="button"
                          onClick={() => setSettingsView("quality")}
                          className="w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <span className="font-medium">Quality</span>
                          <div className="flex items-center gap-1 text-blue-400 font-bold">
                            <span>{selectedQuality}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-white/50" />
                          </div>
                        </button>

                        {/* Captions Submenu */}
                        <button
                          type="button"
                          onClick={() => setSettingsView("captions")}
                          className="w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <span className="font-medium">Captions (CC)</span>
                          <div className="flex items-center gap-1 text-white font-bold">
                            <span>{captionsEnabled ? "English" : "Off"}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-white/50" />
                          </div>
                        </button>
                      </div>
                    )}

                    {/* View 2: Playback Speed */}
                    {settingsView === "speed" && (
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setSettingsView("main")}
                          className="w-full px-2 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 border-b border-[#27272A] hover:bg-white/5 rounded-lg mb-1 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4 text-blue-400" />
                          <span>Playback Speed</span>
                        </button>
                        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              handleSpeedChange(s);
                              setSettingsView("main");
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              playbackRate === s
                                ? "bg-blue-600 text-white font-bold shadow-xs"
                                : "text-white/80 hover:bg-white/10"
                            }`}
                          >
                            <span>{s === 1 ? "1.0x (Normal)" : `${s}x`}</span>
                            {playbackRate === s && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* View 3: Quality */}
                    {settingsView === "quality" && (
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setSettingsView("main")}
                          className="w-full px-2 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 border-b border-[#27272A] hover:bg-white/5 rounded-lg mb-1 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4 text-blue-400" />
                          <span>Video Quality</span>
                        </button>
                        {["1080p Full HD", "720p HD", "480p SD", "Auto (Recommended)"].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              setSelectedQuality(q);
                              if (isYouTube) {
                                const qVal = q.includes("1080") ? "hd1080" : q.includes("720") ? "hd720" : q.includes("480") ? "large" : "auto";
                                sendYTCommand("setPlaybackQuality", qVal);
                              }
                              setSettingsView("main");
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              selectedQuality === q
                                ? "bg-blue-600 text-white font-bold shadow-xs"
                                : "text-white/80 hover:bg-white/10"
                            }`}
                          >
                            <span>{q}</span>
                            {selectedQuality === q && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* View 4: Captions */}
                    {settingsView === "captions" && (
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setSettingsView("main")}
                          className="w-full px-2 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 border-b border-[#27272A] hover:bg-white/5 rounded-lg mb-1 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4 text-blue-400" />
                          <span>Subtitles & CC</span>
                        </button>
                        {[
                          { label: "Off", enabled: false },
                          { label: "English (Captions)", enabled: true },
                        ].map((c) => (
                          <button
                            key={c.label}
                            type="button"
                            onClick={() => {
                              setCaptionsEnabled(c.enabled);
                              if (isYouTube) {
                                if (c.enabled) {
                                  sendYTCommand("loadModule", "captions");
                                  sendYTCommand("setOption", ["captions", "track", { languageCode: "en" }]);
                                } else {
                                  sendYTCommand("unloadModule", "captions");
                                }
                              }
                              setSettingsView("main");
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              captionsEnabled === c.enabled
                                ? "bg-blue-600 text-white font-bold shadow-xs"
                                : "text-white/80 hover:bg-white/10"
                            }`}
                          >
                            <span>{c.label}</span>
                            {captionsEnabled === c.enabled && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-lg hover:bg-white/15 active:bg-white/25 flex items-center justify-center transition-all cursor-pointer text-white/80 hover:text-white hover:scale-105"
                title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
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
      )}
    </div>
  );
}

export default CustomVideoPlayer;
