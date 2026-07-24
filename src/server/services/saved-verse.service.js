import "server-only";
import { dbConnect } from "@/server/config/db";
import { SavedVerse } from "@/server/models/saved-verse.model";
import { ApiError } from "@/server/utils/api-error";

/** @typedef {import("@/lib/types").SavedVerse} SavedVerse */

/** @returns {SavedVerse} */
function serialize(doc) {
  return {
    reference: doc.reference,
    text: doc.text,
    version: doc.version,
    topic: doc.topic,
  };
}

/** @returns {Promise<SavedVerse[]>} */
export async function listSaved(userId, limit = 100) {
  try {
    await dbConnect();
    const docs = await SavedVerse.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map(serialize);
  } catch {
    return [];
  }
}

/** Adds or removes a save, returning the resulting state. */
export async function toggleSaved(userId, verse) {
  const reference = String(verse?.reference ?? "").trim();
  if (!reference) throw new ApiError(400, "A verse reference is required.");

  await dbConnect();
  const existing = await SavedVerse.findOne({ userId, reference });
  if (existing) {
    await existing.deleteOne();
    return { saved: false };
  }

  await SavedVerse.create({
    userId,
    reference,
    text: String(verse.text ?? "").slice(0, 2000),
    version: String(verse.version ?? "WEB").slice(0, 20),
    topic: String(verse.topic ?? "").slice(0, 40),
  });
  return { saved: true };
}

export async function removeSaved(userId, reference) {
  reference = String(reference ?? "").trim();
  if (!reference) throw new ApiError(400, "A verse reference is required.");

  await dbConnect();
  const result = await SavedVerse.deleteOne({ userId, reference });
  if (result.deletedCount === 0) throw new ApiError(404, "That verse isn't in your saved list.");
  return { removed: true, reference };
}

/**
 * References the user has saved, as a Set-friendly array.
 * @returns {Promise<string[]>}
 */
export async function savedReferences(userId) {
  try {
    await dbConnect();
    const docs = await SavedVerse.find({ userId }).select("reference").lean();
    return docs.map((d) => d.reference);
  } catch {
    return [];
  }
}
