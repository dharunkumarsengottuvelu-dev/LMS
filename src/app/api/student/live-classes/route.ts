import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Helper to compute real-time live status from date and time strings.
 */
function computeLiveClassStatus(
  scheduledDate: string,
  startTimeStr: string,
  endTimeStr: string,
  rawStatus?: string
): { status: "live" | "upcoming" | "completed" | "cancelled"; startsInMinutes: number; startsInFormatted: string } {
  if (rawStatus === "cancelled") {
    return { status: "cancelled", startsInMinutes: -1, startsInFormatted: "Cancelled" };
  }

  const now = new Date();

  // Clean time format e.g. "10:00", "14:30"
  const startParts = (startTimeStr || "00:00").split(":");
  const endParts = (endTimeStr || "23:59").split(":");

  const startDate = new Date(scheduledDate);
  startDate.setHours(parseInt(startParts[0] || "0", 10), parseInt(startParts[1] || "0", 10), 0, 0);

  const endDate = new Date(scheduledDate);
  endDate.setHours(parseInt(endParts[0] || "23", 10), parseInt(endParts[1] || "59", 10), 59, 999);

  const diffMs = startDate.getTime() - now.getTime();
  const startsInMinutes = Math.round(diffMs / (60 * 1000));

  let startsInFormatted = "";
  if (startsInMinutes > 60 * 24) {
    startsInFormatted = `in ${Math.floor(startsInMinutes / (60 * 24))}d`;
  } else if (startsInMinutes > 60) {
    const hours = Math.floor(startsInMinutes / 60);
    const mins = startsInMinutes % 60;
    startsInFormatted = mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
  } else if (startsInMinutes > 0) {
    startsInFormatted = `in ${startsInMinutes}m`;
  } else {
    startsInFormatted = "Starting now";
  }

  if (now >= startDate && now <= endDate) {
    return { status: "live", startsInMinutes: 0, startsInFormatted: "LIVE NOW" };
  } else if (now < startDate) {
    return { status: "upcoming", startsInMinutes, startsInFormatted };
  } else {
    return { status: "completed", startsInMinutes: -1, startsInFormatted: "Completed" };
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch student's profile to resolve their batch
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, user_id, batch, batch_name, batch_id")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const studentBatch = profile?.batch || profile?.batch_name || profile?.batch_id || "";
    const studentProfileId = profile?.id || user.id;

    // Also fetch any batch_members records for this user
    const { data: memberBatches } = await adminClient
      .from("batch_members")
      .select("batch_id")
      .eq("user_id", user.id);

    const studentBatchSet = new Set<string>();
    if (studentBatch) studentBatchSet.add(studentBatch.toLowerCase());
    if (profile?.batch_id) studentBatchSet.add(String(profile.batch_id).toLowerCase());
    if (profile?.batch_name) studentBatchSet.add(String(profile.batch_name).toLowerCase());
    if (profile?.batch) studentBatchSet.add(String(profile.batch).toLowerCase());
    (memberBatches || []).forEach((mb: any) => {
      if (mb.batch_id) studentBatchSet.add(String(mb.batch_id).toLowerCase());
    });

    // 2. Query all live classes from database
    const { data: rawClasses, error: classErr } = await adminClient
      .from("live_classes")
      .select("*")
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (classErr) {
      // If table doesn't exist yet, return empty list gracefully
      console.warn("live_classes query warning:", classErr.message);
      return NextResponse.json({
        liveNow: [],
        upcoming: [],
        completed: [],
        stats: { total: 0, live: 0, upcoming: 0, completed: 0, attended: 0 },
      });
    }

    // 3. Fetch student's attendance records
    let attendanceMap = new Map<string, any>();
    try {
      const { data: attendanceList } = await adminClient
        .from("live_class_attendance")
        .select("*")
        .or(`student_id.eq.${user.id},student_id.eq.${studentProfileId}`);

      (attendanceList || []).forEach((att: any) => {
        attendanceMap.set(att.live_class_id, att);
      });
    } catch (attErr) {
      console.warn("live_class_attendance query warning:", attErr);
    }

    // 4. Filter classes assigned to this student
    const assignedClasses = (rawClasses || []).filter((cls: any) => {
      if (cls.is_common === true || cls.is_common === "true") return true;
      const batches: string[] = cls.assigned_batches || [];
      if (batches.length === 0 || batches.includes("Common (All Batches)")) return true;
      if (batches.some((b) => studentBatchSet.has(String(b).toLowerCase()))) return true;
      const students: string[] = cls.assigned_students || [];
      if (students.includes(user.id) || students.includes(studentProfileId)) return true;
      return false;
    });

    // 5. Process each class and assign dynamic status
    const liveNow: any[] = [];
    const upcoming: any[] = [];
    const completed: any[] = [];

    assignedClasses.forEach((cls: any) => {
      const { status: computedStatus, startsInFormatted } = computeLiveClassStatus(
        cls.scheduled_date,
        cls.start_time,
        cls.end_time,
        cls.status
      );

      const attendance = attendanceMap.get(cls.id);
      const isAttended = attendance && (attendance.attendance_status === "attended" || attendance.attendance_status === "joined");

      const enrichedClass = {
        id: cls.id,
        title: cls.title,
        description: cls.description || "",
        courseName: cls.course_title || cls.course_name || "",
        courseId: cls.course_id || null,
        moduleName: cls.module_title || cls.module_name || null,
        trainerName: cls.trainer_name || "",
        trainerAvatar: cls.trainer_avatar || null,
        platform: cls.platform || (cls.meeting_url?.includes("meet.google.com") ? "google_meet" : cls.meeting_url?.includes("zoom.us") ? "zoom" : cls.meeting_url?.includes("teams.microsoft.com") ? "teams" : "other"),
        meetingUrl: cls.meeting_url || "",
        scheduledDate: cls.scheduled_date,
        startTime: cls.start_time,
        endTime: cls.end_time,
        durationMinutes: cls.duration_minutes || 60,
        status: computedStatus,
        startsInFormatted,
        attendance: attendance
          ? {
              status: attendance.attendance_status,
              joinedAt: attendance.joined_at,
              durationSeconds: attendance.duration_seconds || 0,
            }
          : null,
        isAttended: Boolean(isAttended),
      };

      if (computedStatus === "live") {
        liveNow.push(enrichedClass);
      } else if (computedStatus === "upcoming") {
        upcoming.push(enrichedClass);
      } else if (computedStatus === "completed" || computedStatus === "cancelled") {
        completed.push(enrichedClass);
      }
    });

    return NextResponse.json({
      liveNow,
      upcoming,
      completed,
      stats: {
        total: assignedClasses.length,
        live: liveNow.length,
        upcoming: upcoming.length,
        completed: completed.length,
        attended: attendanceMap.size,
      },
    });
  } catch (error) {
    console.error("GET /api/student/live-classes error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, liveClassId, seconds = 30 } = body;

    if (!liveClassId) {
      return NextResponse.json({ error: "Missing liveClassId" }, { status: 400 });
    }

    // Fetch student profile info
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, email, batch, batch_name")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const studentName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email?.split("@")[0] || "Student"
      : "Student";
    const studentEmail = profile?.email || user.email || "";
    const cohortBatch = profile?.batch || profile?.batch_name || "General";
    const candidateId = profile?.id || user.id;

    // 1. JOIN SESSION
    if (action === "join_session" || action === "join") {
      const { data: existingAttendance } = await adminClient
        .from("live_class_attendance")
        .select("*")
        .eq("live_class_id", liveClassId)
        .or(`student_id.eq.${candidateId},student_id.eq.${user.id}`)
        .maybeSingle();

      if (!existingAttendance) {
        await adminClient.from("live_class_attendance").insert({
          live_class_id: liveClassId,
          student_id: candidateId,
          student_name: studentName,
          student_email: studentEmail,
          cohort_batch: cohortBatch,
          joined_at: new Date().toISOString(),
          attendance_status: "attended",
          duration_seconds: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        await adminClient
          .from("live_class_attendance")
          .update({
            attendance_status: "attended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAttendance.id);
      }

      // Also record in live_class_participants
      try {
        await adminClient
          .from("live_class_participants")
          .upsert({
            live_class_id: liveClassId,
            student_id: candidateId,
            joined_at: new Date().toISOString(),
            attendance_status: "attended",
            updated_at: new Date().toISOString(),
          }, { onConflict: "live_class_id,student_id" });
      } catch {}

      return NextResponse.json({ success: true, status: "attended" });
    }

    // 2. HEARTBEAT DURATION ACCUMULATOR
    if (action === "heartbeat") {
      const { data: existingAttendance } = await adminClient
        .from("live_class_attendance")
        .select("*")
        .eq("live_class_id", liveClassId)
        .or(`student_id.eq.${candidateId},student_id.eq.${user.id}`)
        .maybeSingle();

      if (existingAttendance) {
        const newDuration = (existingAttendance.duration_seconds || 0) + (Number(seconds) || 30);
        await adminClient
          .from("live_class_attendance")
          .update({
            duration_seconds: newDuration,
            attendance_status: "attended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAttendance.id);
      }
      return NextResponse.json({ success: true });
    }

    // 3. LEAVE SESSION
    if (action === "leave_session") {
      const { data: existingAttendance } = await adminClient
        .from("live_class_attendance")
        .select("*")
        .eq("live_class_id", liveClassId)
        .or(`student_id.eq.${candidateId},student_id.eq.${user.id}`)
        .maybeSingle();

      if (existingAttendance) {
        await adminClient
          .from("live_class_attendance")
          .update({
            left_at: new Date().toISOString(),
            attendance_status: (existingAttendance.duration_seconds || 0) >= 300 ? "attended" : "partial",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAttendance.id);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/student/live-classes error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
