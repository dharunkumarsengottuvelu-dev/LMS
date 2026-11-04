/**
 * SENSILEARN LMS — CENTRAL EVENT NOTIFICATION & DIRECT REDIRECT DISPATCHER
 * 
 * Enterprise event-driven notification hub connecting:
 * Business Actions -> Event -> Recipient Resolution -> MNC Template -> Direct Redirect URL -> SMTP Dispatch -> Delivery Logging.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isValidEmail } from "@/lib/email/email-service";
import {
  // 20 Primary LMS Activity Templates
  generateCoursePublishedEmail,
  generatePracticePublishedEmail,
  generateMcqPracticePublishedEmail,
  generateCodingPracticePublishedEmail,
  generateTestPublishedEmail,
  generateAssessmentScheduledEmail,
  generateLiveClassScheduledEmail,
  generateLiveClassRescheduledEmail,
  generateLiveClassCancelledEmail,
  generateCodingChallengePublishedEmail,
  generateProgrammingContestEmail,
  generateAssignmentAssignedEmail,
  generateProjectAssignedEmail,
  generateDeadlineReminderEmail,
  generateResultPublishedEmail,
  generateFeedbackEmail,
  generateStudyMaterialEmail,
  generateAnnouncementEmail,
  generateBatchAllocationEmail,
  generateCourseUpdatedEmail,

  // Operational / System Builders
  generateCertificateGeneratedEmail,
  generateAssignmentSubmissionTrainerEmail,
  generateAssessmentCompletionTrainerEmail,
  generateStudentWelcomeEmail,
  generateTrainerWelcomeEmail,
  generatePasswordResetEmail,
  generateEmailVerificationEmail,
  buildMncEmailLayout,
} from "@/lib/email/email-templates";
import { getAbsoluteUrl } from "@/config/site";

export type LMSEventType =
  // The 20 Primary LMS Activity Events
  | "COURSE_PUBLISHED"
  | "PRACTICE_PUBLISHED"
  | "MCQ_PRACTICE_PUBLISHED"
  | "CODING_PRACTICE_PUBLISHED"
  | "TEST_PUBLISHED"
  | "ASSESSMENT_SCHEDULED"
  | "LIVE_CLASS_SCHEDULED"
  | "LIVE_CLASS_RESCHEDULED"
  | "LIVE_CLASS_CANCELLED"
  | "CODING_CHALLENGE_PUBLISHED"
  | "PROGRAMMING_CONTEST_PUBLISHED"
  | "ASSIGNMENT_ASSIGNED"
  | "PROJECT_ASSIGNED"
  | "DEADLINE_REMINDER"
  | "RESULT_PUBLISHED"
  | "FEEDBACK_PUBLISHED"
  | "STUDY_MATERIAL_PUBLISHED"
  | "ANNOUNCEMENT_PUBLISHED"
  | "BATCH_ALLOCATED"
  | "COURSE_UPDATED"
  // Operational and legacy aliases
  | "COURSE_CREATED"
  | "PRACTICE_CREATED"
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
  | "ASSIGNMENT_UPDATED"
  | "ASSIGNMENT_DEADLINE_CHANGED"
  | "ASSIGNMENT_REMINDER"
  | "ANNOUNCEMENT_CREATED"
  | "ANNOUNCEMENT_UPDATED"
  | "BATCH_CREATED"
  | "BATCH_UPDATED"
  | "STUDENT_ADDED_TO_BATCH"
  | "STUDENT_REMOVED_FROM_BATCH"
  | "STUDENT_CREATED"
  | "TRAINER_CREATED"
  | "ASSESSMENT_SUBMITTED"
  | "ASSIGNMENT_SUBMITTED"
  | "CERTIFICATE_GENERATED"
  | "PASSWORD_RESET_REQUESTED"
  | "EMAIL_VERIFICATION_REQUESTED"
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
  batchIds?: string[];
  batchName?: string;
  batchNames?: string[];
  institutionId?: string;
  isCommon?: boolean; // Targets all active students (scoped to institution if institutionId is set)
  targetRole?: "student" | "trainer" | "all";

  // Entity Details
  resourceType?:
    | "course"
    | "practice"
    | "codelab"
    | "problem"
    | "assessment"
    | "test"
    | "assignment"
    | "announcement"
    | "batch"
    | "result"
    | "certificate"
    | "live_class"
    | "user"
    | "project"
    | "material"
    | "feedback";
  resourceId?: string;
  targetUrl: string; // The direct relative or absolute URL to the exact resource

  // Contextual Properties
  title?: string;
  name?: string;
  courseName?: string;
  courseDescription?: string;
  trainerName?: string;
  studentName?: string;
  assignedBy?: string;
  category?: string;
  topicName?: string;
  totalQuestions?: string | number;
  programmingLanguage?: string;
  languages?: string;
  difficulty?: string;
  duration?: string;
  totalMarks?: string | number;
  passingPercentage?: string | number;
  dueDate?: string;
  deadline?: string;
  previousDeadline?: string;
  newDeadline?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  assessmentDate?: string;
  sessionDate?: string;
  sessionTime?: string;
  oldDate?: string;
  oldTime?: string;
  newDate?: string;
  newTime?: string;
  meetingUrl?: string;
  problemCount?: number | string;
  projectName?: string;
  assignedDate?: string;
  evaluatorName?: string;
  evaluationDate?: string;
  resourceName?: string;
  moduleName?: string;
  programmeName?: string;
  programName?: string;
  institutionName?: string;
  updateDescription?: string;
  updatedDate?: string;
  publishedDate?: string;
  changes?: string;
  changeSummary?: string;
  score?: string | number;
  percentage?: string | number;
  certificateId?: string;
  customMessage?: string;
  activityName?: string;
  activityType?: string;
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
  batchIds?: string[];
  batchNames?: string[];
  institutionId?: string;
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
    assessment_assigned: "ASSESSMENT_SCHEDULED",
    test_scheduled: "TEST_PUBLISHED",
    practice_assigned: "PRACTICE_PUBLISHED",
    live_class_scheduled: "LIVE_CLASS_SCHEDULED",
    result_published: "RESULT_PUBLISHED",
    certificate_issued: "CERTIFICATE_GENERATED",
    announcement: "ANNOUNCEMENT_PUBLISHED",
  };
  return map[evt] || evt;
}

/**
 * Resolves the appropriate MNC email template based on the 20 LMS Activity Types.
 */
function resolveEmailTemplate(
  eventType: LMSEventType,
  recipientName: string,
  event: LMSEventPayload,
  directRedirectUrl: string
): { subject: string; html: string; text: string; ctaText: string } {
  const norm = normalizeEventType(eventType);
  const resourceTitle = event.name || event.title || event.courseName || "Learning Resource";
  const primaryBatchName = event.batchName || (event.batchNames && event.batchNames.length > 0 ? event.batchNames[0] : undefined);

  switch (norm) {
    // 1. COURSE EMAIL TEMPLATE (Section 2)
    case "COURSE_PUBLISHED":
    case "COURSE_CREATED": {
      const res = generateCoursePublishedEmail({
        recipientName,
        courseName: event.courseName || resourceTitle,
        courseDescription: event.courseDescription,
        batchName: primaryBatchName,
        trainerName: event.trainerName || event.assignedBy,
        publishedDate: event.publishedDate,
        courseUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "ACCESS YOUR COURSE" };
    }

    // 2. PRACTICE MODULE EMAIL TEMPLATE (Section 3)
    case "PRACTICE_PUBLISHED":
    case "PRACTICE_CREATED": {
      const res = generatePracticePublishedEmail({
        recipientName,
        practiceName: resourceTitle,
        courseName: event.courseName,
        topicName: event.topicName || event.category,
        batchName: primaryBatchName,
        publishedDate: event.publishedDate,
        practiceUrl: directRedirectUrl,
        duration: event.duration,
        totalMarks: event.totalMarks,
      });
      return { ...res, ctaText: "START PRACTICING" };
    }

    // 3. MCQ PRACTICE EMAIL TEMPLATE (Section 4)
    case "MCQ_PRACTICE_PUBLISHED": {
      const res = generateMcqPracticePublishedEmail({
        recipientName,
        practiceName: resourceTitle,
        courseName: event.courseName,
        topicName: event.topicName || event.category,
        totalQuestions: event.totalQuestions,
        batchName: primaryBatchName,
        practiceUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "START MCQ PRACTICE" };
    }

    // 4. CODING PRACTICE EMAIL TEMPLATE (Section 5)
    case "CODING_PRACTICE_PUBLISHED": {
      const res = generateCodingPracticePublishedEmail({
        recipientName,
        practiceName: resourceTitle,
        programmingLanguage: event.programmingLanguage || event.languages,
        difficulty: event.difficulty,
        courseName: event.courseName,
        batchName: primaryBatchName,
        practiceUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "OPEN CODING PRACTICE" };
    }

    // 5. TEST EMAIL TEMPLATE (Section 6)
    case "TEST_PUBLISHED": {
      const res = generateTestPublishedEmail({
        recipientName,
        testName: resourceTitle,
        courseName: event.courseName,
        batchName: primaryBatchName,
        totalQuestions: event.totalQuestions,
        totalMarks: event.totalMarks,
        duration: event.duration,
        startDate: event.startDate || event.dueDate,
        endDate: event.endDate,
        testUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW TEST DETAILS" };
    }

    // 6. ASSESSMENT EMAIL TEMPLATE (Section 7)
    case "ASSESSMENT_SCHEDULED":
    case "ASSESSMENT_ASSIGNED":
    case "ASSESSMENT_PUBLISHED":
    case "ASSESSMENT_CREATED": {
      const res = generateAssessmentScheduledEmail({
        recipientName,
        assessmentName: resourceTitle,
        courseName: event.courseName,
        batchName: primaryBatchName,
        assessmentDate: event.assessmentDate || event.startDate || event.dueDate,
        startTime: event.startTime,
        duration: event.duration,
        totalMarks: event.totalMarks,
        assessmentUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW ASSESSMENT" };
    }

    // 7. LIVE CLASS EMAIL TEMPLATE (Section 8)
    case "LIVE_CLASS_SCHEDULED": {
      const res = generateLiveClassScheduledEmail({
        recipientName,
        sessionTitle: resourceTitle,
        courseName: event.courseName,
        trainerName: event.trainerName || event.assignedBy,
        batchName: primaryBatchName,
        sessionDate: event.sessionDate || event.startDate || event.dueDate,
        sessionTime: event.sessionTime || event.startTime,
        duration: event.duration,
        meetingUrl: event.meetingUrl,
        liveClassUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "JOIN LIVE CLASS" };
    }

    // 8. LIVE CLASS RESCHEDULE EMAIL TEMPLATE (Section 9)
    case "LIVE_CLASS_RESCHEDULED": {
      const res = generateLiveClassRescheduledEmail({
        recipientName,
        sessionTitle: resourceTitle,
        oldDate: event.oldDate,
        oldTime: event.oldTime,
        newDate: event.newDate || event.sessionDate || event.startDate || "Updated Date",
        newTime: event.newTime || event.sessionTime || event.startTime || "Updated Time",
        trainerName: event.trainerName || event.assignedBy,
        batchName: primaryBatchName,
        liveClassUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW UPDATED SCHEDULE" };
    }

    // 9. LIVE CLASS CANCELLATION EMAIL TEMPLATE (Section 10)
    case "LIVE_CLASS_CANCELLED": {
      const res = generateLiveClassCancelledEmail({
        recipientName,
        sessionTitle: resourceTitle,
        courseName: event.courseName,
        sessionDate: event.sessionDate || event.startDate,
        batchName: primaryBatchName,
        dashboardUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW DASHBOARD" };
    }

    // 10. CODING CHALLENGE EMAIL TEMPLATE (Section 11)
    case "CODING_CHALLENGE_PUBLISHED":
    case "CODING_PROBLEM_PUBLISHED":
    case "CODING_PROBLEM_CREATED": {
      const res = generateCodingChallengePublishedEmail({
        recipientName,
        challengeName: resourceTitle,
        category: event.category,
        difficulty: event.difficulty,
        languages: event.languages || event.programmingLanguage,
        batchName: primaryBatchName,
        deadline: event.deadline || event.dueDate,
        challengeUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "SOLVE CHALLENGE" };
    }

    // 11. PROGRAMMING CONTEST EMAIL TEMPLATE (Section 12)
    case "PROGRAMMING_CONTEST_PUBLISHED": {
      const res = generateProgrammingContestEmail({
        recipientName,
        contestName: resourceTitle,
        batchName: primaryBatchName,
        startDate: event.startDate || event.dueDate,
        startTime: event.startTime,
        duration: event.duration,
        problemCount: event.problemCount,
        contestUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW CONTEST" };
    }

    // 12. ASSIGNMENT EMAIL TEMPLATE (Section 13)
    case "ASSIGNMENT_ASSIGNED":
    case "ASSIGNMENT_PUBLISHED":
    case "ASSIGNMENT_CREATED": {
      const res = generateAssignmentAssignedEmail({
        recipientName,
        assignmentName: resourceTitle,
        courseName: event.courseName,
        batchName: primaryBatchName,
        assignedDate: event.assignedDate,
        dueDate: event.dueDate || event.deadline,
        totalMarks: event.totalMarks,
        assignmentUrl: directRedirectUrl,
        trainerName: event.trainerName || event.assignedBy,
      });
      return { ...res, ctaText: "VIEW ASSIGNMENT" };
    }

    // 13. PROJECT EMAIL TEMPLATE (Section 14)
    case "PROJECT_ASSIGNED": {
      const res = generateProjectAssignedEmail({
        recipientName,
        projectName: event.projectName || resourceTitle,
        courseName: event.courseName,
        batchName: primaryBatchName,
        assignedBy: event.assignedBy,
        trainerName: event.trainerName,
        startDate: event.startDate,
        deadline: event.deadline || event.dueDate,
        projectUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW PROJECT" };
    }

    // 14. DEADLINE REMINDER EMAIL TEMPLATE (Section 15)
    case "DEADLINE_REMINDER":
    case "ASSIGNMENT_REMINDER":
    case "ASSIGNMENT_DEADLINE_CHANGED":
    case "ASSESSMENT_DEADLINE_CHANGED": {
      const res = generateDeadlineReminderEmail({
        recipientName,
        activityName: event.activityName || resourceTitle,
        activityType: event.activityType || event.resourceType || "Academic Activity",
        courseName: event.courseName,
        batchName: primaryBatchName,
        deadline: event.deadline || event.newDeadline || event.dueDate || "Approaching Cutoff",
        activityUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "CONTINUE ACTIVITY" };
    }

    // 15. RESULTS PUBLISHED EMAIL TEMPLATE (Section 16)
    case "RESULT_PUBLISHED": {
      const res = generateResultPublishedEmail({
        recipientName,
        assessmentName: resourceTitle,
        courseName: event.courseName,
        batchName: primaryBatchName,
        publishedDate: event.publishedDate,
        resultUrl: directRedirectUrl,
        score: event.score,
        totalMarks: event.totalMarks,
        percentage: event.percentage,
      });
      return { ...res, ctaText: "VIEW MY RESULTS" };
    }

    // 16. FEEDBACK EMAIL TEMPLATE (Section 17)
    case "FEEDBACK_PUBLISHED": {
      const res = generateFeedbackEmail({
        recipientName,
        activityName: event.activityName || resourceTitle,
        courseName: event.courseName,
        batchName: primaryBatchName,
        trainerName: event.trainerName || event.assignedBy,
        evaluatorName: event.evaluatorName,
        evaluationDate: event.evaluationDate,
        feedbackUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW FEEDBACK" };
    }

    // 17. STUDY MATERIAL EMAIL TEMPLATE (Section 18)
    case "STUDY_MATERIAL_PUBLISHED": {
      const res = generateStudyMaterialEmail({
        recipientName,
        resourceName: event.resourceName || resourceTitle,
        courseName: event.courseName,
        moduleName: event.moduleName,
        batchName: primaryBatchName,
        trainerName: event.trainerName || event.assignedBy,
        materialUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "ACCESS STUDY MATERIAL" };
    }

    // 18. ANNOUNCEMENT EMAIL TEMPLATE (Section 19)
    case "ANNOUNCEMENT_PUBLISHED":
    case "ANNOUNCEMENT_CREATED": {
      const res = generateAnnouncementEmail({
        recipientName,
        announcementTitle: event.title || resourceTitle,
        announcementDescription: event.customMessage,
        batchName: primaryBatchName,
        authorName: event.assignedBy,
        publishedDate: event.publishedDate,
        announcementUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "READ ANNOUNCEMENT" };
    }

    // 19. BATCH ALLOCATION EMAIL TEMPLATE (Section 20)
    case "BATCH_ALLOCATED":
    case "STUDENT_ADDED_TO_BATCH":
    case "BATCH_UPDATED": {
      const res = generateBatchAllocationEmail({
        recipientName,
        batchName: event.batchName || resourceTitle,
        programmeName: event.programmeName || event.programName || event.courseName,
        institutionName: event.institutionName,
        trainerName: event.trainerName || event.assignedBy,
        startDate: event.startDate,
        dashboardUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "OPEN STUDENT DASHBOARD" };
    }

    // 20. COURSE UPDATE EMAIL TEMPLATE (Section 21)
    case "COURSE_UPDATED": {
      const res = generateCourseUpdatedEmail({
        recipientName,
        courseName: event.courseName || resourceTitle,
        batchName: primaryBatchName,
        updateDescription: event.updateDescription || event.changeSummary || event.changes,
        updatedBy: event.assignedBy || event.trainerName,
        updatedDate: event.updatedDate,
        courseUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "VIEW COURSE UPDATE" };
    }

    // Operational System Events
    case "CODELAB_PUBLISHED":
    case "CODELAB_CREATED": {
      const res = generateCodingPracticePublishedEmail({
        recipientName,
        practiceName: resourceTitle,
        courseName: event.courseName,
        difficulty: event.difficulty,
        batchName: primaryBatchName,
        practiceUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "OPEN CODE LAB" };
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
        batchName: primaryBatchName,
        submissionUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "REVIEW SUBMISSION" };
    }

    case "ASSESSMENT_SUBMITTED": {
      const res = generateAssessmentCompletionTrainerEmail({
        trainerName: recipientName,
        studentName: event.studentName || "Student",
        assessmentName: resourceTitle,
        batchName: primaryBatchName,
        score: event.score,
        submissionUrl: directRedirectUrl,
      });
      return { ...res, ctaText: "REVIEW SUBMISSION" };
    }

    case "STUDENT_CREATED": {
      const res = generateStudentWelcomeEmail({
        studentName: recipientName,
        studentEmail: event.recipientEmails?.[0] || "",
        batchName: primaryBatchName,
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
 * Handles recipient resolution, deduplication, batch filtering, template selection, and non-blocking delivery.
 */
export async function dispatchLMSEvent(event: LMSEventPayload): Promise<{
  success: boolean;
  totalRecipients: number;
  dispatched: number;
  skippedDraft?: boolean;
}> {
  // CRITICAL RULE: Draft vs Published check (no emails for unassigned drafts)
  if (event.isDraft || event.status === "draft") {
    console.log(`[Notification Hub] Skipped notification for draft item (${event.eventType}: ${event.title || event.name})`);
    return { success: true, totalRecipients: 0, dispatched: 0, skippedDraft: true };
  }

  const adminClient = createAdminClient();
  const directRedirectUrl = event.targetUrl.startsWith("http")
    ? event.targetUrl
    : getAbsoluteUrl(event.targetUrl);

  try {
    // 1. Resolve Target Profiles with strict deduplication
    const recipientMap = new Map<string, any>(); // Key: email or user_id for strict deduplication

    // Case A: Specific User IDs (Individual assignment or targeted test participants)
    if (event.recipientUserIds && event.recipientUserIds.length > 0) {
      let query = adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role, institution_id")
        .in("id", event.recipientUserIds);

      if (event.institutionId) {
        query = query.eq("institution_id", event.institutionId);
      }

      const { data } = await query;
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    }

    // Case B: Specific Emails provided directly
    if (event.recipientEmails && event.recipientEmails.length > 0) {
      const cleanEmails = event.recipientEmails.map((e) => e.trim().toLowerCase()).filter(isValidEmail);
      if (cleanEmails.length > 0) {
        let query = adminClient
          .from("profiles")
          .select("id, user_id, first_name, last_name, email, role, institution_id")
          .in("email", cleanEmails);

        if (event.institutionId) {
          query = query.eq("institution_id", event.institutionId);
        }

        const { data } = await query;
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
      let query = adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role, institution_id")
        .eq("role", "trainer");

      if (event.institutionId) {
        query = query.eq("institution_id", event.institutionId);
      }

      const { data } = await query.limit(500);
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    } else if (event.targetRole === "all") {
      let query = adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role, institution_id")
        .or("role.eq.student,role.eq.trainer,role.is.null");

      if (event.institutionId) {
        query = query.eq("institution_id", event.institutionId);
      }

      const { data } = await query.limit(1000);
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    } else if (event.isCommon) {
      // All active students, isolated by institution if provided
      let query = adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role, institution_id")
        .eq("role", "student")
        .eq("status", "active");

      if (event.institutionId) {
        query = query.eq("institution_id", event.institutionId);
      }

      const { data } = await query.limit(1000);
      (data || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    }

    // Case D: Single Batch or Multiple Batches Resolution
    const allBatchIds: string[] = [];
    if (event.batchId) allBatchIds.push(event.batchId);
    if (event.batchIds && Array.isArray(event.batchIds)) {
      allBatchIds.push(...event.batchIds.filter(Boolean));
    }

    const allBatchNames: string[] = [];
    if (event.batchName) allBatchNames.push(event.batchName);
    if (event.batchNames && Array.isArray(event.batchNames)) {
      allBatchNames.push(...event.batchNames.filter(Boolean));
    }

    if (allBatchIds.length > 0 || allBatchNames.length > 0) {
      const filterConditions: string[] = [];
      allBatchIds.forEach((bId) => {
        filterConditions.push(`batch_id.eq.${bId}`);
      });
      allBatchNames.forEach((bName) => {
        filterConditions.push(`batch.eq.${bName}`);
        filterConditions.push(`batch_name.eq.${bName}`);
      });

      let query = adminClient
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, role, institution_id")
        .or(filterConditions.join(","));

      if (event.institutionId) {
        query = query.eq("institution_id", event.institutionId);
      }

      const { data: batchProfiles } = await query.limit(1000);

      (batchProfiles || []).forEach((u) => {
        const key = (u.email || u.user_id || u.id).toLowerCase();
        recipientMap.set(key, u);
      });
    }

    const uniqueRecipients = Array.from(recipientMap.values());
    if (uniqueRecipients.length === 0) {
      return { success: true, totalRecipients: 0, dispatched: 0 };
    }

    // 2. Dispatch with batch in-app notifications and non-blocking background emails
    let dispatchedCount = 0;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const eventTitle = event.title || event.name || "LMS Notification";

    // Batch query recent duplicate notifications for all candidate recipients at once
    const userIds = uniqueRecipients.map((u) => u.user_id || u.id || "system").filter(Boolean);
    const recentDupsMap = new Set<string>();
    try {
      const { data: recentDups } = await adminClient
        .from("notifications")
        .select("user_id")
        .in("user_id", userIds.slice(0, 100))
        .eq("title", eventTitle)
        .gte("created_at", tenMinutesAgo);

      (recentDups || []).forEach((d: any) => {
        if (d.user_id) recentDupsMap.add(d.user_id);
      });
    } catch {
      // Non-critical, continue
    }

    const notificationsToInsert: any[] = [];
    const emailsToSend: any[] = [];

    for (const u of uniqueRecipients) {
      const userId = u.user_id || u.id || "system";
      if (recentDupsMap.has(userId)) {
        continue;
      }

      const recipientName =
        (u.first_name || u.last_name)
          ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
          : (u.email ? u.email.split("@")[0] : (u.role === "trainer" ? "Trainer" : "Student"));
      const recipientEmail = u.email || "";

      // Build personalized dynamic template
      const template = resolveEmailTemplate(
        event.eventType,
        recipientName,
        event,
        directRedirectUrl
      );

      notificationsToInsert.push({
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

      if (isValidEmail(recipientEmail)) {
        emailsToSend.push({
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
      }
    }

    // Bulk insert all in-app notifications in a single database round-trip
    if (notificationsToInsert.length > 0) {
      try {
        const BATCH_SIZE = 100;
        for (let i = 0; i < notificationsToInsert.length; i += BATCH_SIZE) {
          const chunk = notificationsToInsert.slice(i, i + BATCH_SIZE);
          await adminClient.from("notifications").insert(chunk);
        }
      } catch (dbErr) {
        console.warn("[Notification Hub] Bulk in-app notification insert warning:", dbErr);
      }
    }

    // Asynchronously dispatch emails in the background so API callers are never blocked by SMTP latency
    if (emailsToSend.length > 0) {
      dispatchedCount = emailsToSend.length;
      void (async () => {
        try {
          const CHUNK_SIZE = 5;
          for (let i = 0; i < emailsToSend.length; i += CHUNK_SIZE) {
            const chunk = emailsToSend.slice(i, i + CHUNK_SIZE);
            await Promise.allSettled(chunk.map((item) => sendEmail(item)));
          }
        } catch (emailErr) {
          console.warn("[Notification Hub] Background email dispatch error:", emailErr);
        }
      })();
    }

    console.log(`[Notification Hub] Event "${event.eventType}" dispatched to ${notificationsToInsert.length} in-app / ${emailsToSend.length} email recipients.`);
    return { success: true, totalRecipients: uniqueRecipients.length, dispatched: notificationsToInsert.length };
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
    batchIds: options.batchIds,
    batchNames: options.batchNames,
    institutionId: options.institutionId,
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
    assignedBy: options.assignedBy || "SensiLearn Administrator",
  });
}
