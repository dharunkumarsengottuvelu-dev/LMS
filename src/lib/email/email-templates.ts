/**
 * SENSILEARN LMS — MNC-LEVEL ENTERPRISE EMAIL TEMPLATES
 * 
 * Strict enterprise email formatting conforming to:
 * - Brand: Sensilearn
 * - Primary Color: #0A1F44 (Royal Dark Blue Header)
 * - Secondary Color: #FFFFFF (Clean White Email Card)
 * - Accent: #2563EB (Professional Blue Buttons & Highlights)
 * - Background: #F4F6F8
 * - Typography: Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif
 * - Master Card Layout: 640px maximum width, centered, responsive
 * - Personalized Student Greeting: Dear {{student_name}},
 * - Support Contact: sensigroup.info@gmail.com | sensilearn.com
 */

import { getAbsoluteUrl, getAppOrigin } from "@/config/site";

export interface EmailDetailField {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface MasterEmailOptions {
  recipientName: string;
  categoryLabel: string;
  title: string;
  preheader: string;
  message: string;
  details?: EmailDetailField[];
  ctaText: string;
  redirectUrl: string;
  supportingText?: string;
  subject?: string;
  closing?: string;
}

function getFormattedCurrentDate(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Universal Master Layout Generator for Sensilearn Enterprise Emails.
 */
export function buildMncEmailLayout(options: MasterEmailOptions): { subject: string; html: string; text: string } {
  const {
    recipientName,
    categoryLabel,
    title,
    preheader,
    message,
    details = [],
    ctaText,
    redirectUrl,
    supportingText,
    subject = `[SENSILEARN] ${title}`,
    closing = "Best Regards,\nSensilearn Academic Team",
  } = options;

  const currentYear = new Date().getFullYear();
  const appOrigin = getAppOrigin();
  const logoUrl = `${appOrigin}/apple-touch-icon.png`;

  // Render detail fields table
  const detailsHtml =
    details.length > 0
      ? `
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px 24px; margin: 24px 0 28px;">
        <table style="width: 100%; border-collapse: collapse; font-family: Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
          ${details
            .map(
              (d) => `
            <tr>
              <td style="padding: 8px 0; font-size: 13px; color: #64748B; width: 140px; vertical-align: top; font-weight: 500;">
                ${escapeHtml(d.label)}
              </td>
              <td style="padding: 8px 0; font-size: 13px; color: ${d.highlight ? "#2563EB" : "#0F172A"}; font-weight: 600; line-height: 1.5;">
                ${escapeHtml(d.value)}
              </td>
            </tr>
          `
            )
            .join("")}
        </table>
      </div>
    `
      : "";

  // Plaintext version
  const textDetails = details.map((d) => `  ${d.label}: ${d.value}`).join("\n");
  const text = [
    `SENSILEARN`,
    `[ ${categoryLabel.toUpperCase()} ]`,
    ``,
    title,
    ``,
    `Dear ${recipientName},`,
    ``,
    message,
    details.length > 0 ? `\nDETAILS:\n${textDetails}\n` : ``,
    supportingText ? `${supportingText}\n` : ``,
    `CTA: ${ctaText}`,
    `Direct Link: ${redirectUrl}`,
    ``,
    `--------------------------------------------------`,
    `If the link above does not open directly, copy and paste this address into your browser:`,
    redirectUrl,
    ``,
    closing,
    ``,
    `--------------------------------------------------`,
    `Support: sensigroup.info@gmail.com | sensilearn.com`,
    `This is an automated notification from the Sensilearn LMS platform. Please do not reply directly to this email.`,
    `© ${currentYear} Sensilearn Learning Technologies. All rights reserved.`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(subject)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F4F6F8;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    .cta-button {
      display: inline-block;
      background-color: #2563EB;
      color: #FFFFFF !important;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 9px;
      border: 1px solid #1D4ED8;
    }
    @media only screen and (max-width: 660px) {
      .email-wrapper { width: 100% !important; padding: 16px 12px !important; }
      .email-card { width: 100% !important; border-radius: 10px !important; }
      .inner-content { padding: 24px 20px !important; }
      .header-bar { padding: 20px 20px !important; }
      .cta-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #F4F6F8;">
  <!-- Hidden Preheader -->
  <span style="display: none; font-size: 1px; color: #F4F6F8; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(preheader)}
  </span>

  <div class="email-wrapper" style="max-width: 640px; margin: 0 auto;">
    <table role="presentation" class="email-card" style="width: 100%; max-width: 640px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
      
      <!-- Top Brand Header (Royal Dark Blue #0A1F44) -->
      <tr>
        <td class="header-bar" style="padding: 24px 32px; background-color: #0A1F44; border-bottom: 3px solid #2563EB;">
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="vertical-align: middle;">
                <table role="presentation" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding-right: 12px; vertical-align: middle;">
                      <img src="${logoUrl}" alt="Sensilearn Logo" width="32" height="32" style="display: block; border-radius: 6px; background-color: #132B5C;" onerror="this.style.display='none'" />
                    </td>
                    <td style="vertical-align: middle;">
                      <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.2;">
                        SENSILEARN<span style="color: #2563EB;">.</span>
                      </div>
                      <div style="font-size: 11px; font-weight: 500; color: #94A3B8; letter-spacing: 0.2px; line-height: 1.2;">
                        Learning Technologies
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.8px; background-color: #132B5C; border: 1px solid #1D4ED8; padding: 4px 10px; border-radius: 6px;">
                  Enterprise LMS
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Main Body Content -->
      <tr>
        <td class="inner-content" style="padding: 36px 36px 32px;">
          
          <!-- Category Pill -->
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; font-size: 10px; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 1px; background-color: #EFF6FF; border: 1px solid #BFDBFE; padding: 4px 10px; border-radius: 5px;">
              ${escapeHtml(categoryLabel)}
            </span>
          </div>

          <!-- Email Title -->
          <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0A1F44; letter-spacing: -0.3px; line-height: 1.3;">
            ${escapeHtml(title)}
          </h1>

          <!-- Personalized Greeting -->
          <p style="margin: 0 0 14px; font-size: 14px; color: #334155; font-weight: 600;">
            Dear ${escapeHtml(recipientName)},
          </p>

          <!-- Core Message -->
          <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            ${escapeHtml(message)}
          </p>

          <!-- Structured Info Card -->
          ${detailsHtml}

          <!-- Supporting Text / Contextual Guidance -->
          ${
            supportingText
              ? `
            <p style="margin: 0 0 24px; font-size: 13px; color: #475569; line-height: 1.6;">
              ${escapeHtml(supportingText)}
            </p>
          `
              : ""
          }

          <!-- Universal Primary CTA -->
          <div style="text-align: center; margin: 28px 0 24px;">
            <a href="${redirectUrl}" class="cta-button" style="display: inline-block; background-color: #2563EB; color: #FFFFFF !important; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; text-decoration: none; padding: 13px 32px; border-radius: 9px; border: 1px solid #1D4ED8;">
              ${escapeHtml(ctaText)} &rarr;
            </a>
          </div>

          <!-- Professional Closing -->
          <div style="margin-top: 24px; font-size: 13px; color: #475569; line-height: 1.6;">
            ${escapeHtml(closing).replace(/\n/g, "<br>")}
          </div>

          <!-- Fallback Direct URL -->
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #F1F5F9;">
            <p style="margin: 0 0 6px; font-size: 11px; color: #94A3B8; line-height: 1.5;">
              If the button above does not work, copy and paste this direct link into your browser:
            </p>
            <p style="margin: 0; font-size: 11px; word-break: break-all;">
              <a href="${redirectUrl}" style="color: #2563EB; text-decoration: underline;">
                ${escapeHtml(redirectUrl)}
              </a>
            </p>
          </div>

        </td>
      </tr>

      <!-- Master Corporate Footer -->
      <tr>
        <td style="padding: 24px 36px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #0A1F44; letter-spacing: 0.2px; margin-bottom: 4px;">
            SENSILEARN LEARNING TECHNOLOGIES
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
            Learning &bull; Assessment &bull; Growth
          </div>
          <div style="font-size: 11px; color: #2563EB; margin-bottom: 12px;">
            <a href="mailto:sensigroup.info@gmail.com" style="color: #2563EB; text-decoration: none;">Support: sensigroup.info@gmail.com</a> &nbsp;|&nbsp; <a href="https://sensilearn.com" style="color: #2563EB; text-decoration: none;">sensilearn.com</a>
          </div>
          <p style="margin: 0 0 6px; font-size: 11px; color: #94A3B8; line-height: 1.5;">
            This is an automated notification from the Sensilearn LMS platform. Please do not reply directly to this email.
          </p>
          <p style="margin: 0; font-size: 11px; color: #94A3B8;">
            &copy; ${currentYear} Sensilearn Learning Technologies. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/* ─────────────────────────────────────────────────────────────
 * 20 ACTIVITY-SPECIFIC LMS EMAIL TEMPLATES
 * ───────────────────────────────────────────────────────────── */

// 1. COURSE EMAIL TEMPLATE (Section 2)
export function generateCoursePublishedEmail(options: {
  recipientName: string;
  courseName: string;
  courseDescription?: string;
  batchName?: string;
  trainerName?: string;
  publishedDate?: string;
  courseUrl: string;
  description?: string; // fallback alias
}): { subject: string; html: string; text: string } {
  const publishedDate = options.publishedDate || getFormattedCurrentDate();
  const desc = options.courseDescription || options.description || "Comprehensive structured curriculum and hands-on modules.";
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Course Available",
    title: `New Course Available – ${options.courseName}`,
    subject: `New Course Available – ${options.courseName} | Sensilearn`,
    preheader: `New course opportunity: ${options.courseName}`,
    message: `A new learning opportunity has been made available for your batch.`,
    details: [
      { label: "Course Name", value: options.courseName },
      { label: "Description", value: desc },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Instructor", value: options.trainerName || "Sensilearn Faculty" },
      { label: "Published Date", value: publishedDate, highlight: true },
    ],
    supportingText: "You can now access the course through your Sensilearn learning dashboard.",
    ctaText: "ACCESS YOUR COURSE",
    redirectUrl: options.courseUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 2. PRACTICE MODULE EMAIL TEMPLATE (Section 3)
export function generatePracticePublishedEmail(options: {
  recipientName: string;
  practiceName: string;
  courseName?: string;
  topicName?: string;
  batchName?: string;
  publishedDate?: string;
  practiceUrl: string;
  category?: string; // fallback alias
  duration?: string;
  totalMarks?: string | number;
}): { subject: string; html: string; text: string } {
  const publishedDate = options.publishedDate || getFormattedCurrentDate();
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Practice Module",
    title: `New Practice Module – ${options.practiceName}`,
    subject: `New Practice Module – ${options.practiceName} | Sensilearn`,
    preheader: `Practice module available: ${options.practiceName}`,
    message: `A new practice module has been added to your learning programme.`,
    details: [
      { label: "Practice Name", value: options.practiceName },
      { label: "Course", value: options.courseName || "Hands-on Technical Track" },
      { label: "Topic", value: options.topicName || options.category || "Structured Problem Solving" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Available From", value: publishedDate, highlight: true },
    ],
    supportingText: "Strengthen your technical knowledge through structured practice.",
    ctaText: "START PRACTICING",
    redirectUrl: options.practiceUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 3. MCQ PRACTICE EMAIL TEMPLATE (Section 4)
export function generateMcqPracticePublishedEmail(options: {
  recipientName: string;
  practiceName: string;
  courseName?: string;
  topicName?: string;
  totalQuestions?: number | string;
  batchName?: string;
  practiceUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "MCQ Practice",
    title: `New MCQ Practice Available – ${options.practiceName}`,
    subject: `New MCQ Practice Available – ${options.practiceName} | Sensilearn`,
    preheader: `Multiple-choice practice ready: ${options.practiceName}`,
    message: `A new multiple-choice practice activity is now available.`,
    details: [
      { label: "Practice", value: options.practiceName },
      { label: "Course", value: options.courseName || "Conceptual Foundation Track" },
      { label: "Topic", value: options.topicName || "Objective Evaluation" },
      { label: "Total Questions", value: String(options.totalQuestions || 10), highlight: true },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
    ],
    supportingText: "Access the practice module and evaluate your understanding.",
    ctaText: "START MCQ PRACTICE",
    redirectUrl: options.practiceUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 4. CODING PRACTICE EMAIL TEMPLATE (Section 5)
export function generateCodingPracticePublishedEmail(options: {
  recipientName: string;
  practiceName: string;
  programmingLanguage?: string;
  difficulty?: string;
  courseName?: string;
  batchName?: string;
  practiceUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Programming Practice",
    title: `New Programming Practice – ${options.practiceName}`,
    subject: `New Programming Practice – ${options.practiceName} | Sensilearn`,
    preheader: `Programming practice published: ${options.practiceName}`,
    message: `A new programming practice activity has been published for your batch.`,
    details: [
      { label: "Practice", value: options.practiceName },
      { label: "Programming Language", value: options.programmingLanguage || "Multi-Language (Python, Java, C++, JS)" },
      { label: "Difficulty", value: (options.difficulty || "Medium").toUpperCase(), highlight: true },
      { label: "Course", value: options.courseName || "Algorithm & Logic Track" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
    ],
    supportingText: "Improve your coding skills through practical problem-solving.",
    ctaText: "OPEN CODING PRACTICE",
    redirectUrl: options.practiceUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 5. TEST EMAIL TEMPLATE (Section 6)
export function generateTestPublishedEmail(options: {
  recipientName: string;
  testName: string;
  courseName?: string;
  batchName?: string;
  totalQuestions?: number | string;
  totalMarks?: number | string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  testUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Formal Test",
    title: `New Test Available – ${options.testName}`,
    subject: `New Test Available – ${options.testName} | Sensilearn`,
    preheader: `Test assigned: ${options.testName}`,
    message: `A new test has been assigned to your batch.`,
    details: [
      { label: "Test Name", value: options.testName },
      { label: "Course", value: options.courseName || "Standard Assessment Track" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Total Questions", value: String(options.totalQuestions || 25) },
      { label: "Total Marks", value: String(options.totalMarks || 100) },
      { label: "Duration", value: options.duration || "60 Minutes" },
      { label: "Start Date", value: options.startDate || "Available Now" },
      { label: "End Date", value: options.endDate || "See portal schedule", highlight: true },
    ],
    supportingText: "Please review the test instructions and complete the assessment within the scheduled period.",
    ctaText: "VIEW TEST DETAILS",
    redirectUrl: options.testUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 6. ASSESSMENT EMAIL TEMPLATE (Section 7)
export function generateAssessmentScheduledEmail(options: {
  recipientName: string;
  assessmentName: string;
  courseName?: string;
  batchName?: string;
  assessmentDate?: string;
  startTime?: string;
  duration?: string;
  totalMarks?: number | string;
  assessmentUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Proctored Assessment",
    title: `Assessment Scheduled – ${options.assessmentName}`,
    subject: `Assessment Scheduled – ${options.assessmentName} | Sensilearn`,
    preheader: `Assessment scheduled: ${options.assessmentName}`,
    message: `An assessment has been scheduled for your batch.`,
    details: [
      { label: "Assessment", value: options.assessmentName },
      { label: "Course", value: options.courseName || "Academic Track" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Assessment Date", value: options.assessmentDate || "Scheduled Date" },
      { label: "Start Time", value: options.startTime || "Scheduled Time" },
      { label: "Duration", value: options.duration || "60 Minutes" },
      { label: "Total Marks", value: String(options.totalMarks || 100), highlight: true },
    ],
    supportingText: "Please prepare accordingly and ensure your availability.",
    ctaText: "VIEW ASSESSMENT",
    redirectUrl: options.assessmentUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 7. LIVE CLASS EMAIL TEMPLATE (Section 8)
export function generateLiveClassScheduledEmail(options: {
  recipientName: string;
  sessionTitle?: string;
  classTitle?: string; // alias
  courseName?: string;
  trainerName?: string;
  batchName?: string;
  sessionDate?: string;
  sessionTime?: string;
  scheduledTime?: string; // alias
  duration?: string;
  meetingUrl?: string;
  platform?: string; // alias
  liveClassUrl: string;
}): { subject: string; html: string; text: string } {
  const sessionTitle = options.sessionTitle || options.classTitle || "Live Interactive Class";
  const sessionDate = options.sessionDate || (options.scheduledTime ? options.scheduledTime.split(" ")[0] || "Scheduled Date" : "Scheduled Date");
  const sessionTime = options.sessionTime || (options.scheduledTime ? options.scheduledTime.split(" ").slice(1).join(" ") || "Scheduled Time" : "Scheduled Time");
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Live Class",
    title: `Upcoming Live Class – ${sessionTitle}`,
    subject: `Upcoming Live Class – ${sessionTitle} | Sensilearn`,
    preheader: `Upcoming session: ${sessionTitle}`,
    message: `A new live learning session has been scheduled.`,
    details: [
      { label: "Session", value: sessionTitle },
      { label: "Course", value: options.courseName || "Interactive Lecture" },
      { label: "Trainer", value: options.trainerName || "Sensilearn Faculty" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Date", value: sessionDate },
      { label: "Time", value: sessionTime },
      { label: "Duration", value: options.duration || "60 Minutes", highlight: true },
    ],
    supportingText: "Join the session using the link below.",
    ctaText: "JOIN LIVE CLASS",
    redirectUrl: options.meetingUrl || options.liveClassUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 8. LIVE CLASS RESCHEDULE EMAIL TEMPLATE (Section 9)
export function generateLiveClassRescheduledEmail(options: {
  recipientName: string;
  sessionTitle: string;
  oldDate?: string;
  oldTime?: string;
  newDate: string;
  newTime: string;
  trainerName?: string;
  batchName?: string;
  liveClassUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Schedule Update",
    title: `Schedule Update – Live Class: ${options.sessionTitle}`,
    subject: `Schedule Update – Live Class | Sensilearn`,
    preheader: `Live class rescheduled: ${options.sessionTitle}`,
    message: `Please note that the schedule of your upcoming live class has been updated.`,
    details: [
      { label: "Session", value: options.sessionTitle },
      { label: "Previous Date", value: options.oldDate || "Prior Date" },
      { label: "Previous Time", value: options.oldTime || "Prior Time" },
      { label: "New Date", value: options.newDate, highlight: true },
      { label: "New Time", value: options.newTime, highlight: true },
      { label: "Trainer", value: options.trainerName || "Sensilearn Faculty" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
    ],
    supportingText: "Please follow the updated schedule.",
    ctaText: "VIEW UPDATED SCHEDULE",
    redirectUrl: options.liveClassUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 9. LIVE CLASS CANCELLATION EMAIL TEMPLATE (Section 10)
export function generateLiveClassCancelledEmail(options: {
  recipientName: string;
  sessionTitle: string;
  courseName?: string;
  sessionDate?: string;
  batchName?: string;
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Class Cancelled",
    title: `Live Class Cancelled – ${options.sessionTitle}`,
    subject: `Live Class Cancelled – ${options.sessionTitle} | Sensilearn`,
    preheader: `Class cancellation notice: ${options.sessionTitle}`,
    message: `We would like to inform you that the following live session has been cancelled.`,
    details: [
      { label: "Session", value: options.sessionTitle },
      { label: "Course", value: options.courseName || "Interactive Lecture" },
      { label: "Original Date", value: options.sessionDate || "Scheduled Date" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Status", value: "Cancelled", highlight: true },
    ],
    supportingText: "Please check your Sensilearn dashboard for further updates.",
    ctaText: "VIEW DASHBOARD",
    redirectUrl: options.dashboardUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 10. CODING CHALLENGE EMAIL TEMPLATE (Section 11)
export function generateCodingChallengePublishedEmail(options: {
  recipientName: string;
  challengeName: string;
  category?: string;
  difficulty?: string;
  languages?: string;
  batchName?: string;
  deadline?: string;
  challengeUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Coding Challenge",
    title: `New Coding Challenge – ${options.challengeName}`,
    subject: `New Coding Challenge – ${options.challengeName} | Sensilearn`,
    preheader: `New challenge ready: ${options.challengeName}`,
    message: `A new coding challenge is available for your batch.`,
    details: [
      { label: "Challenge", value: options.challengeName },
      { label: "Category", value: options.category || "Algorithms & Problem Solving" },
      { label: "Difficulty", value: (options.difficulty || "Medium").toUpperCase(), highlight: true },
      { label: "Programming Languages", value: options.languages || "Python, Java, C++, JavaScript" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Deadline", value: options.deadline || "Self-Paced" },
    ],
    supportingText: "Put your programming knowledge into practice and challenge yourself.",
    ctaText: "SOLVE CHALLENGE",
    redirectUrl: options.challengeUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 11. PROGRAMMING CONTEST EMAIL TEMPLATE (Section 12)
export function generateProgrammingContestEmail(options: {
  recipientName: string;
  contestName: string;
  batchName?: string;
  startDate?: string;
  startTime?: string;
  duration?: string;
  problemCount?: number | string;
  contestUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Programming Contest",
    title: `Upcoming Programming Contest – ${options.contestName}`,
    subject: `Upcoming Programming Contest – ${options.contestName} | Sensilearn`,
    preheader: `New contest announced: ${options.contestName}`,
    message: `A new programming contest has been announced.`,
    details: [
      { label: "Contest", value: options.contestName },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Start Date", value: options.startDate || "Scheduled Date" },
      { label: "Start Time", value: options.startTime || "Scheduled Time" },
      { label: "Duration", value: options.duration || "120 Minutes" },
      { label: "Number of Problems", value: String(options.problemCount || 4), highlight: true },
    ],
    supportingText: "Prepare yourself and demonstrate your problem-solving skills.",
    ctaText: "VIEW CONTEST",
    redirectUrl: options.contestUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 12. ASSIGNMENT EMAIL TEMPLATE (Section 13)
export function generateAssignmentAssignedEmail(options: {
  recipientName: string;
  assignmentName: string;
  courseName?: string;
  batchName?: string;
  assignedDate?: string;
  dueDate?: string;
  totalMarks?: number | string;
  assignmentUrl: string;
  trainerName?: string;
  maxMarks?: string | number; // alias
}): { subject: string; html: string; text: string } {
  const assignedDate = options.assignedDate || getFormattedCurrentDate();
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Assignment",
    title: `New Assignment – ${options.assignmentName}`,
    subject: `New Assignment – ${options.assignmentName} | Sensilearn`,
    preheader: `New assignment assigned: ${options.assignmentName}`,
    message: `A new assignment has been assigned to your batch.`,
    details: [
      { label: "Assignment", value: options.assignmentName },
      { label: "Course", value: options.courseName || "Curriculum Track" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Assigned Date", value: assignedDate },
      { label: "Due Date", value: options.dueDate || "See portal", highlight: true },
      { label: "Total Marks", value: String(options.totalMarks || options.maxMarks || 100) },
    ],
    supportingText: "Please review the instructions and complete your submission before the deadline.",
    ctaText: "VIEW ASSIGNMENT",
    redirectUrl: options.assignmentUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 13. PROJECT EMAIL TEMPLATE (Section 14)
export function generateProjectAssignedEmail(options: {
  recipientName: string;
  projectName: string;
  courseName?: string;
  batchName?: string;
  assignedBy?: string;
  trainerName?: string;
  startDate?: string;
  deadline?: string;
  projectUrl: string;
}): { subject: string; html: string; text: string } {
  const startDate = options.startDate || getFormattedCurrentDate();
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Project Assigned",
    title: `New Project Assigned – ${options.projectName}`,
    subject: `New Project Assigned – ${options.projectName} | Sensilearn`,
    preheader: `Capstone project assigned: ${options.projectName}`,
    message: `A new project has been assigned as part of your learning programme.`,
    details: [
      { label: "Project", value: options.projectName },
      { label: "Course", value: options.courseName || "Capstone Track" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Assigned By", value: options.assignedBy || options.trainerName || "Sensilearn Faculty" },
      { label: "Start Date", value: startDate },
      { label: "Submission Deadline", value: options.deadline || "See portal", highlight: true },
    ],
    supportingText: "Review the project requirements and begin your work.",
    ctaText: "VIEW PROJECT",
    redirectUrl: options.projectUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 14. DEADLINE REMINDER EMAIL TEMPLATE (Section 15)
export function generateDeadlineReminderEmail(options: {
  recipientName: string;
  activityName: string;
  activityType?: string;
  courseName?: string;
  batchName?: string;
  deadline: string;
  activityUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Deadline Reminder",
    title: `Upcoming Deadline Reminder – ${options.activityName}`,
    subject: `Upcoming Deadline Reminder – ${options.activityName} | Sensilearn`,
    preheader: `Approaching deadline: ${options.activityName}`,
    message: `This is a reminder that an upcoming academic activity is approaching its deadline.`,
    details: [
      { label: "Activity", value: options.activityName },
      { label: "Type", value: options.activityType || "Assignment / Activity" },
      { label: "Course", value: options.courseName || "Curriculum Track" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Deadline", value: options.deadline, highlight: true },
    ],
    supportingText: "Please complete the activity before the deadline.",
    ctaText: "CONTINUE ACTIVITY",
    redirectUrl: options.activityUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 15. RESULTS PUBLISHED EMAIL TEMPLATE (Section 16)
export function generateResultPublishedEmail(options: {
  recipientName: string;
  assessmentName: string;
  courseName?: string;
  batchName?: string;
  publishedDate?: string;
  resultUrl: string;
  // Optional detailed fields for scorecard
  score?: string | number;
  totalMarks?: string | number;
  percentage?: string | number;
  status?: string;
  completedDate?: string;
}): { subject: string; html: string; text: string } {
  const publishedDate = options.publishedDate || options.completedDate || getFormattedCurrentDate();
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Results Published",
    title: `Results Published – ${options.assessmentName}`,
    subject: `Results Published – ${options.assessmentName} | Sensilearn`,
    preheader: `Results published: ${options.assessmentName}`,
    message: `Your assessment results are now available.`,
    details: [
      { label: "Assessment", value: options.assessmentName },
      { label: "Course", value: options.courseName || "Assessment Module" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Published Date", value: publishedDate, highlight: true },
    ],
    supportingText: "Log in to your Sensilearn dashboard to view your individual performance.",
    ctaText: "VIEW MY RESULTS",
    redirectUrl: options.resultUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 16. FEEDBACK EMAIL TEMPLATE (Section 17)
export function generateFeedbackEmail(options: {
  recipientName: string;
  activityName: string;
  courseName?: string;
  batchName?: string;
  trainerName?: string;
  evaluatorName?: string;
  evaluationDate?: string;
  feedbackUrl: string;
}): { subject: string; html: string; text: string } {
  const evalDate = options.evaluationDate || getFormattedCurrentDate();
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Evaluation Feedback",
    title: `Feedback Available – ${options.activityName}`,
    subject: `Feedback Available – ${options.activityName} | Sensilearn`,
    preheader: `Instructor feedback available for: ${options.activityName}`,
    message: `Your submitted work has been evaluated.`,
    details: [
      { label: "Activity", value: options.activityName },
      { label: "Course", value: options.courseName || "Curriculum Track" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Evaluated By", value: options.evaluatorName || options.trainerName || "Sensilearn Faculty" },
      { label: "Evaluation Date", value: evalDate, highlight: true },
    ],
    supportingText: "Your individual feedback is now available through Sensilearn.",
    ctaText: "VIEW FEEDBACK",
    redirectUrl: options.feedbackUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 17. STUDY MATERIAL EMAIL TEMPLATE (Section 18)
export function generateStudyMaterialEmail(options: {
  recipientName: string;
  resourceName: string;
  courseName?: string;
  moduleName?: string;
  batchName?: string;
  trainerName?: string;
  materialUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Learning Material",
    title: `New Learning Material – ${options.resourceName}`,
    subject: `New Learning Material – ${options.resourceName} | Sensilearn`,
    preheader: `Study material available: ${options.resourceName}`,
    message: `New learning material has been made available for your batch.`,
    details: [
      { label: "Resource", value: options.resourceName },
      { label: "Course", value: options.courseName || "Curriculum Track" },
      { label: "Module", value: options.moduleName || "Core Courseware" },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Uploaded By", value: options.trainerName || "Sensilearn Faculty", highlight: true },
    ],
    supportingText: "Access the resource through your learning dashboard.",
    ctaText: "ACCESS STUDY MATERIAL",
    redirectUrl: options.materialUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 18. ANNOUNCEMENT EMAIL TEMPLATE (Section 19)
export function generateAnnouncementEmail(options: {
  recipientName: string;
  announcementTitle: string;
  announcementDescription?: string;
  announcementMessage?: string; // alias
  batchName?: string;
  authorName?: string;
  publishedBy?: string; // alias
  publishedDate?: string;
  announcementUrl: string;
}): { subject: string; html: string; text: string } {
  const publishedDate = options.publishedDate || getFormattedCurrentDate();
  const desc = options.announcementDescription || options.announcementMessage || "An important academic announcement has been published.";
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Important Announcement",
    title: options.announcementTitle,
    subject: `Important Announcement – ${options.announcementTitle} | Sensilearn`,
    preheader: `Important announcement: ${options.announcementTitle}`,
    message: `An important academic announcement has been published.`,
    details: [
      { label: "Title", value: options.announcementTitle },
      { label: "Posted By", value: options.authorName || options.publishedBy || "Sensilearn Administration" },
      { label: "Batch", value: options.batchName || "All Cohorts" },
      { label: "Published Date", value: publishedDate, highlight: true },
    ],
    supportingText: `${desc}\n\nPlease review the complete announcement.`,
    ctaText: "READ ANNOUNCEMENT",
    redirectUrl: options.announcementUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 19. BATCH ALLOCATION EMAIL TEMPLATE (Section 20)
export function generateBatchAllocationEmail(options: {
  recipientName: string;
  batchName: string;
  programmeName?: string;
  programName?: string; // alias
  institutionName?: string;
  trainerName?: string;
  startDate?: string;
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  const startDate = options.startDate || getFormattedCurrentDate();
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Batch Allocation",
    title: "Batch Allocation Confirmed",
    subject: "Batch Allocation Confirmed – Sensilearn",
    preheader: `You have been allocated to cohort: ${options.batchName}`,
    message: `Your batch allocation has been successfully completed.`,
    details: [
      { label: "Batch Name", value: options.batchName },
      { label: "Programme", value: options.programmeName || options.programName || "Enterprise Fullstack Track" },
      { label: "Institution", value: options.institutionName || "Sensilearn Academic Institute" },
      { label: "Start Date", value: startDate, highlight: true },
    ],
    supportingText: "You can now access the learning activities assigned to your batch.",
    ctaText: "OPEN STUDENT DASHBOARD",
    redirectUrl: options.dashboardUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

// 20. COURSE UPDATE EMAIL TEMPLATE (Section 21)
export function generateCourseUpdatedEmail(options: {
  recipientName: string;
  courseName: string;
  batchName?: string;
  updateDescription?: string;
  changeSummary?: string; // alias
  updatedBy?: string;
  updatedDate?: string;
  courseUrl: string;
}): { subject: string; html: string; text: string } {
  const updatedDate = options.updatedDate || getFormattedCurrentDate();
  const summary = options.updateDescription || options.changeSummary || "Curriculum lessons & modules updated";
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Course Update",
    title: `Course Update – ${options.courseName}`,
    subject: `Course Update – ${options.courseName} | Sensilearn`,
    preheader: `Course curriculum updated: ${options.courseName}`,
    message: `An important update has been published for your course.`,
    details: [
      { label: "Course", value: options.courseName },
      { label: "Batch", value: options.batchName || "Enrolled Cohort" },
      { label: "Update", value: summary },
      { label: "Updated Date", value: updatedDate, highlight: true },
    ],
    supportingText: "Please review the latest course information.",
    ctaText: "VIEW COURSE UPDATE",
    redirectUrl: options.courseUrl,
    closing: "Best Regards,\nSensilearn Academic Team",
  });
}

/* ─────────────────────────────────────────────────────────────
 * PRESERVED OPERATIONAL / SYSTEM EMAIL BUILDERS
 * ───────────────────────────────────────────────────────────── */

// CERTIFICATE GENERATED
export function generateCertificateGeneratedEmail(options: {
  recipientName: string;
  courseName: string;
  completionDate?: string;
  certificateId: string;
  certificateUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Certification",
    title: `Your Certificate Is Ready – ${options.courseName}`,
    subject: `Your Certificate Is Ready – ${options.courseName} | Sensilearn`,
    preheader: `Official certificate issued: ${options.courseName}`,
    message: `Congratulations! You have fulfilled all graduation and testing requirements for "${options.courseName}". Your official digital certificate is now ready for download.`,
    details: [
      { label: "Program", value: options.courseName },
      { label: "Recipient", value: options.recipientName },
      { label: "Credential ID", value: options.certificateId, highlight: true },
      { label: "Issue Date", value: options.completionDate || getFormattedCurrentDate() },
    ],
    ctaText: "VIEW CERTIFICATE",
    redirectUrl: options.certificateUrl,
    supportingText: "You can share your credential directly on LinkedIn or download a PDF copy.",
  });
}

// TRAINER: STUDENT ASSIGNMENT SUBMISSION
export function generateAssignmentSubmissionTrainerEmail(options: {
  trainerName: string;
  studentName: string;
  assignmentName: string;
  courseName?: string;
  batchName?: string;
  submittedAt?: string;
  submissionUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.trainerName,
    categoryLabel: "Student Submission",
    title: `New Assignment Submission – ${options.assignmentName}`,
    subject: `New Assignment Submission – ${options.assignmentName} | Sensilearn`,
    preheader: `Submission from ${options.studentName}`,
    message: `A student has submitted their project for "${options.assignmentName}". Please review the code repository and grade the deliverables.`,
    details: [
      { label: "Student", value: options.studentName },
      { label: "Assignment", value: options.assignmentName },
      { label: "Course", value: options.courseName || "Curriculum Track" },
      { label: "Batch", value: options.batchName || "Assigned Batch" },
      { label: "Submitted At", value: options.submittedAt || new Date().toLocaleString() },
    ],
    ctaText: "REVIEW SUBMISSION",
    redirectUrl: options.submissionUrl,
  });
}

// TRAINER: ASSESSMENT COMPLETION
export function generateAssessmentCompletionTrainerEmail(options: {
  trainerName: string;
  studentName: string;
  assessmentName: string;
  batchName?: string;
  score?: string | number;
  completedAt?: string;
  submissionUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.trainerName,
    categoryLabel: "Assessment Completed",
    title: `Assessment Completed – ${options.assessmentName}`,
    subject: `Assessment Completed – ${options.assessmentName} | Sensilearn`,
    preheader: `${options.studentName} completed ${options.assessmentName}`,
    message: `A candidate has completed their proctored assessment attempt for "${options.assessmentName}". Proctoring logs and answer records are ready for review.`,
    details: [
      { label: "Student", value: options.studentName },
      { label: "Assessment", value: options.assessmentName },
      { label: "Batch", value: options.batchName || "Cohort" },
      { label: "Score", value: String(options.score ?? "Evaluated") },
      { label: "Completed At", value: options.completedAt || new Date().toLocaleString() },
    ],
    ctaText: "REVIEW SUBMISSION",
    redirectUrl: options.submissionUrl,
  });
}

// STUDENT WELCOME
export function generateStudentWelcomeEmail(options: {
  studentName: string;
  studentEmail: string;
  batchName?: string;
  programName?: string;
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.studentName,
    categoryLabel: "Welcome to Sensilearn",
    title: "Welcome to Sensilearn LMS",
    subject: "Welcome to Sensilearn LMS",
    preheader: "Your Sensilearn account has been created",
    message: `Welcome to the Sensilearn Learning Technologies platform. Your student account is active and you have been provisioned access to your technical courses, practice labs, and coding environments.`,
    details: [
      { label: "Student Name", value: options.studentName },
      { label: "Registered Email", value: options.studentEmail },
      { label: "Enrolled Cohort", value: options.batchName || "Standard Program" },
      { label: "Curriculum Track", value: options.programName || "Fullstack Software Engineering" },
    ],
    ctaText: "ACCESS SENSILEARN",
    redirectUrl: options.dashboardUrl,
    supportingText: "Sign in with your registered email to begin your interactive curriculum.",
  });
}

// TRAINER WELCOME
export function generateTrainerWelcomeEmail(options: {
  trainerName: string;
  trainerEmail: string;
  trainerDashboardUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.trainerName,
    categoryLabel: "Faculty Onboarding",
    title: "Welcome to Sensilearn – Trainer Account Created",
    subject: "Welcome to Sensilearn – Trainer Account Created",
    preheader: "Your faculty account is active",
    message: `Welcome to Sensilearn Learning Technologies. Your trainer account has been provisioned with elevated academic management privileges to oversee batches, create assessments, and host live classes.`,
    details: [
      { label: "Trainer Name", value: options.trainerName },
      { label: "Work Email", value: options.trainerEmail },
      { label: "Assigned Role", value: "Academic Faculty / Trainer", highlight: true },
    ],
    ctaText: "ACCESS TRAINER PORTAL",
    redirectUrl: options.trainerDashboardUrl,
    supportingText: "Never share your administrative credentials with unauthorized personnel.",
  });
}

// PASSWORD RESET
export function generatePasswordResetEmail(options: {
  recipientName: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Security Verification",
    title: "Reset Your Sensilearn Password",
    subject: "Reset Your Sensilearn Password",
    preheader: "Password reset request for your Sensilearn account",
    message: `We received a request to reset the password for your Sensilearn LMS account. Click the button below to establish a new secure password. This request link is valid for 1 hour.`,
    details: [
      { label: "Request Type", value: "Password Reset" },
      { label: "Validity", value: "60 Minutes", highlight: true },
      { label: "Security Status", value: "Single-Use Token" },
    ],
    ctaText: "RESET PASSWORD",
    redirectUrl: options.resetUrl,
    supportingText: "If you did not request this password reset, please disregard this email or notify IT Security.",
  });
}

// EMAIL VERIFICATION
export function generateEmailVerificationEmail(options: {
  recipientName: string;
  verificationUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Account Verification",
    title: "Verify Your Sensilearn Email Address",
    subject: "Verify Your Sensilearn Email Address",
    preheader: "Please verify your email address",
    message: `Please confirm your email address to complete your Sensilearn LMS profile setup and activate full platform access.`,
    details: [
      { label: "Action", value: "Email Address Verification" },
      { label: "Status", value: "Pending Confirmation", highlight: true },
    ],
    ctaText: "VERIFY EMAIL ADDRESS",
    redirectUrl: options.verificationUrl,
    supportingText: "This verification link is uniquely tied to your profile and will expire in 24 hours.",
  });
}

/* ─────────────────────────────────────────────────────────────
 * BACKWARD COMPATIBILITY ALIASES FOR EXISTING CODEBASE
 * ───────────────────────────────────────────────────────────── */

export function generatePracticeUpdatedEmail(options: {
  recipientName: string;
  practiceName: string;
  updatedBy?: string;
  changeSummary?: string;
  practiceUrl: string;
}) {
  return generatePracticePublishedEmail({
    recipientName: options.recipientName,
    practiceName: options.practiceName,
    practiceUrl: options.practiceUrl,
  });
}

export function generateCodeLabPublishedEmail(options: {
  recipientName: string;
  codelabName: string;
  courseName?: string;
  difficulty?: string;
  problemCount?: number;
  codelabUrl: string;
}) {
  return generateCodingPracticePublishedEmail({
    recipientName: options.recipientName,
    practiceName: options.codelabName,
    courseName: options.courseName,
    difficulty: options.difficulty,
    practiceUrl: options.codelabUrl,
  });
}

export function generateCodeLabUpdatedEmail(options: {
  recipientName: string;
  codelabName: string;
  updatedBy?: string;
  codelabUrl: string;
}) {
  return generateCodeLabPublishedEmail({
    recipientName: options.recipientName,
    codelabName: options.codelabName,
    codelabUrl: options.codelabUrl,
  });
}

export function generateCodingProblemPublishedEmail(options: {
  recipientName: string;
  problemName: string;
  difficulty?: string;
  topic?: string;
  estimatedDuration?: string;
  problemUrl: string;
}) {
  return generateCodingChallengePublishedEmail({
    recipientName: options.recipientName,
    challengeName: options.problemName,
    category: options.topic,
    difficulty: options.difficulty,
    deadline: options.estimatedDuration,
    challengeUrl: options.problemUrl,
  });
}

export function generateCodingProblemUpdatedEmail(options: {
  recipientName: string;
  problemName: string;
  updatedBy?: string;
  changeSummary?: string;
  problemUrl: string;
}) {
  return generateCodingProblemPublishedEmail({
    recipientName: options.recipientName,
    problemName: options.problemName,
    problemUrl: options.problemUrl,
  });
}

export function generateAssessmentAssignedEmail(options: {
  recipientName: string;
  assessmentName: string;
  duration?: string;
  totalMarks?: string | number;
  passingPercentage?: string | number;
  attemptsAllowed?: number | string;
  startDate?: string;
  deadline?: string;
  assessmentUrl: string;
}) {
  return generateAssessmentScheduledEmail({
    recipientName: options.recipientName,
    assessmentName: options.assessmentName,
    duration: options.duration,
    totalMarks: options.totalMarks,
    assessmentDate: options.startDate,
    assessmentUrl: options.assessmentUrl,
  });
}

export function generateAssessmentUpdatedEmail(options: {
  recipientName: string;
  assessmentName: string;
  updatedBy?: string;
  changes?: string;
  assessmentUrl: string;
}) {
  return generateAssessmentScheduledEmail({
    recipientName: options.recipientName,
    assessmentName: options.assessmentName,
    assessmentUrl: options.assessmentUrl,
  });
}

export function generateAssessmentDeadlineChangedEmail(options: {
  recipientName: string;
  assessmentName: string;
  previousDeadline?: string;
  newDeadline: string;
  assessmentUrl: string;
}) {
  return generateDeadlineReminderEmail({
    recipientName: options.recipientName,
    activityName: options.assessmentName,
    activityType: "Assessment",
    deadline: options.newDeadline,
    activityUrl: options.assessmentUrl,
  });
}

export function generateAssignmentUpdatedEmail(options: {
  recipientName: string;
  assignmentName: string;
  updatedBy?: string;
  changes?: string;
  assignmentUrl: string;
}) {
  return generateAssignmentAssignedEmail({
    recipientName: options.recipientName,
    assignmentName: options.assignmentName,
    assignmentUrl: options.assignmentUrl,
  });
}

export function generateAssignmentDeadlineChangedEmail(options: {
  recipientName: string;
  assignmentName: string;
  previousDeadline?: string;
  newDeadline: string;
  assignmentUrl: string;
}) {
  return generateDeadlineReminderEmail({
    recipientName: options.recipientName,
    activityName: options.assignmentName,
    activityType: "Assignment",
    deadline: options.newDeadline,
    activityUrl: options.assignmentUrl,
  });
}

export function generateAssignmentReminderEmail(options: {
  recipientName: string;
  assignmentName: string;
  deadline: string;
  assignmentUrl: string;
}) {
  return generateDeadlineReminderEmail({
    recipientName: options.recipientName,
    activityName: options.assignmentName,
    activityType: "Assignment",
    deadline: options.deadline,
    activityUrl: options.assignmentUrl,
  });
}

export function generateBatchUpdatedEmail(options: {
  recipientName: string;
  batchName: string;
  changes?: string;
  batchUrl: string;
}) {
  return generateBatchAllocationEmail({
    recipientName: options.recipientName,
    batchName: options.batchName,
    dashboardUrl: options.batchUrl,
  });
}

export function generateStudentAddedToBatchEmail(options: {
  recipientName: string;
  batchName: string;
  programName?: string;
  trainerName?: string;
  startDate?: string;
  batchUrl: string;
}) {
  return generateBatchAllocationEmail({
    recipientName: options.recipientName,
    batchName: options.batchName,
    programmeName: options.programName,
    trainerName: options.trainerName,
    startDate: options.startDate,
    dashboardUrl: options.batchUrl,
  });
}

export { generateCoursePublishedEmail as generateCourseAssignedEmail };
export { generatePracticePublishedEmail as generatePracticeAssignedEmail };
