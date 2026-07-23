import "server-only";
import { dbConnect } from "@/server/config/db";
import { Verse } from "@/server/models/verse.model";
import { dayNumber, manilaDayKey } from "@/server/utils/dates";
import { verseLibrary } from "@/lib/data";

/** Deterministic fallback so the site works even if the DB is down. */
function fallbackVerse() {
  return verseLibrary[dayNumber(manilaDayKey()) % verseLibrary.length];
}

/**
 * Verse of the day: deterministic rotation over the DB collection,
 * keyed by Manila date. Seeds the collection from verseLibrary on
 * first run; falls back to the static library if the DB is unreachable.
 */
export async function getVerseOfDay() {
  try {
    await dbConnect();
    let count = await Verse.countDocuments();
    if (count === 0) {
      await Verse.insertMany(verseLibrary);
      count = verseLibrary.length;
    }
    const idx = dayNumber(manilaDayKey()) % count;
    const doc = await Verse.findOne().sort({ reference: 1 }).skip(idx).lean();
    if (!doc) return fallbackVerse();
    return { reference: doc.reference, text: doc.text, version: doc.version, topic: doc.topic };
  } catch {
    return fallbackVerse();
  }
}
