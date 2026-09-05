import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

// Types excluded from student notification feed
const EXCLUDED_TYPES = ["session_heartbeat", "direct_message", "broadcast_log"];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = createAdminClient();

    // Resolve the authenticated student's profile ID
    let profileId: string | null = null;
    let studentEmail = "";
    let studentFullName = "Student";
    let myIds: string[] = [];

    if (user) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, batch_id, batch, role")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profile) {
        profileId = profile.id;
        studentEmail = profile.email || user.email || "";
        studentFullName =
          `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
          "Student";
        myIds = Array.from(new Set([profile.id, profile.user_id, user.id].filter(Boolean) as string[]));
      } else {
        profileId = user.id;
        studentEmail = user.email || "";
        myIds = [user.id];
      }
    }

    if (!profileId || myIds.length === 0) {
      return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
    }

    // Fetch notifications for this student directly addressed or globally broadcast
    const { data: rawNotifications } = await adminClient
      .from("notifications")
      .select("*")
      .in("user_id", myIds)
      .not("type", "in", `(${EXCLUDED_TYPES.map((t) => `"${t}"`).join(",")})`)
      .order("created_at", { ascending: false })
      .limit(60);

    // Normalize: support both link_url and link fields
    const notifications = (rawNotifications || []).map((n: any) => ({
      ...n,
      link: n.link_url || n.link || null,
      sender_name: n.metadata?.sender_name || null,
      sender_role: n.metadata?.sender_role || null,
    }));

    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

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
      let profileId: string | null = null;
      if (user) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id")
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();
        profileId = profile?.id || user.id;
      }
      if (profileId) {
        await adminClient
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", profileId)
          .not("type", "in", `(${EXCLUDED_TYPES.map((t) => `"${t}"`).join(",")})`);
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
