import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { Prayer } from "@/server/models/prayer.model";
import { PrayerHit } from "@/server/models/prayer-hit.model";
import { User } from "@/server/models/user.model";
import { ApiError } from "@/server/utils/api-error";
import { logError } from "@/server/utils/logger";

/** @typedef {import("@/lib/types").PrayerItem} PrayerItem */
/** @typedef {import("@/lib/types").ModeratedPrayer} ModeratedPrayer */

const NEW_TAG_MS = 24 * 60 * 60 * 1000;

/** @returns {PrayerItem} */
function serialize(doc, prayed = false) {
  const createdAt = new Date(doc.createdAt);
  // "New" is derived from age at read time, never stored, so it expires on its own.
  const isNew = Date.now() - createdAt.getTime() < NEW_TAG_MS;
  return {
    id: doc._id.toString(),
    name: doc.name,
    request: doc.request,
    tag: isNew ? "New" : "",
    prayedCount: doc.prayedCount,
    prayed,
    createdAt: createdAt.toISOString(),
  };
}

/** Set of prayerId strings the user has already prayed for, among `docs`. */
async function prayedSet(docs, userId) {
  if (!userId || docs.length === 0) return new Set();
  const hits = await PrayerHit.find({
    userId,
    prayerId: { $in: docs.map((d) => d._id) },
  })
    .select("prayerId")
    .lean();
  return new Set(hits.map((h) => h.prayerId.toString()));
}

/** @returns {Promise<PrayerItem[]>} */
/**
 * @param {number} [limit]
 * @param {string | null} [userId]
 */
export async function listPrayers(limit = 20, userId = null) {
  const { prayers } = await listPrayersPage({ limit, userId });
  return prayers;
}

/**
 * One page of the wall, newest first. Uses createdAt as a cursor rather than
 * skip/limit so new posts never shift rows into or out of a later page.
 * @param {{ limit?: number, cursor?: string | null, userId?: string | null }} [opts]
 * @returns {Promise<{ prayers: PrayerItem[], nextCursor: string | null, total: number }>}
 */
export async function listPrayersPage({ limit = 20, cursor = null, userId = null } = {}) {
  limit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  try {
    await dbConnect();

    const filter = { status: "approved" };
    if (cursor) {
      const at = new Date(cursor);
      if (!Number.isNaN(at.getTime())) filter.createdAt = { $lt: at };
    }

    // Fetch one extra row to learn whether another page exists.
    const docs = await Prayer.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;
    const mine = await prayedSet(page, userId);

    return {
      prayers: page.map((d) => serialize(d, mine.has(d._id.toString()))),
      nextCursor: hasMore ? new Date(page[page.length - 1].createdAt).toISOString() : null,
      total: await Prayer.countDocuments({ status: "approved" }),
    };
  } catch (err) {
    // DB down — return an empty page rather than fabricated content.
    logError("prayer.listPrayersPage", err);
    return { prayers: [], nextCursor: null, total: 0 };
  }
}

/**
 * Posting requires a signed-in user. `anonymous` only hides the display name —
 * the author is still stored so moderation can act on repeat abuse.
 */
export async function createPrayer({ name, request, anonymous }, author) {
  if (!author) throw new ApiError(401, "Sign in to share a prayer request.");

  request = String(request ?? "").trim();
  const display = anonymous
    ? "Anonymous"
    : String(name ?? "").trim() || author.name || "Anonymous";

  if (request.length < 10)
    throw new ApiError(400, "Please write at least a short sentence so people know how to pray.");
  if (request.length > 1000)
    throw new ApiError(400, "Please keep requests under 1000 characters.");

  await dbConnect();
  // Verified email required so wall posts carry real accountability.
  const account = await User.findById(author.sub).select("emailVerified").lean();
  if (!account?.emailVerified)
    throw new ApiError(403, "Please confirm your email before posting to the prayer wall.");

  const doc = await Prayer.create({
    userId: author.sub,
    name: display.slice(0, 60),
    request,
  });
  return serialize(doc);
}

/**
 * Admin view: every request, including hidden ones.
 * @returns {Promise<ModeratedPrayer[]>}
 */
export async function listAllPrayers(limit = 200) {
  await dbConnect();
  const docs = await Prayer.find().sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({ ...serialize(d), status: d.status }));
}

/** Count of prayer posts created in the last `hours`, for the admin nudge. */
export async function recentPrayerCount(hours = 24) {
  try {
    await dbConnect();
    return await Prayer.countDocuments({ createdAt: { $gte: new Date(Date.now() - hours * 3_600_000) } });
  } catch (err) {
    logError("prayer.recentPrayerCount", err);
    return 0;
  }
}

export async function setPrayerStatus(id, status) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Not found.");
  if (!["approved", "hidden"].includes(status)) throw new ApiError(400, "Invalid status.");

  await dbConnect();
  const doc = await Prayer.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
  if (!doc) throw new ApiError(404, "Not found.");
  return { ...serialize(doc), status: doc.status };
}

/**
 * Toggles the signed-in user's prayer for a request. The per-user PrayerHit row
 * is the source of truth: the count only moves when a row is actually created
 * or removed, so repeat calls are idempotent and the count can't be inflated.
 * @returns {Promise<{ prayedCount: number, prayed: boolean }>}
 */
export async function togglePrayed(id, userId, undo) {
  if (!userId) throw new ApiError(401, "Sign in to pray for a request.");
  if (!isValidObjectId(id)) throw new ApiError(404, "Not found.");
  await dbConnect();

  if (undo) {
    const removed = await PrayerHit.findOneAndDelete({ prayerId: id, userId });
    if (!removed) {
      const doc = await Prayer.findById(id).select("prayedCount").lean();
      if (!doc) throw new ApiError(404, "Not found.");
      return { prayedCount: doc.prayedCount, prayed: false };
    }
    const doc = await Prayer.findOneAndUpdate(
      { _id: id, prayedCount: { $gt: 0 } },
      { $inc: { prayedCount: -1 } },
      { new: true }
    ).lean();
    return { prayedCount: doc?.prayedCount ?? 0, prayed: false };
  }

  try {
    await PrayerHit.create({ prayerId: id, userId });
  } catch (err) {
    // Duplicate key — already prayed. Return the current count unchanged.
    if (err?.code === 11000) {
      const doc = await Prayer.findById(id).select("prayedCount").lean();
      if (!doc) throw new ApiError(404, "Not found.");
      return { prayedCount: doc.prayedCount, prayed: true };
    }
    throw err;
  }
  const doc = await Prayer.findOneAndUpdate(
    { _id: id },
    { $inc: { prayedCount: 1 } },
    { new: true }
  ).lean();
  if (!doc) {
    // Prayer vanished between the two writes — drop the orphan hit.
    await PrayerHit.deleteOne({ prayerId: id, userId }).catch(() => {});
    throw new ApiError(404, "Not found.");
  }
  return { prayedCount: doc.prayedCount, prayed: true };
}
