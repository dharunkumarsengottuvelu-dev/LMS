import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { dispatchBatchNotification } from "@/lib/notifications/dispatcher";

export const dynamic = "force-dynamic";

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

    // 1. Fetch trainer profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, role")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const trainerProfileId = profile?.id || user.id;

    // 2. Fetch live classes created by or assigned to this trainer
    const { data: rawClasses, error: classErr } = await adminClient
      .from("live_classes")
      .select("*")
      .or(`trainer_id.eq.${user.id},trainer_id.eq.${trainerProfileId},created_by.eq.${user.id}`)
      .order("scheduled_date", { ascending: false });

    // 3. Fetch courses, batches for trainer form
    const { data: coursesData } = await adminClient
      .from("courses")
      .select("id, title, slug, category");

    // 3b. Fetch batches from batches table + batch_members for accurate counts
    const { data: batchesData } = await adminClient
      .from("batches")
      .select("id, name, batch_name, college_name")
      .order("created_at", { ascending: false });

    const { data: batchMembersData } = await adminClient
      .from("batch_members")
      .select("batch_id, user_id");


    const batchStudentMap: Record<string, number> = {};
    (batchMembersData || []).forEach((bm: any) => {
      batchStudentMap[bm.batch_id] = (batchStudentMap[bm.batch_id] || 0) + 1;
    });

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

    // Primary: from batches table
    (batchesData || []).forEach((b: any) => {
      const bName = b.name || b.batch_name;
      if (bName && b.id) {
        batchNamesSet.add(b.id);
        mappedBatches.push({
          id: b.id,
          name: bName,
          collegeName: b.college_name || "",
          studentCount: batchStudentMap[b.id] || 0,
        });
      }
    });

    // Fallback: legacy string batches from profiles.batch
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
        mappedBatches.push({ id: bName, name: bName, collegeName: "Student Learning Cohort", studentCount: count });
      }
    });

    if (mappedBatches.length === 0) {
      mappedBatches.push(
        { id: "Batch A", name: "Batch A", collegeName: "Campus Engineering", studentCount: 0 },
        { id: "Batch B", name: "Batch B", collegeName: "Technology Division", studentCount: 0 },
        { id: "General Cohort", name: "General Cohort", collegeName: "All Enrolled Students", studentCount: 0 }
      );
    }


    // 4. Calculate real-time stats
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
        courseName: cls.course_title || cls.course_name || "Enterprise Training",
        moduleId: cls.module_id || null,
        moduleName: cls.module_title || cls.module_name || null,
        trainerId: cls.trainer_id || trainerProfileId,
        trainerName: cls.trainer_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Trainer",
        platform: cls.platform || "google_meet",
        meetingUrl: cls.meeting_url || "",
        scheduledDate: cls.scheduled_date,
        startTime: cls.start_time,
        endTime: cls.end_time,
        durationMinutes: cls.duration_minutes || 60,
        status: computedStatus,
        isCommon: cls.is_common ?? true,
        assignedBatches: cls.assigned_batches || [],
        assignedStudents: cls.assigned_students || [],
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
      courses: (coursesData || []).map((c: any) => ({ id: c.id, title: c.title, slug: c.slug })),
      batches: mappedBatches,
    });
  } catch (error) {
    console.error("GET /api/trainer/live-classes error:", error);
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

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const trainerFullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Trainer";
    const body = await request.json();

    const {
      id,
      title,
      description,
      courseId,
      courseName,
      moduleId,
      moduleName,
      scheduledDate,
      startTime,
      endTime,
      durationMinutes,
      isCommon,
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
        .or(`id.eq.${liveClassId}`);

      try {
        await adminClient.from("live_class_sessions").insert({
          live_class_id: liveClassId,
          started_at: new Date().toISOString(),
          active: true,
        });
      } catch {}

      return NextResponse.json({ success: true, status: "live" });
    }

    if (action === "end_session" && liveClassId) {
      await adminClient
        .from("live_classes")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .or(`id.eq.${liveClassId}`);

      try {
        await adminClient
          .from("live_class_sessions")
          .update({ active: false, ended_at: new Date().toISOString() })
          .eq("live_class_id", liveClassId);
      } catch {}

      return NextResponse.json({ success: true, status: "completed" });
    }

    if (action === "cancel_class" && liveClassId) {
      await adminClient
        .from("live_classes")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", liveClassId);

      return NextResponse.json({ success: true, status: "cancelled" });
    }

    if (!title || !scheduledDate || !startTime) {
      return NextResponse.json(
        { error: "Title, Scheduled Date, and Start Time are required." },
        { status: 400 }
      );
    }

    let initialStatus = body.status;
    if (!initialStatus || initialStatus === "upcoming" || initialStatus === "scheduled") {
      const now = new Date();
      const [y, m, d] = (scheduledDate || "").split("-").map(Number);
      const [sH, sM] = (startTime || "00:00").split(":").map(Number);
      const [eH, eM] = (endTime || "23:59").split(":").map(Number);
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
      title: title.trim(),
      description: description || "",
      course_id: courseId || null,
      course_title: courseName || "",
      module_id: moduleId || null,
      module_title: moduleName || "",
      trainer_id: user.id,
      trainer_name: trainerFullName,
      platform: platform || (meeting_url || meetingUrl ? "external" : "falcon_webrtc"),
      meeting_url: meeting_url || meetingUrl || "",
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime || "11:00",
      duration_minutes: Number(durationMinutes) || 60,
      is_common: Boolean(isCommon),
      assigned_batches: assignedBatches || [],
      status: initialStatus,
      created_by: user.id,
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
      if (error) throw error;
      savedClass = data;
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

    // Dispatch notifications
    try {
      const classId = savedClass?.id || id;
      const scheduleStr = `${scheduledDate} ${startTime}`;
      const durationStr = `${payload.duration_minutes} Mins`;

      if (isCommon) {
        dispatchBatchNotification({
          isCommon: true,
          eventType: "live_class_scheduled",
          title: `New Live Class Scheduled: ${title}`,
          message: `Trainer ${trainerFullName} has scheduled a FALCON live classroom session "${title}" for ${scheduleStr}.`,
          resourceType: "live_class",
          resourceId: classId,
          targetUrl: `/student/live-classes`,
          assignedBy: trainerFullName,
          dueDate: scheduleStr,
          duration: durationStr,
          category: "FALCON Live Class",
        }).catch((e) => console.warn("Trainer batch live class notification error:", e));
      } else if (assignedBatches && assignedBatches.length > 0) {
        for (const bName of assignedBatches) {
          dispatchBatchNotification({
            batchName: bName,
            eventType: "live_class_scheduled",
            title: `New Live Class Scheduled: ${title}`,
            message: `A FALCON live classroom session "${title}" has been scheduled for cohort ${bName} on ${scheduleStr}.`,
            resourceType: "live_class",
            resourceId: classId,
            targetUrl: `/student/live-classes`,
            assignedBy: trainerFullName,
            dueDate: scheduleStr,
            duration: durationStr,
            category: "FALCON Live Class",
          }).catch((e) => console.warn("Trainer batch live class notification error:", e));
        }
      }
    } catch (notifErr) {
      console.warn("Trainer live class notification warning:", notifErr);
    }

    return NextResponse.json({ success: true, liveClass: savedClass });
  } catch (error) {
    console.error("POST /api/trainer/live-classes error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
