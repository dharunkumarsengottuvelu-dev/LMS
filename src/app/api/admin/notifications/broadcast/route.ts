import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import {
  sendEmail,
  isValidEmail,
} from "@/lib/email/email-service";
import { generateAnnouncementEmail } from "@/lib/email/email-templates";
import { getAbsoluteUrl } from "@/config/site";

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

    // Verify sender is admin or trainer
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, role, email")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const senderRole = (senderProfile?.role || "").toLowerCase();
    if (!["admin", "super_admin", "trainer"].includes(senderRole)) {
      return NextResponse.json({ success: false, error: "Forbidden: insufficient role" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      message,
      type = "announcement",
      target_type = "common", // "common" | "batch"
      batch_id,
      batch_name,
      link_url,
      send_email: sendEmailFlag = false,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title and message are required" },
        { status: 400 }
      );
    }

    // Resolve target students
    const { data: allProfiles, error: studentsError } = await adminClient
      .from("profiles")
      .select("id, user_id, email, first_name, last_name, role, batch_id, batch_name, batch");

    if (studentsError) {
      throw new Error(`Failed to resolve students: ${studentsError.message}`);
    }

    let resolvedStudents: any[] = [];

    if (target_type === "trainers") {
      resolvedStudents = (allProfiles || []).filter((p: any) => {
        const r = (p.role || "").toLowerCase();
        return r === "trainer";
      });
    } else if (target_type === "both" || target_type === "all") {
      resolvedStudents = (allProfiles || []).filter((p: any) => {
        const r = (p.role || "").toLowerCase();
        return r === "student" || r === "trainer" || (!r && !["admin", "super_admin"].includes(r));
      });
    } else if (target_type === "batch" && (batch_id || batch_name)) {
      resolvedStudents = (allProfiles || []).filter((p: any) => {
        const r = (p.role || "").toLowerCase();
        const isStudent = r === "student" || (!r && !["admin", "super_admin", "trainer"].includes(r));
        return (
          isStudent &&
          ((batch_id && (p.batch_id === batch_id || p.batch === batch_id)) ||
            (batch_name && (p.batch_name === batch_name || p.batch === batch_name)))
        );
      });
    } else {
      // Default: all students
      resolvedStudents = (allProfiles || []).filter((p: any) => {
        const r = (p.role || "").toLowerCase();
        return r === "student" || (!r && !["admin", "super_admin", "trainer"].includes(r));
      });
    }

    if (resolvedStudents.length === 0) {
      return NextResponse.json({
        success: false,
        error:
          target_type === "batch"
            ? `No students found in batch "${batch_name || batch_id}".`
            : target_type === "trainers"
            ? "No active trainers found."
            : "No active recipients found.",
      });
    }

    const senderName =
      `${senderProfile?.first_name || ""} ${senderProfile?.last_name || ""}`.trim() ||
      senderRole.charAt(0).toUpperCase() + senderRole.slice(1);

    // Build notification records for all resolved students
    const notificationRecords = resolvedStudents.map((student) => ({
      user_id: student.id,
      title,
      message,
      type,
      is_read: false,
      link_url: link_url || null,
      metadata: {
        sender_id: senderProfile?.id || user.id,
        sender_name: senderName,
        sender_role: senderRole,
        target_type,
        batch_id: batch_id || null,
        batch_name: batch_name || null,
      },
    }));

    // Insert notifications in batches of 50
    const BATCH_SIZE = 50;
    let insertedCount = 0;
    for (let i = 0; i < notificationRecords.length; i += BATCH_SIZE) {
      const batch = notificationRecords.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await adminClient.from("notifications").insert(batch);
      if (insertError) {
        console.error("Notification insert error:", insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    // Send emails if requested
    let emailSentCount = 0;
    let emailFailedCount = 0;
    let emailStatus: "sent" | "failed" | "dev_simulated" | "skipped" = "skipped";

    if (sendEmailFlag) {
      for (const student of resolvedStudents) {
        const recipientEmail = student.email;
        if (!isValidEmail(recipientEmail)) continue;

        const recipientDisplayName =
          `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
          (student.role === "trainer" ? "Trainer" : "Student");

        const directTargetUrl = link_url
          ? (link_url.startsWith("http") ? link_url : getAbsoluteUrl(link_url))
          : getAbsoluteUrl(student.role === "trainer" ? "/trainer/notifications" : "/student/notifications");

        const tpl = generateAnnouncementEmail({
          recipientName: recipientDisplayName,
          announcementTitle: title,
          announcementMessage: message,
          publishedBy: senderName,
          announcementUrl: directTargetUrl,
        });

        const result = await sendEmail({
          to: recipientEmail,
          recipientName: recipientDisplayName,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          notificationType: "ANNOUNCEMENT_PUBLISHED",
          redirectUrl: directTargetUrl,
          ctaText: "VIEW ANNOUNCEMENT",
        });

        if (result.success) {
          emailSentCount++;
          emailStatus = result.status;
        } else {
          emailFailedCount++;
        }
      }
    }

    // Save broadcast log record for admin/trainer history
    await adminClient.from("notifications").insert([
      {
        user_id: senderProfile?.id || user.id,
        title: `[BROADCAST] ${title}`,
        message,
        type: "broadcast_log",
        is_read: true,
        link_url: link_url || null,
        metadata: {
          sender_id: senderProfile?.id || user.id,
          sender_name: senderName,
          sender_role: senderRole,
          target_type,
          batch_id: batch_id || null,
          batch_name: batch_name || null,
          recipient_count: insertedCount,
          email_enabled: sendEmailFlag,
          email_sent: emailSentCount,
          email_failed: emailFailedCount,
          email_status: emailStatus,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      recipientCount: insertedCount,
      emailSent: emailSentCount,
      emailFailed: emailFailedCount,
      emailStatus,
      message: `Notification sent to ${insertedCount} recipient(s)${sendEmailFlag ? `, emails: ${emailSentCount} sent, ${emailFailedCount} failed` : ""}.`,
    });
  } catch (err: any) {
    console.error("POST /api/admin/notifications/broadcast error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
