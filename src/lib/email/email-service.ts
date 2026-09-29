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
 * Generates branded FALCON Learning Technologies HTML email for notifications.
 * Format: FALCON header → title → Hello [name], → message → Regards, Falcon Learning Technologies
 */
export function generateNotificationEmailHtml(
  studentName: string,
  title: string,
  message: string,
  linkUrl?: string,
  linkLabel?: string
): string {
  const safeStudentName = studentName || "Student";
  const safeLinkSection = linkUrl
    ? `<div style="margin:28px 0 0;">
        <a href="${linkUrl}" style="display:inline-block;background:#2563EB;color:#fff;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:0.3px;">
          ${linkLabel || "View Details"}
        </a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
          <!-- Header -->
          <tr>
            <td style="background:#0F172A;padding:28px 36px;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                FALCON<span style="color:#2563EB;">.</span>
              </p>
              <p style="margin:4px 0 0;font-size:11px;font-weight:600;color:#94A3B8;letter-spacing:1.5px;text-transform:uppercase;">
                Learning Technologies
              </p>
            </td>
          </tr>
          <!-- Blue accent bar -->
          <tr>
            <td style="background:#2563EB;height:4px;"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0F172A;line-height:1.3;">
                ${title}
              </h1>
              <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
                Hello <strong>${safeStudentName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.7;">
                ${message.replace(/\n/g, "<br/>")}
              </p>
              ${safeLinkSection}
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <hr style="border:none;border-top:1px solid #E2E8F0;margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 32px;">
              <p style="margin:0 0 4px;font-size:13px;color:#64748B;line-height:1.6;">
                Regards,<br/>
                <strong style="color:#0F172A;">Falcon Learning Technologies</strong>
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#94A3B8;line-height:1.5;">
                This is an automated notification from the FALCON LMS platform. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
