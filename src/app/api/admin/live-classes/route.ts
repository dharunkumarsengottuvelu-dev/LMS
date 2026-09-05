import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { dispatchBatchNotification } from "@/lib/notifications/dispatcher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const type = searchParams.get("type");

    // 0. Query attendance roster for a specific class
    if (classId && type === "attendance") {
      const { data: attendance, error: attErr } = await adminClient
        .from("live_class_attendance")
        .select("*")
        .eq("live_class_id", classId)
        .order("joined_at", { ascending: false });

      if (attErr) throw attErr;
      return NextResponse.json({ attendance: attendance || [] });
    }

    // 1. Fetch live classes
    const { data: rawClasses } = await adminClient
      .from("live_classes")
      .select("*")
      .order("scheduled_date", { ascending: false })
      .order("start_time", { ascending: false });

    // 2. Fetch courses for dropdown
    const { data: coursesData } = await adminClient
      .from("courses")
      .select("id, title, slug, category");

    // 3. Fetch trainers for dropdown
    const { data: trainersData } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, role")
      .in("role", ["trainer", "admin", "super_admin"]);

    // 4. Fetch batches using the same approach as the batches management hub
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, code, description")
      .order("created_at", { ascending: false });

    // Use batch_members for accurate student counts (not profiles.batch)
    const { data: batchMembersData } = await adminClient
      .from("batch_members")
      .select("batch_id, user_id");

    const batchStudentMap: Record<string, number> = {};
    (batchMembersData || []).forEach((bm: any) => {
      batchStudentMap[bm.batch_id] = (batchStudentMap[bm.batch_id] || 0) + 1;
    });

    // Also count from profiles.batch_id for legacy assignments
    const { data: profilesData } = await adminClient
      .from("profiles")
      .select("id, batch, batch_name, batch_id")
      .eq("role", "student");

    (profilesData || []).forEach((p: any) => {
      if (p.batch_id) {
        batchStudentMap[p.batch_id] = (batchStudentMap[p.batch_id] || 0) + 1;
      }
    });

    const batchNamesSet = new Set<string>();
    const mappedBatches: any[] = [];

    // Primary: batches from the batches table
    (batchesData || []).forEach((b: any) => {
      const bName = b.name || b.batch_name;
      if (bName && b.id) {
        batchNamesSet.add(b.id);
        let meta: any = {};
        try {
          if (b.description && b.description.startsWith("{")) {
            meta = JSON.parse(b.description);
          }
        } catch {}
        mappedBatches.push({
          id: b.id,
          name: bName,
          collegeName: meta.collegeName || meta.college_name || "",
          studentCount: batchStudentMap[b.id] || 0,
        });
      }
    });

    // Fallback: batches from profiles.batch field (legacy string-based batches)
    const legacyBatchCounts: Record<string, number> = {};
    (profilesData || []).forEach((p: any) => {
      const pb = p.batch || p.batch_name;
      if (pb && !p.batch_id) {
        legacyBatchCounts[pb] = (legacyBatchCounts[pb] || 0) + 1;
      }
    });
    Object.entries(legacyBatchCounts).forEach(([bName, count]) => {
      if (!batchNamesSet.has(bName)) {
        batchNamesSet.add(bName);
        mappedBatches.push({
          id: bName,
          name: bName,
          collegeName: "Student Learning Cohort",
          studentCount: count,
        });
      }
    });

    // 5. Fetch all attendance counts grouped by live_class_id
    let attendanceCounts: Record<string, number> = {};
    try {
      const { data: allAtt } = await adminClient
        .from("live_class_attendance")
        .select("live_class_id");

      (allAtt || []).forEach((a: any) => {
        attendanceCounts[a.live_class_id] = (attendanceCounts[a.live_class_id] || 0) + 1;
      });
    } catch (attErr) {
      console.warn("Attendance count query warning:", attErr);
    }

    // 6. Calculate real-time stats
    const now = new Date();
    let liveCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    const mappedClasses = (rawClasses || []).map((cls: any) => {
      let computedStatus = cls.status || "scheduled";

      if (cls.status === "cancelled") {
        cancelledCount++;
        computedStatus = "cancelled";
      } else if (cls.status === "completed") {
        completedCount++;
        computedStatus = "completed";
      } else {
        const [year, month, day] = (cls.scheduled_date || "").split("-").map(Number);
        const [startH, startM] = (cls.start_time || "00:00").split(":").map(Number);
        const [endH, endM] = (cls.end_time || "23:59").split(":").map(Number);

        if (year && month && day) {
          const startDate = new Date(year, month - 1, day, startH || 0, startM || 0, 0, 0);
          const endDate = new Date(year, month - 1, day, endH || 23, endM || 59, 59, 999);

          if (cls.status === "live") {
            if (now.getTime() > endDate.getTime() + 2 * 60 * 60 * 1000) {
              computedStatus = "completed";
              completedCount++;
            } else {
              computedStatus = "live";
              liveCount++;
            }
          } else if (now >= startDate && now <= endDate) {
            computedStatus = "live";
            liveCount++;
          } else if (now < startDate) {
            computedStatus = "upcoming";
            upcomingCount++;
          } else {
            computedStatus = "completed";
            completedCount++;
          }
        } else {
          computedStatus = "upcoming";
          upcomingCount++;
        }
      }

      return {
        id: cls.id,
        title: cls.title,
        description: cls.description || "",
        courseId: cls.course_id || null,
        courseName: cls.course_title || cls.course_name || "",
        moduleId: cls.module_id || null,
        moduleName: cls.module_title || cls.module_name || null,
        trainerId: cls.trainer_id || null,
        trainerName: cls.trainer_name || "",
        platform: "falcon_webrtc",
        meetingUrl: `/student/live-classes/${cls.id}`,
        scheduledDate: cls.scheduled_date,
        startTime: cls.start_time,
        endTime: cls.end_time,
        durationMinutes: cls.duration_minutes || 60,
        isCommon: Boolean(cls.is_common),
        assignedBatches: cls.assigned_batches || [],
        assignedStudents: cls.assigned_students || [],
        status: computedStatus,
        attendanceCount: attendanceCounts[cls.id] || 0,
        createdAt: cls.created_at,
      };
    });

    return NextResponse.json({
      classes: mappedClasses,
      stats: {
        total: mappedClasses.length,
        live: liveCount,
        upcoming: upcomingCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
      courses: coursesData || [],
      trainers: trainersData || [],
      batches: mappedBatches,
    });
  } catch (error) {
    console.error("GET /api/admin/live-classes error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const {
      id,
      title,
      description,
      course_id,
      courseId,
      course_name,
      courseName,
      trainer_id,
      trainerId,
      trainer_name,
      trainerName,
      scheduled_date,
      scheduledDate,
      start_time,
      startTime,
      end_time,
      endTime,
      duration_minutes,
      durationMinutes,
      is_common,
      isCommon,
      assigned_batches,
      assignedBatches,
      platform,
      meeting_url,
      meetingUrl,
      action,
      liveClassId,
    } = body;

    // Handle Start / End Session Actions from Classroom
    if (action === "start_session" && liveClassId) {
      await adminClient
        .from("live_classes")
        .update({ status: "live", updated_at: new Date().toISOString() })
        .eq("id", liveClassId);

      await adminClient.from("live_class_sessions").insert({
        live_class_id: liveClassId,
        started_at: new Date().toISOString(),
        active: true,
      });

      return NextResponse.json({ success: true, status: "live" });
    }

    if (action === "end_session" && liveClassId) {
      await adminClient
        .from("live_classes")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", liveClassId);

      await adminClient
        .from("live_class_sessions")
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq("live_class_id", liveClassId);

      return NextResponse.json({ success: true, status: "completed" });
    }

    if (action === "cancel_class" && liveClassId) {
      await adminClient
        .from("live_classes")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", liveClassId);

      return NextResponse.json({ success: true, status: "cancelled" });
    }

    const effectiveTitle = title?.trim();
    const effectiveDate = scheduled_date || scheduledDate;
    const effectiveStartTime = start_time || startTime;
    const effectiveEndTime = end_time || endTime || "11:00";
    const effectiveCourseId = course_id || courseId || null;
    const effectiveCourseName = course_name || courseName || "";
    const effectiveTrainerId = trainer_id || trainerId || null;
    const effectiveTrainerName = trainer_name || trainerName || "";
    const effectiveIsCommon = is_common !== undefined ? is_common : isCommon !== undefined ? isCommon : true;
    const effectiveBatches = assigned_batches || assignedBatches || [];

    if (!effectiveTitle || !effectiveDate || !effectiveStartTime) {
      return NextResponse.json(
        { error: "Title, Scheduled Date, and Start Time are required." },
        { status: 400 }
      );
    }

    // Determine initial/updated status
    let initialStatus = body.status;
    if (!initialStatus || initialStatus === "upcoming" || initialStatus === "scheduled") {
      const now = new Date();
      const [y, m, d] = (effectiveDate || "").split("-").map(Number);
      const [sH, sM] = (effectiveStartTime || "00:00").split(":").map(Number);
      const [eH, eM] = (effectiveEndTime || "23:59").split(":").map(Number);
      if (y && m && d) {
        const startDt = new Date(y, m - 1, d, sH || 0, sM || 0, 0, 0);
        const endDt = new Date(y, m - 1, d, eH || 23, eM || 59, 59, 999);
        if (now >= startDt && now <= endDt) {
          initialStatus = "live";
        } else if (now > endDt) {
          initialStatus = "completed";
        } else {
          initialStatus = "upcoming";
        }
      } else {
        initialStatus = "upcoming";
      }
    }

    const payload: any = {
      title: effectiveTitle,
      description: description || "",
      course_id: effectiveCourseId,
      course_title: effectiveCourseName,
      trainer_id: effectiveTrainerId,
      trainer_name: effectiveTrainerName,
      platform: platform || (meeting_url || meetingUrl ? "external" : "falcon_webrtc"),
      meeting_url: meeting_url || meetingUrl || "",
      scheduled_date: effectiveDate,
      start_time: effectiveStartTime,
      end_time: effectiveEndTime,
      duration_minutes: Number(duration_minutes || durationMinutes) || 60,
      is_common: Boolean(effectiveIsCommon),
      assigned_batches: effectiveBatches,
      status: initialStatus,
      updated_at: new Date().toISOString(),
    };

    let savedClass: any = null;

    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      payload.id = id;
      const { data, error } = await adminClient
        .from("live_classes")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        const { data: updateData, error: updateErr } = await adminClient
          .from("live_classes")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        savedClass = updateData;
      } else {
        savedClass = data;
      }
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await adminClient
        .from("live_classes")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      savedClass = data;
    }

    // Expand student assignments into live_class_participants
    try {
      const classId = savedClass?.id;
      if (classId) {
        let studentsQuery = adminClient.from("profiles").select("id, batch, batch_name");
        if (!effectiveIsCommon && effectiveBatches.length > 0) {
          studentsQuery = studentsQuery.or(
            effectiveBatches.map((b: string) => `batch.eq.${b},batch_name.eq.${b}`).join(",")
          );
        }
        const { data: eligibleStudents } = await studentsQuery;
        if (eligibleStudents && eligibleStudents.length > 0) {
          const participantRows = eligibleStudents.map((stu: any) => ({
            live_class_id: classId,
            student_id: stu.id,
            attendance_status: "absent",
          }));
          await adminClient
            .from("live_class_participants")
            .upsert(participantRows, { onConflict: "live_class_id,student_id", ignoreDuplicates: true });
        }
      }
    } catch (partErr) {
      console.warn("Participant expansion warning:", partErr);
    }

    // Asynchronously dispatch notifications and emails to assigned students
    try {
      const classId = savedClass?.id || id;
      const classTitle = savedClass?.title || effectiveTitle;
      const scheduleStr = `${effectiveDate} ${effectiveStartTime}`;
      const durationStr = `${payload.duration_minutes} Mins`;

      if (effectiveIsCommon) {
        dispatchBatchNotification({
          isCommon: true,
          eventType: "live_class_scheduled",
          title: `New Live Class Scheduled: ${classTitle}`,
          message: `A live WebRTC classroom session "${classTitle}" has been scheduled for your cohort on ${scheduleStr}.`,
          resourceType: "live_class",
          resourceId: classId,
          targetUrl: `/student/live-classes`,
          assignedBy: effectiveTrainerName || "FALCON Trainer",
          dueDate: scheduleStr,
          duration: durationStr,
          category: "FALCON Live Class",
        }).catch((e) => console.warn("Live class batch notification error:", e));
      } else if (effectiveBatches && effectiveBatches.length > 0) {
        for (const bName of effectiveBatches) {
          dispatchBatchNotification({
            batchName: bName,
            eventType: "live_class_scheduled",
            title: `New Live Class Scheduled: ${classTitle}`,
            message: `A live WebRTC classroom session "${classTitle}" has been scheduled for cohort ${bName} on ${scheduleStr}.`,
            resourceType: "live_class",
            resourceId: classId,
            targetUrl: `/student/live-classes`,
            assignedBy: effectiveTrainerName || "FALCON Trainer",
            dueDate: scheduleStr,
            duration: durationStr,
            category: "FALCON Live Class",
          }).catch((e) => console.warn("Live class batch notification error:", e));
        }
      }
    } catch (notifErr) {
      console.warn("Live class notification dispatch warning:", notifErr);
    }

    return NextResponse.json({ success: true, liveClass: savedClass });
  } catch (error) {
    console.error("POST /api/admin/live-classes error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing live class ID" }, { status: 400 });
    }

    const { error } = await adminClient.from("live_classes").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Live class deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/live-classes error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
