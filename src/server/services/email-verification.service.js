import "server-only";
import crypto from "node:crypto";
import { dbConnect } from "@/server/config/db";
import { mailConfigured, mailFrom, mailer } from "@/server/config/mailer";
import { User } from "@/server/models/user.model";
import { VerifyToken } from "@/server/models/verify-token.model";
import { ApiError } from "@/server/utils/api-error";
import { logError } from "@/server/utils/logger";
import { requireSiteUrl } from "@/lib/site";

const TTL_MINUTES = 60 * 24; // 24 hours

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function emailBody(name, link) {
  const safeName = escapeHtml(name);
  return {
    text: [
      `Hi ${name},`,
      "",
      "Confirm your email to finish setting up your CYA Daily Verse account:",
      link,
      "",
      `This link expires in ${TTL_MINUTES / 60} hours.`,
      "If you didn't create an account, you can ignore this email.",
      "",
      "— CYA Daily Verse",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0f2233">
        <p style="font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#0095ff;margin:0">
          CYA Daily Verse
        </p>
        <h1 style="font-size:22px;margin:16px 0 0">Confirm your email</h1>
        <p style="line-height:1.6;color:#44586b">Hi ${safeName}, confirm your email to finish setting up your account:</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#0095ff;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;display:inline-block">
            Confirm email
          </a>
        </p>
        <p style="line-height:1.6;color:#44586b;font-size:14px">
          This link expires in ${TTL_MINUTES / 60} hours.
          If you didn't create an account, you can ignore this email.
        </p>
        <p style="color:#8ba0b3;font-size:12px;word-break:break-all;margin-top:24px">${link}</p>
      </div>
    `,
  };
}

/**
 * Emails a fresh verification link to the given account. Best-effort: a mail
 * failure is logged, not thrown, so registration itself never fails on it.
 * @param {{ id: string, name: string, email: string }} user
 */
export async function sendVerificationEmail(user) {
  if (!mailConfigured()) return { sent: false };
  try {
    await dbConnect();
    // Only the newest link should work.
    await VerifyToken.deleteMany({ userId: user.id, usedAt: null });

    const token = crypto.randomBytes(32).toString("hex");
    await VerifyToken.create({
      userId: user.id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
    });

    const link = `${requireSiteUrl()}/verify-email?token=${token}`;
    const { text, html } = emailBody(user.name.split(" ")[0] || "friend", link);
    await mailer().sendMail({
      from: mailFrom(),
      to: user.email,
      subject: "Confirm your CYA Daily Verse email",
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    logError("emailVerification.send", err, { userId: user.id });
    return { sent: false };
  }
}

/** Resends a verification link to the signed-in user, if still unverified. */
export async function resendVerification(userId) {
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(404, "Account not found.");
  if (user.emailVerified) return { sent: true, alreadyVerified: true };
  await sendVerificationEmail({ id: user._id.toString(), name: user.name, email: user.email });
  return { sent: true };
}

/** Marks the account verified if the token is valid, unused and unexpired. */
export async function verifyEmail(token) {
  token = String(token ?? "").trim();
  if (!token) throw new ApiError(400, "This verification link is invalid.");

  await dbConnect();
  // Atomic claim: the filter requires usedAt still null, so two concurrent
  // requests with the same token can't both pass a find-then-save gap and
  // both consume it.
  const record = await VerifyToken.findOneAndUpdate(
    { tokenHash: hash(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!record) throw new ApiError(400, "This verification link has expired or already been used.");

  await User.findByIdAndUpdate(record.userId, { $set: { emailVerified: true } });
  return { verified: true };
}
