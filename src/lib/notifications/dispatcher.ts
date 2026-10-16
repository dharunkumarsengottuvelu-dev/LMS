/**
 * SENSILEARN LMS — CENTRAL EVENT NOTIFICATION & DIRECT REDIRECT DISPATCHER
 * 
 * Enterprise event-driven notification hub connecting:
 * Business Actions -> Event -> Recipient Resolution -> MNC Template -> Direct Redirect URL -> SMTP Dispatch -> Delivery Logging.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isValidEmail } from "@/lib/email/email-service";
import {
  generateCoursePublishedEmail,
  generateCourseUpdatedEmail,
  generatePracticePublishedEmail,
  generatePracticeUpdatedEmail,
  generateCodeLabPublishedEmail,
  generateCodeLabUpdatedEmail,
  generateCodingProblemPublishedEmail,
  generateCodingProblemUpdatedEmail,
  generateAssessmentAssignedEmail,
  generateAssessmentUpdatedEmail,
  generateAssessmentDeadlineChangedEmail,
  generateAssignmentAssignedEmail,
  generateAssignmentUpdatedEmail,
  generateAssignmentDeadlineChangedEmail,
  generateAssignmentReminderEmail,
  generateAnnouncementEmail,
  generateBatchUpdatedEmail,
  generateStudentAddedToBatchEmail,
  generateResultPublishedEmail,
  generateCertificateGeneratedEmail,
  generateAssignmentSubmissionTrainerEmail,
  generateAssessmentCompletionTrainerEmail,
  generateStudentWelcomeEmail,
  generateTrainerWelcomeEmail,
  generatePasswordResetEmail,
  generateEmailVerificationEmail,
  generateLiveClassScheduledEmail,
  buildMncEmailLayout,
} from "@/lib/email/email-templates";
import { getAbsoluteUrl } from "@/config/site";

export type LMSEventType =
  | "COURSE_CREATED"
  | "COURSE_PUBLISHED"
  | "COURSE_UPDATED"
  | "PRACTICE_CREATED"
  | "PRACTICE_PUBLISHED"
  | "PRACTICE_UPDATED"
  | "CODELAB_CREATED"
  | "CODELAB_PUBLISHED"
  | "CODELAB_UPDATED"
  | "CODING_PROBLEM_CREATED"
  | "CODING_PROBLEM_PUBLISHED"
  | "CODING_PROBLEM_UPDATED"
  | "ASSESSMENT_CREATED"
  | "ASSESSMENT_PUBLISHED"
  | "ASSESSMENT_ASSIGNED"
  | "ASSESSMENT_UPDATED"
  | "ASSESSMENT_SCHEDULE_CHANGED"
  | "ASSESSMENT_DEADLINE_CHANGED"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_PUBLISHED"
  | "ASSIGNMENT_ASSIGNED"
  | "ASSIGNMENT_UPDATED"
  | "ASSIGNMENT_DEADLINE_CHANGED"
  | "ASSIGNMENT_REMINDER"
  | "ANNOUNCEMENT_CREATED"
  | "ANNOUNCEMENT_PUBLISHED"
  | "ANNOUNCEMENT_UPDATED"
  | "BATCH_CREATED"
  | "BATCH_UPDATED"
  | "STUDENT_ADDED_TO_BATCH"
  | "STUDENT_REMOVED_FROM_BATCH"
  | "STUDENT_CREATED"
  | "TRAINER_CREATED"
  | "ASSESSMENT_SUBMITTED"
  | "ASSIGNMENT_SUBMITTED"
  | "RESULT_PUBLISHED"
  | "CERTIFICATE_GENERATED"
  | "PASSWORD_RESET_REQUESTED"
  | "EMAIL_VERIFICATION_REQUESTED"
  | "LIVE_CLASS_SCHEDULED"
  // Legacy aliases
  | "course_assigned"
  | "course_updated"
  | "assessment_assigned"
  | "test_scheduled"
  | "live_class_scheduled"
  | "practice_assigned"
  | "result_published"
  | "certificate_issued"
  | "announcement"
  | "general";

export interface LMSEventPayload {
  eventType: LMSEventType;
  isDraft?: boolean;
  status?: string;

  // Targeting
  recipientUserIds?: string[];
  recipientEmails?: string[];
  batchId?: string;
  batchName?: string;
  isCommon?: boolean; // Targets all active students
  targetRole?: "student" | "trainer" | "all";

  // Entity Details
  resourceType?: "course" | "practice" | "codelab" | "problem" | "assessment" | "test" | "assignment" | "announcement" | "batch" | "result" | "certificate" | "live_class" | "user";
  resourceId?: string;
  targetUrl: string; // The direct relative or absolute URL to the exact resource

  // Contextual Properties
  title?: string;
  name?: string;
  courseName?: string;
  trainerName?: string;
  studentName?: string;
  assignedBy?: string;
  category?: string;
  difficulty?: string;
  duration?: string;
  totalMarks?: string | number;
  passingPercentage?: string | number;
  dueDate?: string;
  previousDeadline?: string;
  newDeadline?: string;
  changes?: string;
  changeSummary?: string;
  score?: string | number;
  percentage?: string | number;
  certificateId?: string;
  customMessage?: string;
}

export interface DispatchStudentNotificationOptions {
  studentUserId?: string;
  profileId?: string;
  studentEmail?: string;
  studentName?: string;
  eventType: LMSEventType;
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
  trainerIds?: string[];
  isCommon?: boolean;
  targetRole?: "student" | "trainer" | "all";
  eventType: LMSEventType;
  title: string;
  message: string;
  resourceType?: "course" | "assessment" | "test" | "live_class" | "practice" | "assignment" | "announcement";
  resourceId?: string;
  targetUrl: string;
  assignedBy?: string;
  category?: string;
  dueDate?: string;
  duration?: string;
  isDraft?: boolean;
}

/**
 * Normalizes legacy event types into standard uppercase LMSEventType.
 */
function normalizeEventType(evt: LMSEventType): LMSEventType {
  const map: Record<string, LMSEventType> = {
    course_assigned: "COURSE_PUBLISHED",
    course_updated: "COURSE_UPDATED",
    assessment_assigned: "ASSESSMENT_ASSIGNED",
    test_scheduled: "ASSESSMENT_ASSIGNED",
    practice_assigned: "PRACTICE_PUBLISHED",
    live_class_scheduled: "LIVE_CLASS_SCHEDULED",
    result_published: "RESULT_PUBLISHED",
    certificate_issued: "CERTIFICATE_GENERATED",
    announcement: "ANNOUNCEMENT_PUBLISHED",
  };
  return map[evt] || evt;
}

/**
 * Resolves the appropriate MNC email template based on event type.
 */
function resolveEmailTemplate(
  eventType: LMSEventType,
  recipientName: string,
  event: LMSEventPayload,
  directRedirectUrl: string
): { subject: string; html: string; text: string; ctaText: string } {
  const norm = normalizeEventType(eventType);
  const resourceTitle = event.name || event.title || event.courseName || "Learning Resource";

  switch (norm) {
    case "COURSE_PUBLISHED":
    case "COURSE_CREATED": {
      const res = generateCoursePublishedEmail({
        recipientName,
        courseName: resourceTitle,
        trainerName: event.trainerName || event.assignedBy,
        batchName: event.batchName,
        courseUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW COURSE" };
    }

    case "COURSE_UPDATED": {
      const res = generateCourseUpdatedEmail({
        recipientName,
        courseName: resourceTitle,
        updatedBy: event.assignedBy || event.trainerName,
        changeSummary: event.changeSummary || event.changes,
        courseUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW UPDATED COURSE" };
    }

    case "PRACTICE_PUBLISHED":
    case "PRACTICE_CREATED": {
      const res = generatePracticePublishedEmail({
        recipientName,
        practiceName: resourceTitle,
        category: event.category,
        duration: event.duration,
        totalMarks: event.totalMarks,
        practiceUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "START PRACTICE" };
    }

    case "PRACTICE_UPDATED": {
      const res = generatePracticeUpdatedEmail({
        recipientName,
        practiceName: resourceTitle,
        updatedBy: event.assignedBy,
        changeSummary: event.changeSummary || event.changes,
        practiceUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW UPDATED PRACTICE" };
    }

    case "CODELAB_PUBLISHED":
    case "CODELAB_CREATED": {
      const res = generateCodeLabPublishedEmail({
        recipientName,
        codelabName: resourceTitle,
        courseName: event.courseName,
        difficulty: event.difficulty,
        codelabUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "OPEN CODE LAB" };
    }

    case "CODELAB_UPDATED": {
      const res = generateCodeLabUpdatedEmail({
        recipientName,
        codelabName: resourceTitle,
        updatedBy: event.assignedBy,
        codelabUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW UPDATED CODE LAB" };
    }

    case "CODING_PROBLEM_PUBLISHED":
    case "CODING_PROBLEM_CREATED": {
      const res = generateCodingProblemPublishedEmail({
        recipientName,
        problemName: resourceTitle,
        topic: event.category,
        difficulty: event.difficulty,
        estimatedDuration: event.duration,
        problemUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "SOLVE CHALLENGE" };
    }

    case "CODING_PROBLEM_UPDATED": {
      const res = generateCodingProblemUpdatedEmail({
        recipientName,
        problemName: resourceTitle,
        updatedBy: event.assignedBy,
        changeSummary: event.changeSummary || event.changes,
        problemUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW UPDATED PROBLEM" };
    }

    case "ASSESSMENT_ASSIGNED":
    case "ASSESSMENT_PUBLISHED": {
      const res = generateAssessmentAssignedEmail({
        recipientName,
        assessmentName: resourceTitle,
        duration: event.duration,
        totalMarks: event.totalMarks,
        passingPercentage: event.passingPercentage,
        deadline: event.dueDate,
        startDate: event.dueDate,
        assessmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW ASSESSMENT" };
    }

    case "ASSESSMENT_UPDATED": {
      const res = generateAssessmentUpdatedEmail({
        recipientName,
        assessmentName: resourceTitle,
        updatedBy: event.assignedBy,
        changes: event.changes || event.changeSummary,
        assessmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW UPDATED ASSESSMENT" };
    }

    case "ASSESSMENT_SCHEDULE_CHANGED":
    case "ASSESSMENT_DEADLINE_CHANGED": {
      const res = generateAssessmentDeadlineChangedEmail({
        recipientName,
        assessmentName: resourceTitle,
        previousDeadline: event.previousDeadline,
        newDeadline: event.newDeadline || event.dueDate || "Updated Deadline",
        assessmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW ASSESSMENT" };
    }

    case "ASSIGNMENT_ASSIGNED":
    case "ASSIGNMENT_PUBLISHED":
    case "ASSIGNMENT_CREATED": {
      const res = generateAssignmentAssignedEmail({
        recipientName,
        assignmentName: resourceTitle,
        courseName: event.courseName,
        trainerName: event.trainerName || event.assignedBy,
        maxMarks: event.totalMarks,
        dueDate: event.dueDate || "See portal",
        assignmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW ASSIGNMENT" };
    }

    case "ASSIGNMENT_UPDATED": {
      const res = generateAssignmentUpdatedEmail({
        recipientName,
        assignmentName: resourceTitle,
        updatedBy: event.assignedBy,
        changes: event.changes || event.changeSummary,
        assignmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW UPDATED ASSIGNMENT" };
    }

    case "ASSIGNMENT_DEADLINE_CHANGED": {
      const res = generateAssignmentDeadlineChangedEmail({
        recipientName,
        assignmentName: resourceTitle,
        previousDeadline: event.previousDeadline,
        newDeadline: event.newDeadline || event.dueDate || "Updated Cutoff",
        assignmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW ASSIGNMENT" };
    }

    case "ASSIGNMENT_REMINDER": {
      const res = generateAssignmentReminderEmail({
        recipientName,
        assignmentName: resourceTitle,
        deadline: event.dueDate || "Approaching Cutoff",
        assignmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "SUBMIT ASSIGNMENT" };
    }

    case "ANNOUNCEMENT_PUBLISHED":
    case "ANNOUNCEMENT_CREATED": {
      const res = generateAnnouncementEmail({
        recipientName,
        announcementTitle: event.title || resourceTitle,
        announcementMessage: event.customMessage || "An important institutional update has been released.",
        publishedBy: event.assignedBy,
        announcementUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW ANNOUNCEMENT" };
    }

    case "BATCH_UPDATED": {
      const res = generateBatchUpdatedEmail({
        recipientName,
        batchName: event.batchName || resourceTitle,
        changes: event.changes || event.changeSummary,
        batchUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW BATCH" };
    }

    case "STUDENT_ADDED_TO_BATCH": {
      const res = generateStudentAddedToBatchEmail({
        recipientName,
        batchName: event.batchName || resourceTitle,
        programName: event.courseName,
        trainerName: event.trainerName || event.assignedBy,
        batchUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW BATCH" };
    }

    case "RESULT_PUBLISHED": {
      const res = generateResultPublishedEmail({
        recipientName,
        assessmentName: resourceTitle,
        score: event.score ?? "Completed",
        totalMarks: event.totalMarks ?? 100,
        percentage: event.percentage ?? 100,
        status: "Passed",
        resultUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW RESULT" };
    }

    case "CERTIFICATE_GENERATED": {
      const res = generateCertificateGeneratedEmail({
        recipientName,
        courseName: resourceTitle,
        certificateId: event.certificateId || `CERT-${Date.now().toString().slice(-6)}`,
        certificateUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW CERTIFICATE" };
    }

    case "ASSIGNMENT_SUBMITTED": {
      const res = generateAssignmentSubmissionTrainerEmail({
        trainerName: recipientName,
        studentName: event.studentName || "Student",
        assignmentName: resourceTitle,
        courseName: event.courseName,
        batchName: event.batchName,
        submissionUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "REVIEW SUBMISSION" };
    }

    case "ASSESSMENT_SUBMITTED": {
      const res = generateAssessmentCompletionTrainerEmail({
        trainerName: recipientName,
        studentName: event.studentName || "Student",
        assessmentName: resourceTitle,
        batchName: event.batchName,
        score: event.score,
        submissionUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "REVIEW SUBMISSION" };
    }

    case "STUDENT_CREATED": {
      const res = generateStudentWelcomeEmail({
        studentName: recipientName,
        studentEmail: event.recipientEmails?.[0] || "",
        batchName: event.batchName,
        programName: event.courseName,
        dashboardUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "ACCESS SENSILEARN" };
    }

    case "TRAINER_CREATED": {
      const res = generateTrainerWelcomeEmail({
        trainerName: recipientName,
        trainerEmail: event.recipientEmails?.[0] || "",
        trainerDashboardUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "ACCESS TRAINER PORTAL" };
    }

    case "PASSWORD_RESET_REQUESTED": {
      const res = generatePasswordResetEmail({
        recipientName,
        resetUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "RESET PASSWORD" };
    }

    case "EMAIL_VERIFICATION_REQUESTED": {
      const res = generateEmailVerificationEmail({
        recipientName,
        verificationUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VERIFY EMAIL ADDRESS" };
    }

    case "LIVE_CLASS_SCHEDULED": {
      const res = generateLiveClassScheduledEmail({
        recipientName,
        classTitle: resourceTitle,
        trainerName: event.trainerName || event.assignedBy,
        scheduledTime: event.dueDate,
        duration: event.duration,
        platform: event.category,
        liveClassUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "JOIN LIVE CLASS" };
    }

    default: {
      const res = buildMncEmailLayout({
        recipientName,
        categoryLabel: "Platform Notification",
        title: event.title || resourceTitle,
        preheader: event.title || resourceTitle,
        message: event.customMessage || "An update is available on your SensiLearn LMS portal.",
        ctaText: "VIEW DETAILS",
        redirectUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW DETAILS" };
    }
  }
}

/**
 * Main Central Event Dispatcher for Sensilearn LMS.
 * Handles recipient resolution, deduplication, template selection, and non-blocking delivery.
 */
export async function dispatchLMSEvent(event: LMSEventPayload): Promise<{
  success: boolean;
  totalRecipients: number;
  dispatched: number;
  skippedDraft?: boolean;
}> {
  // CRITICAL RULE 12: Draft vs Published check
  if (event.isDraft || event.status === "draft") {
    console.log(`[Notification Hub] Skipped notification for draft item (${event.eventType}: ${event.title || event.name})`);
    return { success: true, totalRecipients: 0, dispatched: 0, skippedDraft: true };
  }

  const adminClient = createAdminClient();
  const directRedirectUrl = event.targetUrl.startsWith("http")
    ? event.targetUrl
    : getAbsoluteUrl(event.targetUrl);

  try {
    // 1. Resolve Target Profiles
    const recipientMap = new Map<string, any>(); // Key: email or user_id for strict deduplication

    // Case A: Specific User IDs
    if (event.recipientUserIds && event.recipientUserIds.length > 0) {
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role")
        .in("id", event.recipientUserIds);
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    }

    // Case B: Specific Emails provided directly
    if (event.recipientEmails && event.recipientEmails.length > 0) {
      const cleanEmails = event.recipientEmails.map((e) => e.trim().toLowerCase()).filter(isValidEmail);
      if (cleanEmails.length > 0) {
        const { data } = await adminClient
          .from("profiles")
          .select("id, user_id, first_name, last_name, email, role")
          .in("email", cleanEmails);
        (data || []).forEach((u) => {
          recipientMap.set(u.email.toLowerCase(), u);
        });
        // Also add any email that wasn't in profiles
        cleanEmails.forEach((em) => {
          if (!recipientMap.has(em)) {
            recipientMap.set(em, { email: em, first_name: em.split("@")[0], role: "user" });
          }
        });
      }
    }

    // Case C: Role targeting
    if (event.targetRole === "trainer") {
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role")
        .eq("role", "trainer")
        .limit(500);
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    } else if (event.targetRole === "all") {
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role")
        .or("role.eq.student,role.eq.trainer,role.is.null")
        .limit(1000);
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    } else if (event.isCommon) {
      // All active students
      const { data } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role")
        .eq("role", "student")
        .eq("status", "active")
        .limit(1000);
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    } else if (event.batchId || event.batchName) {
      // Batch-specific recipients
      const filterConditions = [];
      if (event.batchId) filterConditions.push(`batch_id.eq.${event.batchId}`);
      if (event.batchName) {
        filterConditions.push(`batch.eq.${event.batchName}`);
        filterConditions.push(`batch_name.eq.${event.batchName}`);
      }

      const { data: batchProfiles } = await adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role")
        .or(filterConditions.join(","))
        .limit(500);

      (batchProfiles || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    }

    const uniqueRecipients = Array.from(recipientMap.values());
    if (uniqueRecipients.length === 0) {
      return { success: true, totalRecipients: 0, dispatched: 0 };
    }

    // 2. Dispatch concurrently to all deduplicated recipients
    let dispatchedCount = 0;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    await Promise.allSettled(
      uniqueRecipients.map(async (u) => {
        try {
          const userId = u.user_id || u.id || "system";
          const recipientName =
            (u.first_name || u.last_name)
              ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
              : (u.email ? u.email.split("@")[0] : (u.role === "trainer" ? "Trainer" : "Student"));
          const recipientEmail = u.email || "";

          // Deduplication: check if same notification was sent in last 10 minutes
          const eventTitle = event.title || event.name || "LMS Notification";
          const { data: recentDups } = await adminClient
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("title", eventTitle)
            .gte("created_at", tenMinutesAgo)
            .limit(1);

          if (recentDups && recentDups.length > 0) {
            return;
          }

          // Build template
          const template = resolveEmailTemplate(
            event.eventType,
            recipientName,
            event,
            directRedirectUrl
          );

          // Create In-App Notification in Supabase
          try {
            await adminClient.from("notifications").insert({
              user_id: userId,
              type: event.eventType.toLowerCase(),
              title: eventTitle,
              message: event.customMessage || template.subject,
              is_read: false,
              link_url: event.targetUrl,
              metadata: {
                event_type: event.eventType,
                redirect_url: directRedirectUrl,
                cta_text: template.ctaText,
                resource_type: event.resourceType,
                resource_id: event.resourceId,
              },
              created_at: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.warn("[Notification Hub] In-app notification insert warning:", dbErr);
          }

          // Send Email if valid email exists
          if (isValidEmail(recipientEmail)) {
            await sendEmail({
              to: recipientEmail,
              recipientName,
              subject: template.subject,
              html: template.html,
              text: template.text,
              notificationType: event.eventType,
              resourceType: event.resourceType,
              resourceId: event.resourceId,
              redirectUrl: directRedirectUrl,
              ctaText: template.ctaText,
            });
            dispatchedCount++;
          }
        } catch (itemErr) {
          console.error("[Notification Hub] Recipient dispatch exception:", itemErr);
        }
      })
    );

    console.log(`[Notification Hub] Event "${event.eventType}" dispatched to ${dispatchedCount}/${uniqueRecipients.length} recipients.`);
    return { success: true, totalRecipients: uniqueRecipients.length, dispatched: dispatchedCount };
  } catch (error) {
    console.error("[Notification Hub] Top-level dispatch error:", error);
    return { success: false, totalRecipients: 0, dispatched: 0 };
  }
}

/**
 * Backward compatibility wrapper for dispatchBatchNotification.
 */
export async function dispatchBatchNotification(
  options: DispatchBatchNotificationOptions
): Promise<{ total: number; successful: number }> {
  const result = await dispatchLMSEvent({
    eventType: options.eventType,
    isDraft: options.isDraft,
    batchId: options.batchId,
    batchName: options.batchName,
    recipientUserIds: options.studentIds || options.trainerIds,
    isCommon: options.isCommon,
    targetRole: options.targetRole,
    resourceType: options.resourceType as any,
    resourceId: options.resourceId,
    targetUrl: options.targetUrl,
    title: options.title,
    name: options.title,
    customMessage: options.message,
    assignedBy: options.assignedBy,
    category: options.category,
    dueDate: options.dueDate,
    duration: options.duration,
  });

  return { total: result.totalRecipients, successful: result.dispatched };
}

/**
 * Backward compatibility wrapper for dispatchStudentNotification.
 */
export async function dispatchStudentNotification(
  options: DispatchStudentNotificationOptions
): Promise<{ success: boolean; emailStatus: string; error?: string }> {
  const result = await dispatchLMSEvent({
    eventType: options.eventType,
    recipientUserIds: options.profileId ? [options.profileId] : (options.studentUserId ? [options.studentUserId] : undefined),
    recipientEmails: options.studentEmail ? [options.studentEmail] : undefined,
    resourceType: options.resourceType as any,
    resourceId: options.resourceId,
    targetUrl: options.targetUrl,
    title: options.title,
    name: options.title,
    studentName: options.studentName,
    customMessage: options.message,
    assignedBy: options.assignedBy,
    category: options.category,
    dueDate: options.dueDate,
    duration: options.duration,
    score: options.score,
  });

  return {
    success: result.success,
    emailStatus: result.dispatched > 0 ? "sent" : "skipped",
  };
}

/**
 * Backward compatibility wrapper for dispatchTrainerNotification.
 */
export async function dispatchTrainerNotification(options: {
  trainerUserId?: string;
  profileId?: string;
  trainerEmail?: string;
  trainerName?: string;
  eventType: LMSEventType;
  title: string;
  message: string;
  targetUrl: string;
  resourceType?: "course" | "assessment" | "test" | "live_class" | "practice" | "assignment" | "announcement";
  resourceId?: string;
  assignedBy?: string;
}): Promise<{ success: boolean; emailStatus: string; error?: string }> {
  return dispatchStudentNotification({
    studentUserId: options.trainerUserId,
    profileId: options.profileId,
    studentEmail: options.trainerEmail,
    studentName: options.trainerName || "Trainer",
    eventType: options.eventType,
    title: options.title,
    message: options.message,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    targetUrl: options.targetUrl,
    assignedBy: options.assignedBy || "SensiGroup Administrator",
  });
}
