import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SendEmailPayload {
  to: string;
  studentName?: string;
  recipientName?: string;
  subject: string;
  html: string;
  text?: string;
  notificationType?: string;
  resourceType?: string;
  resourceId?: string;
  redirectUrl?: string;
  ctaText?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  status: "sent" | "failed" | "dev_simulated" | "skipped";
  messageId?: string;
  errorMessage?: string;
}

/**
 * Validates email syntax strictly to prevent injection and delivery issues.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const cleaned = email.trim();
  // Protection against newline injection in email addresses
  if (/[\r\n]/.test(cleaned)) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(cleaned);
}

/**
 * Sanitizes header string to prevent email header injection attacks.
 */
function sanitizeHeader(val: string): string {
  return (val || "").replace(/[\r\n]+/g, " ").trim();
}

/**
 * Universal Server-Side Email Service with Retry & Fallback.
 * Conforms to MNC Email specifications with multi-mode (development / production) execution.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<EmailDeliveryResult> {
  const {
    to,
    studentName,
    recipientName,
    subject,
    html,
    text,
    notificationType,
    resourceType,
    resourceId,
    redirectUrl,
    ctaText,
  } = payload;

  const targetName = recipientName || studentName || "Recipient";

  if (!isValidEmail(to)) {
    console.warn(`[Email Service] Skipped: Invalid or missing email address: "${to}"`);
    return {
      success: false,
      status: "failed",
      errorMessage: `Invalid recipient email address: "${to}"`,
    };
  }

  const cleanTo = to.trim();
  const cleanSubject = sanitizeHeader(subject);

  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "sensigroup.info@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME || "SensiGroup LMS";
  const formattedFrom = `"${sanitizeHeader(fromName)}" <${sanitizeHeader(fromEmail)}>`;

  const emailMode = (process.env.EMAIL_MODE || "").toLowerCase();
  const smtpUser = process.env.SMTP_USER || "sensigroup.info@gmail.com";
  const rawPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
  const smtpPass = rawPass.replace(/\s+/g, "");
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";

  // Check if simulated mode explicitly forced via EMAIL_MODE=development without SMTP_PASS
  if (emailMode === "development" && !smtpPass) {
    console.log(`\n========================================`);
    console.log(`EMAIL SIMULATION`);
    console.log(`========================================`);
    console.log(`Event:     ${notificationType || "GENERAL_NOTIFICATION"}`);
    console.log(`Recipient: ${cleanTo} (${targetName})`);
    console.log(`Subject:   ${cleanSubject}`);
    console.log(`Redirect:  ${redirectUrl || "N/A"}`);
    console.log(`CTA:       ${ctaText || "VIEW"}`);
    console.log(`Status:    SIMULATED`);
    console.log(`========================================\n`);

    return {
      success: true,
      status: "dev_simulated",
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  // Option 1: Live SMTP Transport via Nodemailer with Retries
  if (smtpPass) {
    const isGmail =
      smtpHost.toLowerCase().includes("gmail") ||
      smtpUser.toLowerCase().endsWith("@gmail.com");

    const port = Number(process.env.SMTP_PORT) || (isGmail ? 465 : 587);
    const secure = port === 465 || process.env.SMTP_SECURE === "true";

    const transporter = isGmail
      ? nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })
      : nodemailer.createTransport({
          host: smtpHost,
          port,
          secure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await transporter.sendMail({
          from: formattedFrom,
          to: cleanTo,
          subject: cleanSubject,
          html,
          text: text || "",
        });

        console.log(`[Email Service] Success: Dispatched via SMTP to ${cleanTo} (Message ID: ${info.messageId}) [Attempt ${attempt}]`);

        // Record asynchronous delivery log
        logEmailDeliveryAsync({
          recipientEmail: cleanTo,
          recipientName: targetName,
          subject: cleanSubject,
          eventType: notificationType || "GENERAL",
          resourceType,
          resourceId,
          redirectUrl,
          status: "sent",
          messageId: info.messageId,
          provider: isGmail ? "gmail_smtp" : "smtp",
        });

        return { success: true, status: "sent", messageId: info.messageId };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Email Service] SMTP attempt ${attempt}/${maxRetries} failed for ${cleanTo}:`, err?.message || err);
        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1500ms
          await new Promise((resolve) => setTimeout(resolve, attempt * 750));
        }
      }
    }

    console.error(`[Email Service] SMTP delivery permanently failed after ${maxRetries} attempts for ${cleanTo}:`, lastError);

    logEmailDeliveryAsync({
      recipientEmail: cleanTo,
      recipientName: targetName,
      subject: cleanSubject,
      eventType: notificationType || "GENERAL",
      resourceType,
      resourceId,
      redirectUrl,
      status: "failed",
      errorMessage: lastError?.message || String(lastError),
      provider: isGmail ? "gmail_smtp" : "smtp",
    });

    return {
      success: false,
      status: "failed",
      errorMessage: lastError?.message || "SMTP dispatch failed after retries",
    };
  }

  // Option 2: Fallback Development Simulation when SMTP_PASS is missing
  console.log(`\n================== [SENSILEARN LMS EMAIL DISPATCH] ==================`);
  console.log(`To:             ${cleanTo} (${targetName})`);
  console.log(`Subject:        ${cleanSubject}`);
  console.log(`From:           ${formattedFrom}`);
  console.log(`Status:         Simulated Dev Delivery (SMTP_PASS not provided)`);
  console.log(`Redirect URL:   ${redirectUrl || "N/A"}`);
  console.log(`=================================================================\n`);

  return {
    success: true,
    status: "dev_simulated",
    messageId: `dev_${Date.now()}`,
  };
}

/**
 * Asynchronously persists delivery logs into database without blocking the caller.
 */
function logEmailDeliveryAsync(log: {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  redirectUrl?: string;
  status: string;
  messageId?: string;
  errorMessage?: string;
  provider: string;
}) {
  try {
    const admin = createAdminClient();
    admin
      .from("email_notifications")
      .insert({
        email: log.recipientEmail,
        notification_type: log.eventType,
        resource_type: log.resourceType || "general",
        resource_id: log.resourceId || null,
        subject: log.subject,
        status: log.status,
        error_message: log.errorMessage || null,
        sent_at: log.status === "sent" ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      })
      .then(
        () => {},
        () => {
          // Table may not exist yet, fallback silently
        }
      );
  } catch {}
}

/**
 * Verifies SMTP configuration and sends a test email.
 */
export async function testSmtpConnection(testRecipient?: string): Promise<{ success: boolean; message: string; details?: any }> {
  const smtpUser = process.env.SMTP_USER || "sensigroup.info@gmail.com";
  const rawPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
  const smtpPass = rawPass.replace(/\s+/g, "");
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";

  if (!smtpPass) {
    return {
      success: false,
      message: `SMTP password (Google App Password) is not set in .env.local for ${smtpUser}. Please add SMTP_PASS=your-16-char-app-password.`,
    };
  }

  try {
    const isGmail = smtpHost.toLowerCase().includes("gmail") || smtpUser.toLowerCase().endsWith("@gmail.com");
    const port = Number(process.env.SMTP_PORT) || (isGmail ? 465 : 587);
    const secure = port === 465 || process.env.SMTP_SECURE === "true";

    const transporter = isGmail
      ? nodemailer.createTransport({
          service: "gmail",
          auth: { user: smtpUser, pass: smtpPass },
        })
      : nodemailer.createTransport({
          host: smtpHost,
          port,
          secure,
          auth: { user: smtpUser, pass: smtpPass },
        });

    await transporter.verify();

    const targetEmail = testRecipient || smtpUser;
    const testResult = await transporter.sendMail({
      from: `"SensiGroup LMS" <${smtpUser}>`,
      to: targetEmail,
      subject: `[SensiGroup LMS] SMTP Verification Test Email`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 550px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0F172A; margin-top: 0;">SensiGroup LMS — SMTP Connected</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            This test confirmation verifies that <strong>${smtpUser}</strong> is successfully configured for automated LMS email notifications to students and trainers.
          </p>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; font-size: 12px; color: #475569;">
            <strong>Timestamp:</strong> ${new Date().toISOString()}<br/>
            <strong>Service:</strong> Gmail SMTP (SSL: ${secure})
          </div>
        </div>
      `,
      text: `SensiGroup LMS — SMTP Connected successfully for ${smtpUser} at ${new Date().toISOString()}`,
    });

    return {
      success: true,
      message: `SMTP connection verified and test email sent to ${targetEmail}!`,
      details: { messageId: testResult.messageId },
    };
  } catch (err: any) {
    console.error("[Email Service] SMTP verification failed:", err);
    return {
      success: false,
      message: err?.message || "Failed to connect to SMTP server. Ensure Google App Password is correct.",
    };
  }
}
