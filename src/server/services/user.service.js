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
  return {
    streak: user.streak,
    bestStreak: user.bestStreak,
    totalReads: user.totalReads,
    xp: user.xp,
    level: levelFor(user.xp),
    xpToNext: xpToNext(user.xp),
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
    { new: true }
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
  const challenge = challenges.find((c) => c.title === challengeId);
  if (!challenge) throw new ApiError(400, "Unknown challenge.");
  const xp = challenge.xp;
  const key = `${manilaDayKey()}:${challenge.title.slice(0, 40)}`;

  await dbConnect();
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");

  if (user.challengeDates.includes(key)) return { alreadyClaimed: true, ...stats(user) };

  user.challengeDates = [...user.challengeDates.slice(-40), key];
  user.xp += xp;
  await user.save();

  return { alreadyClaimed: false, ...stats(user) };
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
  const doc = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true })
    .select("name email role")
    .lean();
  if (!doc) throw new ApiError(404, "Account not found.");
  return { id, name: doc.name, email: doc.email, role: doc.role };
}
