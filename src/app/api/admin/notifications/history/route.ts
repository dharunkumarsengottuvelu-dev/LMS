import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify sender is admin or trainer
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("id, role")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const senderRole = (senderProfile?.role || "").toLowerCase();
    if (!["admin", "super_admin", "trainer"].includes(senderRole)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Fetch broadcast logs sent by this sender
    const { data: logs, error } = await adminClient
      .from("notifications")
      .select("*")
      .eq("type", "broadcast_log")
      .eq("user_id", senderProfile?.id || user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    let totalEmails = 0;
    let sentEmails = 0;
    let failedEmails = 0;

    const history = (logs || []).map((log: any) => {
      const emailSent = Number(log.metadata?.email_sent || 0);
      const emailFailed = Number(log.metadata?.email_failed || 0);
      totalEmails += emailSent + emailFailed;
      sentEmails += emailSent;
      failedEmails += emailFailed;

      return {
        id: log.id,
        title: log.title.replace(/^\[BROADCAST\]\s*/i, ""),
        message: log.message,
        created_at: log.created_at,
        target_type: log.metadata?.target_type || "common",
        batch_name: log.metadata?.batch_name || null,
        recipient_count: log.metadata?.recipient_count || 0,
        email_enabled: log.metadata?.email_enabled || false,
        email_sent: emailSent,
        email_failed: emailFailed,
        email_status: log.metadata?.email_status || "skipped",
        sender_name: log.metadata?.sender_name || "Admin",
        link_url: log.link_url || null,
      };
    });

    return NextResponse.json({
      success: true,
      history,
      stats: {
        totalEmails,
        sent: sentEmails,
        failed: failedEmails,
        queued: 0,
        sender: "sensigroup.info@gmail.com",
        protocol: "Gmail SMTP:465 (SSL)",
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/notifications/history error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err), history: [], stats: { totalEmails: 0, sent: 0, failed: 0, queued: 0 } },
      { status: 500 }
    );
  }
}
