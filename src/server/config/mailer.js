import "server-only";
import nodemailer from "nodemailer";
import { ApiError } from "@/server/utils/api-error";

let cached = null;

/**
 * Gmail SMTP. SMTP_PASS must be a Google App Password (16 chars, 2FA required),
 * never the account password.
 */
export function mailer() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new ApiError(503, "Email is not configured on this server.");

  cached ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cached;
}

export function mailFrom() {
  return process.env.SMTP_FROM ?? `CYA Daily Verse <${process.env.SMTP_USER}>`;
}

export function mailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}
