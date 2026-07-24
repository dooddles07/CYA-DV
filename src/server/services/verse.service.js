import "server-only";
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/server/config/db";
import { Verse } from "@/server/models/verse.model";
import { dayNumber, manilaDayKey } from "@/server/utils/dates";
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
  } catch {
    return fallbackVerse();
  }
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
    await ensureSeeded();
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
