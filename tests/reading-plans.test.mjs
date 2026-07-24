import test from "node:test";
import assert from "node:assert/strict";
import { defaultPlanSlug, getPlan, readingPlans } from "../src/lib/data.ts";

test("every plan has a unique slug", () => {
  const slugs = readingPlans.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("the default plan exists", () => {
  assert.ok(getPlan(defaultPlanSlug));
});

test("every plan has real, non-empty readings", () => {
  for (const plan of readingPlans) {
    assert.ok(plan.readings.length > 0, `${plan.slug} has no readings`);
    for (const r of plan.readings) {
      assert.match(r, /^[1-3]?\s?[A-Za-z]+ \d+$/, `"${r}" in ${plan.slug} is not a passage`);
    }
  }
});

test("no plan repeats a reading", () => {
  for (const plan of readingPlans) {
    assert.equal(
      new Set(plan.readings).size,
      plan.readings.length,
      `${plan.slug} repeats a passage`
    );
  }
});

test("the gospels plan covers all four books in order", () => {
  const plan = getPlan("through-the-gospels");
  assert.equal(plan.readings.length, 89);
  assert.equal(plan.readings[0], "Matthew 1");
  assert.equal(plan.readings[27], "Matthew 28");
  assert.equal(plan.readings[28], "Mark 1");
  assert.equal(plan.readings.at(-1), "John 21");
});

test("getPlan returns undefined for an unknown slug", () => {
  assert.equal(getPlan("does-not-exist"), undefined);
});
