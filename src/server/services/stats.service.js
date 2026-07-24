import "server-only";
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { Prayer } from "@/server/models/prayer.model";
import { Verse } from "@/server/models/verse.model";

/** @typedef {import("@/lib/types").CommunityStats} CommunityStats */

/** @type {CommunityStats} */
const EMPTY = { readers: 0, versesRead: 0, bestStreak: 0, prayers: 0 };

// Same for every visitor; a few minutes of staleness on community totals is
// fine. Errors throw out of the cached fn so the fallback is never cached.
const cachedCommunityStats = unstable_cache(
  async () => {
    await dbConnect();
    const [readers, prayers, agg] = await Promise.all([
      User.countDocuments(),
      Prayer.countDocuments({ status: "approved" }),
      User.aggregate([
        { $group: { _id: null, versesRead: { $sum: "$totalReads" }, bestStreak: { $max: "$bestStreak" } } },
      ]),
    ]);
    return {
      readers,
      prayers,
      versesRead: agg[0]?.versesRead ?? 0,
      bestStreak: agg[0]?.bestStreak ?? 0,
    };
  },
  ["community-stats"],
  { revalidate: 300, tags: ["stats"] }
);

/**
 * Community totals for the hero. Real counts — zero until people sign up.
 * @returns {Promise<CommunityStats>}
 */
export async function getCommunityStats() {
  try {
    return await cachedCommunityStats();
  } catch {
    return EMPTY;
  }
}

const cachedTopicCounts = unstable_cache(
  async () => {
    await dbConnect();
    const rows = await Verse.aggregate([{ $group: { _id: "$topic", count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  },
  ["topic-counts"],
  { revalidate: 3600, tags: ["verses"] }
);

/**
 * Verse count per topic, for the category grid. Returns {} if the DB is down.
 * @returns {Promise<Record<string, number>>}
 */
export async function getTopicCounts() {
  try {
    return await cachedTopicCounts();
  } catch {
    return {};
  }
}
