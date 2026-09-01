"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, BookOpen, Sparkles, Loader2, AlertCircle, Zap } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisibilitySelector } from "@/components/admin/visibility-selector";
import { useToast } from "@/hooks/use-toast";
import { parseMeetingLinkOrInvite } from "@/lib/meeting-parser";

export default function TrainerNewLiveClassPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startingNow, setStartingNow] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [platform, setPlatform] = useState<"falcon_webrtc" | "google_meet" | "zoom" | "teams" | "other">("falcon_webrtc");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [isCommon, setIsCommon] = useState(true);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoFetchedInfo, setAutoFetchedInfo] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoadingInitial(true);
        const res = await fetch("/api/trainer/live-classes");
        const data = await res.json();
        setCourses(data.courses || []);
        // Only real batches — no static fallback
        setBatches(data.batches || []);

        if (data.courses && data.courses.length > 0) {
          setCourseId(data.courses[0].id);
        }

        const today = new Date().toISOString().slice(0, 10);
        setScheduledDate(today);

        // Set current time as default
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const endHH = String(now.getHours() + 1).padStart(2, "0");
        setStartTime(`${hh}:${mm}`);
        setEndTime(`${endHH}:${mm}`);
      } catch (err) {
        console.error("Failed to load options for live class scheduling:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadFormData();
  }, []);

  const buildPayload = () => {
    const selectedCourse = courses.find((c) => c.id === courseId);

    const todayDate = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const defaultStart = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const defaultEnd = `${String((now.getHours() + 1) % 24).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const finalDate = scheduledDate || todayDate;
    const finalStart = startTime || defaultStart;
    const finalEnd = endTime || defaultEnd;

    return {
      title: title.trim(),
      description: description.trim(),
      course_id: courseId || null,
      course_name: selectedCourse?.title || "",
      platform: platform,
      meeting_url: platform === "falcon_webrtc" ? "" : meetingUrl.trim(),
      scheduled_date: finalDate,
      start_time: finalStart,
      end_time: finalEnd,
      is_common: isCommon,
      assigned_batches: isCommon ? [] : selectedBatches,
    };
  };

  const handleMeetingUrlChange = (val: string) => {
    setMeetingUrl(val);
    const parsed = parseMeetingLinkOrInvite(val);

    if (parsed.cleanUrl && parsed.cleanUrl !== val) {
      setMeetingUrl(parsed.cleanUrl);
    }

    if (parsed.platform && parsed.platform !== "other" && platform !== parsed.platform) {
      setPlatform(parsed.platform);
    }

    const detectedParts: string[] = [];
    if (parsed.scheduledDate) {
      setScheduledDate(parsed.scheduledDate);
      detectedParts.push(`Date: ${parsed.scheduledDate}`);
    }
    if (parsed.startTime) {
      setStartTime(parsed.startTime);
      detectedParts.push(`Start: ${parsed.startTime}`);
    }
    if (parsed.endTime) {
      setEndTime(parsed.endTime);
      detectedParts.push(`End: ${parsed.endTime}`);
    }
    if (parsed.title && !title) {
      setTitle(parsed.title);
      detectedParts.push(`Title: "${parsed.title}"`);
    }

    if (detectedParts.length > 0) {
      setAutoFetchedInfo(`Auto-detected: ${detectedParts.join(", ")}`);
    }
  };

  const applyPresetTime = (type: "now" | "15min" | "tomorrow" | "clear") => {
    const now = new Date();
    if (type === "now") {
      setScheduledDate(now.toISOString().slice(0, 10));
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const endHH = String((now.getHours() + 1) % 24).padStart(2, "0");
      setStartTime(`${hh}:${mm}`);
      setEndTime(`${endHH}:${mm}`);
      setAutoFetchedInfo("Set to Right Now (Live)");
    } else if (type === "15min") {
      const future = new Date(now.getTime() + 15 * 60000);
      setScheduledDate(future.toISOString().slice(0, 10));
      const hh = String(future.getHours()).padStart(2, "0");
      const mm = String(future.getMinutes()).padStart(2, "0");
      const endHH = String((future.getHours() + 1) % 24).padStart(2, "0");
      setStartTime(`${hh}:${mm}`);
      setEndTime(`${endHH}:${mm}`);
      setAutoFetchedInfo("Set to Starts in 15 Minutes");
    } else if (type === "tomorrow") {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60000);
      setScheduledDate(tomorrow.toISOString().slice(0, 10));
      setStartTime("10:00");
      setEndTime("11:00");
      setAutoFetchedInfo("Set to Tomorrow at 10:00 AM");
    } else if (type === "clear") {
      setScheduledDate("");
      setStartTime("");
      setEndTime("");
      setAutoFetchedInfo(null);
    }
  };

  const validate = () => {
    if (!title.trim()) { setErrorMsg("Class title is required."); return false; }
    if (!isCommon && selectedBatches.length === 0) { setErrorMsg("Please select at least one cohort batch or set visibility to Common."); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validate()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/trainer/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to schedule live class.");

      toast({
        title: "Live Class Scheduled",
        description: `"${title.trim()}" has been scheduled successfully.`,
      });

      router.push("/trainer/live-classes");
    } catch (err: any) {
      console.error("Error creating live class:", err);
      setErrorMsg(err.message || "An unexpected error occurred while scheduling.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNow = async () => {
    setErrorMsg(null);
    if (!title.trim()) { setErrorMsg("Class title is required to start now."); return; }
    if (!isCommon && selectedBatches.length === 0) { setErrorMsg("Please select at least one cohort batch."); return; }

    try {
      setStartingNow(true);

      const now = new Date();
      const todayDate = now.toISOString().slice(0, 10);
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const endHH = String(now.getHours() + 1).padStart(2, "0");

      const payload = {
        ...buildPayload(),
        scheduled_date: todayDate,
        start_time: `${hh}:${mm}`,
        end_time: `${endHH}:${mm}`,
      };

      const res = await fetch("/api/trainer/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create class.");

      const classId = json.liveClass?.id;
      if (!classId) throw new Error("Class created but ID not returned.");

      toast({ title: "Class Started", description: `"${title.trim()}" is live. Redirecting to classroom...` });
      router.push(`/trainer/live-classes/${classId}`);
    } catch (err: any) {
      console.error("Error starting now:", err);
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setStartingNow(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Loading scheduling configuration...</p>
      </div>
    );
  }

  const selectedCourseLabel = courses.find((c) => c.id === courseId)?.title || "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Schedule Live Class"
        description="Create an internal WebRTC live interactive classroom session and assign student cohorts."
        backAction={{
          label: "Back to Live Classes",
          href: "/trainer/live-classes",
        }}
      />

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-xl flex items-center gap-3 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
            <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
              Class Details & Schedule
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280]">
              Specify the session agenda, course alignment, and timing.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Class Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Enterprise Spring Boot Microservices Deep Dive"
                required
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Description / Agenda
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key concepts, interactive topics, and hands-on lab requirements..."
                rows={3}
                className="text-xs rounded-xl"
              />
            </div>

            {/* Native select — prevents UUID display bug */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Associated Course
              </Label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— No specific course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              {selectedCourseLabel && (
                <p className="text-[11px] text-slate-500 pl-1">Selected: <span className="font-semibold text-slate-700 dark:text-zinc-300">{selectedCourseLabel}</span></p>
              )}
            </div>

            {/* Meeting Platform & Link Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Classroom Meeting Platform
                </Label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="falcon_webrtc">FALCON Live Classroom (Built-in WebRTC)</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="zoom">Zoom Meeting</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="other">Custom / External Meeting URL</option>
                </select>
                <p className="text-[11px] text-slate-500 pl-1">
                  {platform === "falcon_webrtc"
                    ? "Interactive in-app classroom with video, audio, screen share & live attendance."
                    : "External video meeting platform with automated LMS attendance tracking."}
                </p>
              </div>

              {platform !== "falcon_webrtc" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Meeting Link / URL / Invite <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Auto-detects Date & Time
                    </span>
                  </div>
                  <Input
                    type="text"
                    value={meetingUrl}
                    onChange={(e) => handleMeetingUrlChange(e.target.value)}
                    placeholder={
                      platform === "google_meet"
                        ? "https://meet.google.com/abc-defg-hij"
                        : platform === "zoom"
                        ? "https://zoom.us/j/1234567890"
                        : platform === "teams"
                        ? "https://teams.microsoft.com/l/meetup-join/..."
                        : "Paste meeting link or full invite text here"
                    }
                    required
                    className="h-10 text-xs rounded-xl"
                  />
                  <p className="text-[11px] text-slate-500 pl-1">
                    Paste Google Meet, Zoom, Teams link or invite text. Date, Start & End Time will automatically auto-fill below.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
                    <p className="font-semibold">Internal WebRTC Mode Active</p>
                    <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                      No external link required. Students and trainers attend directly inside FALCON LMS.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-detected notification banner */}
            {autoFetchedInfo && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-medium truncate">{autoFetchedInfo}</span>
                <button
                  type="button"
                  onClick={() => setAutoFetchedInfo(null)}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Date & Time Row — Optional / Manual Override */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Schedule & Timing <span className="text-[10px] text-muted-foreground font-normal">(Auto-filled or Set Manually)</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyPresetTime("now")}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Start Now
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyPresetTime("15min")}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600"
                  >
                    +15 Mins
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyPresetTime("tomorrow")}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Tomorrow 10 AM
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyPresetTime("clear")}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md text-slate-400 hover:text-rose-500"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Scheduled Date
                  </Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
            <CardTitle className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
              Student & Cohort Assignment
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280]">
              Assign this live class to all enrolled students or restrict to specific learning cohorts.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <VisibilitySelector
              isCommon={isCommon}
              selectedBatches={selectedBatches}
              onChange={({ isCommon: newIsCommon, selectedBatches: newSelectedBatches }) => {
                setIsCommon(newIsCommon);
                setSelectedBatches(newSelectedBatches);
              }}
              batches={batches}
              label="Classroom Access Scope"
              description="Eligible students will automatically see this session on their Live Classes dashboard."
            />
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            onClick={handleStartNow}
            disabled={startingNow || submitting}
            className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-2 shadow-sm order-2 sm:order-1"
          >
            {startingNow ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Starting Class...</span></>
            ) : (
              <><Zap className="h-4 w-4" /><span>Start Now</span></>
            )}
          </Button>

          <div className="flex items-center gap-3 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/trainer/live-classes")}
              disabled={submitting || startingNow}
              className="h-10 px-5 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={submitting || startingNow}
              className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl gap-2 shadow-sm"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span>Scheduling...</span></>
              ) : (
                <><Sparkles className="h-4 w-4" /><span>Schedule Live Class</span></>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
