import nodemailer from "nodemailer";

async function verifySmtp() {
  const user = process.env.SMTP_USER || "sensigroup.info@gmail.com";
  const rawPass = process.env.SMTP_PASSWORD || "";
  const pass = rawPass.replace(/\s+/g, "");

  console.log(`Testing SMTP connection for: ${user}`);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  try {
    const verified = await transporter.verify();
    console.log("✅ Gmail SMTP connection SUCCESSFUL! Server is ready to send messages.");
    return true;
  } catch (error: any) {
    console.error("❌ Gmail SMTP verification failed:", error?.message || error);
    return false;
  }
}

verifySmtp().then((success) => {
  process.exit(success ? 0 : 1);
});

