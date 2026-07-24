/**
 * Syncs src/data/verses.json into the database named by MONGO_URL.
 *
 *   npm run seed
 *
 * Safe to run repeatedly: verses are upserted by reference, so nothing is
 * duplicated and nothing else in the database is touched.
 */
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";

function loadEnv(text) {
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const VerseSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, trim: true },
  text: { type: String, required: true },
  version: { type: String, default: "WEB" },
  topic: { type: String, required: true },
});

async function main() {
  await readFile(".env", "utf8").then(loadEnv).catch(() => {});

  const url = process.env.MONGO_URL;
  if (!url) {
    console.error("MONGO_URL is not set. Pass it inline:\n  MONGO_URL='...' npm run seed");
    process.exit(1);
  }

  const verses = JSON.parse(await readFile("src/data/verses.json", "utf8"));
  console.log(`Connecting... (${verses.length} verses to sync)`);

  await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });
  const Verse = mongoose.models.Verse ?? mongoose.model("Verse", VerseSchema);

  const before = await Verse.countDocuments();
  const result = await Verse.bulkWrite(
    verses.map((v) => ({
      updateOne: { filter: { reference: v.reference }, update: { $set: v }, upsert: true },
    })),
    { ordered: false }
  );
  const after = await Verse.countDocuments();

  console.log(`  before:   ${before}`);
  console.log(`  inserted: ${result.upsertedCount ?? 0}`);
  console.log(`  updated:  ${result.modifiedCount ?? 0}`);
  console.log(`  after:    ${after}`);

  const byTopic = await Verse.aggregate([{ $group: { _id: "$topic", n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.log("\nPer topic:");
  for (const t of byTopic) console.log(`  ${t._id.padEnd(16)} ${t.n}`);

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
