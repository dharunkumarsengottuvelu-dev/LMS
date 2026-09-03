import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

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

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId parameter" }, { status: 400 });
    }

    // Check user profile and role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, user_id, role, first_name, last_name")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const isHost = profile?.role === "trainer" || profile?.role === "admin";
    const candidateId = profile?.id || user.id;

    if (isHost) {
      // Host: Fetch all pending join requests for this live class
      const { data: requests, error } = await adminClient
        .from("live_class_join_requests")
        .select("*")
        .eq("live_class_id", classId)
        .eq("status", "pending")
        .order("requested_at", { ascending: true });

      if (error) {
        // Table might be initializing or empty
        return NextResponse.json({ requests: [] });
      }

      return NextResponse.json({
        requests: (requests || []).map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          userEmail: r.user_email,
          userRole: r.user_role,
          status: r.status,
          requestedAt: r.requested_at,
        })),
      });
    } else {
      // Student: Check their own latest join request status
      const { data: myRequest } = await adminClient
        .from("live_class_join_requests")
        .select("*")
        .eq("live_class_id", classId)
        .or(`user_id.eq.${candidateId},user_id.eq.${user.id}`)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        request: myRequest
          ? {
              id: myRequest.id,
              status: myRequest.status,
              requestedAt: myRequest.requested_at,
              respondedAt: myRequest.responded_at,
            }
          : null,
      });
    }
  } catch (error) {
    console.error("GET /api/live-classes/join-requests error:", error);
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
      .select("id, user_id, role, first_name, last_name, email, batch, batch_name, batch_id")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const userFullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || user.email?.split("@")[0] || "Student";
    const userRole = profile?.role || "student";
    const candidateId = profile?.id || user.id;
    const isHost = userRole === "trainer" || userRole === "admin";

    const body = await request.json();
    const { action, classId, requestId, targetUserId } = body;

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    // 1. ACTION: REQUEST TO JOIN (Student)
    if (action === "request") {
      // Fetch live class access mode
      const { data: classRecord } = await adminClient
        .from("live_classes")
        .select("id, status, access_mode, assigned_batches, assigned_students, is_common")
        .eq("id", classId)
        .maybeSingle();

      const accessMode = classRecord?.access_mode || "ask_to_join";

      // If access is OPEN, automatically approve
      if (accessMode === "open" || isHost) {
        await adminClient.from("live_class_join_requests").upsert({
          live_class_id: classId,
          user_id: candidateId,
          user_name: userFullName,
          user_email: profile?.email || user.email || "",
          user_role: userRole,
          status: "approved",
          requested_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "live_class_id,user_id" });

        return NextResponse.json({ status: "approved", accessMode: "open" });
      }

      // If access is RESTRICTED, check assignment
      if (accessMode === "restricted") {
        const isAssigned =
          classRecord?.is_common ||
          (classRecord?.assigned_students || []).includes(user.id) ||
          (classRecord?.assigned_students || []).includes(candidateId) ||
          (profile?.batch && (classRecord?.assigned_batches || []).includes(profile.batch));

        if (!isAssigned) {
          return NextResponse.json(
            { error: "This session is restricted to enrolled batch members only.", status: "rejected" },
            { status: 403 }
          );
        }
      }

      // Default ASK_TO_JOIN: Create or reset pending join request
      const { data: newRequest } = await adminClient
        .from("live_class_join_requests")
        .upsert({
          live_class_id: classId,
          user_id: candidateId,
          user_name: userFullName,
          user_email: profile?.email || user.email || "",
          user_role: userRole,
          status: "pending",
          requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "live_class_id,user_id" })
        .select()
        .single();

      return NextResponse.json({
        status: "pending",
        requestId: newRequest?.id,
        message: "Join request submitted. Waiting for host admission.",
      });
    }

    // 2. ACTION: CHECK STATUS (Student polling or reconnect check)
    if (action === "check_status") {
      const { data: myRequest } = await adminClient
        .from("live_class_join_requests")
        .select("*")
        .eq("live_class_id", classId)
        .or(`user_id.eq.${candidateId},user_id.eq.${user.id}`)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        status: myRequest?.status || "none",
        requestId: myRequest?.id || null,
      });
    }

    // 3. ACTION: CANCEL REQUEST (Student left lobby)
    if (action === "cancel") {
      await adminClient
        .from("live_class_join_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("live_class_id", classId)
        .or(`user_id.eq.${candidateId},user_id.eq.${user.id}`);

      return NextResponse.json({ success: true, status: "cancelled" });
    }

    // --- HOST MODERATION ACTIONS (Require Trainer or Admin Role) ---
    if (!isHost) {
      return NextResponse.json({ error: "Forbidden: Host privileges required" }, { status: 403 });
    }

    // 4. ACTION: ADMIT SPECIFIC STUDENT
    if (action === "admit") {
      let query = adminClient
        .from("live_class_join_requests")
        .update({
          status: "approved",
          responded_at: new Date().toISOString(),
          responded_by: candidateId,
          updated_at: new Date().toISOString(),
        })
        .eq("live_class_id", classId);

      if (requestId) {
        query = query.eq("id", requestId);
      } else if (targetUserId) {
        query = query.eq("user_id", targetUserId);
      }

      await query;
      return NextResponse.json({ success: true, status: "approved" });
    }

    // 5. ACTION: DENY SPECIFIC STUDENT
    if (action === "deny") {
      let query = adminClient
        .from("live_class_join_requests")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
          responded_by: candidateId,
          updated_at: new Date().toISOString(),
        })
        .eq("live_class_id", classId);

      if (requestId) {
        query = query.eq("id", requestId);
      } else if (targetUserId) {
        query = query.eq("user_id", targetUserId);
      }

      await query;
      return NextResponse.json({ success: true, status: "rejected" });
    }

    // 6. ACTION: ADMIT ALL PENDING
    if (action === "admit_all") {
      await adminClient
        .from("live_class_join_requests")
        .update({
          status: "approved",
          responded_at: new Date().toISOString(),
          responded_by: candidateId,
          updated_at: new Date().toISOString(),
        })
        .eq("live_class_id", classId)
        .eq("status", "pending");

      return NextResponse.json({ success: true, status: "approved_all" });
    }

    // 7. ACTION: DENY ALL PENDING
    if (action === "deny_all") {
      await adminClient
        .from("live_class_join_requests")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
          responded_by: candidateId,
          updated_at: new Date().toISOString(),
        })
        .eq("live_class_id", classId)
        .eq("status", "pending");

      return NextResponse.json({ success: true, status: "rejected_all" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/live-classes/join-requests error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
