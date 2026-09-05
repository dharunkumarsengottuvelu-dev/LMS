import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Resolve current user profile
    const { data: myProfile } = await adminClient
      .from("profiles")
      .select("id, user_id")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const myIds = Array.from(
      new Set([myProfile?.id, myProfile?.user_id, user.id].filter(Boolean) as string[])
    );

    const body = await request.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { success: false, error: "conversation_id is required" },
        { status: 400 }
      );
    }

    // Mark all unread messages in this conversation addressed to me as read
    const { data: msgs } = await adminClient
      .from("notifications")
      .select("id, metadata")
      .eq("type", "direct_message")
      .eq("is_read", false)
      .in("user_id", myIds);

    const toMarkRead = (msgs || [])
      .filter((m: any) => m.metadata?.conversation_id === conversation_id)
      .map((m: any) => m.id);

    if (toMarkRead.length > 0) {
      await adminClient
        .from("notifications")
        .update({ is_read: true })
        .in("id", toMarkRead);
    }

    return NextResponse.json({ success: true, markedRead: toMarkRead.length });
  } catch (err: any) {
    console.error("POST /api/messages/read error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
