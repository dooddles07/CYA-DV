import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { ApiError } from "@/server/utils/api-error";
import { dayNumber, manilaDayKey } from "@/server/utils/dates";
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
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");

  const today = manilaDayKey();
  let alreadyRead = false;

  if (user.lastReadDate === today) {
    alreadyRead = true;
  } else {
    const consecutive =
      user.lastReadDate && dayNumber(today) - dayNumber(user.lastReadDate) === 1;
    user.streak = consecutive ? user.streak + 1 : 1;
    user.bestStreak = Math.max(user.bestStreak, user.streak);
    user.lastReadDate = today;
    user.totalReads += 1;
    user.xp += XP_PER_READ;
    await user.save();
  }

  return { alreadyRead, ...stats(user) };
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
