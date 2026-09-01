"use client";

import { useState, useEffect, useCallback, useTransition } from "react";

export type NotificationType =
  | "assessment_assigned"
  | "test_scheduled"
  | "assignment_deadline"
  | "course_updated"
  | "new_lesson"
  | "result_published"
  | "certificate_issued"
  | "practice_assigned"
  | "general"
  | "announcement";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export const NOTIFICATIONS_UPDATED_EVENT = "lms_notifications_updated";
const LOCAL_READ_KEY = "lms_read_notification_ids";

/**
 * Helper to get local read notification IDs for instant optimism & offline fallback.
 */
function getLocalReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Helper to record local read notification IDs.
 */
function saveLocalReadId(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getLocalReadIds();
    set.add(id);
    localStorage.setItem(LOCAL_READ_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Format timestamp into user-friendly relative time (e.g. "Just now", "5m ago", "2h ago").
 */
export function formatNotificationTime(dateStr: string): string {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "Just now";

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 45) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

/**
 * Comprehensive React hook for student notifications with dynamic polling and instant read sync.
 */
export function useStudentNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/student/notifications", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        const rawList: NotificationItem[] = Array.isArray(data.notifications) ? data.notifications : [];
        const localRead = getLocalReadIds();

        // Merge backend read status with locally cached read overrides
        const merged = rawList.map((n) => ({
          ...n,
          is_read: n.is_read || localRead.has(n.id),
        }));

        startTransition(() => {
          setNotifications(merged);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.warn("Failed to fetch student notifications:", err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // 1. Periodic background polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // 2. Revalidate when tab regains focus or becomes visible
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // 3. Listen for internal broadcast events
    const handleCustomUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleCustomUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleCustomUpdate);
    };
  }, [fetchNotifications]);

  // Calculate dynamic unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!id) return;
    saveLocalReadId(id);

    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

    // Broadcast across windows/tabs
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
    }

    try {
      await fetch("/api/student/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_as_read", id }),
      });
    } catch (err) {
      console.warn("Failed to persist notification read state to server:", err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistically update all
    setNotifications((prev) => {
      prev.forEach((n) => saveLocalReadId(n.id));
      return prev.map((item) => ({ ...item, is_read: true }));
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
    }

    try {
      await fetch("/api/student/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_as_read" }),
      });
    } catch (err) {
      console.warn("Failed to persist mark_all_as_read to server:", err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
