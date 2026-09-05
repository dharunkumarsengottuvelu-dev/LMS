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
  link_url?: string | null;
  sender_name?: string | null;
  sender_role?: string | null;
  created_at: string;
}

export const NOTIFICATIONS_UPDATED_EVENT = "lms_notifications_updated";

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
 * Comprehensive React hook for student notifications with polling and optimistic updates.
 * Read state is 100% database-backed — no localStorage overrides.
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

        // Normalize: always use link_url over link if both exist
        const normalized = rawList.map((n) => ({
          ...n,
          link: n.link_url || n.link || null,
        }));

        startTransition(() => {
          setNotifications(normalized);
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

    // 3. Listen for internal broadcast events (e.g., after sending a message)
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

  // Calculate dynamic unread count from database state only
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark single notification as read — optimistic update then persist to DB
  const markAsRead = useCallback(async (id: string) => {
    if (!id) return;

    // Optimistically update UI immediately
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

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
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

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

  // Delete a notification
  const deleteNotification = useCallback(async (id: string) => {
    if (!id) return;
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`/api/student/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Failed to delete notification:", err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
