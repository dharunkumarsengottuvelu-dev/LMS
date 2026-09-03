"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LiveClassItem {
  id: string;
  title: string;
  description: string;
  courseName: string;
  courseId: string | null;
  moduleName: string | null;
  trainerName: string;
  trainerAvatar: string | null;
  platform: string;
  meetingUrl: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: "live" | "upcoming" | "completed" | "cancelled";
  startsInFormatted: string;
  attendance: {
    status: string;
    joinedAt: string;
    durationSeconds: number;
  } | null;
  isAttended: boolean;
}

function getPlatformBadge(platform: string) {
  const p = (platform || "").toLowerCase();
  if (p.includes("meet") || p.includes("google")) {
    return { name: "Google Meet", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60" };
  } else if (p.includes("zoom")) {
    return { name: "Zoom", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60" };
  } else if (p.includes("teams")) {
    return { name: "Microsoft Teams", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60" };
  }
  return { name: "Live Meeting", color: "bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700" };
}

function formatScheduleTime(dateStr: string, startTime: string, endTime: string) {
  if (!dateStr) return `${startTime} – ${endTime}`;
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let prefix = dateStr;
    if (dateStr === todayStr) {
      prefix = "Today";
    } else if (dateStr === tomorrowStr) {
      prefix = "Tomorrow";
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        prefix = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
    }
    return `${prefix} • ${startTime} – ${endTime}`;
  } catch {
    return `${dateStr} • ${startTime} – ${endTime}`;
  }
}

export default function StudentLiveClassesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [liveNow, setLiveNow] = useState<LiveClassItem[]>([]);
  const [upcoming, setUpcoming] = useState<LiveClassItem[]>([]);
  const [completed, setCompleted] = useState<LiveClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isJoiningId, setIsJoiningId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedClass, setSelectedClass] = useState<LiveClassItem | null>(null);

  const fetchLiveClasses = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const res = await fetch("/api/student/live-classes");
      if (!res.ok) throw new Error("Failed to load live classes");
      const data = await res.json();
      setLiveNow(data.liveNow || []);
      setUpcoming(data.upcoming || []);
      setCompleted(data.completed || []);
    } catch (err) {
      console.error("Failed to fetch live classes:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveClasses();
    const interval = setInterval(fetchLiveClasses, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinClass = async (cls: LiveClassItem) => {
    try {
      setIsJoiningId(cls.id);

      // If class is configured with an external meeting link (Google Meet, Zoom, Teams, etc.)
      if (cls.platform !== "falcon_webrtc" && cls.meetingUrl && cls.meetingUrl.trim().startsWith("http")) {
        // Record attendance in background
        fetch("/api/student/live-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join_session", liveClassId: cls.id }),
        }).catch((e) => console.warn("Live class attendance join recording:", e));

        // Open external meeting
        window.open(cls.meetingUrl.trim(), "_blank", "noopener,noreferrer");
        return;
      }

      // Default: internal FALCON WebRTC live classroom
      router.push(`/student/live-classes/${cls.id}`);
    } catch (err) {
      console.error("Join class error:", err);
    } finally {
      setIsJoiningId(null);
    }
  };

  const allCombined = useMemo(() => {
    return [...liveNow, ...upcoming, ...completed];
  }, [liveNow, upcoming, completed]);

  const counts = useMemo(() => {
    return {
      all: allCombined.length,
      live: liveNow.length,
      upcoming: upcoming.length,
      completed: completed.length,
    };
  }, [allCombined, liveNow, upcoming, completed]);

  const filteredClasses = useMemo(() => {
    let source: LiveClassItem[] = allCombined;
    if (tab === "live") source = liveNow;
    if (tab === "upcoming") source = upcoming;
    if (tab === "completed") source = completed;

    if (!search.trim()) return source;

    const q = search.toLowerCase();
    return source.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.trainerName.toLowerCase().includes(q)
    );
  }, [allCombined, liveNow, upcoming, completed, tab, search]);

  return (
    <div className="w-full space-y-6 pb-12 animate-fade-up">
      {/* 1. Top Header - Exact Compact Enterprise Header format from Courses & Practices */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-2xs overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          {/* Left: Breadcrumb & Title */}
          <div className="space-y-1 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Live Classes
              </h1>
              <Badge variant="outline" className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                {counts.all} Total
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal line-clamp-1">
              Join your scheduled classes and track your attendance
            </p>
          </div>

          {/* Right: Search */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search live classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8.5 h-8.5 text-xs bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLiveClasses}
              disabled={isLoading}
              className="h-8.5 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Tabs Bar (Exact style from Courses page) */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="w-full overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <TabsList className="bg-slate-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl h-11 sm:h-12 w-max min-w-full sm:w-fit border border-slate-200/80 dark:border-zinc-700/80 flex gap-1 sm:gap-1.5 shrink-0">
            <TabsTrigger
              value="all"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all cursor-pointer"
            >
              All Classes ({counts.all})
            </TabsTrigger>
            <TabsTrigger
              value="live"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all cursor-pointer"
            >
              Live Now ({counts.live})
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all cursor-pointer"
            >
              Upcoming ({counts.upcoming})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="h-8.5 sm:h-9.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 dark:text-zinc-400 transition-all cursor-pointer"
            >
              Completed ({counts.completed})
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* 3. Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] space-y-2.5 animate-pulse">
              <div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded w-1/3" />
              <div className="h-5 bg-slate-100 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-zinc-800 rounded w-1/2" />
              <div className="h-9 bg-slate-100 dark:bg-zinc-800 rounded mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Error State */}
      {hasError && !isLoading && (
        <Card className="bg-card border border-border p-8 text-center rounded-xl w-full shadow-xs">
          <h3 className="text-sm font-semibold text-foreground">Unable to load live classes</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 font-normal">
            Please check your connection and try again.
          </p>
          <Button
            size="sm"
            onClick={fetchLiveClasses}
            className="h-8 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white mt-3"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* 5. Classes Grid */}
      {!isLoading && !hasError && (
        <div className="space-y-4">
          {filteredClasses.length === 0 ? (
            <Card className="bg-card border border-border p-8 text-center rounded-xl w-full shadow-xs">
              <h3 className="text-sm font-semibold text-foreground">
                {tab === "live"
                  ? "No Live Classes Right Now"
                  : tab === "upcoming"
                  ? "No Upcoming Classes"
                  : tab === "completed"
                  ? "No Completed Classes Yet"
                  : "No Matching Live Classes"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 font-normal">
                {search ? "Try adjusting your search query." : "Scheduled sessions will appear here once assigned."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
              {filteredClasses.map((cls) => {
                const platformBadge = getPlatformBadge(cls.platform);
                const scheduleText = formatScheduleTime(cls.scheduledDate, cls.startTime, cls.endTime);
                const isLive = cls.status === "live";
                const isCompleted = cls.status === "completed";

                return (
                  <Card
                    key={cls.id}
                    className={cn(
                      "flex flex-col justify-between overflow-hidden transition-all duration-200 bg-white dark:bg-[#18181B] border shadow-xs rounded-2xl group",
                      isLive
                        ? "border-emerald-500/60 hover:border-emerald-500 hover:shadow-md"
                        : "border-slate-200/80 dark:border-zinc-800 hover:border-blue-500/40 hover:shadow-md"
                    )}
                  >
                    <CardHeader className="p-4 pb-2 space-y-2">
                      <div className="flex items-center justify-between gap-1.5">
                        {isLive ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                            LIVE NOW
                          </Badge>
                        ) : isCompleted ? (
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 border-slate-200">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-800/40">
                            {cls.startsInFormatted || "Upcoming"}
                          </Badge>
                        )}

                        <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5 truncate max-w-[110px]", platformBadge.color)}>
                          {platformBadge.name}
                        </Badge>
                      </div>

                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-1 pt-0.5">
                        {cls.title}
                      </CardTitle>

                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 leading-relaxed">
                        {cls.courseName} {cls.moduleName ? `• ${cls.moduleName}` : ""}
                      </p>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-2.5 flex-1 flex flex-col justify-end">
                      <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-1 bg-slate-50/70 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{scheduleText}</p>
                        {isCompleted && (
                          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
                            {cls.isAttended ? "Attendance: Attended" : "Attendance: Absent"}
                          </p>
                        )}
                      </div>

                      <div className="pt-1">
                        {isLive ? (
                          <Button
                            onClick={() => handleJoinClass(cls)}
                            disabled={isJoiningId === cls.id}
                            className="w-full h-8.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs"
                          >
                            {isJoiningId === cls.id ? "Connecting..." : cls.isAttended ? "Rejoin Live Class" : "Join Live Class"}
                          </Button>
                        ) : isCompleted ? (
                          <Button
                            variant="outline"
                            onClick={() => setSelectedClass(cls)}
                            className="w-full h-8.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                          >
                            Completed
                          </Button>
                        ) : cls.status === "cancelled" ? (
                          <Button
                            variant="outline"
                            disabled
                            className="w-full h-8.5 text-xs font-semibold rounded-lg border-rose-200 text-rose-500 opacity-60"
                          >
                            Cancelled
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setSelectedClass(cls)}
                            className="w-full h-8.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                          >
                            Starts at {cls.startTime || "Scheduled Time"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Live Class Details Modal */}
      <Dialog open={Boolean(selectedClass)} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl p-5">
          {selectedClass && (
            <>
              <DialogHeader className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px] font-semibold", getPlatformBadge(selectedClass.platform).color)}>
                    {getPlatformBadge(selectedClass.platform).name}
                  </Badge>
                  {selectedClass.status === "live" && (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">LIVE NOW</Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white pt-1">
                  {selectedClass.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  {selectedClass.courseName} {selectedClass.moduleName ? `• ${selectedClass.moduleName}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                {selectedClass.description && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 leading-relaxed">
                    {selectedClass.description}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Platform</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">{getPlatformBadge(selectedClass.platform).name}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Duration</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">{selectedClass.durationMinutes} Minutes</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Date</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">{selectedClass.scheduledDate}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Time</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5">
                      {selectedClass.startTime} – {selectedClass.endTime}
                    </p>
                  </div>
                </div>

                {selectedClass.attendance && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Attendance Recorded: {selectedClass.attendance.status.toUpperCase()}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button variant="outline" onClick={() => setSelectedClass(null)} className="rounded-lg text-xs h-8.5">
                  Close
                </Button>
                {selectedClass.status === "live" ? (
                  <Button
                    onClick={() => handleJoinClass(selectedClass)}
                    className="rounded-lg text-xs h-8.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Join Live Class
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleJoinClass(selectedClass)}
                    className="rounded-lg text-xs h-8.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold"
                  >
                    Open Meeting Link
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
