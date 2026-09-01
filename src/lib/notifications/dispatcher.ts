import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isValidEmail } from "@/lib/email/email-service";
import {
  generateCourseAssignedEmail,
  generateAssessmentAssignedEmail,
  generatePracticeAssignedEmail,
  generateResultPublishedEmail,
  generateLiveClassScheduledEmail,
} from "@/lib/email/email-templates";

export type LMSNotificationEventType =
  | "course_assigned"
  | "course_updated"
  | "assessment_assigned"
  | "test_scheduled"
  | "live_class_scheduled"
  | "practice_assigned"
  | "result_published"
  | "certificate_issued"
  | "assignment_deadline"
  | "announcement"
  | "general";

export interface DispatchStudentNotificationOptions {
  studentUserId?: string;
  profileId?: string;
  studentEmail?: string;
  studentName?: string;
  eventType: LMSNotificationEventType;
  title: string;
  message: string;
  resourceType?: "course" | "assessment" | "test" | "live_class" | "practice" | "assignment" | "announcement";
  resourceId?: string;
  targetUrl: string;
  assignedBy?: string;
  category?: string;
  dueDate?: string;
  duration?: string;
  score?: string;
}

export interface DispatchBatchNotificationOptions {
  batchId?: string;
  batchName?: string;
  studentIds?: string[];
  isCommon?: boolean;
  eventType: LMSNotificationEventType;
  title: string;
  message: string;
  resourceType?: "course" | "assessment" | "test" | "live_class" | "practice" | "assignment" | "announcement";
  resourceId?: string;
  targetUrl: string;
  assignedBy?: string;
  category?: string;
  dueDate?: string;
  duration?: string;
}

/**
 * Dispatches both in-app notification and registered email notification to an individual student.
 */
export async function dispatchStudentNotification(
  options: DispatchStudentNotificationOptions
): Promise<{ success: boolean; notificationId?: string; emailStatus: string; error?: string }> {
  const adminClient = createAdminClient();
  const {
    studentUserId,
    profileId,
    eventType,
    title,
    message,
    resourceType,
    resourceId,
    targetUrl,
    assignedBy = "FALCON Administrator",
    category,
    dueDate,
    duration,
    score,
  } = options;

  try {
    // 1. Resolve registered student profile from database
    let profile: any = null;
    const lookupId = studentUserId || profileId;

    if (lookupId) {
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role")
        .or(`id.eq.${lookupId},user_id.eq.${lookupId}${options.studentEmail ? `,email.eq.${options.studentEmail}` : ""}`)
        .maybeSingle();
      profile = data;
    }

    const resolvedUserId = profile?.user_id || profile?.id || studentUserId || profileId || "all";
    const resolvedName = (
      (profile?.first_name || profile?.last_name)
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : options.studentName || profile?.email?.split("@")[0] || "Student"
    );
    const resolvedEmail = profile?.email || options.studentEmail || "";

    // 2. Deduplication check: Avoid duplicate notifications sent within a 10-minute window
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentDuplicates } = await adminClient
      .from("notifications")
      .select("id")
      .eq("user_id", resolvedUserId)
      .eq("title", title)
      .gte("created_at", tenMinutesAgo)
      .limit(1);

    if (recentDuplicates && recentDuplicates.length > 0) {
      console.log(`[Notification Dispatcher] Duplicate notification skipped for ${resolvedUserId} (${title})`);
      return { success: true, emailStatus: "duplicate_skipped" };
    }

    // 3. Create In-App Notification in Supabase
    let notificationId: string | undefined;
    try {
      const { data: insertedNotif, error: notifError } = await adminClient
        .from("notifications")
        .insert({
          user_id: resolvedUserId,
          type: eventType,
          title,
          message,
          is_read: false,
          link: targetUrl,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (!notifError && insertedNotif) {
        notificationId = insertedNotif.id;
      }
    } catch (dbErr) {
      console.warn("[Notification Dispatcher] In-app notification insert warning:", dbErr);
    }

    // 4. Send Email Notification if valid registered email exists
    let emailStatus = "no_email";
    if (isValidEmail(resolvedEmail)) {
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const fullTargetUrl = targetUrl.startsWith("http") ? targetUrl : `${appBaseUrl}${targetUrl}`;

      let emailTemplate: { subject: string; html: string; text: string };

      if (eventType === "course_assigned" || eventType === "course_updated") {
        emailTemplate = generateCourseAssignedEmail({
          studentName: resolvedName,
          resourceTitle: title.replace(/^New Course Assigned:\s*/i, ""),
          assignedBy,
          targetUrl: fullTargetUrl,
          category,
        });
      } else if (eventType === "assessment_assigned" || eventType === "test_scheduled") {
        emailTemplate = generateAssessmentAssignedEmail({
          studentName: resolvedName,
          resourceTitle: title.replace(/^New Assessment Scheduled:\s*/i, ""),
          assignedBy,
          targetUrl: fullTargetUrl,
          dueDate,
          duration,
        });
      } else if (eventType === "practice_assigned") {
        emailTemplate = generatePracticeAssignedEmail({
          studentName: resolvedName,
          resourceTitle: title.replace(/^New Practice Track Assigned:\s*/i, ""),
          assignedBy,
          targetUrl: fullTargetUrl,
          category,
        });
      } else if (eventType === "result_published") {
        emailTemplate = generateResultPublishedEmail({
          studentName: resolvedName,
          resourceTitle: title.replace(/^Assessment Result Published:\s*/i, ""),
          targetUrl: fullTargetUrl,
          score,
        });
      } else if (eventType === "live_class_scheduled") {
        emailTemplate = generateLiveClassScheduledEmail({
          studentName: resolvedName,
          resourceTitle: title.replace(/^New Live Class Scheduled:\s*/i, ""),
          assignedBy,
          targetUrl: fullTargetUrl,
          dueDate,
          duration,
          category,
        });
      } else {
        emailTemplate = {
          subject: `[FALCON LMS] ${title}`,
          html: `<p>Hi ${resolvedName},</p><p>${message}</p><p><a href="${fullTargetUrl}">View on FALCON LMS</a></p>`,
          text: `Hi ${resolvedName},\n\n${message}\n\nView: ${fullTargetUrl}`,
        };
      }

      const emailResult = await sendEmail({
        to: resolvedEmail,
        studentName: resolvedName,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        notificationType: eventType,
        resourceType,
        resourceId,
      });

      emailStatus = emailResult.status;

      // 5. Optionally log delivery status to email_notifications table
      try {
        await adminClient.from("email_notifications").insert({
          user_id: resolvedUserId,
          email: resolvedEmail,
          notification_type: eventType,
          resource_type: resourceType || "general",
          resource_id: resourceId || null,
          subject: emailTemplate.subject,
          status: emailResult.status,
          error_message: emailResult.errorMessage || null,
          sent_at: emailResult.success ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
        });
      } catch (logErr) {
        // Logging table optional, do not crash
      }
    } else {
      console.log(`[Notification Dispatcher] No registered email found for student ${resolvedUserId}`);
    }

    return {
      success: true,
      notificationId,
      emailStatus,
    };
  } catch (err: any) {
    console.error("[Notification Dispatcher] Error:", err);
    return {
      success: false,
      emailStatus: "failed",
      error: err?.message || String(err),
    };
  }
}

/**
 * Dispatches notifications to an entire batch, cohort, or list of student IDs.
 */
export async function dispatchBatchNotification(
  options: DispatchBatchNotificationOptions
): Promise<{ total: number; successful: number }> {
  const adminClient = createAdminClient();
  const { batchId, batchName, studentIds, isCommon } = options;

  try {
    let targetStudents: any[] = [];

    if (studentIds && studentIds.length > 0) {
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email")
        .in("id", studentIds);
      targetStudents = data || [];
    } else if (isCommon || batchName === "Common (All Batches)") {
      // Fetch all active students
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email")
        .eq("role", "student")
        .eq("status", "active")
        .limit(500);
      targetStudents = data || [];
    } else if (batchId || batchName) {
      // Fetch batch members or profiles assigned to this batch
      const filterConditions = [];
      if (batchId) filterConditions.push(`batch_id.eq.${batchId}`);
      if (batchName) {
        filterConditions.push(`batch.eq.${batchName}`);
        filterConditions.push(`batch_name.eq.${batchName}`);
      }

      const { data: directProfiles } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email")
        .or(filterConditions.join(","))
        .limit(500);

      targetStudents = directProfiles || [];
    }

    if (targetStudents.length === 0) {
      console.log("[Notification Dispatcher] No target students found for batch notification.");
      return { total: 0, successful: 0 };
    }

    // Process all students concurrently with individual failure isolation
    const results = await Promise.allSettled(
      targetStudents.map((s) =>
        dispatchStudentNotification({
          studentUserId: s.user_id || s.id,
          profileId: s.id,
          studentEmail: s.email,
          studentName: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
          eventType: options.eventType,
          title: options.title,
          message: options.message,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          targetUrl: options.targetUrl,
          assignedBy: options.assignedBy,
          category: options.category,
          dueDate: options.dueDate,
          duration: options.duration,
        })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    console.log(`[Notification Dispatcher] Batch dispatched to ${successful}/${targetStudents.length} students.`);

    return { total: targetStudents.length, successful };
  } catch (err) {
    console.error("[Notification Dispatcher] Batch notification error:", err);
    return { total: 0, successful: 0 };
  }
}
