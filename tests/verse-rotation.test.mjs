import test from "node:test";
import assert from "node:assert/strict";
import { dayNumber } from "../src/server/utils/dates.js";

// Mirrors the index maths in verse.service.js without needing a database.
const indexFor = (dayKey, count) => dayNumber(dayKey) % count;

test("the same day always yields the same verse", () => {
  assert.equal(indexFor("2026-07-24", 12), indexFor("2026-07-24", 12));
});

test("consecutive days yield different verses", () => {
  assert.notEqual(indexFor("2026-07-24", 12), indexFor("2026-07-25", 12));
});

test("the index always lands inside the collection", () => {
  for (const count of [1, 5, 12, 89, 365]) {
    for (const day of ["2026-01-01", "2026-07-24", "2026-12-31", "2027-06-15"]) {
      const i = indexFor(day, count);
      assert.ok(i >= 0 && i < count, `index ${i} out of range for count ${count}`);
    }
  }
});

test("rotation repeats only after the whole collection is used", () => {
  const count = 12;
  const seen = new Set();
  for (let d = 0; d < count; d++) {
    const key = new Date(Date.UTC(2026, 6, 1 + d)).toISOString().slice(0, 10);
    seen.add(indexFor(key, count));
  }
  assert.equal(seen.size, count);
});
