import "server-only";
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/server/config/db";
import { Verse } from "@/server/models/verse.model";
import { dayNumber, keyFromDayNumber, manilaDayKey } from "@/server/utils/dates";
import { logError } from "@/server/utils/logger";
import verseSeed from "../../data/verses.json" with { type: "json" };

/** Deterministic fallback so the site works even if the DB is down. */
function fallbackVerse() {
  return verseSeed[dayNumber(manilaDayKey()) % verseSeed.length];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Local filter used as the DB-down fallback for search. */
function searchLibrary(query, topic) {
  const q = query.trim().toLowerCase();
  return verseSeed.filter(
    (v) =>
      (!q || v.text.toLowerCase().includes(q) || v.reference.toLowerCase().includes(q)) &&
      (!topic || v.topic === topic)
  );
}

/**
 * Upserts every seed verse by reference. Idempotent, and unlike a plain
 * "insert if empty" it also tops up a collection that already has rows,
 * so adding verses to the seed file reaches an existing deployment.
 */
export async function syncVerses() {
  await dbConnect();
  const result = await Verse.bulkWrite(
    verseSeed.map((v) => ({
      updateOne: {
        filter: { reference: v.reference },
        update: { $set: v },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  return {
    total: verseSeed.length,
    inserted: result.upsertedCount ?? 0,
    updated: result.modifiedCount ?? 0,
  };
}

/** Seeds on first use only; syncVerses() handles top-ups after that. */
async function ensureSeeded() {
  const count = await Verse.countDocuments();
  if (count > 0) return count;
  await syncVerses();
  return verseSeed.length;
}

// Identical for every user and stable for a whole Manila day. The day key is a
// cache-key arg, so the entry rolls over at midnight; the TTL is a safety net.
const cachedVerseOfDay = unstable_cache(
  async (dayKey) => {
    await dbConnect();
    const count = await ensureSeeded();
    const idx = dayNumber(dayKey) % count;
    const doc = await Verse.findOne().sort({ reference: 1 }).skip(idx).lean();
    // Throw so the DB-empty/down case falls back and is never cached.
    if (!doc) throw new Error("no verse");
    return { reference: doc.reference, text: doc.text, version: doc.version, topic: doc.topic };
  },
  ["verse-of-day"],
  { revalidate: 3600, tags: ["verses"] }
);

/**
 * Verse of the day: deterministic rotation over the DB collection,
 * keyed by Manila date. Falls back to the bundled seed if the DB
 * is unreachable, so the page always renders something real.
 */
export async function getVerseOfDay() {
  try {
    return await cachedVerseOfDay(manilaDayKey());
  } catch (err) {
    logError("verse.getVerseOfDay", err);
    return fallbackVerse();
  }
}

/**
 * Search the whole verse collection by keyword or reference, optionally
 * narrowed to a topic. Escapes user input before building the regex.
 */
const toVerse = (d) => ({ reference: d.reference, text: d.text, version: d.version, topic: d.topic });

/** Same lexical order the DB uses, for the archive's seed fallback. */
function byReference(a, b) {
  return a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0;
}

/**
 * The last `days` daily verses. Verse-of-day is a deterministic rotation
 * (dayNumber % count), so past days are reproducible with no history table.
 * @returns {Promise<{ dayKey: string, today: boolean, verse: import("@/lib/data").Verse }[]>}
 */
export async function getVerseArchive(days = 30) {
  const build = (docs) => {
    const count = docs.length;
    const todayNum = dayNumber(manilaDayKey());
    return Array.from({ length: days }, (_, i) => {
      const num = todayNum - i;
      const idx = ((num % count) + count) % count;
      return { dayKey: keyFromDayNumber(num), today: i === 0, verse: toVerse(docs[idx]) };
    });
  };

  try {
    await dbConnect();
    await ensureSeeded();
    const docs = await Verse.find().sort({ reference: 1 }).lean();
    if (!docs.length) throw new Error("no verses");
    return build(docs);
  } catch (err) {
    logError("verse.getVerseArchive", err);
    return build([...verseSeed].sort(byReference));
  }
}

export async function searchVerses({ query = "", topic = "", limit = 60 } = {}) {
  query = String(query).slice(0, 120).trim();
  topic = String(topic).slice(0, 40).trim();

  try {
    await dbConnect();
    await ensureSeeded();
    const topicFilter = topic ? { topic } : {};

    if (!query) {
      const docs = await Verse.find(topicFilter).sort({ reference: 1 }).limit(limit).lean();
      return docs.map(toVerse);
    }

    // Fast path: the text index ranks whole-word and reference matches.
    const scored = await Verse.find(
      { $text: { $search: query }, ...topicFilter },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean();
    if (scored.length) return scored.map(toVerse);

    // Fallback for partial words the tokenizer can't match (e.g. mid-typing
    // "lov"). Rare and bounded by limit; the index handles the common case.
    const rx = new RegExp(escapeRegex(query), "i");
    const docs = await Verse.find({ $or: [{ text: rx }, { reference: rx }], ...topicFilter })
      .sort({ reference: 1 })
      .limit(limit)
      .lean();
    return docs.map(toVerse);
  } catch (err) {
    logError("verse.searchVerses", err, { query, topic });
    return searchLibrary(query, topic);
  }
}
