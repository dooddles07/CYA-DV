import "server-only";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { ApiError } from "@/server/utils/api-error";
import {
  decryptSecret,
  encryptSecret,
  generateSecret,
  otpauthUri,
  verifyTotp,
} from "@/server/utils/totp";

const BACKUP_CODE_COUNT = 10;

const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");
const normalizeBackupCode = (code) => String(code ?? "").replace(/[^a-f0-9]/gi, "").toLowerCase();

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

function sessionShape(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, tokenVersion: user.tokenVersion ?? 0 };
}

/**
 * Starts (or restarts) enrollment for an admin-role account. The secret and
 * backup-code hashes are written immediately but inert — confirmEnrollment
 * is what flips totpEnabled, which is the actual gate login() checks.
 */
export async function beginEnrollment(userId) {
  await dbConnect();
  const existing = await User.findById(userId).select("role email").lean();
  if (!existing) throw new ApiError(404, "Account not found.");
  if (existing.role !== "admin") throw new ApiError(403, "MFA enrollment is for admin accounts only.");

  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  // Atomic $set instead of load+save: two concurrent enroll calls (a double
  // click, a retried request, React Strict Mode's dev-only double-effect)
  // would otherwise race a stale in-memory document against Mongoose's
  // optimistic-concurrency check and throw a VersionError on the loser.
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        totpSecret: encryptSecret(secret),
        backupCodeHashes: backupCodes.map((c) => hashCode(normalizeBackupCode(c))),
        totpEnabled: false,
      },
    },
    { returnDocument: "after" }
  );
  if (!user) throw new ApiError(404, "Account not found.");

  const uri = otpauthUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(uri);
  return { otpauthUri: uri, qrDataUrl, backupCodes };
}

/** Verifies the first code and flips totpEnabled — the account is now MFA-protected. */
export async function confirmEnrollment(userId, code) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");
  if (!user.totpSecret) throw new ApiError(400, "Start enrollment first.");

  const secret = decryptSecret(user.totpSecret);
  if (!verifyTotp(secret, code)) throw new ApiError(401, "That code didn't match. Try again.");

  const updated = await User.findByIdAndUpdate(userId, { $set: { totpEnabled: true } }, { new: true });
  return sessionShape(updated);
}

/** Verifies a TOTP code or consumes a single-use backup code for an already-enrolled account. */
export async function verifyMemberCode(userId, { code, backupCode } = {}) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user || !user.totpEnabled) throw new ApiError(401, "MFA is not set up for this account.");

  if (backupCode) {
    const target = hashCode(normalizeBackupCode(backupCode));
    // Atomic pull, conditioned on the code still being present, so two
    // concurrent redemptions of the same backup code can't both succeed.
    const updated = await User.findOneAndUpdate(
      { _id: userId, backupCodeHashes: target },
      { $pull: { backupCodeHashes: target } },
      { returnDocument: "after" }
    );
    if (!updated) throw new ApiError(401, "That backup code is not valid.");
    return sessionShape(updated);
  }

  const secret = decryptSecret(user.totpSecret);
  if (!verifyTotp(secret, code)) throw new ApiError(401, "That code didn't match. Try again.");
  return sessionShape(user);
}

/** Verifies a code against the single shared portal secret (no backup codes — see design doc). */
export async function verifyPortalCode({ code }) {
  const secret = process.env.ADMIN_PORTAL_TOTP_SECRET;
  if (!secret) throw new ApiError(503, "Portal MFA is not configured.");
  if (!verifyTotp(secret, code)) throw new ApiError(401, "That code didn't match. Try again.");
  return true;
}
