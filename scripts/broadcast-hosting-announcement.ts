import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { generateAnnouncementEmail } from "../src/lib/email/email-templates";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vdpokcnbslgzyufybxey.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SMTP_USER = process.env.SMTP_USER || "sensigroup.info@gmail.com";
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

async function main() {
  const args = process.argv.slice(2);
  const isSendAll = args.includes("--send-all");
  const testToArg = args.find((a) => a.startsWith("--test-to="))?.split("=")[1];

  console.log("======================================================================");
  console.log("📣 SENSILEARN LMS — HOSTING ANNOUNCEMENT BROADCASTER");
  console.log("======================================================================\n");

  // 1. Fetch registered users from Supabase Auth & Profiles
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error || !users) {
    console.error("Failed to fetch users from Supabase:", error);
    process.exit(1);
  }

  const { data: profiles } = await supabase.from("profiles").select("user_id, email, first_name, last_name, role");
  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

  // Filter out dummy test domains (like @lms.com)
  const validRecipients = users
    .filter((u) => u.email && !u.email.endsWith("@lms.com"))
    .map((u) => {
      const p = profileMap.get(u.id);
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || u.email!.split("@")[0];
      return {
        id: u.id,
        email: u.email!,
        name,
        role: p?.role || (u.user_metadata?.role as string) || "student",
      };
    });

  console.log(`Found ${validRecipients.length} valid registered users in database:`);
  validRecipients.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.name} <${r.email}> [${r.role}]`);
  });
  console.log("");

  const announcementTitle = "SensiLearn LMS is Officially Hosted & Live at sensilearn.com!";
  const announcementMessage =
    "We are pleased to inform you that SensiLearn LMS is now officially hosted and fully operational at https://sensilearn.com.\n\n" +
    "All learning modules, coding practice environments, online compilers, and assessments are active. " +
    "You can now access your courses, participate in code challenges, and track your progress seamlessly.\n\n" +
    "Please log in using your registered credentials or continue with Google Sign-In.";

  if (testToArg) {
    console.log(`Sending single TEST email to: ${testToArg}...`);
    const template = generateAnnouncementEmail({
      recipientName: "SensiLearn Member",
      announcementTitle,
      announcementMessage,
      publishedBy: "SensiLearn Executive Team",
      announcementUrl: "https://sensilearn.com/login",
    });

    try {
      await transporter.sendMail({
        from: `"SensiLearn LMS" <${SMTP_USER}>`,
        to: testToArg,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      console.log(`✅ Test email successfully sent to ${testToArg}!`);
    } catch (sendErr: any) {
      console.error("❌ Failed to send test email:", sendErr?.message || sendErr);
    }
    return;
  }

  if (!isSendAll) {
    console.log("ℹ️  Dry-run mode. To send to all recipients, run with '--send-all'");
    console.log("   Or to send a test email first, run with '--test-to=your-email@gmail.com'");
    return;
  }

  console.log(`🚀 Broadcasting to all ${validRecipients.length} registered users...\n`);
  let successCount = 0;
  let failCount = 0;

  for (const r of validRecipients) {
    const template = generateAnnouncementEmail({
      recipientName: r.name || "Student",
      announcementTitle,
      announcementMessage,
      publishedBy: "SensiLearn Executive Team",
      announcementUrl: "https://sensilearn.com/login",
    });

    try {
      await transporter.sendMail({
        from: `"SensiLearn LMS" <${SMTP_USER}>`,
        to: r.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      console.log(`✅ Sent to ${r.name} <${r.email}>`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ Failed to send to ${r.email}:`, err?.message || err);
      failCount++;
    }

    // Gentle delay to avoid Gmail rate-limits
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  console.log("\n======================================================================");
  console.log(`📊 BROADCAST COMPLETE: ${successCount} sent, ${failCount} failed.`);
  console.log("======================================================================");
}

main().catch(console.error);

