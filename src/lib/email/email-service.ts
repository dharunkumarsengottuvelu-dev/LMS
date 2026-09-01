import nodemailer from "nodemailer";

export interface SendEmailPayload {
  to: string;
  studentName?: string;
  subject: string;
  html: string;
  text?: string;
  notificationType?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  status: "sent" | "failed" | "dev_simulated" | "skipped";
  messageId?: string;
  errorMessage?: string;
}

/**
 * Validates basic email syntax.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Universal Server-Side Email Service.
 * Transports emails through SMTP, Resend, Brevo, or simulated Dev Logger.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<EmailDeliveryResult> {
  const { to, subject, html, text } = payload;

  if (!isValidEmail(to)) {
    console.warn(`[Email Service] Skipped: Invalid or missing email address: "${to}"`);
    return {
      success: false,
      status: "failed",
      errorMessage: `Invalid recipient email address: "${to}"`,
    };
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || "notifications@falconlms.com";
  const fromName = process.env.EMAIL_FROM_NAME || "FALCON LMS";
  const formattedFrom = `"${fromName}" <${fromEmail}>`;

  // Option 1: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: formattedFrom,
          to: [to.trim()],
          subject,
          html,
          text: text || "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[Email Service] Successfully dispatched via Resend to ${to} (ID: ${data.id})`);
        return { success: true, status: "sent", messageId: data.id };
      } else {
        const errText = await res.text();
        console.error(`[Email Service] Resend API error:`, errText);
        return { success: false, status: "failed", errorMessage: errText };
      }
    } catch (err: any) {
      console.error(`[Email Service] Resend dispatch exception:`, err);
      return { success: false, status: "failed", errorMessage: err?.message || String(err) };
    }
  }

  // Option 2: SMTP Transport via Nodemailer
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: formattedFrom,
        to: to.trim(),
        subject,
        html,
        text: text || "",
      });

      console.log(`[Email Service] Successfully dispatched via SMTP to ${to} (ID: ${info.messageId})`);
      return { success: true, status: "sent", messageId: info.messageId };
    } catch (err: any) {
      console.error(`[Email Service] SMTP dispatch error:`, err);
      return { success: false, status: "failed", errorMessage: err?.message || String(err) };
    }
  }

  // Option 3: Development Simulation / Console Transport
  // If no live credentials configured, safely simulate delivery and log email payload
  console.log(`\n================== [FALCON LMS EMAIL DISPATCH] ==================`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`From: ${formattedFrom}`);
  console.log(`Status: Simulated Dev Delivery (Configure SMTP_HOST or RESEND_API_KEY for live sending)`);
  console.log(`=================================================================\n`);

  return {
    success: true,
    status: "dev_simulated",
    messageId: `dev_${Date.now()}`,
  };
}
