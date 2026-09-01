"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn, getInitials } from "@/lib/utils";

interface LiveClassItem {
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
  const [stats, setStats] = useState({ total: 0, live: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Attendance Inspector Modal
  const [attendanceModalClass, setAttendanceModalClass] = useState<LiveClassItem | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const apiEndpoint = role === "trainer" ? "/api/trainer/live-classes" : "/api/admin/live-classes";
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        setStats(data.stats || { total: 0, live: 0, upcoming: 0, completed: 0, cancelled: 0 });
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
      toast({ title: "Failed to load classes", description: "Please check your connection.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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

  const handleDeleteClass = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const apiEndpoint = role === "trainer" ? `/api/trainer/live-classes?id=${id}` : `/api/admin/live-classes?id=${id}`;
      const res = await fetch(apiEndpoint, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Class Deleted", description: `"${title}" has been deleted.` });
        fetchClasses();
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

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchSearch =
        cls.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.trainerName.toLowerCase().includes(searchQuery.toLowerCase());

      if (filterStatus === "all") return matchSearch;
      return matchSearch && cls.status === filterStatus;
    });
  }, [classes, searchQuery, filterStatus]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Top Header Banner matching Enterprise Admin Standard */}
      <PageHeader
        title={role === "admin" ? "Live Classes Management" : "Assigned Live Classes"}
        description="Schedule live interactive WebRTC sessions, assign cohorts, and inspect student attendance."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={fetchClasses}
              disabled={isLoading}
              className="h-[42px] px-4 rounded-xl text-xs font-semibold border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 shadow-xs"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              onClick={() => router.push(`/${role}/live-classes/new`)}
              className="h-[42px] px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Schedule Live Class
            </Button>
          </div>
        }
      />

      {/* 2. Platform Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="shadow-2xs border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Classes</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live Now</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.live}</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Upcoming</span>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.upcoming}</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Completed</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] rounded-2xl">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Cancelled</span>
            <p className="text-2xl font-bold text-slate-500 mt-1">{stats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Filter Controls */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 p-2 rounded-2xl shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { id: "all", label: "All" },
            { id: "live", label: "Live Now" },
            { id: "upcoming", label: "Upcoming" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterStatus(filter.id)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex-shrink-0 cursor-pointer",
                filterStatus === filter.id
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Input
            placeholder="Search by title, course, or trainer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-xs bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-700 rounded-xl"
          />
        </div>
      </div>

      {/* 4. Live Classes Table */}
      <Card className="shadow-2xs border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-zinc-900/80 text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-200 dark:border-zinc-800 uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Class Title & Course</th>
                <th className="p-4">Trainer</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Cohort</th>
                <th className="p-4">Status</th>
                <th className="p-4">Attendance</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 dark:text-zinc-300 text-sm">No live classes found</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Schedule Live Class" to create your first session.</p>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => {
                  const isLive = cls.status === "live";
                  const isUpcoming = cls.status === "upcoming";

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 pl-6 font-medium">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{cls.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[220px] mt-0.5">
                          {cls.courseName || "General Cohort Session"}
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-[9px] font-bold">
                              {getInitials(cls.trainerName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-slate-700 dark:text-zinc-200">{cls.trainerName}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{cls.scheduledDate}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{cls.startTime} – {cls.endTime} ({cls.durationMinutes}m)</p>
                      </td>

                      <td className="p-4">
                        {cls.isCommon ? (
                          <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-semibold">
                            All Batches
                          </Badge>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                            {cls.assignedBatches.join(", ") || "Specific Students"}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {isLive && (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            LIVE NOW
                          </Badge>
                        )}
                        {isUpcoming && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">
                            Upcoming
                          </Badge>
                        )}
                        {cls.status === "completed" && (
                          <Badge variant="outline" className="text-slate-500 border-slate-200 text-[10px]">
                            Completed
                          </Badge>
                        )}
                        {cls.status === "cancelled" && (
                          <Badge variant="outline" className="text-rose-500 border-rose-200 text-[10px]">
                            Cancelled
                          </Badge>
                        )}
                      </td>

                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAttendanceModalClass(cls)}
                          className="h-7 px-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          {cls.attendanceCount} Joined
                        </Button>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadAttendance(cls)}
                            className="h-8 text-xs font-semibold rounded-xl px-2.5 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                          >
                            Export CSV
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleEnterClassroom(cls.id)}
                            className={cn(
                              "h-8 text-xs font-bold rounded-xl px-3",
                              isLive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                            )}
                          >
                            {isLive ? "Enter Live Class" : "Open Classroom"}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="outline-none">
                              <div className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
                                Options
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl">
                              <DropdownMenuItem onClick={() => setAttendanceModalClass(cls)} className="cursor-pointer text-xs">
                                View Attendance ({cls.attendanceCount})
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadAttendance(cls)} className="cursor-pointer text-xs">
                                Download Attendance CSV
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteClass(cls.id, cls.title)} className="cursor-pointer text-xs text-rose-600 focus:text-rose-600">
                                Delete Class
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Attendance Inspector Modal */}
      <Dialog open={Boolean(attendanceModalClass)} onOpenChange={(open) => !open && setAttendanceModalClass(null)}>
        <DialogContent className="sm:max-w-[640px] bg-white dark:bg-[#18181B] border-slate-200 dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Class Attendance Roster
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              {attendanceModalClass?.title} • {attendanceModalClass?.scheduledDate}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {isLoadingAttendance ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading attendance data...</div>
            ) : attendanceLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                <p className="font-semibold text-xs text-slate-600 dark:text-zinc-300">No students have joined yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Attendance logs update in real-time when students join the WebRTC classroom.</p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-2">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 pb-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                </div>
                {attendanceLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{log.student_name || "Enrolled Student"}</p>
                      <p className="text-[11px] text-slate-500 truncate">{log.student_email} • {log.cohort_batch || "General"}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3 space-y-0.5">
                      <Badge className={cn(
                        "text-[10px] font-semibold",
                        log.attendance_status === "attended" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                        log.attendance_status === "partial" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                        "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        {log.attendance_status || "attended"}
                      </Badge>
                      <p className="text-[10px] text-slate-400">
                        {log.duration_seconds ? `${Math.round(log.duration_seconds / 60)} mins` : "Active"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {attendanceLogs.length > 0 && attendanceModalClass && (
              <Button
                variant="outline"
                onClick={() => exportAttendanceCSV(attendanceModalClass, attendanceLogs)}
                className="rounded-lg text-xs h-9"
              >
                Download CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => setAttendanceModalClass(null)} className="rounded-lg text-xs h-9">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
