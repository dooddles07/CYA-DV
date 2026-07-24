import test from "node:test";
import assert from "node:assert/strict";
import { dayNumber, manilaDayKey } from "../src/server/utils/dates.js";

test("manilaDayKey formats as YYYY-MM-DD", () => {
  assert.match(manilaDayKey(new Date("2026-07-24T03:00:00Z")), /^\d{4}-\d{2}-\d{2}$/);
});

test("manila day rolls over at 16:00 UTC, not midnight UTC", () => {
  // 15:59 UTC is still the same Manila day; 16:00 UTC is the next one.
  assert.equal(manilaDayKey(new Date("2026-07-24T15:59:00Z")), "2026-07-24");
  assert.equal(manilaDayKey(new Date("2026-07-24T16:00:00Z")), "2026-07-25");
});

test("consecutive days differ by exactly 1", () => {
  assert.equal(dayNumber("2026-07-25") - dayNumber("2026-07-24"), 1);
});

test("a gap of more than one day breaks a streak", () => {
  assert.equal(dayNumber("2026-07-26") - dayNumber("2026-07-24"), 2);
});

test("dayNumber spans month and year boundaries correctly", () => {
  assert.equal(dayNumber("2026-08-01") - dayNumber("2026-07-31"), 1);
  assert.equal(dayNumber("2027-01-01") - dayNumber("2026-12-31"), 1);
});
