"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  ArrowLeft, 
  BookOpen, 
  ClipboardCheck, 
  Award, 
  Clock, 
  Megaphone, 
  Search, 
  ExternalLink,
  Filter,
  Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useStudentNotifications, 
  formatNotificationTime, 
  NotificationItem 
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

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

export default function StudentNotificationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useStudentNotifications();

  // Dynamic counts for tabs
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.is_read).length,
      assessments: notifications.filter((n) => n.type === "assessment_assigned" || n.type === "test_scheduled").length,
      courses: notifications.filter((n) => n.type === "course_updated" || n.type === "new_lesson").length,
      announcements: notifications.filter((n) => n.type === "announcement" || n.type === "general").length,
    };
  }, [notifications]);

  // Filtered list based on active tab and search query
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (tab === "unread" && n.is_read) return false;
      if (tab === "assessments" && n.type !== "assessment_assigned" && n.type !== "test_scheduled") return false;
      if (tab === "courses" && n.type !== "course_updated" && n.type !== "new_lesson") return false;
      if (tab === "announcements" && n.type !== "announcement" && n.type !== "general") return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesMsg = n.message.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg) return false;
      }

      return true;
    });
  }, [notifications, tab, search]);

  return (
    <div className="space-y-6 pb-16 w-full">
      {/* Top Header - Spacious Enterprise MNC Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Column: Breadcrumb + Title + Subtitle */}
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
                Notifications & Alerts
              </h1>
              {unreadCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 shadow-xs">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
          </div>

          {/* Right Action: Mark All Read */}
          {unreadCount > 0 && (
            <div className="flex items-center gap-3 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-2xs gap-1.5 cursor-pointer"
              >
                <CheckCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Mark all as read</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab} className="w-full md:w-auto">
          <TabsList className="bg-slate-100 dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 p-1 rounded-xl h-auto flex flex-wrap gap-1">
            <TabsTrigger value="all" className="text-xs font-semibold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs font-semibold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
              Unread ({counts.unread})
            </TabsTrigger>
            <TabsTrigger value="assessments" className="text-xs font-semibold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              Assessments ({counts.assessments})
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-xs font-semibold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              Courses ({counts.courses})
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs font-semibold px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              Announcements ({counts.announcements})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-[#18181B] border-slate-200 dark:border-zinc-800"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 text-center space-y-3 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Fetching notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {search ? "No notifications match your search" : "No notifications in this category"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {search
                ? "Try searching for a different keyword or view all notifications."
                : "You're all caught up! New assessments, course updates, and system notices will appear here."}
            </p>
            {tab !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTab("all")}
                className="text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 mt-2"
              >
                View All Notifications
              </Button>
            )}
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isUnread = !n.is_read;
            return (
              <Card
                key={n.id}
                className={cn(
                  "bg-white dark:bg-[#18181B] border transition-all duration-200 rounded-xl overflow-hidden shadow-2xs group hover:border-blue-500/40",
                  isUnread
                    ? "border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/10"
                    : "border-slate-200/80 dark:border-zinc-800"
                )}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Notification Type Icon */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5",
                        getIconBg(n.type)
                      )}
                    >
                      {getNotificationIcon(n.type)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={cn(
                            "text-sm tracking-tight",
                            isUnread
                              ? "font-bold text-slate-900 dark:text-white"
                              : "font-semibold text-slate-700 dark:text-zinc-300"
                          )}
                        >
                          {n.title}
                        </h4>
                        {isUnread && (
                          <Badge className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0">
                            New
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed max-w-3xl">
                        {n.message}
                      </p>

                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 pt-0.5">
                        {formatNotificationTime(n.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Navigate & Mark Read) */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(n.id)}
                        className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg gap-1 cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mark read</span>
                      </Button>
                    )}

                    {n.link && (
                      <Button
                        size="sm"
                        className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-2xs gap-1 cursor-pointer"
                        asChild
                        onClick={() => {
                          if (isUnread) markAsRead(n.id);
                        }}
                      >
                        <Link href={n.link} prefetch={true}>
                          <span>View</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
