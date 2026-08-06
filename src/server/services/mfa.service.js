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
 * Starts (or resumes) enrollment for an admin-role account. If an
 * unconfirmed enrollment is already in progress, its secret is reused rather
 * than replaced — a page reload, a duplicate tab, or a duplicate in-flight
 * request must not silently invalidate whatever the user already scanned
 * into their authenticator app.
 *
 * The secret decision is a single atomic conditional update, not a
 * read-then-write: two calls racing at the same instant (the client's
 * effect double-fires under React Strict Mode) could otherwise both read
 * "no secret yet", each generate a *different* one, and whichever HTTP
 * response reaches the browser last isn't guaranteed to be the one whose DB
 * write landed last — the displayed QR code could silently mismatch the
 * secret confirmEnrollment actually checks against. MongoDB serializes
 * writes per document, so of two concurrent findByIdAndUpdate calls with
 * the same "still vacant" filter, only one can win the $set; the loser's
 * filter no longer matches once the winner's write commits, so it falls
 * through and reads back the value that's now consistently stored.
 *
 * Backup codes are regenerated every call regardless (their plaintext can't
 * be recovered from the stored hashes) — safe because each response's own
 * write pairs its stored hashes with the exact codes it displays.
 * confirmEnrollment is what flips totpEnabled, which is the actual gate
 * login() checks.
 */
export async function beginEnrollment(userId) {
  await dbConnect();

  const role = await User.findById(userId).select("role").lean();
  if (!role) throw new ApiError(404, "Account not found.");
  if (role.role !== "admin") throw new ApiError(403, "MFA enrollment is for admin accounts only.");

  const freshSecret = generateSecret();
  let user = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ totpSecret: { $exists: false } }, { totpSecret: null }, { totpEnabled: true }],
    },
    { $set: { totpSecret: encryptSecret(freshSecret), totpEnabled: false } },
    { returnDocument: "after" }
  );
  let secret = freshSecret;

  if (!user) {
    // Filter didn't match: a pending secret already exists (this call lost
    // the race, or arrived after an earlier sequential call). Read it back.
    user = await User.findById(userId).select("email totpSecret");
    if (!user) throw new ApiError(404, "Account not found.");
    secret = decryptSecret(user.totpSecret);
  }

  const backupCodes = generateBackupCodes();
  await User.updateOne(
    { _id: userId },
    { $set: { backupCodeHashes: backupCodes.map((c) => hashCode(normalizeBackupCode(c))) } }
  );

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

  const updated = await User.findByIdAndUpdate(userId, { $set: { totpEnabled: true } }, { returnDocument: "after" });
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
