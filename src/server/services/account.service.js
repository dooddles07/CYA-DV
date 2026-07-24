import "server-only";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { Prayer } from "@/server/models/prayer.model";
import { PrayerHit } from "@/server/models/prayer-hit.model";
import { EventRsvp } from "@/server/models/event-rsvp.model";
import { Event } from "@/server/models/event.model";
import { SavedVerse } from "@/server/models/saved-verse.model";
import { UserPlan } from "@/server/models/user-plan.model";
import { PushSubscription } from "@/server/models/push-subscription.model";
import { ResetToken } from "@/server/models/reset-token.model";
import { VerifyToken } from "@/server/models/verify-token.model";
import { ApiError } from "@/server/utils/api-error";

/**
 * Everything the account holds, for the Data Privacy Act right-to-access /
 * portability request. Excludes the password hash and other people's data.
 */
export async function exportUserData(userId) {
  await dbConnect();
  const user = await User.findById(userId).select("-passwordHash -__v").lean();
  if (!user) throw new ApiError(404, "Account not found.");

  const [prayers, saved, plans, rsvps] = await Promise.all([
    Prayer.find({ userId }).select("-__v").lean(),
    SavedVerse.find({ userId }).select("-__v").lean(),
    UserPlan.find({ userId }).select("-__v").lean(),
    EventRsvp.find({ userId }).select("eventId createdAt").lean(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerified),
      xp: user.xp,
      streak: user.streak,
      bestStreak: user.bestStreak,
      totalReads: user.totalReads,
      lastReadDate: user.lastReadDate ?? null,
      createdAt: user.createdAt,
    },
    prayerRequests: prayers.map((p) => ({
      request: p.request,
      name: p.name,
      tag: p.tag,
      status: p.status,
      prayedCount: p.prayedCount,
      createdAt: p.createdAt,
    })),
    savedVerses: saved.map((s) => ({ reference: s.reference, text: s.text, createdAt: s.createdAt })),
    readingPlans: plans.map((pl) => ({
      planSlug: pl.planSlug,
      active: pl.active,
      completedDays: pl.completedDays,
      createdAt: pl.createdAt,
    })),
    eventRsvps: rsvps.map((r) => ({ eventId: r.eventId.toString(), createdAt: r.createdAt })),
  };
}

/**
 * Permanently deletes the account and every record tied to it (right to
 * erasure). Decrements the denormalised prayer/RSVP counts the user
 * contributed so headcounts stay honest.
 */
export async function deleteAccount(userId) {
  await dbConnect();
  const user = await User.findById(userId).select("_id").lean();
  if (!user) throw new ApiError(404, "Account not found.");

  // Roll back this user's contribution to shared counters before removing rows.
  const [hits, rsvps] = await Promise.all([
    PrayerHit.find({ userId }).select("prayerId").lean(),
    EventRsvp.find({ userId }).select("eventId").lean(),
  ]);
  if (hits.length)
    await Prayer.bulkWrite(
      hits.map((h) => ({
        updateOne: { filter: { _id: h.prayerId, prayedCount: { $gt: 0 } }, update: { $inc: { prayedCount: -1 } } },
      }))
    );
  if (rsvps.length)
    await Event.bulkWrite(
      rsvps.map((r) => ({
        updateOne: { filter: { _id: r.eventId, rsvpCount: { $gt: 0 } }, update: { $inc: { rsvpCount: -1 } } },
      }))
    );

  await Promise.all([
    Prayer.deleteMany({ userId }),
    PrayerHit.deleteMany({ userId }),
    EventRsvp.deleteMany({ userId }),
    SavedVerse.deleteMany({ userId }),
    UserPlan.deleteMany({ userId }),
    PushSubscription.deleteMany({ userId }),
    ResetToken.deleteMany({ userId }),
    VerifyToken.deleteMany({ userId }),
  ]);
  await User.deleteOne({ _id: userId });

  return { deleted: true };
}
