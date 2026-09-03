"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn, getInitials } from "@/lib/utils";
import {
  Pencil, Calendar, Clock, AlertCircle, Loader2,
  CheckCircle2, Ban, Trash2, BookOpen, User,
  Video, Radio, Users, Download, Plus, RefreshCw,
  Search, X, FolderKanban, UserCheck, LayoutGrid, Table as TableIcon
} from "lucide-react";

export interface LiveClassItem {
  id: string;
  title: string;
  description: string;
  courseId: string | null;
  courseName: string;
  moduleId: string | null;
  moduleName: string | null;
  trainerId: string | null;
  trainerName: string;
  platform: string;
  meetingUrl: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: "live" | "upcoming" | "completed" | "cancelled";
  isCommon: boolean;
  assignedBatches: string[];
  assignedStudents: string[];
  attendanceCount: number;
  createdAt?: string;
}

// CSV export utility
function exportAttendanceCSV(cls: LiveClassItem, logs: any[]) {
  const headers = ["Student Name", "Student Email", "Batch", "Joined At", "Left At", "Duration (mins)", "Status"];
  const rows = logs.map((log: any) => [
    log.student_name || "Student",
    log.student_email || "",
    log.cohort_batch || "General",
    log.joined_at ? new Date(log.joined_at).toLocaleString() : "",
    log.left_at ? new Date(log.left_at).toLocaleString() : "Still Active",
    log.duration_seconds ? Math.round(log.duration_seconds / 60) : 0,
    log.attendance_status || "attended",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeTitle = cls.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  link.href = url;
  link.download = `attendance_${safeTitle}_${cls.scheduledDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function LiveClassManagementHub({ role = "admin" }: { role?: "admin" | "trainer" }) {
  const router = useRouter();
  const { toast } = useToast();

  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Dynamic current time ticker to re-evaluate statuses automatically
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // Check every 15s
    return () => clearInterval(timer);
  }, []);

  // Edit Modal State
  const [editingClass, setEditingClass] = useState<LiveClassItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    courseId: "",
    trainerId: "",
    scheduledDate: "",
    startTime: "10:00",
    endTime: "11:00",
    platform: "falcon_webrtc",
    meetingUrl: "",
    isCommon: true,
    assignedBatches: [] as string[],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Attendance Inspector Modal
  const [attendanceModalClass, setAttendanceModalClass] = useState<LiveClassItem | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const fetchClasses = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const apiEndpoint = role === "trainer" ? "/api/trainer/live-classes" : "/api/admin/live-classes";
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        setCourses(data.courses || []);
        setTrainers(data.trainers || []);
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
      toast({ title: "Failed to load classes", description: "Please check your connection.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [role]);

  // Fetch Attendance records when attendance modal opens
  useEffect(() => {
    if (!attendanceModalClass) return;
    const loadAttendance = async () => {
      setIsLoadingAttendance(true);
      try {
        const apiEndpoint = role === "trainer"
          ? `/api/trainer/live-classes?classId=${attendanceModalClass.id}&type=attendance`
          : `/api/admin/live-classes?classId=${attendanceModalClass.id}&type=attendance`;
        const res = await fetch(apiEndpoint);
        if (res.ok) {
          const data = await res.json();
          setAttendanceLogs(data.attendance || []);
        }
      } catch (err) {
        console.error("Failed to load attendance logs:", err);
      } finally {
        setIsLoadingAttendance(false);
      }
    };
    loadAttendance();
  }, [attendanceModalClass, role]);

  // Precise Status Calculation without timezone drift
  const getComputedStatus = useCallback((cls: LiveClassItem, now: Date = currentTime): "live" | "upcoming" | "completed" | "cancelled" => {
    if (cls.status === "cancelled") return "cancelled";
    if (cls.status === "completed") return "completed";

    try {
      const [year, month, day] = (cls.scheduledDate || "").split("-").map(Number);
      const [startH, startM] = (cls.startTime || "00:00").split(":").map(Number);
      const [endH, endM] = (cls.endTime || "23:59").split(":").map(Number);

      if (!year || !month || !day) return cls.status || "upcoming";

      const startDate = new Date(year, month - 1, day, startH || 0, startM || 0, 0, 0);
      const endDate = new Date(year, month - 1, day, endH || 23, endM || 59, 59, 999);

      if (cls.status === "live") {
        if (now.getTime() > endDate.getTime() + 2 * 60 * 60 * 1000) {
          return "completed";
        }
        return "live";
      }

      if (now >= startDate && now <= endDate) {
        return "live";
      } else if (now < startDate) {
        return "upcoming";
      } else {
        return "completed";
      }
    } catch {
      return cls.status || "upcoming";
    }
  }, [currentTime]);

  // Dynamic filter counts
  const dynamicStats = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;

    classes.forEach((cls) => {
      const st = getComputedStatus(cls, currentTime);
      if (st === "live") live++;
      else if (st === "upcoming") upcoming++;
      else if (st === "completed") completed++;
      else if (st === "cancelled") cancelled++;
    });

    return {
      total: classes.length,
      live,
      upcoming,
      completed,
      cancelled,
    };
  }, [classes, currentTime, getComputedStatus]);

  // Filtered classes by Tab + Search Query
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const computedStatus = getComputedStatus(cls, currentTime);

      // Search matching title, course, or trainer
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        cls.title.toLowerCase().includes(q) ||
        cls.courseName.toLowerCase().includes(q) ||
        cls.trainerName.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Status Filter
      if (filterStatus === "all") return true;
      return computedStatus === filterStatus;
    });
  }, [classes, searchQuery, filterStatus, currentTime, getComputedStatus]);

  // Open Edit Modal with class data
  const handleOpenEdit = (cls: LiveClassItem) => {
    setEditingClass(cls);
    setEditForm({
      title: cls.title,
      description: cls.description || "",
      courseId: cls.courseId || "",
      trainerId: cls.trainerId || "",
      scheduledDate: cls.scheduledDate,
      startTime: cls.startTime,
      endTime: cls.endTime,
      platform: cls.platform || "falcon_webrtc",
      meetingUrl: cls.meetingUrl || "",
      isCommon: cls.isCommon ?? true,
      assignedBatches: cls.assignedBatches || [],
    });
    setEditError(null);
  };

  // Save Edit to Database
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    if (!editForm.title.trim()) {
      setEditError("Class Title is required.");
      return;
    }
    if (!editForm.scheduledDate) {
      setEditError("Scheduled Date is required.");
      return;
    }
    if (!editForm.startTime || !editForm.endTime) {
      setEditError("Start and End times are required.");
      return;
    }

    if (editForm.endTime <= editForm.startTime) {
      setEditError("End time must be after start time.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const selectedCourse = courses.find((c) => c.id === editForm.courseId);
      const selectedTrainer = trainers.find((t) => t.id === editForm.trainerId);

      const apiEndpoint = role === "trainer" ? "/api/trainer/live-classes" : "/api/admin/live-classes";

      const payload = {
        id: editingClass.id,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        course_id: editForm.courseId || null,
        course_name: selectedCourse?.title || editingClass.courseName,
        trainer_id: editForm.trainerId || null,
        trainer_name: selectedTrainer
          ? `${selectedTrainer.first_name || ""} ${selectedTrainer.last_name || ""}`.trim() || selectedTrainer.email
          : editingClass.trainerName,
        scheduled_date: editForm.scheduledDate,
        start_time: editForm.startTime,
        end_time: editForm.endTime,
        is_common: editForm.isCommon,
        assigned_batches: editForm.isCommon ? [] : editForm.assignedBatches,
        platform: editForm.platform,
        meeting_url: editForm.platform === "falcon_webrtc" ? "" : editForm.meetingUrl,
      };

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update live class.");
      }

      // Immediately update local state without requiring page reload
      const updatedClassItem: LiveClassItem = {
        ...editingClass,
        title: payload.title,
        description: payload.description,
        courseId: payload.course_id,
        courseName: payload.course_name,
        trainerId: payload.trainer_id,
        trainerName: payload.trainer_name,
        scheduledDate: payload.scheduled_date,
        startTime: payload.start_time,
        endTime: payload.end_time,
        isCommon: payload.is_common,
        assignedBatches: payload.assigned_batches,
        platform: payload.platform,
        meetingUrl: payload.meeting_url,
      };

      setClasses((prev) =>
        prev.map((c) => (c.id === editingClass.id ? updatedClassItem : c))
      );

      toast({
        title: "Class Updated",
        description: `"${payload.title}" has been updated successfully.`,
      });

      setEditingClass(null);

      // Background sync
      fetchClasses();
    } catch (err: any) {
      setEditError(err.message || "Failed to save changes.");
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update class.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Cancel Class Action
  const handleCancelClass = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to cancel "${title}"?`)) return;

    try {
      const apiEndpoint = role === "trainer" ? "/api/trainer/live-classes" : "/api/admin/live-classes";
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_class", liveClassId: id }),
      });

      if (res.ok) {
        setClasses((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c))
        );
        toast({ title: "Class Cancelled", description: `"${title}" has been cancelled.` });
        fetchClasses();
      }
    } catch (err) {
      toast({ title: "Cancel Error", description: "Failed to cancel class.", variant: "destructive" });
    }
  };

  const handleDeleteClass = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const apiEndpoint = role === "trainer" ? `/api/trainer/live-classes?id=${id}` : `/api/admin/live-classes?id=${id}`;
      const res = await fetch(apiEndpoint, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Class Deleted", description: `"${title}" has been deleted.` });
        setClasses((prev) => prev.filter((c) => c.id !== id));
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      toast({ title: "Delete Error", description: "Failed to delete class.", variant: "destructive" });
    }
  };

  const handleEnterClassroom = (id: string) => {
    router.push(`/${role}/live-classes/${id}`);
  };

  const handleDownloadAttendance = async (cls: LiveClassItem) => {
    try {
      const apiEndpoint = role === "trainer"
        ? `/api/trainer/live-classes?classId=${cls.id}&type=attendance`
        : `/api/admin/live-classes?classId=${cls.id}&type=attendance`;
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const data = await res.json();
        const logs = data.attendance || [];
        exportAttendanceCSV(cls, logs);
        toast({ title: "Report Downloaded", description: `Attendance report for "${cls.title}" exported as CSV.` });
      }
    } catch (err) {
      toast({ title: "Download Failed", description: "Could not download attendance report.", variant: "destructive" });
    }
  };

  // Quick Preset Helper for Edit form
  const applyPresetTime = (type: "now" | "1hour" | "tomorrow") => {
    const now = new Date();
    if (type === "now") {
      const today = now.toISOString().slice(0, 10);
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const endHH = String((now.getHours() + 1) % 24).padStart(2, "0");
      setEditForm((prev) => ({
        ...prev,
        scheduledDate: today,
        startTime: `${hh}:${mm}`,
        endTime: `${endHH}:${mm}`,
      }));
    } else if (type === "1hour") {
      const parts = editForm.startTime.split(":");
      const curH = parseInt(parts[0] || "10", 10);
      const curM = parts[1] || "00";
      const newStartH = String((curH + 1) % 24).padStart(2, "0");
      const newEndH = String((curH + 2) % 24).padStart(2, "0");
      setEditForm((prev) => ({
        ...prev,
        startTime: `${newStartH}:${curM}`,
        endTime: `${newEndH}:${curM}`,
      }));
    } else if (type === "tomorrow") {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setEditForm((prev) => ({
        ...prev,
        scheduledDate: tomorrow,
      }));
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Page Header (Exact match to Practice Track Management) */}
      <PageHeader
        title={role === "admin" ? "Live Classes Management" : "Assigned Live Classes"}
        description="Schedule live interactive WebRTC sessions, assign cohorts, and inspect student attendance."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => fetchClasses(true)}
              disabled={isRefreshing || isLoading}
              className="h-[44px] text-xs font-semibold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 gap-1.5 rounded-xl shrink-0 shadow-xs cursor-pointer"
              title="Refresh live classes list"
            >
              <RefreshCw className={cn("h-4 w-4", (isRefreshing || isLoading) && "animate-spin")} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Sessions"}</span>
            </Button>

            <Button
              onClick={() => router.push(`/${role}/live-classes/new`)}
              className="h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold gap-2 px-5 rounded-xl shrink-0 shadow-sm text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Schedule Live Class
            </Button>
          </div>
        }
      />

      {/* 2. Search & Filter Bar (Matching Practice Track Management exact structure) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-3 rounded-xl shadow-sm">
        {/* Search Input on Left */}
        <div className="relative w-full md:w-[420px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search live classes by title, course, or trainer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border-none shadow-none focus-visible:ring-0 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Real-time Filter Tabs on Right */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          {[
            { id: "all", label: "All", count: dynamicStats.total },
            { id: "live", label: "Live Now", count: dynamicStats.live, isLive: true },
            { id: "upcoming", label: "Upcoming", count: dynamicStats.upcoming },
            { id: "completed", label: "Completed", count: dynamicStats.completed },
            { id: "cancelled", label: "Cancelled", count: dynamicStats.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                filterStatus === tab.id
                  ? "bg-[#2563EB] text-white shadow-xs font-bold"
                  : "text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-zinc-800"
              )}
            >
              {tab.isLive && tab.count > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              )}
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                  filterStatus === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Live Classes Cards Grid (Exact matching card design from Practice Track Management screenshot) */}
      {filteredClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl bg-white dark:bg-[#18181B] shadow-sm">
          <h3 className="font-semibold text-lg text-[#111827] dark:text-[#FAFAFA]">No live classes found</h3>
          <p className="text-sm text-[#6B7280] mt-1 max-w-sm font-normal">
            {searchQuery
              ? "No live classes match your search criteria. Try a different term."
              : filterStatus !== "all"
              ? `No live classes found with status "${filterStatus}".`
              : "You haven't scheduled any live classes yet. Click the button above to get started."}
          </p>
          {!searchQuery && filterStatus === "all" && (
            <Button
              onClick={() => router.push(`/${role}/live-classes/new`)}
              className="mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" /> Schedule First Class
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const computedStatus = getComputedStatus(cls, currentTime);
            const isLive = computedStatus === "live";
            const isUpcoming = computedStatus === "upcoming";

            return (
              <Card
                key={cls.id}
                className={cn(
                  "bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-[#2563EB]/40 transition-all",
                  isLive && "border-emerald-400/60 ring-1 ring-emerald-500/20"
                )}
              >
                <CardContent className="p-6 space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    {/* Top Row: Category Pill & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold px-3 py-1 border-[#2563EB]/30 text-[#2563EB] bg-[#2563EB]/5 rounded-lg flex items-center gap-1.5 whitespace-normal max-w-[200px]"
                      >
                        <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{cls.courseName || "General Cohort"}</span>
                      </Badge>

                      {/* Status Badge */}
                      {isLive ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-2.5 py-0.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1.5 rounded-md shrink-0 flex items-center"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Live Now</span>
                        </Badge>
                      ) : isUpcoming ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-2.5 py-0.5 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 gap-1 rounded-md shrink-0 flex items-center"
                        >
                          <Clock className="h-3 w-3" /> Upcoming
                        </Badge>
                      ) : computedStatus === "completed" ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-2.5 py-0.5 border-slate-300 text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 gap-1 rounded-md shrink-0 flex items-center"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-2.5 py-0.5 border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 gap-1 rounded-md shrink-0 flex items-center"
                        >
                          <Ban className="h-3 w-3" /> Cancelled
                        </Badge>
                      )}
                    </div>

                    {/* Instructor Row */}
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <User className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                      <span>
                        Instructor: <strong className="text-[#111827] dark:text-[#FAFAFA] font-semibold">{cls.trainerName}</strong>
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3
                        onClick={() => handleEnterClassroom(cls.id)}
                        className="font-bold text-base text-[#111827] dark:text-[#FAFAFA] leading-snug line-clamp-2 hover:text-[#2563EB] transition-colors cursor-pointer"
                        title={cls.title}
                      >
                        {cls.title}
                      </h3>
                      <p className="text-xs text-[#6B7280] line-clamp-2 mt-1.5 leading-relaxed">
                        {cls.description || "Interactive live session with HD WebRTC audio/video, screen sharing, and realtime participation."}
                      </p>
                    </div>

                    {/* Parameters Box (Matching Practice Track Management screenshot) */}
                    <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Schedule Date:</span>
                        <span className="font-bold text-[#2563EB]">{cls.scheduledDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Session Time:</span>
                        <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">
                          {cls.startTime} – {cls.endTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Total Duration:</span>
                        <span className="font-bold text-[#111827] dark:text-[#FAFAFA]">{cls.durationMinutes} mins</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
                        <span className="text-[#6B7280]">Cohort / Batch:</span>
                        <span className="font-bold text-[#111827] dark:text-[#FAFAFA] truncate max-w-[160px]">
                          {cls.isCommon ? "All Batches" : (cls.assignedBatches?.join(", ") || "Specific Students")}
                        </span>
                      </div>
                      {cls.attendanceCount > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
                          <span className="text-[#6B7280]">Attendance:</span>
                          <Badge className="bg-[#16A34A] text-white text-[10px] font-semibold gap-1 cursor-pointer" onClick={() => setAttendanceModalClass(cls)}>
                            <UserCheck className="h-3 w-3" /> {cls.attendanceCount} Students Joined
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Bar (Matching Practice Track Management screenshot) */}
                  <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                    {/* Primary Button Row */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleEnterClassroom(cls.id)}
                        className={cn(
                          "flex-1 h-9 text-xs font-semibold text-white rounded-xl shadow-xs cursor-pointer transition-all",
                          isLive
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                        )}
                      >
                        {isLive ? "Enter Live Class" : "Open Classroom"}
                      </Button>

                      <Button
                        onClick={() => handleDownloadAttendance(cls)}
                        variant="outline"
                        className="h-9 px-3.5 text-xs font-bold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-xl gap-1.5 cursor-pointer shadow-2xs"
                        title="Download Attendance CSV"
                      >
                        <Download className="h-3.5 w-3.5" /> Export CSV
                      </Button>
                    </div>

                    {/* Secondary Button Row: Attendance + Edit + Cancel/Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        onClick={() => setAttendanceModalClass(cls)}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs font-bold border-[#E5E7EB] text-[#111827] dark:text-[#FAFAFA] hover:bg-[#F9FAFB] gap-1.5 rounded-xl shadow-xs cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5 text-[#2563EB]" /> Attendance ({cls.attendanceCount})
                      </Button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit Button (Orange matching Edit button in Practice Tracks) */}
                        <Button
                          onClick={() => handleOpenEdit(cls)}
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-[#D97706] border-[#D97706]/40 hover:bg-[#D97706]/10 rounded-xl cursor-pointer"
                          title="Edit Class Details"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        {/* Cancel Button */}
                        {cls.status !== "cancelled" && (
                          <Button
                            onClick={() => handleCancelClass(cls.id, cls.title)}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-amber-600 border-amber-500/40 hover:bg-amber-50 rounded-xl cursor-pointer"
                            title="Cancel Live Class"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Delete Button (Red matching Delete button in Practice Tracks) */}
                        <Button
                          onClick={() => handleDeleteClass(cls.id, cls.title)}
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-[#DC2626] border-[#DC2626]/40 hover:bg-[#DC2626]/10 rounded-xl cursor-pointer"
                          title="Delete Live Class"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. EDIT LIVE CLASS MODAL */}
      <Dialog open={Boolean(editingClass)} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent className="sm:max-w-[620px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 flex items-center justify-center">
                <Pencil className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Edit Live Class Session
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B7280] mt-0.5">
                  Update class schedule, course, trainer, or cohort assignment. Changes save immediately.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            {/* Class Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Class Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Masterclass: Advanced Full-Stack Architecture"
                className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                required
              />
            </div>

            {/* Course & Trainer Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Course</Label>
                <select
                  value={editForm.courseId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, courseId: e.target.value }))}
                  className="w-full h-10 px-3 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[#111827] dark:text-[#FAFAFA] focus:outline-hidden"
                >
                  <option value="">General Cohort (No specific course)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Trainer</Label>
                <select
                  value={editForm.trainerId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, trainerId: e.target.value }))}
                  className="w-full h-10 px-3 text-xs bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[#111827] dark:text-[#FAFAFA] focus:outline-hidden"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name ? `${t.first_name} ${t.last_name || ""}` : t.email} ({t.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule / Date & Time with quick presets */}
            <div className="space-y-2 bg-[#F9FAFB] dark:bg-[#09090B] p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>Session Schedule</span>
                </Label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetTime("now")}
                    className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-md cursor-pointer border border-emerald-200 transition-colors"
                  >
                    Start Now
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTime("1hour")}
                    className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/20 px-2.5 py-0.5 rounded-md cursor-pointer border border-[#2563EB]/20 transition-colors"
                  >
                    +1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTime("tomorrow")}
                    className="text-[10px] font-bold text-[#6B7280] bg-white hover:bg-slate-100 px-2.5 py-0.5 rounded-md cursor-pointer border border-[#E5E7EB] transition-colors"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={editForm.scheduledDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Cohort Assignment */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Cohort Visibility</Label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#111827] dark:text-[#FAFAFA]">
                  <input
                    type="radio"
                    name="editIsCommon"
                    checked={editForm.isCommon}
                    onChange={() => setEditForm((prev) => ({ ...prev, isCommon: true }))}
                    className="accent-[#2563EB]"
                  />
                  <span>All Batches (Common Session)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#111827] dark:text-[#FAFAFA]">
                  <input
                    type="radio"
                    name="editIsCommon"
                    checked={!editForm.isCommon}
                    onChange={() => setEditForm((prev) => ({ ...prev, isCommon: false }))}
                    className="accent-[#2563EB]"
                  />
                  <span>Specific Batches</span>
                </label>
              </div>

              {!editForm.isCommon && (
                <div className="pt-1.5 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#F9FAFB] dark:bg-[#09090B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                  {batches.map((b) => {
                    const isSelected = editForm.assignedBatches.includes(b.name || b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          const bName = b.name || b.id;
                          setEditForm((prev) => ({
                            ...prev,
                            assignedBatches: isSelected
                              ? prev.assignedBatches.filter((x) => x !== bName)
                              : [...prev.assignedBatches, bName],
                          }));
                        }}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer",
                          isSelected
                            ? "bg-[#2563EB]/10 border-[#2563EB]/40 text-[#2563EB]"
                            : "bg-white border-[#E5E7EB] text-[#6B7280] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                        )}
                      >
                        {b.name} ({b.studentCount || 0})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Description (Optional)</Label>
              <Textarea
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief summary of agenda, requirements, or prerequisites..."
                className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] resize-none"
              />
            </div>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingClass(null)}
                className="h-10 text-xs font-semibold rounded-xl border-[#E5E7EB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                className="h-10 px-5 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer shadow-sm"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. ATTENDANCE INSPECTOR MODAL */}
      <Dialog open={Boolean(attendanceModalClass)} onOpenChange={(open) => !open && setAttendanceModalClass(null)}>
        <DialogContent className="sm:max-w-[640px] bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Class Attendance Roster
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B7280] mt-0.5">
                  {attendanceModalClass?.title} • {attendanceModalClass?.scheduledDate}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between bg-[#F9FAFB] dark:bg-[#09090B] p-3 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
              <span className="text-xs font-semibold text-[#6B7280]">
                Total Students Joined: <strong className="text-[#111827] dark:text-[#FAFAFA] text-sm ml-1">{attendanceLogs.length}</strong>
              </span>
              {attendanceModalClass && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportAttendanceCSV(attendanceModalClass, attendanceLogs)}
                  className="h-8 text-xs font-semibold rounded-xl gap-1.5 shadow-2xs border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>Export CSV</span>
                </Button>
              )}
            </div>

            {isLoadingAttendance ? (
              <div className="py-12 text-center text-[#6B7280]">
                <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#2563EB] mb-2" />
                <p className="text-xs font-semibold">Loading attendance records...</p>
              </div>
            ) : attendanceLogs.length === 0 ? (
              <div className="py-12 text-center text-[#6B7280] border border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-2xl">
                <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                <p className="font-semibold text-[#111827] dark:text-[#FAFAFA] text-xs">No attendance recorded yet</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Students who join this live session will appear here automatically.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-[#E5E7EB] dark:border-[#27272A] divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                {attendanceLogs.map((att: any, i: number) => (
                  <div key={i} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 border border-slate-200 dark:border-zinc-700">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
                          {getInitials(att.student_name || "ST")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-[#111827] dark:text-[#FAFAFA] text-xs">{att.student_name || "Enrolled Student"}</p>
                        <p className="text-[11px] text-[#6B7280]">{att.student_email || "No email"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">
                        {att.duration_seconds ? `${Math.round(att.duration_seconds / 60)} mins` : "In Progress"}
                      </p>
                      <p className="text-[10px] text-[#6B7280]">
                        {att.joined_at ? new Date(att.joined_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
