import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { getEmailSettings } from "../services/emailSettingsService.js";

dotenv.config();

const { EMAIL_USER, EMAIL_PASS, EMAIL_FROM, SUPPORT_EMAIL } = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("Email credentials missing (EMAIL_USER / EMAIL_PASS)");
  process.exit(1);
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
}

const transporter = createTransporter();

/**
 * Send email with DB-defined support email override.
 */
export async function sendEmail({ to, subject, html, replyTo }) {
  if (!to || !subject) {
    throw new Error("Missing required email fields (to, subject)");
  }

  try {
    const settings = await getEmailSettings();

    const from = EMAIL_FROM || `Kumar Music <${EMAIL_USER}>`;

    const finalReplyTo =
      replyTo ||
      settings.supportEmail ||
      SUPPORT_EMAIL ||
      undefined;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(finalReplyTo ? { replyTo: finalReplyTo } : {}),
    });

    console.log(`Email sent → ${info.messageId}`);
  } catch (err) {
    console.error("Email send failed:", err.message);
    throw new Error("Email delivery failed");
  }
}
