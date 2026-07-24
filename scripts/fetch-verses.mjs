/**
 * Fetches every curated reference from the Free Use Bible API in the Berean
 * Standard Bible (BSB, public domain) and writes src/data/verses.json.
 *
 *   npm run verses:fetch
 *
 * Resumable: BSB references already present in the JSON are skipped, so a run
 * cut short can simply be run again. Entries from an older translation are
 * dropped on load so switching translations regenerates cleanly. Run this only
 * when the reference list changes — the committed JSON is what ships, so builds
 * and deploys never depend on the API being reachable.
 *
 * Source: https://bible.helloao.org (chapter JSON, one fetch per chapter,
 * cached in memory across the run).
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { referencesByTopic } from "./verse-references.mjs";

const API = "https://bible.helloao.org/api/BSB";
const VERSION = "BSB";
const DELAY_MS = 200;
const MAX_RETRIES = 5;
const OUT = "src/data/verses.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Collapses runs of whitespace so joined verse fragments read as one line. */
function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

/** Book name -> USFM code, built from the API plus a couple of ref aliases. */
async function buildBookCodes() {
  const res = await fetch(`${API}/books.json`);
  if (!res.ok) throw new Error(`books.json HTTP ${res.status}`);
  const { books } = await res.json();
  const codes = new Map(books.map((b) => [b.name, b.id]));
  // The curated list uses names that differ from the API's.
  codes.set("Psalm", "PSA");
  codes.set("Song of Solomon", "SNG");
  return codes;
}

/** "1 Corinthians 13:4-7" -> { book, chapter, start, end }. */
function parseReference(reference) {
  const m = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error("unparseable reference");
  const [, book, chapter, start, end] = m;
  return { book, chapter: Number(chapter), start: Number(start), end: Number(end ?? start) };
}

const chapterCache = new Map();

/** Retries on 429/5xx with exponential backoff. */
async function fetchChapter(code, chapter) {
  const key = `${code}/${chapter}`;
  if (chapterCache.has(key)) return chapterCache.get(key);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(`${API}/${code}/${chapter}.json`);
    if (res.ok) {
      const data = await res.json();
      chapterCache.set(key, data);
      return data;
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * 2 ** attempt;
      console.log(`    ${res.status} on ${key} — waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  throw new Error("gave up after retries");
}

/** Joins the requested verse range into a single normalized string. */
function extractText(chapterData, start, end) {
  const parts = [];
  for (const node of chapterData.chapter.content) {
    if (node.type !== "verse" || node.number < start || node.number > end) continue;
    for (const piece of node.content) {
      // Prose verses hold plain strings; poetry holds { text, poem } objects.
      // Footnote markers ({ noteId }) and other nodes carry no text.
      if (typeof piece === "string") parts.push(piece);
      else if (piece && typeof piece.text === "string") parts.push(piece.text);
    }
  }
  const text = normalizeText(parts.join(" "));
  if (!text) throw new Error("empty text");
  return text;
}

async function fetchVerse(reference, bookCodes) {
  const { book, chapter, start, end } = parseReference(reference);
  const code = bookCodes.get(book);
  if (!code) throw new Error(`unknown book "${book}"`);
  const data = await fetchChapter(code, chapter);
  return { reference, text: extractText(data, start, end), version: VERSION };
}

async function loadExisting() {
  try {
    const all = JSON.parse(await readFile(OUT, "utf8"));
    // Drop entries from an older translation so a switch regenerates cleanly.
    return all.filter((v) => v.version === VERSION);
  } catch {
    return [];
  }
}

async function main() {
  const bookCodes = await buildBookCodes();
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
    if (seen.has(reference)) continue;

    try {
      const verse = await fetchVerse(reference, bookCodes);
      seen.add(verse.reference);
      verses.push({ ...verse, topic });
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

// Only run when executed directly, so helpers can be imported and tested.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { normalizeText, parseReference, extractText };
