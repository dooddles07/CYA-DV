import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/server/config/db";
import { logoDataUri, mailConfigured, mailFrom, mailer } from "@/server/config/mailer";
import { User } from "@/server/models/user.model";
import { ResetToken } from "@/server/models/reset-token.model";
import { ApiError } from "@/server/utils/api-error";
import { requireSiteUrl } from "@/lib/site";
import { logError } from "@/server/utils/logger";
import { isPasswordBreached } from "@/server/services/breach-check.service";

const TTL_MINUTES = 60;

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function emailBody(name, link) {
  const safeName = escapeHtml(name);
  const logoUrl = logoDataUri();
  return {
    text: [
      `Hi ${name},`,
      "",
      "Someone asked to reset the password on your CYA Daily Verse account.",
      "If that was you, pick a new one here:",
      link,
      "",
      `This link works once and expires in ${TTL_MINUTES} minutes.`,
      "Wasn't you? Nothing's changed — just leave this email alone.",
      "",
      "— CYA Daily Verse",
    ].join("\n"),
    html: `
      <div style="background:#eef6ff;padding:40px 16px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(15,34,51,0.08)">
          <div style="background:#0095ff;padding:32px 32px 28px;text-align:center">
            <img src="${logoUrl}" alt="CYA Daily Verse" width="56" height="56" style="border-radius:14px;display:block;margin:0 auto 12px" />
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#e0f2ff">
              CYA Daily Verse
            </p>
          </div>
          <div style="padding:36px 32px 32px">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f2233">Reset your password</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44586b">
              Hi ${safeName}, someone asked to reset the password on your CYA Daily Verse account. If that was you,
              pick a new one below.
            </p>
            <div style="text-align:center;margin:0 0 28px">
              <a href="${link}" style="display:inline-block;background:#0095ff;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:999px">
                Choose a new password
              </a>
            </div>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#8ba0b3">
              This link works once and expires in ${TTL_MINUTES} minutes. Wasn't you? Nothing's changed
              — just leave this email alone.
            </p>
            <p style="margin:20px 0 0;font-size:11px;word-break:break-all;color:#b7c5d1">${link}</p>
          </div>
          <div style="padding:20px 32px;background:#f7fafc;text-align:center;border-top:1px solid #eef2f5">
            <p style="margin:0;font-size:12px;color:#8ba0b3">Made with prayer, for the youth.</p>
          </div>
        </div>
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

  const link = `${requireSiteUrl()}/reset-password?token=${token}`;
  const { text, html } = emailBody(user.name.split(" ")[0] || "friend", link);

  // Fire-and-forget: the response is the same whether or not an account exists
  // (anti-enumeration), so it need not wait on the SMTP round-trip. Awaiting
  // would let a slow mail server stall the request.
  void mailer()
    .sendMail({
      from: mailFrom(),
      to: user.email,
      subject: "Reset your CYA Daily Verse password",
      text,
      html,
    })
    .catch((err) => logError("passwordReset.send", err, { userId: user._id.toString() }));

  return { sent: true };
}

/** Consumes a token and sets the new password. */
export async function completeReset(token, password) {
  token = String(token ?? "").trim();
  password = String(password ?? "");

  if (!token) throw new ApiError(400, "This reset link is invalid.");
  if (password.length < 8) throw new ApiError(400, "Password needs at least 8 characters.");
  if (await isPasswordBreached(password))
    throw new ApiError(400, "This password has appeared in a data breach. Please choose a different one.");

  await dbConnect();
  // Atomic claim: the filter requires usedAt still null, so two concurrent
  // requests with the same token can't both pass a find-then-save gap and
  // both consume it.
  const record = await ResetToken.findOneAndUpdate(
    { tokenHash: hash(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!record) throw new ApiError(400, "This reset link has expired or already been used.");

  const user = await User.findById(record.userId);
  if (!user) throw new ApiError(400, "This reset link is no longer valid.");

  user.passwordHash = await bcrypt.hash(password, 10);
  // Invalidate every existing session so a compromised login is logged out.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return { id: user._id.toString(), name: user.name, email: user.email, tokenVersion: user.tokenVersion };
}
