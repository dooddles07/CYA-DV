import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/server/config/db";
import { mailConfigured, mailFrom, mailer } from "@/server/config/mailer";
import { User } from "@/server/models/user.model";
import { ResetToken } from "@/server/models/reset-token.model";
import { ApiError } from "@/server/utils/api-error";
import { SITE_URL } from "@/lib/site";

const TTL_MINUTES = 60;

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

function emailBody(name, link) {
  return {
    text: [
      `Hi ${name},`,
      "",
      "We received a request to reset your CYA Daily Verse password.",
      "Open this link to choose a new one:",
      link,
      "",
      `The link expires in ${TTL_MINUTES} minutes and can only be used once.`,
      "If you didn't ask for this, you can safely ignore this email — nothing has changed.",
      "",
      "— CYA Daily Verse",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f2233">
        <p style="font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#0095ff;margin:0">
          CYA Daily Verse
        </p>
        <h1 style="font-size:22px;margin:16px 0 0">Reset your password</h1>
        <p style="line-height:1.6;color:#44586b">Hi ${name}, we received a request to reset your password. Choose a new one here:</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#0095ff;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;display:inline-block">
            Choose a new password
          </a>
        </p>
        <p style="line-height:1.6;color:#44586b;font-size:14px">
          The link expires in ${TTL_MINUTES} minutes and can only be used once.
          If you didn't ask for this, you can safely ignore this email — nothing has changed.
        </p>
        <p style="color:#8ba0b3;font-size:12px;word-break:break-all;margin-top:24px">${link}</p>
      </div>
    `,
  };
}

/**
 * Emails a reset link if the address belongs to an account.
 * Always resolves the same way so the endpoint cannot be used to discover
 * which email addresses are registered.
 */
export async function requestReset(email) {
  email = String(email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, "That email doesn't look right.");

  // Checked before touching the database so a missing mail config reports
  // itself clearly instead of surfacing as a generic failure.
  if (!mailConfigured())
    throw new ApiError(503, "Password reset by email isn't set up yet. Please contact a leader.");

  await dbConnect();
  const user = await User.findOne({ email });
  if (!user) return { sent: true };

  // Invalidate any earlier links so only the newest one works.
  await ResetToken.deleteMany({ userId: user._id, usedAt: null });

  const token = crypto.randomBytes(32).toString("hex");
  await ResetToken.create({
    userId: user._id,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
  });

  const link = `${SITE_URL}/reset-password?token=${token}`;
  const { text, html } = emailBody(user.name.split(" ")[0] || "friend", link);

  await mailer().sendMail({
    from: mailFrom(),
    to: user.email,
    subject: "Reset your CYA Daily Verse password",
    text,
    html,
  });

  return { sent: true };
}

/** Consumes a token and sets the new password. */
export async function completeReset(token, password) {
  token = String(token ?? "").trim();
  password = String(password ?? "");

  if (!token) throw new ApiError(400, "This reset link is invalid.");
  if (password.length < 8) throw new ApiError(400, "Password needs at least 8 characters.");

  await dbConnect();
  const record = await ResetToken.findOne({ tokenHash: hash(token) });
  if (!record || record.usedAt || record.expiresAt < new Date())
    throw new ApiError(400, "This reset link has expired or already been used.");

  const user = await User.findById(record.userId);
  if (!user) throw new ApiError(400, "This reset link is no longer valid.");

  user.passwordHash = await bcrypt.hash(password, 10);
  // Invalidate every existing session so a compromised login is logged out.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  record.usedAt = new Date();
  await record.save();

  return { id: user._id.toString(), name: user.name, email: user.email, tokenVersion: user.tokenVersion };
}
