import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { Prayer } from "@/server/models/prayer.model";
import { ApiError } from "@/server/utils/api-error";
import { prayerWall } from "@/lib/data";

/** @typedef {import("@/lib/types").PrayerItem} PrayerItem */
/** @typedef {import("@/lib/types").ModeratedPrayer} ModeratedPrayer */

const HOUR = 3_600_000;

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

function staticWall() {
  const now = Date.now();
  return prayerWall.map((p, i) => ({
    id: `static-${i}`,
    name: p.name,
    request: p.request,
    tag: p.tag,
    prayedCount: p.prayedCount,
    createdAt: new Date(now - (i + 1) * 3 * HOUR).toISOString(),
  }));
}

/** Seed the wall from the original mock content so it never launches empty. */
async function seedIfEmpty() {
  const count = await Prayer.countDocuments();
  if (count > 0) return;
  const now = Date.now();
  await Prayer.insertMany(
    prayerWall.map((p, i) => ({
      name: p.name,
      request: p.request,
      tag: p.tag,
      prayedCount: p.prayedCount,
      createdAt: new Date(now - (i + 1) * 3 * HOUR),
    }))
  );
}

/** @returns {Promise<PrayerItem[]>} */
export async function listPrayers(limit = 50) {
  try {
    await dbConnect();
    await seedIfEmpty();
    const docs = await Prayer.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map(serialize);
  } catch {
    // DB down — show the static wall read-only rather than an empty page.
    return staticWall();
  }
}

export async function createPrayer({ name, request, anonymous }) {
  request = String(request ?? "").trim();
  name = anonymous ? "Anonymous" : String(name ?? "").trim() || "Anonymous";

  if (request.length < 10)
    throw new ApiError(400, "Please write at least a short sentence so people know how to pray.");
  if (request.length > 1000)
    throw new ApiError(400, "Please keep requests under 1000 characters.");

  await dbConnect();
  const doc = await Prayer.create({ name: name.slice(0, 60), request, tag: "New" });
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
