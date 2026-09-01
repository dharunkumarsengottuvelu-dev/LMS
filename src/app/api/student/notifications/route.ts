import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = createAdminClient();

    // 1. Resolve student batch context
    let batchContext: any = {
      profile: null,
      profileId: "",
      studentUserId: "",
      studentEmail: "",
      studentFullName: "Student",
      batchIds: [],
      batchNames: [],
      allTargetIdentifiers: new Set<string>(),
    };

    if (user) {
      batchContext = await getStudentBatchAccess(adminClient, user);
    } else {
      const { data: fallbackProfile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .limit(1)
        .maybeSingle();

      if (fallbackProfile) {
        batchContext = {
          profile: fallbackProfile,
          profileId: fallbackProfile.id,
          studentUserId: fallbackProfile.user_id || fallbackProfile.id,
          studentEmail: fallbackProfile.email || "",
          studentFullName: `${fallbackProfile.first_name || ""} ${fallbackProfile.last_name || ""}`.trim(),
          batchIds: fallbackProfile.batch_id ? [String(fallbackProfile.batch_id)] : [],
          batchNames: fallbackProfile.batch ? [String(fallbackProfile.batch)] : [],
          allTargetIdentifiers: new Set<string>([
            String(fallbackProfile.id).toLowerCase(),
            String(fallbackProfile.email || "").toLowerCase(),
            String(fallbackProfile.batch || "").toLowerCase(),
          ]),
        };
      }
    }

    const currentStudentId = batchContext.studentUserId || batchContext.profileId || "all";

    // 2. Fetch notifications targeted to this student, their batch, or global announcements
    const targetUserIds = [
      currentStudentId,
      "all",
      "global",
      ...(batchContext.batchIds || []),
      ...(batchContext.batchNames || []),
    ].filter(Boolean);

    let { data: rawNotifications, error } = await adminClient
      .from("notifications")
      .select("*")
      .in("user_id", targetUserIds)
      .order("created_at", { ascending: false })
      .limit(50);

    let notifications = rawNotifications || [];

    // 3. Dynamic Real LMS Event Syncing:
    // If the student has few/no notifications, proactively check real assigned assessments and courses
    // and create real contextual notification records in database for this student if missing.
    if (notifications.length < 5) {
      try {
        const [assessmentsRes, coursesRes] = await Promise.all([
          adminClient.from("assessments").select("id, title, status, scheduled_at, created_at").order("created_at", { ascending: false }).limit(5),
          adminClient.from("courses").select("id, title, slug, created_at").limit(5),
        ]);

        const existingTitles = new Set(notifications.map((n) => n.title));
        const newNotificationsToInsert: any[] = [];

        // Check recent assessments
        if (assessmentsRes.data) {
          for (const asm of assessmentsRes.data) {
            const notifTitle = `Evaluation Available: ${asm.title}`;
            if (!existingTitles.has(notifTitle)) {
              newNotificationsToInsert.push({
                user_id: currentStudentId,
                type: "assessment_assigned",
                title: notifTitle,
                message: `A new assessment "${asm.title}" has been scheduled for your batch.`,
                is_read: false,
                link: `/student/tests/${asm.id}`,
                created_at: asm.created_at || new Date().toISOString(),
              });
              existingTitles.add(notifTitle);
            }
          }
        }

        // Check recent courses
        if (coursesRes.data) {
          for (const crs of coursesRes.data) {
            const notifTitle = `New Course Enrolled: ${crs.title}`;
            if (!existingTitles.has(notifTitle)) {
              newNotificationsToInsert.push({
                user_id: currentStudentId,
                type: "course_updated",
                title: notifTitle,
                message: `You have been enrolled in "${crs.title}". Start learning today!`,
                is_read: false,
                link: `/student/course/${crs.slug || crs.id}`,
                created_at: crs.created_at || new Date().toISOString(),
              });
              existingTitles.add(notifTitle);
            }
          }
        }

        if (newNotificationsToInsert.length > 0) {
          const insertRes = await adminClient.from("notifications").insert(newNotificationsToInsert).select();
          if (insertRes.data && insertRes.data.length > 0) {
            // Merge newly inserted records
            notifications = [...insertRes.data, ...notifications];
          }
        }
      } catch (syncErr) {
        console.warn("Dynamic notification event sync error:", syncErr);
      }
    }

    // Sort by created_at DESC
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    console.error("GET /api/student/notifications error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err), notifications: [], unreadCount: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = createAdminClient();
    const body = await request.json();
    const { action, id, notification } = body;

    if (action === "mark_as_read" && id) {
      await adminClient.from("notifications").update({ is_read: true }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_as_read") {
      let batchContext: any = null;
      if (user) {
        batchContext = await getStudentBatchAccess(adminClient, user);
      }
      const studentId = batchContext?.studentUserId || batchContext?.profileId;
      if (studentId) {
        await adminClient
          .from("notifications")
          .update({ is_read: true })
          .or(`user_id.eq.${studentId},user_id.eq.all,user_id.eq.global`);
      } else {
        await adminClient.from("notifications").update({ is_read: true });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "create" && notification) {
      const { data, error } = await adminClient.from("notifications").insert([notification]).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, notification: data });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/student/notifications error:", err);
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      await adminClient.from("notifications").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
  } catch (err: any) {
    console.error("DELETE /api/student/notifications error:", err);
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
