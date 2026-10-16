/**
 * SENSILEARN LMS — MNC-LEVEL ENTERPRISE EMAIL TEMPLATES
 * 
 * Strict enterprise email formatting conforming to:
 * - Master Card Layout: 640px maximum width, centered, responsive
 * - Outer Background: #F4F6F8
 * - Email Card: #FFFFFF, border #E5E7EB, rounded 14px
 * - Primary Brand Color: #2563EB (Sensilearn Blue)
 * - Structured Information Cards with Key-Value grids
 * - Dynamic Primary Contextual CTA Buttons
 * - Fallback Direct Deep-Links
 * - Official Enterprise Multi-Line Footer
 * - Strict zero-emoji, clean corporate typography (Inter / Arial / Helvetica)
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
              <td style="padding: 7px 0; font-size: 13px; color: #64748B; width: 140px; vertical-align: top; font-weight: 500;">
                ${escapeHtml(d.label)}
              </td>
              <td style="padding: 7px 0; font-size: 13px; color: ${d.highlight ? "#2563EB" : "#0F172A"}; font-weight: 600; line-height: 1.5;">
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
    `SENSILEARN LEARNING TECHNOLOGIES`,
    `[ ${categoryLabel.toUpperCase()} ]`,
    ``,
    title,
    ``,
    `Hello ${recipientName},`,
    ``,
    message,
    details.length > 0 ? `\nDetails:\n${textDetails}\n` : ``,
    `Action: ${ctaText}`,
    `Direct Link: ${redirectUrl}`,
    supportingText ? `\n${supportingText}\n` : ``,
    `--------------------------------------------------`,
    `If the link above does not open directly, copy and paste this address into your browser:`,
    redirectUrl,
    ``,
    `Regards,`,
    `SENSILEARN LEARNING TECHNOLOGIES`,
    `Learning • Assessment • Growth`,
    `Support | Privacy | Terms`,
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
  <title>${escapeHtml(title)}</title>
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
      
      <!-- Top Brand Header -->
      <tr>
        <td class="header-bar" style="padding: 24px 32px; background-color: #0F172A; border-bottom: 3px solid #2563EB;">
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="vertical-align: middle;">
                <table role="presentation" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding-right: 12px; vertical-align: middle;">
                      <img src="${logoUrl}" alt="Sensilearn Logo" width="32" height="32" style="display: block; border-radius: 6px; background-color: #1E293B;" onerror="this.style.display='none'" />
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
                <span style="display: inline-block; font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.8px; background-color: #1E293B; border: 1px solid #334155; padding: 4px 10px; border-radius: 6px;">
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
          <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; line-height: 1.3;">
            ${escapeHtml(title)}
          </h1>

          <!-- Greeting -->
          <p style="margin: 0 0 14px; font-size: 14px; color: #334155; font-weight: 600;">
            Hello ${escapeHtml(recipientName)},
          </p>

          <!-- Core Message -->
          <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
            ${escapeHtml(message)}
          </p>

          <!-- Structured Info Card -->
          ${detailsHtml}

          <!-- Universal Primary CTA -->
          <div style="text-align: center; margin: 28px 0 24px;">
            <a href="${redirectUrl}" class="cta-button" style="display: inline-block; background-color: #2563EB; color: #FFFFFF !important; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; text-decoration: none; padding: 13px 32px; border-radius: 9px; border: 1px solid #1D4ED8;">
              ${escapeHtml(ctaText)} &rarr;
            </a>
          </div>

          ${
            supportingText
              ? `
            <p style="margin: 0 0 20px; font-size: 12px; color: #64748B; line-height: 1.5; text-align: center;">
              ${escapeHtml(supportingText)}
            </p>
          `
              : ""
          }

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

      <!-- Master Footer -->
      <tr>
        <td style="padding: 24px 36px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #0F172A; letter-spacing: 0.2px; margin-bottom: 4px;">
            SENSILEARN LEARNING TECHNOLOGIES
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 12px;">
            Learning &bull; Assessment &bull; Growth
          </div>
          <div style="font-size: 11px; color: #94A3B8; margin-bottom: 12px;">
            Support &nbsp;|&nbsp; Privacy Policy &nbsp;|&nbsp; Terms of Service
          </div>
          <p style="margin: 0 0 6px; font-size: 11px; color: #94A3B8; line-height: 1.5;">
            This is an automated notification from the SensiLearn LMS platform. Please do not reply to this email.
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

  return { subject: `[SENSILEARN LMS] ${title}`, html, text };
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ─────────────────────────────────────────────────────────────
 * EVENT-SPECIFIC TEMPLATE BUILDERS
 * ───────────────────────────────────────────────────────────── */

// 1. COURSE PUBLISHED
export function generateCoursePublishedEmail(options: {
  recipientName: string;
  courseName: string;
  trainerName?: string;
  batchName?: string;
  courseUrl: string;
  description?: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Course Available",
    title: `New Course Available – ${options.courseName}`,
    preheader: `New course enrolled: ${options.courseName}`,
    message: `A new course has been published and assigned to your learning cohort on SensiLearn LMS. You can begin exploring your modules, curriculum, and interactive exercises now.`,
    details: [
      { label: "Course Name", value: options.courseName },
      { label: "Lead Trainer", value: options.trainerName || "SensiLearn Faculty" },
      { label: "Cohort / Batch", value: options.batchName || "Assigned Cohort" },
      { label: "Status", value: "Active & Enrolled", highlight: true },
    ],
    ctaText: "VIEW COURSE",
    redirectUrl: options.courseUrl,
    supportingText: "Complete all prerequisite modules to earn your technical certification.",
  });
}

// 2. COURSE UPDATED
export function generateCourseUpdatedEmail(options: {
  recipientName: string;
  courseName: string;
  updatedBy?: string;
  changeSummary?: string;
  courseUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Course Update",
    title: `Course Updated – ${options.courseName}`,
    preheader: `Course curriculum updated: ${options.courseName}`,
    message: `Important updates have been published to the course curriculum for "${options.courseName}". Please review the updated syllabus and revised materials.`,
    details: [
      { label: "Course", value: options.courseName },
      { label: "Updated By", value: options.updatedBy || "Academic Team" },
      { label: "Change Summary", value: options.changeSummary || "Curriculum & Lesson Enhancements" },
      { label: "Updated Date", value: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW UPDATED COURSE",
    redirectUrl: options.courseUrl,
    supportingText: "Your existing module completion progress remains safely preserved.",
  });
}

// 3. PRACTICE PUBLISHED
export function generatePracticePublishedEmail(options: {
  recipientName: string;
  practiceName: string;
  category?: string;
  duration?: string;
  totalMarks?: string | number;
  practiceUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Skill Lab Practice",
    title: `New Practice Module Available – ${options.practiceName}`,
    preheader: `Practice module ready: ${options.practiceName}`,
    message: `A new hands-on technical practice track has been assigned to your workspace. Start working through the interactive challenges to reinforce your problem-solving skills.`,
    details: [
      { label: "Practice Track", value: options.practiceName },
      { label: "Domain / Category", value: options.category || "Technical Problem Solving" },
      { label: "Total Points", value: String(options.totalMarks || "100") },
      { label: "Estimated Time", value: options.duration || "Self-Paced" },
    ],
    ctaText: "START PRACTICE",
    redirectUrl: options.practiceUrl,
    supportingText: "Submissions are automatically evaluated against enterprise test suites.",
  });
}

// 4. PRACTICE UPDATED
export function generatePracticeUpdatedEmail(options: {
  recipientName: string;
  practiceName: string;
  updatedBy?: string;
  changeSummary?: string;
  practiceUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Practice Update",
    title: `Practice Module Updated – ${options.practiceName}`,
    preheader: `Practice exercises revised: ${options.practiceName}`,
    message: `The practice module "${options.practiceName}" has been updated with revised challenges, instructions, or additional test suites.`,
    details: [
      { label: "Practice Track", value: options.practiceName },
      { label: "Updated By", value: options.updatedBy || "Lead Trainer" },
      { label: "Changes", value: options.changeSummary || "Questions & Test Specifications Updated" },
      { label: "Updated Date", value: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW UPDATED PRACTICE",
    redirectUrl: options.practiceUrl,
  });
}

// 5. CODE LAB PUBLISHED
export function generateCodeLabPublishedEmail(options: {
  recipientName: string;
  codelabName: string;
  courseName?: string;
  difficulty?: string;
  problemCount?: number;
  codelabUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Code Lab",
    title: `New Code Lab Available – ${options.codelabName}`,
    preheader: `New Code Lab available: ${options.codelabName}`,
    message: `A new algorithmic Code Lab challenge workspace has been published on SensiLearn LMS. Complete the algorithmic challenges directly within the Monaco IDE.`,
    details: [
      { label: "Code Lab", value: options.codelabName },
      { label: "Associated Track", value: options.courseName || "Coding Practice" },
      { label: "Difficulty", value: options.difficulty ? options.difficulty.toUpperCase() : "MEDIUM", highlight: true },
      { label: "Problem Count", value: String(options.problemCount || 1) },
    ],
    ctaText: "OPEN CODE LAB",
    redirectUrl: options.codelabUrl,
    supportingText: "Compiler environment supports Python, Java, C++, C, JavaScript, and SQL.",
  });
}

// 6. CODE LAB UPDATED
export function generateCodeLabUpdatedEmail(options: {
  recipientName: string;
  codelabName: string;
  updatedBy?: string;
  codelabUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Code Lab Update",
    title: `Code Lab Updated – ${options.codelabName}`,
    preheader: `Code Lab modified: ${options.codelabName}`,
    message: `The Code Lab workspace "${options.codelabName}" has been updated. Review the updated challenge specifications and test parameters.`,
    details: [
      { label: "Code Lab", value: options.codelabName },
      { label: "Updated By", value: options.updatedBy || "Technical Lead" },
      { label: "Updated Date", value: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW UPDATED CODE LAB",
    redirectUrl: options.codelabUrl,
  });
}

// 7. CODING PROBLEM PUBLISHED
export function generateCodingProblemPublishedEmail(options: {
  recipientName: string;
  problemName: string;
  difficulty?: string;
  topic?: string;
  estimatedDuration?: string;
  problemUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Coding Challenge",
    title: `New Coding Challenge Available – ${options.problemName}`,
    preheader: `New problem published: ${options.problemName}`,
    message: `A new technical problem has been added to the SensiLearn Code Lab. Write, execute, and verify your algorithmic solution against comprehensive test suites.`,
    details: [
      { label: "Problem", value: options.problemName },
      { label: "Topic", value: options.topic || "Algorithms & Data Structures" },
      { label: "Difficulty", value: (options.difficulty || "Medium").toUpperCase(), highlight: true },
      { label: "Duration", value: options.estimatedDuration || "30 Mins" },
    ],
    ctaText: "SOLVE CHALLENGE",
    redirectUrl: options.problemUrl,
    supportingText: "Solution submissions are scored on execution time, memory usage, and edge case coverage.",
  });
}

// 8. CODING PROBLEM UPDATED
export function generateCodingProblemUpdatedEmail(options: {
  recipientName: string;
  problemName: string;
  updatedBy?: string;
  changeSummary?: string;
  problemUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Problem Update",
    title: `Coding Challenge Updated – ${options.problemName}`,
    preheader: `Problem specifications updated: ${options.problemName}`,
    message: `The coding problem "${options.problemName}" has been revised. Review the updated problem description and sample test cases.`,
    details: [
      { label: "Problem", value: options.problemName },
      { label: "Updated By", value: options.updatedBy || "Faculty" },
      { label: "Changes", value: options.changeSummary || "Constraints or test cases revised" },
    ],
    ctaText: "VIEW UPDATED PROBLEM",
    redirectUrl: options.problemUrl,
  });
}

// 9. ASSESSMENT ASSIGNED
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
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Assessment Assigned",
    title: `New Assessment Assigned – ${options.assessmentName}`,
    preheader: `Assessment scheduled: ${options.assessmentName}`,
    message: `A formal proctored assessment has been scheduled and assigned to your account on SensiLearn LMS. Please review the schedule and prepare accordingly.`,
    details: [
      { label: "Assessment", value: options.assessmentName },
      { label: "Duration", value: options.duration || "60 Minutes" },
      { label: "Total Marks", value: String(options.totalMarks || 100) },
      { label: "Passing Score", value: `${options.passingPercentage || 40}%` },
      { label: "Attempts", value: String(options.attemptsAllowed || 1) },
      { label: "Schedule / Start", value: options.startDate || "Active Now" },
      { label: "Deadline", value: options.deadline || "See portal", highlight: true },
    ],
    ctaText: "VIEW ASSESSMENT",
    redirectUrl: options.assessmentUrl,
    supportingText: "Automated proctoring rules may apply. Ensure a stable internet connection and webcam access.",
  });
}

// 10. ASSESSMENT UPDATED
export function generateAssessmentUpdatedEmail(options: {
  recipientName: string;
  assessmentName: string;
  updatedBy?: string;
  changes?: string;
  assessmentUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Assessment Update",
    title: `Assessment Updated – ${options.assessmentName}`,
    preheader: `Assessment update: ${options.assessmentName}`,
    message: `The assessment parameters, schedule, or questions for "${options.assessmentName}" have been updated by the examination board.`,
    details: [
      { label: "Assessment", value: options.assessmentName },
      { label: "Updated By", value: options.updatedBy || "Examination Board" },
      { label: "Modifications", value: options.changes || "Schedule / Criteria revised" },
      { label: "Updated Date", value: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW UPDATED ASSESSMENT",
    redirectUrl: options.assessmentUrl,
  });
}

// 11. ASSESSMENT DEADLINE CHANGED
export function generateAssessmentDeadlineChangedEmail(options: {
  recipientName: string;
  assessmentName: string;
  previousDeadline?: string;
  newDeadline: string;
  assessmentUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Deadline Revision",
    title: `Assessment Deadline Updated – ${options.assessmentName}`,
    preheader: `New deadline: ${options.assessmentName}`,
    message: `The submission deadline for the assessment "${options.assessmentName}" has been modified. Please take note of the updated schedule.`,
    details: [
      { label: "Assessment", value: options.assessmentName },
      { label: "Previous Deadline", value: options.previousDeadline || "Prior schedule" },
      { label: "New Deadline", value: options.newDeadline, highlight: true },
    ],
    ctaText: "VIEW ASSESSMENT",
    redirectUrl: options.assessmentUrl,
    supportingText: "Ensure completion before the revised cutoff time. Late submissions will be closed.",
  });
}

// 12. ASSIGNMENT ASSIGNED
export function generateAssignmentAssignedEmail(options: {
  recipientName: string;
  assignmentName: string;
  courseName?: string;
  trainerName?: string;
  maxMarks?: string | number;
  dueDate: string;
  assignmentUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Assignment Assigned",
    title: `New Assignment Assigned – ${options.assignmentName}`,
    preheader: `Assignment assigned: ${options.assignmentName}`,
    message: `A new project assignment has been assigned to your batch. Complete your deliverables and submit your code/repository before the due date.`,
    details: [
      { label: "Assignment", value: options.assignmentName },
      { label: "Course / Track", value: options.courseName || "Curriculum Track" },
      { label: "Lead Trainer", value: options.trainerName || "SensiLearn Faculty" },
      { label: "Maximum Marks", value: String(options.maxMarks || 100) },
      { label: "Due Date", value: options.dueDate, highlight: true },
    ],
    ctaText: "VIEW ASSIGNMENT",
    redirectUrl: options.assignmentUrl,
    supportingText: "Submissions require your GitHub repository link or verified project archive.",
  });
}

// 13. ASSIGNMENT UPDATED
export function generateAssignmentUpdatedEmail(options: {
  recipientName: string;
  assignmentName: string;
  updatedBy?: string;
  changes?: string;
  assignmentUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Assignment Update",
    title: `Assignment Updated – ${options.assignmentName}`,
    preheader: `Assignment updated: ${options.assignmentName}`,
    message: `The assignment "${options.assignmentName}" has been revised with updated specifications or grading guidelines.`,
    details: [
      { label: "Assignment", value: options.assignmentName },
      { label: "Updated By", value: options.updatedBy || "Course Instructor" },
      { label: "Details", value: options.changes || "Deliverables or instructions revised" },
    ],
    ctaText: "VIEW UPDATED ASSIGNMENT",
    redirectUrl: options.assignmentUrl,
  });
}

// 14. ASSIGNMENT DEADLINE CHANGED
export function generateAssignmentDeadlineChangedEmail(options: {
  recipientName: string;
  assignmentName: string;
  previousDeadline?: string;
  newDeadline: string;
  assignmentUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Deadline Extended",
    title: `Assignment Deadline Updated – ${options.assignmentName}`,
    preheader: `Deadline changed: ${options.assignmentName}`,
    message: `The deadline for assignment "${options.assignmentName}" has been officially updated. Review the revised cutoff below.`,
    details: [
      { label: "Assignment", value: options.assignmentName },
      { label: "Previous Due Date", value: options.previousDeadline || "Standard cutoff" },
      { label: "New Due Date", value: options.newDeadline, highlight: true },
    ],
    ctaText: "VIEW ASSIGNMENT",
    redirectUrl: options.assignmentUrl,
  });
}

// 15. ASSIGNMENT DEADLINE REMINDER
export function generateAssignmentReminderEmail(options: {
  recipientName: string;
  assignmentName: string;
  deadline: string;
  assignmentUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Submission Reminder",
    title: `Reminder: Assignment Due Soon – ${options.assignmentName}`,
    preheader: `Reminder: ${options.assignmentName} is due soon`,
    message: `This is a courtesy reminder that your submission for "${options.assignmentName}" is pending and due shortly. Please submit your work before the deadline.`,
    details: [
      { label: "Assignment", value: options.assignmentName },
      { label: "Due Date", value: options.deadline, highlight: true },
      { label: "Submission Status", value: "Pending" },
    ],
    ctaText: "SUBMIT ASSIGNMENT",
    redirectUrl: options.assignmentUrl,
  });
}

// 16. ANNOUNCEMENT PUBLISHED
export function generateAnnouncementEmail(options: {
  recipientName: string;
  announcementTitle: string;
  announcementMessage: string;
  publishedBy?: string;
  announcementUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "System Announcement",
    title: options.announcementTitle,
    preheader: `Announcement: ${options.announcementTitle}`,
    message: options.announcementMessage,
    details: [
      { label: "Published By", value: options.publishedBy || "SensiLearn Administration" },
      { label: "Date", value: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW ANNOUNCEMENT",
    redirectUrl: options.announcementUrl,
  });
}

// 17. BATCH UPDATED
export function generateBatchUpdatedEmail(options: {
  recipientName: string;
  batchName: string;
  changes?: string;
  batchUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Batch Update",
    title: `Batch Updated – ${options.batchName}`,
    preheader: `Cohort details updated: ${options.batchName}`,
    message: `Details and scheduling for your assigned academic cohort "${options.batchName}" have been updated by the administration.`,
    details: [
      { label: "Batch", value: options.batchName },
      { label: "Status", value: "Active Cohort", highlight: true },
      { label: "Update Summary", value: options.changes || "Cohort schedules / track updated" },
    ],
    ctaText: "VIEW BATCH",
    redirectUrl: options.batchUrl,
  });
}

// 18. STUDENT ADDED TO BATCH
export function generateStudentAddedToBatchEmail(options: {
  recipientName: string;
  batchName: string;
  programName?: string;
  trainerName?: string;
  startDate?: string;
  batchUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Cohort Enrolment",
    title: `You Have Been Added to ${options.batchName}`,
    preheader: `Enrolled in batch: ${options.batchName}`,
    message: `You have been officially enrolled into the academic cohort "${options.batchName}". All batch-specific curriculums, assessments, and live sessions are now available on your portal.`,
    details: [
      { label: "Cohort", value: options.batchName },
      { label: "Program Track", value: options.programName || "Enterprise Fullstack Track" },
      { label: "Mentor / Lead", value: options.trainerName || "SensiLearn Academic Team" },
      { label: "Enrolment Date", value: options.startDate || new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW BATCH",
    redirectUrl: options.batchUrl,
  });
}

// 19. RESULT PUBLISHED
export function generateResultPublishedEmail(options: {
  recipientName: string;
  assessmentName: string;
  score: string | number;
  totalMarks: string | number;
  percentage: string | number;
  status: string;
  completedDate?: string;
  resultUrl: string;
}): { subject: string; html: string; text: string } {
  const isPassed = String(options.status).toLowerCase().includes("pass");
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Assessment Result",
    title: `Your Assessment Result – ${options.assessmentName}`,
    preheader: `Results published: ${options.assessmentName}`,
    message: `Evaluation for your proctored assessment "${options.assessmentName}" has been processed and your scorecard is now accessible.`,
    details: [
      { label: "Assessment", value: options.assessmentName },
      { label: "Score", value: `${options.score} / ${options.totalMarks}` },
      { label: "Percentage", value: `${options.percentage}%` },
      { label: "Outcome", value: isPassed ? "PASSED" : options.status.toUpperCase(), highlight: true },
      { label: "Evaluated At", value: options.completedDate || new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW RESULT",
    redirectUrl: options.resultUrl,
    supportingText: "Access your student analytics page for section-wise breakdown and feedback.",
  });
}

// 20. CERTIFICATE GENERATED
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
    preheader: `Official certificate issued: ${options.courseName}`,
    message: `Congratulations! You have fulfilled all graduation and testing requirements for "${options.courseName}". Your official, verifiable digital certificate is now ready for download.`,
    details: [
      { label: "Program", value: options.courseName },
      { label: "Recipient", value: options.recipientName },
      { label: "Credential ID", value: options.certificateId, highlight: true },
      { label: "Issue Date", value: options.completionDate || new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) },
    ],
    ctaText: "VIEW CERTIFICATE",
    redirectUrl: options.certificateUrl,
    supportingText: "You can share your credential directly on LinkedIn or download a PDF copy.",
  });
}

// 21. STUDENT SUBMISSION → TRAINER (Assignment)
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

// 22. ASSESSMENT COMPLETION → TRAINER
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

// 23. STUDENT WELCOME
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

// 24. TRAINER WELCOME
export function generateTrainerWelcomeEmail(options: {
  trainerName: string;
  trainerEmail: string;
  trainerDashboardUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.trainerName,
    categoryLabel: "Faculty Onboarding",
    title: "Welcome to Sensilearn – Trainer Account Created",
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

// 25. PASSWORD RESET
export function generatePasswordResetEmail(options: {
  recipientName: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Security Verification",
    title: "Reset Your Sensilearn Password",
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

// 26. EMAIL VERIFICATION
export function generateEmailVerificationEmail(options: {
  recipientName: string;
  verificationUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Account Verification",
    title: "Verify Your Sensilearn Email Address",
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

// 27. LIVE CLASS SCHEDULED
export function generateLiveClassScheduledEmail(options: {
  recipientName: string;
  classTitle: string;
  trainerName?: string;
  scheduledTime?: string;
  duration?: string;
  platform?: string;
  liveClassUrl: string;
}): { subject: string; html: string; text: string } {
  return buildMncEmailLayout({
    recipientName: options.recipientName,
    categoryLabel: "Live Interactive Session",
    title: `New Live Class Scheduled – ${options.classTitle}`,
    preheader: `Live class scheduled: ${options.classTitle}`,
    message: `A live interactive training lecture has been scheduled for your cohort on SensiLearn LMS. Please review the start time and join promptly.`,
    details: [
      { label: "Session Title", value: options.classTitle },
      { label: "Lead Trainer", value: options.trainerName || "SensiLearn Faculty" },
      { label: "Scheduled Time", value: options.scheduledTime || "See portal", highlight: true },
      { label: "Duration", value: options.duration || "60 Minutes" },
      { label: "Platform", value: options.platform || "Sensilearn Live Classroom" },
    ],
    ctaText: "JOIN LIVE CLASS",
    redirectUrl: options.liveClassUrl,
    supportingText: "Session attendance and engagement metrics are logged automatically upon entry.",
  });
}

// Backward compatibility alias for legacy imports
export { generateCoursePublishedEmail as generateCourseAssignedEmail };
export { generatePracticePublishedEmail as generatePracticeAssignedEmail };
