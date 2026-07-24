import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { Devotion } from "@/server/models/devotion.model";
import { ApiError } from "@/server/utils/api-error";
import { deleteEventImageIfUnused } from "@/server/services/event-image.service";
import { logError } from "@/server/utils/logger";
import { devotions as seedDevotions } from "@/lib/data";

/** @typedef {import("@/lib/types").Devotion} DevotionItem */

// A bundled asset, or artwork uploaded through the admin console.
const IMAGE_RE = /^(\/media\/[\w.-]+|\/api\/images\/[a-f\d]{24})$/i;

/** @returns {DevotionItem} */
function serialize(doc) {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt ?? "",
    author: doc.author ?? "",
    readTime: doc.readTime ?? "",
    date: doc.date ?? "",
    verse: doc.verse ?? "",
    verseText: doc.verseText ?? "",
    image: doc.image,
    imageAlt: doc.imageAlt ?? "",
    body: Array.isArray(doc.body) ? doc.body : [],
    practice: doc.practice ?? "",
    published: doc.published,
  };
}

/** Seeds the original authored devotionals on first use only. */
async function seedIfEmpty() {
  if (await Devotion.countDocuments()) return;
  await Devotion.insertMany(seedDevotions.map((d) => ({ ...d, published: true })));
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

function validate(input) {
  const title = String(input.title ?? "").trim();
  if (title.length < 3) throw new ApiError(400, "Give the devotional a title (at least 3 characters).");

  const image = String(input.image ?? "").trim();
  if (!image) throw new ApiError(400, "Add a cover image.");
  if (!IMAGE_RE.test(image)) throw new ApiError(400, "That image isn't valid.");

  const body = (Array.isArray(input.body) ? input.body : String(input.body ?? "").split("\n"))
    .map((p) => String(p).trim())
    .filter(Boolean)
    .slice(0, 40);

  const slug = slugify(input.slug || title);
  if (!slug) throw new ApiError(400, "Could not build a valid link slug from that title.");

  return {
    slug,
    title: title.slice(0, 160),
    excerpt: String(input.excerpt ?? "").trim().slice(0, 400),
    author: String(input.author ?? "").trim().slice(0, 80),
    readTime: String(input.readTime ?? "").trim().slice(0, 20) || "3 min",
    date: String(input.date ?? "").trim().slice(0, 40),
    verse: String(input.verse ?? "").trim().slice(0, 80),
    verseText: String(input.verseText ?? "").trim().slice(0, 500),
    image,
    imageAlt: String(input.imageAlt ?? "").trim().slice(0, 200),
    body,
    practice: String(input.practice ?? "").trim().slice(0, 600),
    published: input.published !== false,
  };
}

/** Public list: published, newest first. */
export async function listDevotions(limit = 60) {
  try {
    await dbConnect();
    await seedIfEmpty();
    const docs = await Devotion.find({ published: true }).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map(serialize);
  } catch (err) {
    logError("devotion.listDevotions", err);
    return [];
  }
}

/** @returns {Promise<DevotionItem | null>} */
export async function getDevotion(slug) {
  try {
    await dbConnect();
    await seedIfEmpty();
    const doc = await Devotion.findOne({ slug: String(slug ?? "").toLowerCase(), published: true }).lean();
    return doc ? serialize(doc) : null;
  } catch (err) {
    logError("devotion.getDevotion", err, { slug });
    return null;
  }
}

/** Admin list: everything, including drafts. */
export async function listAllDevotions() {
  await dbConnect();
  await seedIfEmpty();
  const docs = await Devotion.find().sort({ createdAt: -1 }).lean();
  return docs.map(serialize);
}

export async function createDevotion(input) {
  await dbConnect();
  const data = validate(input);
  if (await Devotion.findOne({ slug: data.slug }).lean())
    throw new ApiError(409, "A devotional with that link already exists — change the title or slug.");
  const doc = await Devotion.create(data);
  return serialize(doc);
}

export async function updateDevotion(id, input) {
  if (!isValidObjectId(id)) throw new ApiError(404, "That devotional no longer exists.");
  await dbConnect();
  const data = validate(input);
  const clash = await Devotion.findOne({ slug: data.slug, _id: { $ne: id } }).lean();
  if (clash) throw new ApiError(409, "Another devotional already uses that link.");
  const doc = await Devotion.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  if (!doc) throw new ApiError(404, "That devotional no longer exists.");
  return serialize(doc);
}

export async function deleteDevotion(id) {
  if (!isValidObjectId(id)) throw new ApiError(404, "That devotional no longer exists.");
  await dbConnect();
  const doc = await Devotion.findByIdAndDelete(id).lean();
  if (!doc) throw new ApiError(404, "That devotional no longer exists.");
  await deleteEventImageIfUnused(doc.image, Devotion).catch(() => {});
  return { deleted: true, id };
}
