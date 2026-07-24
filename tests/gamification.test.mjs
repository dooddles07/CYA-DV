import test from "node:test";
import assert from "node:assert/strict";
import { XP_PER_LEVEL, levelFor, xpToNext } from "../src/server/utils/gamification.js";

test("level starts at 1 with no XP", () => {
  assert.equal(levelFor(0), 1);
});

test("level increments every XP_PER_LEVEL", () => {
  assert.equal(levelFor(XP_PER_LEVEL - 1), 1);
  assert.equal(levelFor(XP_PER_LEVEL), 2);
  assert.equal(levelFor(XP_PER_LEVEL * 3), 4);
});

test("xpToNext is always above current XP", () => {
  for (const xp of [0, 1, 249, 250, 999, 5000]) {
    assert.ok(xpToNext(xp) > xp, `xpToNext(${xp}) should exceed ${xp}`);
  }
});

test("xpToNext lands on a level boundary", () => {
  assert.equal(xpToNext(0) % XP_PER_LEVEL, 0);
  assert.equal(xpToNext(600) % XP_PER_LEVEL, 0);
});
