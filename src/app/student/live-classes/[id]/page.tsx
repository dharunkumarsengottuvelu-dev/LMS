"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FalconLiveClassroom } from "@/components/live-classroom/falcon-live-classroom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentLiveClassRoomPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classDetails, setClassDetails] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    async function loadClassData() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        // 1. Get authenticated user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: profileRaw } = await supabase
          .from("profiles")
          .select("*")
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();
        const profile = profileRaw as any;

        const studentUser = {
          id: profile?.id || user.id,
          name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.email?.split("@")[0] || "Student",
          email: profile?.email || user.email || "",
          role: "student" as const,
        };
        setCurrentUser(studentUser);

        // 2. Fetch live class details
        const { data: classRecordRaw, error: classErr } = await supabase
          .from("live_classes")
          .select("*, courses(title, slug)")
          .eq("id", classId)
          .maybeSingle();
        const classRecord = classRecordRaw as any;

        if (classErr || !classRecord) {
          // Fallback: try fetching from student live-classes API
          const res = await fetch("/api/student/live-classes");
          const json = await res.json();
          const found = (json.classes || []).find((c: any) => c.id === classId);
          if (found) {
            setClassDetails({
              id: found.id,
              title: found.title,
              description: found.description,
              courseName: found.courseName,
              trainerName: found.trainerName,
              platform: found.platform || "falcon_webrtc",
              meetingUrl: found.meetingUrl || "",
              scheduledDate: found.scheduledDate,
              startTime: found.startTime,
              endTime: found.endTime,
              durationMinutes: found.durationMinutes,
              status: found.status,
            });
          } else {
            setError("Live classroom session not found or access is restricted.");
          }
        } else {
          setClassDetails({
            id: classRecord.id,
            title: classRecord.title,
            description: classRecord.description,
            courseName: classRecord.courses?.title || "Interactive Track",
            trainerName: classRecord.trainer_name || "Lead Instructor",
            platform: classRecord.platform || "falcon_webrtc",
            meetingUrl: classRecord.meeting_url || "",
            scheduledDate: classRecord.scheduled_date,
            startTime: classRecord.start_time,
            endTime: classRecord.end_time,
            durationMinutes: classRecord.duration_minutes || 60,
            status: classRecord.status,
          });
        }
      } catch (err: any) {
        console.error("Error loading classroom:", err);
        setError("Failed to initialize live classroom.");
      } finally {
        setLoading(false);
      }
    }

    if (classId) {
      loadClassData();
    }
  }, [classId, router]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0B0F19] flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-xs font-semibold text-zinc-400">Connecting to FALCON Live Classroom...</p>
      </div>
    );
  }

  if (error || !classDetails || !currentUser) {
    return (
      <div className="h-screen w-full bg-[#0B0F19] flex flex-col items-center justify-center gap-4 text-white p-6 text-center">
        <p className="text-sm font-semibold text-red-400">{error || "Live class session unavailable"}</p>
        <Button
          onClick={() => router.push("/student/live-classes")}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Live Classes
        </Button>
      </div>
    );
  }

  return (
    <FalconLiveClassroom
      classDetails={classDetails}
      currentUser={currentUser}
      backUrl="/student/live-classes"
    />
  );
}
