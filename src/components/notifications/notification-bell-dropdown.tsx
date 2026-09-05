"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  BookOpen,
  ClipboardCheck,
  Award,
  Clock,
  Megaphone,
  ChevronRight,
  X,
  User,
  MessageSquare,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  useStudentNotifications,
  formatNotificationTime,
  NotificationItem,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

function getNotificationIcon(type: string) {
  switch (type) {
    case "assessment_assigned":
    case "test_scheduled":
      return <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "course_updated":
    case "new_lesson":
      return <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case "certificate_issued":
    case "result_published":
      return <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    case "assignment_deadline":
      return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    case "announcement":
    case "general":
    default:
      return <Megaphone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
  }
}

function getIconBg(type: string) {
  switch (type) {
    case "assessment_assigned":
    case "test_scheduled":
      return "bg-blue-50 dark:bg-blue-950/50 border-blue-200/60 dark:border-blue-800/40";
    case "course_updated":
    case "new_lesson":
      return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/40";
    case "certificate_issued":
    case "result_published":
      return "bg-purple-50 dark:bg-purple-950/50 border-purple-200/60 dark:border-purple-800/40";
    case "assignment_deadline":
      return "bg-amber-50 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/40";
    case "announcement":
    case "general":
    default:
      return "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60 dark:border-indigo-800/40";
  }
}

export function NotificationBellDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { profile, user } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useStudentNotifications();

  // Resolve portal prefix based on role
  const role = (profile?.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "super_admin";
  const isTrainer = role === "trainer";
  const portalPrefix = isAdmin ? "/admin" : isTrainer ? "/trainer" : "/student";
  const notificationsHref = isAdmin ? "/admin/notifications" : isTrainer ? "/trainer/notifications" : "/student/notifications";
  const messagesHref = `${portalPrefix}/messages`;

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    setOpen(false);
    const href = n.link_url || n.link;
    if (href) {
      router.push(href);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200 border border-input shadow-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] max-w-[calc(100vw-24px)] p-0 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
      >
        {/* Dropdown Header */}
        <div className="p-3.5 px-4 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors hover:underline cursor-pointer"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification List Container */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
          {isLoading && notifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 px-6 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mx-auto">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">No notifications yet</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-[220px] mx-auto leading-relaxed">
                You're all caught up. Notifications from your admin and trainers will appear here.
              </p>
              <div className="pt-1">
                <Link
                  href={messagesHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800/60 shadow-xs"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Start Direct Chat</span>
                </Link>
              </div>
            </div>
          ) : (
            notifications.slice(0, 10).map((n) => {
              const isUnread = !n.is_read;
              const href = n.link_url || n.link;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-3.5 px-4 flex items-start gap-3 transition-colors cursor-pointer group select-none relative",
                    isUnread
                      ? "bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                  )}
                >
                  {/* Type Icon */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                      getIconBg(n.type)
                    )}
                  >
                    {getNotificationIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p
                        className={cn(
                          "text-xs leading-snug truncate",
                          isUnread
                            ? "font-bold text-slate-900 dark:text-white"
                            : "font-semibold text-slate-700 dark:text-zinc-300"
                        )}
                      >
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <span>{formatNotificationTime(n.created_at)}</span>
                        {n.sender_name && (
                          <>
                            <span className="text-slate-300 dark:text-zinc-600">·</span>
                            <span className="flex items-center gap-0.5 text-slate-400 dark:text-zinc-500">
                              <User className="h-2.5 w-2.5" />
                              {n.sender_name}
                            </span>
                          </>
                        )}
                      </div>
                      {href && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>View</span>
                          <ChevronRight className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dropdown Footer */}
        <div className="p-2.5 px-4 bg-slate-50/90 dark:bg-zinc-900/90 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-2">
          <Link
            href={notificationsHref}
            onClick={() => setOpen(false)}
            prefetch={true}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
          <Link
            href={messagesHref}
            onClick={() => setOpen(false)}
            prefetch={true}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 shadow-xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Messages & Chat</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
