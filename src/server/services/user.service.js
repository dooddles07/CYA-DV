import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { ApiError } from "@/server/utils/api-error";
import { dayNumber, keyFromDayNumber, manilaDayKey } from "@/server/utils/dates";
import { XP_PER_READ, levelFor, xpToNext } from "@/server/utils/gamification";
import { challenges } from "@/lib/data";
import { logError } from "@/server/utils/logger";

/** @typedef {import("@/lib/types").UserStats} UserStats */

function stats(user) {
  // Coalesce missing fields rather than trust every write path (scripts,
  // manual DB edits) to have populated them — .lean() reads skip Mongoose's
  // schema-default backfill, so a doc missing these would otherwise render
  // `undefined`/NaN and crash the dashboard (`undefined.toLocaleString()`).
  const xp = user.xp ?? 0;
  return {
    streak: user.streak ?? 0,
    bestStreak: user.bestStreak ?? 0,
    totalReads: user.totalReads ?? 0,
    xp,
    level: levelFor(xp),
    xpToNext: xpToNext(xp),
  };
}

/** @returns {Promise<UserStats | null>} */
export async function getUserStats(session) {
  try {
    await dbConnect();
    const user = await User.findById(session.sub).lean();
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      role: user.role,
      lastReadDate: user.lastReadDate,
      ...stats(user),
    };
  } catch (err) {
    // DB down — still report the session identity so the UI stays logged in.
    logError("user.getUserStats", err);
    return {
      name: session.name,
      email: session.email,
      role: "member",
      lastReadDate: null,
      streak: 0,
      bestStreak: 0,
      totalReads: 0,
      xp: 0,
      level: 1,
      xpToNext: 250,
    };
  }
}

/** Marks today's verse as read: extends or resets the streak, awards XP. Idempotent per day. */
export async function markVerseRead(userId) {
  await dbConnect();

  const today = manilaDayKey();
  const yesterday = keyFromDayNumber(dayNumber(today) - 1);

  // Read current state, then commit with a conditional write. The next streak /
  // best are computed in JS rather than an aggregation-pipeline update, which
  // isn't portable across MongoDB versions. Atomicity of the once-per-day award
  // still comes from the { lastReadDate: { $ne: today } } filter below.
  const current = await User.findById(userId).select("streak bestStreak lastReadDate").lean();
  if (!current) throw new ApiError(404, "Account not found.");

  const nextStreak = current.lastReadDate === yesterday ? (current.streak ?? 0) + 1 : 1;
  const nextBest = Math.max(current.bestStreak ?? 0, nextStreak);

  // The filter is the day-guard: two concurrent POSTs can't both award, because
  // the first flips lastReadDate to today and the second no longer matches.
  const user = await User.findOneAndUpdate(
    { _id: userId, lastReadDate: { $ne: today } },
    {
      $set: { streak: nextStreak, bestStreak: nextBest, lastReadDate: today },
      $inc: { totalReads: 1, xp: XP_PER_READ },
    },
    { returnDocument: "after" }
  );

  if (user) return { alreadyRead: false, ...stats(user) };

  // Filter matched nothing: already read today (the account exists — checked above).
  const existing = await User.findById(userId).lean();
  if (!existing) throw new ApiError(404, "Account not found.");
  return { alreadyRead: true, ...stats(existing) };
}

/**
 * Awards XP for a daily challenge. The challenge id must match one in the
 * server-side catalog and the XP is taken from that definition — never from
 * the client — so the reward cannot be inflated or farmed with fake ids.
 * Capped at one claim per challenge per day.
 */
export async function claimChallenge(userId, challengeId) {
  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new ApiError(400, "Unknown challenge.");
  const xp = challenge.xp;
  const key = `${manilaDayKey()}:${challenge.id}`;

  await dbConnect();

  // Atomic claim: the filter requires `key` absent, so two concurrent claims
  // of the same challenge can't both pass a load-then-save gap and both award
  // XP. $slice caps history length the same as the old load-mutate-save did.
  const claimed = await User.findOneAndUpdate(
    { _id: userId, challengeDates: { $ne: key } },
    { $push: { challengeDates: { $each: [key], $slice: -40 } }, $inc: { xp } },
    { returnDocument: "after" }
  );
  if (claimed) return { alreadyClaimed: false, ...stats(claimed) };

  const existing = await User.findById(userId);
  if (!existing) throw new ApiError(404, "Account not found.");
  return { alreadyClaimed: true, ...stats(existing) };
}

export async function requireAdmin(session) {
  await dbConnect();
  const user = await User.findById(session.sub).select("role").lean();
  if (user?.role !== "admin") throw new ApiError(403, "Admins only.");
  return true;
}

/** @typedef {import("@/lib/types").AdminUser} AdminUser */

/** All accounts, newest first, for the admin user-management screen. */
export async function listUsers(limit = 200) {
  await dbConnect();
  const docs = await User.find()
    .select("name email role emailVerified createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: Boolean(u.emailVerified),
    createdAt: new Date(u.createdAt).toISOString(),
  }));
}

/**
 * Sets an account's role. `actorId` is the acting admin's user id (null for a
 * passphrase-only portal session) — an account admin cannot strip their own
 * role and lock themselves out.
 */
export async function setUserRole(id, role, actorId = null) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Account not found.");
  if (!["member", "admin"].includes(role)) throw new ApiError(400, "Invalid role.");
  if (actorId && String(actorId) === String(id) && role !== "admin")
    throw new ApiError(400, "You can't remove your own admin role.");

  await dbConnect();
  const doc = await User.findByIdAndUpdate(id, { $set: { role } }, { returnDocument: "after" })
    .select("name email role")
    .lean();
  if (!doc) throw new ApiError(404, "Account not found.");
  return { id, name: doc.name, email: doc.email, role: doc.role };
}
