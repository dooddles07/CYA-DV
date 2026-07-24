import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { Prayer } from "@/server/models/prayer.model";
import { ApiError } from "@/server/utils/api-error";

/** @typedef {import("@/lib/types").PrayerItem} PrayerItem */
/** @typedef {import("@/lib/types").ModeratedPrayer} ModeratedPrayer */

/** @returns {PrayerItem} */
function serialize(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    request: doc.request,
    tag: doc.tag,
    prayedCount: doc.prayedCount,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

/** @returns {Promise<PrayerItem[]>} */
export async function listPrayers(limit = 20) {
  const { prayers } = await listPrayersPage({ limit });
  return prayers;
}

/**
 * One page of the wall, newest first. Uses createdAt as a cursor rather than
 * skip/limit so new posts never shift rows into or out of a later page.
 * @returns {Promise<{ prayers: PrayerItem[], nextCursor: string | null, total: number }>}
 */
export async function listPrayersPage({ limit = 20, cursor = null } = {}) {
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

    return {
      prayers: page.map(serialize),
      nextCursor: hasMore ? new Date(page[page.length - 1].createdAt).toISOString() : null,
      total: await Prayer.countDocuments({ status: "approved" }),
    };
  } catch {
    // DB down — return an empty page rather than fabricated content.
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
  const doc = await Prayer.create({
    userId: author.sub,
    name: display.slice(0, 60),
    request,
    tag: "New",
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

export async function setPrayerStatus(id, status) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Not found.");
  if (!["approved", "hidden"].includes(status)) throw new ApiError(400, "Invalid status.");

  await dbConnect();
  const doc = await Prayer.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
  if (!doc) throw new ApiError(404, "Not found.");
  return { ...serialize(doc), status: doc.status };
}

export async function togglePrayed(id, undo) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Not found.");
  await dbConnect();
  const doc = await Prayer.findOneAndUpdate(
    // Guard prevents decrementing below zero.
    undo ? { _id: id, prayedCount: { $gt: 0 } } : { _id: id },
    { $inc: { prayedCount: undo ? -1 : 1 } },
    { new: true }
  ).lean();
  if (!doc && !undo) throw new ApiError(404, "Not found.");
  return doc?.prayedCount ?? 0;
}
