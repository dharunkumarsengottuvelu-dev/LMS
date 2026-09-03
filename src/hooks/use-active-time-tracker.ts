"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface ActiveTimeTrackerState {
  totalActiveSeconds: number;
  todayActiveSeconds: number;
  sessionActiveSeconds: number;
  isTracking: boolean;
  isIdle: boolean;
  isHidden: boolean;
  formattedTime: string;
}

const IDLE_TIMEOUT_MS = 60 * 1000; // 60 seconds of inactivity
const HEARTBEAT_INTERVAL_MS = 15 * 1000; // Send heartbeat every 15 seconds
const TAB_CHANNEL_NAME = "edunexus_lms_active_tab";

export function formatSecondsToLMS(totalSecs: number): string {
  const safeSecs = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(safeSecs / 3600);
  const m = Math.floor((safeSecs % 3600) / 60);
  const s = safeSecs % 60;
  return `${h} h ${m} min ${s} s`;
}

export function useActiveTimeTracker() {
  const [totalActiveSeconds, setTotalActiveSeconds] = useState<number>(0);
  const [todayActiveSeconds, setTodayActiveSeconds] = useState<number>(0);
  const [sessionActiveSeconds, setSessionActiveSeconds] = useState<number>(0);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(true);

  const sessionIdRef = useRef<string>("");
  const lastActivityTimeRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localTickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tabChannelRef = useRef<BroadcastChannel | null>(null);
  const isPrimaryTabRef = useRef<boolean>(true);
  const pendingIncrementRef = useRef<number>(0);

  // Initialize unique session ID per browser tab session
  useEffect(() => {
    if (typeof window === "undefined") return;

    let existingSession = sessionStorage.getItem("edunexus_lms_session_id");
    if (!existingSession) {
      existingSession = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem("edunexus_lms_session_id", existingSession);
    }
    sessionIdRef.current = existingSession;

    // Setup multi-tab coordination to prevent double counting
    try {
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel(TAB_CHANNEL_NAME);
        tabChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (event.data?.type === "TAB_FOCUSED") {
            // Another tab became primary; this tab steps down if not focused
            if (!document.hasFocus()) {
              isPrimaryTabRef.current = false;
            }
          }
        };

        // Announce our presence if we currently have focus
        if (document.hasFocus()) {
          channel.postMessage({ type: "TAB_FOCUSED", tabId: sessionIdRef.current });
          isPrimaryTabRef.current = true;
        }
      }
    } catch {
      // BroadcastChannel fallback: allow current tab to track
      isPrimaryTabRef.current = true;
    }

    // Fetch initial active time from server
    fetch("/api/student/active-time")
      .then((res) => res.json())
      .then((data) => {
        if (data?.activeTime) {
          setTotalActiveSeconds(data.activeTime.totalActiveSeconds || 0);
          setTodayActiveSeconds(data.activeTime.todayActiveSeconds || 0);
        }
      })
      .catch(() => {});

    return () => {
      if (tabChannelRef.current) {
        tabChannelRef.current.close();
      }
    };
  }, []);

  // Send heartbeat function
  const sendHeartbeat = useCallback(
    (isClosing = false) => {
      if (!sessionIdRef.current || typeof window === "undefined") return;

      const increment = pendingIncrementRef.current;
      pendingIncrementRef.current = 0;

      const payload = {
        sessionId: sessionIdRef.current,
        incrementSeconds: increment,
        isIdle: isIdle || !isPrimaryTabRef.current,
        isHidden: document.hidden || !document.hasFocus(),
        isClosing,
        deviceInfo: navigator.userAgent?.slice(0, 100) || "Desktop",
      };

      if (isClosing && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
          navigator.sendBeacon("/api/student/active-time/heartbeat", blob);
        } catch {
          // ignore beacon failures
        }
        return;
      }

      fetch("/api/student/active-time/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && typeof data.totalActiveSeconds === "number") {
            setTotalActiveSeconds(data.totalActiveSeconds);
            setTodayActiveSeconds(data.todayActiveSeconds || 0);
            setSessionActiveSeconds(data.sessionActiveSeconds || 0);
          }
        })
        .catch(() => {});
    },
    [isIdle]
  );

  // User activity listeners: reset idle timer
  const handleUserActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now();

    if (isIdle) {
      setIsIdle(false);
    }

    // Claim primary tab leadership if focused
    if (document.hasFocus() && !isPrimaryTabRef.current) {
      isPrimaryTabRef.current = true;
      if (tabChannelRef.current) {
        tabChannelRef.current.postMessage({ type: "TAB_FOCUSED", tabId: sessionIdRef.current });
      }
    }

    // Reset idle timeout
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT_MS);
  }, [isIdle]);

  // Tab visibility and focus listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsHidden(hidden);
      if (hidden) {
        // Tab hidden -> pause tracking
        sendHeartbeat();
      } else {
        // Tab visible -> claim leadership if focused
        if (document.hasFocus()) {
          isPrimaryTabRef.current = true;
          if (tabChannelRef.current) {
            tabChannelRef.current.postMessage({ type: "TAB_FOCUSED", tabId: sessionIdRef.current });
          }
        }
        handleUserActivity();
      }
    };

    const handleFocus = () => {
      isPrimaryTabRef.current = true;
      setIsHidden(false);
      if (tabChannelRef.current) {
        tabChannelRef.current.postMessage({ type: "TAB_FOCUSED", tabId: sessionIdRef.current });
      }
      handleUserActivity();
    };

    const handleBlur = () => {
      // Send any pending seconds before tab loses focus
      sendHeartbeat();
    };

    const handleBeforeUnload = () => {
      sendHeartbeat(true);
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click", "wheel"];
    activityEvents.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    // Initial idle timer setup
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT_MS);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleUserActivity, sendHeartbeat]);

  // Local 1-second ticker for ultra-smooth UI display
  useEffect(() => {
    const active = !isIdle && !isHidden && isPrimaryTabRef.current;
    setIsTracking(active);

    if (active) {
      localTickTimerRef.current = setInterval(() => {
        setTotalActiveSeconds((prev) => prev + 1);
        setTodayActiveSeconds((prev) => prev + 1);
        setSessionActiveSeconds((prev) => prev + 1);
        pendingIncrementRef.current += 1;
      }, 1000);
    } else {
      if (localTickTimerRef.current) {
        clearInterval(localTickTimerRef.current);
        localTickTimerRef.current = null;
      }
    }

    return () => {
      if (localTickTimerRef.current) {
        clearInterval(localTickTimerRef.current);
        localTickTimerRef.current = null;
      }
    };
  }, [isIdle, isHidden]);

  // Periodic heartbeat sync (every 15s)
  useEffect(() => {
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [sendHeartbeat]);

  return {
    totalActiveSeconds,
    todayActiveSeconds,
    sessionActiveSeconds,
    isTracking,
    isIdle,
    isHidden,
    formattedTime: formatSecondsToLMS(totalActiveSeconds),
  };
}
