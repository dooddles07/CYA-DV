import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { categories, moods } from "../src/lib/data.ts";

const verses = JSON.parse(await readFile("src/data/verses.json", "utf8"));

test("the corpus is large enough that rotation does not repeat within a season", () => {
  assert.ok(verses.length >= 90, `only ${verses.length} verses`);
});

test("references are unique — the DB index requires it", () => {
  assert.equal(new Set(verses.map((v) => v.reference)).size, verses.length);
});

test("every verse has all four fields populated", () => {
  for (const v of verses) {
    assert.ok(v.reference?.trim(), "missing reference");
    assert.ok(v.text?.trim().length > 10, `text too short for ${v.reference}`);
    assert.equal(v.version, "BSB");
    assert.ok(v.topic?.trim(), `missing topic for ${v.reference}`);
  }
});

test("text is single-line and free of stray whitespace", () => {
  for (const v of verses) {
    assert.ok(!/[\n\r]/.test(v.text), `${v.reference} contains a newline`);
    assert.ok(!/\s{2,}/.test(v.text), `${v.reference} has doubled spaces`);
    assert.equal(v.text, v.text.trim(), `${v.reference} has edge whitespace`);
  }
});

test("every category on the home grid has verses behind it", () => {
  const topics = new Set(verses.map((v) => v.topic));
  const empty = categories.map((c) => c.name).filter((name) => !topics.has(name));
  assert.deepEqual(empty, [], "categories with no verses");
});

test("every verse topic is a real category", () => {
  const names = new Set(categories.map((c) => c.name));
  const orphans = [...new Set(verses.map((v) => v.topic))].filter((t) => !names.has(t));
  assert.deepEqual(orphans, [], "topics missing from the category list");
});

test("mood shortcuts resolve to the intended verses", () => {
  const expected = {
    "I feel anxious": "Philippians 4:6-7",
    "I need hope": "Jeremiah 29:11",
    "I feel lonely": "Deuteronomy 31:8",
    "I need strength": "Isaiah 40:31",
    "I need forgiveness": "1 John 1:9",
    "I need peace": "John 14:27",
  };
  for (const mood of moods) {
    assert.equal(mood.verse.reference, expected[mood.feeling], `wrong verse for "${mood.feeling}"`);
  }
});
