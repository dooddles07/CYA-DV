/**
 * Purges seeded/fake community data from the database named by MONGO_URL.
 *
 * Prayers are targeted by `userId: null` — real posts always record an author
 * (even anonymous ones), so authorless rows are the seed data. Events have no
 * such marker, so they are only touched when you name them explicitly.
 *
 * DRY-RUN BY DEFAULT. Nothing is deleted unless you pass --commit.
 * This is irreversible on the live DB — take a backup (mongodump) first.
 *
 *   # See what would be removed (safe):
 *   MONGO_URL='...' node scripts/purge-seed.mjs
 *
 *   # Actually delete seed prayers:
 *   MONGO_URL='...' node scripts/purge-seed.mjs --commit
 *
 *   # Also delete named seed events (any combination):
 *   node scripts/purge-seed.mjs --commit \
 *     --event-ids=651f...,652a... \
 *     --event-titles='Youth Camp 2024|Sample Worship Night' \
 *     --events-before=2026-01-01
 *
 * Dependent rows are cleaned up too: PrayerHit for deleted prayers, EventRsvp
 * for deleted events, and uploaded pubmats (EventImage) no event still uses.
 */
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";

function loadEnv(text) {
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const has = (name) => process.argv.includes(`--${name}`);
const arg = (name) => {
  const p = `--${name}=`;
  const a = process.argv.find((s) => s.startsWith(p));
  return a ? a.slice(p.length) : null;
};

const COMMIT = has("commit");
const loose = () => new mongoose.Schema({}, { strict: false, timestamps: true });
const IMAGE_ID_RE = /^\/api\/images\/([a-f\d]{24})$/i;

function buildEventFilter() {
  const or = [];
  const ids = arg("event-ids");
  const titles = arg("event-titles");
  const before = arg("events-before");

  if (ids) {
    const list = ids.split(",").map((s) => s.trim()).filter(mongoose.isValidObjectId);
    if (list.length) or.push({ _id: { $in: list } });
  }
  if (titles) {
    const list = titles.split("|").map((s) => s.trim()).filter(Boolean);
    if (list.length) or.push({ title: { $in: list } });
  }
  if (before) {
    const d = new Date(before);
    if (Number.isNaN(d.getTime())) {
      console.error(`Invalid --events-before date: ${before}`);
      process.exit(1);
    }
    or.push({ createdAt: { $lt: d } });
  }
  return or.length ? { $or: or } : null;
}

async function main() {
  await readFile(".env", "utf8").then(loadEnv).catch(() => {});

  const url = process.env.MONGO_URL;
  if (!url) {
    console.error("MONGO_URL is not set. Pass it inline:\n  MONGO_URL='...' node scripts/purge-seed.mjs");
    process.exit(1);
  }

  await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });
  const Prayer = mongoose.model("Prayer", loose());
  const PrayerHit = mongoose.model("PrayerHit", loose());
  const Event = mongoose.model("Event", loose());
  const EventRsvp = mongoose.model("EventRsvp", loose());
  const EventImage = mongoose.model("EventImage", loose());

  console.log(COMMIT ? "MODE: COMMIT (deleting)\n" : "MODE: DRY-RUN (no changes)\n");

  // ---- Prayers: authorless rows are seed data ----
  const prayerFilter = { userId: null };
  const prayers = await Prayer.find(prayerFilter).select("_id name request").lean();
  console.log(`Seed prayers (userId=null): ${prayers.length}`);
  for (const p of prayers.slice(0, 10))
    console.log(`  - ${String(p._id)}  ${p.name}: ${String(p.request).slice(0, 50)}`);
  if (prayers.length > 10) console.log(`  ...and ${prayers.length - 10} more`);

  const prayerIds = prayers.map((p) => p._id);
  const hitCount = prayerIds.length
    ? await PrayerHit.countDocuments({ prayerId: { $in: prayerIds } })
    : 0;
  console.log(`  dependent PrayerHit rows: ${hitCount}`);

  // ---- Events: only when explicitly named ----
  const eventFilter = buildEventFilter();
  let events = [];
  if (eventFilter) {
    events = await Event.find(eventFilter).select("_id title date image").lean();
    console.log(`\nSeed events (matched by flags): ${events.length}`);
    for (const e of events) console.log(`  - ${String(e._id)}  ${e.date}  ${e.title}`);
  } else {
    console.log("\nNo event flags given (--event-ids / --event-titles / --events-before) — skipping events.");
  }
  const eventIds = events.map((e) => e._id);
  const rsvpCount = eventIds.length
    ? await EventRsvp.countDocuments({ eventId: { $in: eventIds } })
    : 0;
  if (eventFilter) console.log(`  dependent EventRsvp rows: ${rsvpCount}`);

  if (!COMMIT) {
    console.log("\nDry-run complete. Re-run with --commit to delete (after a backup).");
    await mongoose.disconnect();
    return;
  }

  // ---- Delete (dependents first) ----
  if (prayerIds.length) {
    await PrayerHit.deleteMany({ prayerId: { $in: prayerIds } });
    await Prayer.deleteMany({ _id: { $in: prayerIds } });
  }

  if (eventIds.length) {
    await EventRsvp.deleteMany({ eventId: { $in: eventIds } });
    await Event.deleteMany({ _id: { $in: eventIds } });
    // Drop uploaded pubmats no surviving event still references.
    for (const e of events) {
      const id = IMAGE_ID_RE.exec(String(e.image ?? ""))?.[1];
      if (!id) continue;
      if (await Event.countDocuments({ image: e.image })) continue;
      await EventImage.findByIdAndDelete(id).catch(() => {});
    }
  }

  console.log(
    `\nDeleted: ${prayerIds.length} prayers (+${hitCount} hits), ${eventIds.length} events (+${rsvpCount} RSVPs).`
  );
  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error("Purge failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
