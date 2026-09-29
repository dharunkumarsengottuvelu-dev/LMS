/**
 * Professional responsive HTML email templates for FALCON LMS.
 */

interface BaseEmailOptions {
  studentName: string;
  resourceTitle: string;
  assignedBy?: string;
  targetUrl: string;
  category?: string;
  dueDate?: string;
  duration?: string;
  score?: string;
  message?: string;
}

export function generateCourseAssignedEmail({
  studentName,
  resourceTitle,
  assignedBy = "FALCON Academic Team",
  targetUrl,
  category = "Technical Training",
}: BaseEmailOptions): { subject: string; html: string; text: string } {
  const subject = `[FALCON LMS] New Course Assigned: ${resourceTitle}`;
  const text = `Hi ${studentName},\n\nA new course has been assigned to you on FALCON LMS.\n\nCourse: ${resourceTitle}\nCategory: ${category}\nAssigned By: ${assignedBy}\n\nStart Learning: ${targetUrl}\n\nRegards,\nFALCON Learning Technologies`;

  const html = wrapInFalconLayout({
    preheader: `New course assigned: ${resourceTitle}`,
    title: "New Course Assigned",
    studentName,
    bodyHtml: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 24px;">
        A new technical course has been assigned to your learning cohort on <strong>FALCON LMS</strong>.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 120px;">Course Title:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 600;">${resourceTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Category:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Assigned By:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${assignedBy}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0 0 24px; font-size: 14px; color: #64748B; line-height: 22px;">
        You can access your modules, watch curriculum lessons, and complete coding challenges directly from your student portal.
      </p>
    `,
    ctaText: "Start Learning Now",
    ctaUrl: targetUrl,
  });

  return { subject, html, text };
}

export function generateAssessmentAssignedEmail({
  studentName,
  resourceTitle,
  assignedBy = "FALCON Examination Team",
  targetUrl,
  dueDate,
  duration = "60 Mins",
}: BaseEmailOptions): { subject: string; html: string; text: string } {
  const subject = `[FALCON LMS] New Assessment Scheduled: ${resourceTitle}`;
  const text = `Hi ${studentName},\n\nA new proctored evaluation/assessment has been scheduled for you on FALCON LMS.\n\nAssessment: ${resourceTitle}\nDuration: ${duration}\n${dueDate ? `Schedule: ${dueDate}\n` : ""}Assigned By: ${assignedBy}\n\nAccess Assessment: ${targetUrl}\n\nRegards,\nFALCON Learning Technologies`;

  const html = wrapInFalconLayout({
    preheader: `Assessment scheduled: ${resourceTitle}`,
    title: "New Assessment Scheduled",
    studentName,
    bodyHtml: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 24px;">
        A new proctored assessment has been scheduled for your batch on <strong>FALCON LMS</strong>.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 120px;">Assessment:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 600;">${resourceTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Duration:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${duration}</td>
          </tr>
          ${
            dueDate
              ? `<tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Scheduled Time:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 600; color: #2563EB;">${dueDate}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Assigned By:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${assignedBy}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0 0 24px; font-size: 13px; color: #DC2626; line-height: 20px; font-weight: 500;">
        Note: This evaluation may include automated proctoring (tab-switch restrictions and fullscreen enforcement). Please ensure a stable internet connection.
      </p>
    `,
    ctaText: "Launch Assessment",
    ctaUrl: targetUrl,
  });

  return { subject, html, text };
}

export function generatePracticeAssignedEmail({
  studentName,
  resourceTitle,
  assignedBy = "FALCON Trainer",
  targetUrl,
  category = "Practice Track",
}: BaseEmailOptions): { subject: string; html: string; text: string } {
  const subject = `[FALCON LMS] New Practice Track Assigned: ${resourceTitle}`;
  const text = `Hi ${studentName},\n\nA new practice module has been assigned to you on FALCON LMS.\n\nPractice Track: ${resourceTitle}\nAssigned By: ${assignedBy}\n\nStart Practice: ${targetUrl}\n\nRegards,\nFALCON Learning Technologies`;

  const html = wrapInFalconLayout({
    preheader: `New practice assigned: ${resourceTitle}`,
    title: "New Practice Track Assigned",
    studentName,
    bodyHtml: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 24px;">
        Hands-on technical practice modules have been assigned to your workspace.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 120px;">Track Title:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 600;">${resourceTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Category:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Assigned By:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${assignedBy}</td>
          </tr>
        </table>
      </div>
    `,
    ctaText: "Open Practice Lab",
    ctaUrl: targetUrl,
  });

  return { subject, html, text };
}

export function generateResultPublishedEmail({
  studentName,
  resourceTitle,
  targetUrl,
  score = "Evaluated",
}: BaseEmailOptions): { subject: string; html: string; text: string } {
  const subject = `[FALCON LMS] Assessment Result Published: ${resourceTitle}`;
  const text = `Hi ${studentName},\n\nYour evaluation result for "${resourceTitle}" is now available on FALCON LMS.\n\nScore: ${score}\n\nView Detailed Report: ${targetUrl}\n\nRegards,\nFALCON Learning Technologies`;

  const html = wrapInFalconLayout({
    preheader: `Result published: ${resourceTitle}`,
    title: "Assessment Result Published",
    studentName,
    bodyHtml: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 24px;">
        Your evaluation submission for <strong>${resourceTitle}</strong> has been processed and graded.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Result Summary</p>
        <p style="margin: 0; font-size: 24px; color: #16A34A; font-weight: 800;">${score}</p>
      </div>

      <p style="margin: 0 0 24px; font-size: 14px; color: #64748B; line-height: 22px;">
        Log in to review question-by-question breakdown, code execution outputs, and proctoring metrics.
      </p>
    `,
    ctaText: "View Detailed Report",
    ctaUrl: targetUrl,
  });

  return { subject, html, text };
}

export function generateLiveClassScheduledEmail({
  studentName,
  resourceTitle,
  assignedBy = "FALCON Lead Trainer",
  targetUrl,
  dueDate,
  duration = "60 Mins",
  category = "Google Meet",
}: BaseEmailOptions): { subject: string; html: string; text: string } {
  const subject = `[FALCON LMS] New Live Class Scheduled: ${resourceTitle}`;
  const text = `Hi ${studentName},\n\nA live interactive training session has been scheduled for your cohort on FALCON LMS.\n\nClass: ${resourceTitle}\nTrainer: ${assignedBy}\nSchedule: ${dueDate || "Check Portal"}\nPlatform: ${category}\nDuration: ${duration}\n\nJoin Class: ${targetUrl}\n\nRegards,\nFALCON Learning Technologies`;

  const html = wrapInFalconLayout({
    preheader: `Live class scheduled: ${resourceTitle}`,
    title: "New Live Class Scheduled",
    studentName,
    bodyHtml: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 24px;">
        A live interactive training session has been scheduled for your cohort on <strong>FALCON LMS</strong>.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 120px;">Class Title:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 600;">${resourceTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Trainer:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${assignedBy}</td>
          </tr>
          ${
            dueDate
              ? `<tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Scheduled Time:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 600; color: #2563EB;">${dueDate}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Duration:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A;">${duration}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Platform:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 600;">${category}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0 0 24px; font-size: 14px; color: #64748B; line-height: 22px;">
        Please join on time. Attendance and participation are automatically tracked when you enter the live class through your student portal.
      </p>
    `,
    ctaText: "Join Live Class",
    ctaUrl: targetUrl,
  });

  return { subject, html, text };
}

/**
 * Common responsive enterprise email wrapper.
 */
function wrapInFalconLayout({
  preheader,
  title,
  studentName,
  bodyHtml,
  ctaText,
  ctaUrl,
}: {
  preheader: string;
  title: string;
  studentName: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; }
    .btn { display: inline-block; background-color: #2563EB; color: #FFFFFF !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
  </style>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #F1F5F9;">
  <span style="display: none; font-size: 1px; color: #F1F5F9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </span>

  <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Branding Header -->
    <div style="padding: 28px 32px; background-color: #0F172A; border-bottom: 3px solid #2563EB;">
      <table style="width: 100%;">
        <tr>
          <td>
            <span style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
              FALCON<span style="color: #2563EB;">.</span>
            </span>
          </td>
          <td style="text-align: right;">
            <span style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; background-color: #1E293B; padding: 4px 10px; border-radius: 6px;">
              LMS Portal
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 36px 32px;">
      <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px;">
        ${title}
      </h1>
      
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151;">
        Hi <strong>${studentName}</strong>,
      </p>

      ${bodyHtml}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <a href="${ctaUrl}" class="btn" style="display: inline-block; background-color: #2563EB; color: #FFFFFF !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
          ${ctaText} &rarr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
      <p style="margin: 0 0 6px; font-size: 12px; color: #64748B;">
        This is an automated notification from <strong>FALCON Learning Technologies</strong>.
      </p>
      <p style="margin: 0; font-size: 11px; color: #94A3B8;">
        &copy; ${new Date().getFullYear()} FALCON LMS. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>`;
}
