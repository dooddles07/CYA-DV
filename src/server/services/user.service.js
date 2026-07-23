import "server-only";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { ApiError } from "@/server/utils/api-error";
import { dayNumber, manilaDayKey } from "@/server/utils/dates";
import { XP_PER_READ, levelFor, xpToNext } from "@/server/utils/gamification";

export async function getUserStats(session) {
  try {
    await dbConnect();
    const user = await User.findById(session.sub).lean();
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      xp: user.xp,
      level: levelFor(user.xp),
      xpToNext: xpToNext(user.xp),
      streak: user.streak,
      bestStreak: user.bestStreak,
      lastReadDate: user.lastReadDate,
    };
  } catch {
    // DB down — still report the session identity so the UI stays logged in.
    return {
      name: session.name,
      email: session.email,
      xp: 0,
      level: 1,
      xpToNext: 250,
      streak: 0,
      bestStreak: 0,
      lastReadDate: null,
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
    user.xp += XP_PER_READ;
    await user.save();
  }

  return {
    alreadyRead,
    streak: user.streak,
    bestStreak: user.bestStreak,
    xp: user.xp,
    level: levelFor(user.xp),
    xpToNext: xpToNext(user.xp),
  };
}
