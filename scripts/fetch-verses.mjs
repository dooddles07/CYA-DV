/**
 * Fetches every curated reference from bible-api.com in the World English Bible
 * (public domain) and writes src/data/verses.json.
 *
 *   npm run verses:fetch
 *
 * Resumable: references already present in the JSON are skipped, so a run cut
 * short by rate limiting can simply be run again. Run this only when the
 * reference list changes — the committed JSON is what ships, so builds and
 * deploys never depend on the API being reachable.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { referencesByTopic } from "./verse-references.mjs";

const API = "https://bible-api.com";
const DELAY_MS = 1200;
const MAX_RETRIES = 5;
const OUT = "src/data/verses.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * WEB renders the divine name as "Yahweh"; most readers expect "the LORD".
 * Substituting a two-word phrase for a proper noun can leave a lowercase "the"
 * at the start of a sentence, so sentence-initial positions are re-capitalized.
 */
export function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/Yahweh's/g, "the LORD's")
    .replace(/Yahweh/g, "the LORD")
    .trim()
    // Start of the verse, optionally behind an opening quote or bracket.
    .replace(/^(["“‘'(\[]*)the\b/, "$1The")
    // Start of any later sentence.
    .replace(/([.!?]\s+["“‘'(\[]*)the\b/g, "$1The");
}

/** bible-api returns "Psalms 23:1-3"; the app writes "Psalm 23:1-3". */
function normalizeReference(reference) {
  return reference.replace(/^Psalms /, "Psalm ");
}

/** Retries on 429/5xx with exponential backoff, honouring Retry-After. */
async function fetchVerse(reference) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(`${API}/${encodeURIComponent(reference)}?translation=web`);

    if (res.ok) {
      const data = await res.json();
      const text = normalizeText(data.verses.map((v) => v.text).join(" "));
      if (!text) throw new Error("empty text");
      return { reference: normalizeReference(data.reference), text, version: "WEB" };
    }

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2000 * 2 ** attempt;
      console.log(`    ${res.status} on ${reference} — waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }

    throw new Error(`HTTP ${res.status}`);
  }
  throw new Error("gave up after retries");
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    return [];
  }
}

async function main() {
  const verses = await loadExisting();
  const seen = new Set(verses.map((v) => v.reference));
  const failures = [];

  const jobs = Object.entries(referencesByTopic).flatMap(([topic, refs]) =>
    refs.map((reference) => ({ topic, reference }))
  );

  const save = async () => {
    verses.sort((a, b) => a.reference.localeCompare(b.reference));
    await mkdir("src/data", { recursive: true });
    await writeFile(OUT, JSON.stringify(verses, null, 2) + "\n");
  };

  console.log(`${jobs.length} references, ${verses.length} already cached.`);

  for (const [i, { topic, reference }] of jobs.entries()) {
    // Cheap pre-check; the canonical dedupe happens on the returned reference.
    if (seen.has(reference) || seen.has(normalizeReference(reference))) continue;

    try {
      const verse = await fetchVerse(reference);
      if (!seen.has(verse.reference)) {
        seen.add(verse.reference);
        verses.push({ ...verse, topic });
      }
    } catch (err) {
      failures.push(`${topic} / ${reference}: ${err.message}`);
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${jobs.length} — ${verses.length} collected`);
      await save();
    }
    await sleep(DELAY_MS);
  }

  await save();

  const byTopic = {};
  for (const v of verses) byTopic[v.topic] = (byTopic[v.topic] ?? 0) + 1;

  console.log(`\nWrote ${verses.length} verses to ${OUT}`);
  console.log("Per topic:", byTopic);
  if (failures.length) {
    console.log(`\n${failures.length} failed — re-run to retry just these:`);
    for (const f of failures) console.log("  " + f);
  }
}

// Only run when executed directly, so normalizeText can be imported and tested.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
