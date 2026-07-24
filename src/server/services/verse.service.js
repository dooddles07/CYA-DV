import "server-only";
import { dbConnect } from "@/server/config/db";
import { Verse } from "@/server/models/verse.model";
import { dayNumber, manilaDayKey } from "@/server/utils/dates";
import { verseLibrary } from "@/lib/data";

/** Deterministic fallback so the site works even if the DB is down. */
function fallbackVerse() {
  return verseLibrary[dayNumber(manilaDayKey()) % verseLibrary.length];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Local filter used as the DB-down fallback for search. */
function searchLibrary(query, topic) {
  const q = query.trim().toLowerCase();
  return verseLibrary.filter(
    (v) =>
      (!q || v.text.toLowerCase().includes(q) || v.reference.toLowerCase().includes(q)) &&
      (!topic || v.topic === topic)
  );
}

/**
 * Search the whole verse collection by keyword or reference, optionally
 * narrowed to a topic. Escapes user input before building the regex.
 */
export async function searchVerses({ query = "", topic = "", limit = 60 } = {}) {
  query = String(query).slice(0, 120).trim();
  topic = String(topic).slice(0, 40).trim();

  try {
    await dbConnect();
    const filter = {};
    if (query) {
      const rx = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ text: rx }, { reference: rx }];
    }
    if (topic) filter.topic = topic;

    const docs = await Verse.find(filter).sort({ reference: 1 }).limit(limit).lean();
    return docs.map((d) => ({
      reference: d.reference,
      text: d.text,
      version: d.version,
      topic: d.topic,
    }));
  } catch {
    return searchLibrary(query, topic);
  }
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
