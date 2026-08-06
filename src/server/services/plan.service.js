import "server-only";
import { dbConnect } from "@/server/config/db";
import { UserPlan } from "@/server/models/user-plan.model";
import { ApiError } from "@/server/utils/api-error";
import { defaultPlanSlug, getPlan, readingPlans } from "@/lib/data";
import { logError } from "@/server/utils/logger";

/** @typedef {import("@/lib/types").ActivePlan} ActivePlan */
/** @typedef {import("@/lib/types").PlanSummary} PlanSummary */

/**
 * A rolling 7-day window ending at (or near) the day the reader is on, so a
 * plan at day 40 shows days 34-40 instead of a useless days 1-7.
 * @returns {{ day: number, done: boolean }[]}
 */
function weekWindow(total, nextDay, done) {
  const len = Math.min(7, total);
  const end = Math.min(total, Math.max(len, nextDay));
  const start = Math.max(1, end - len + 1);
  return Array.from({ length: len }, (_, i) => {
    const day = start + i;
    return { day, done: done.has(day) };
  });
}

/**
 * Shape the plans page renders when nobody is signed in.
 * @returns {ActivePlan}
 */
export function previewPlan(slug = defaultPlanSlug) {
  const plan = getPlan(slug);
  return {
    slug: plan.slug,
    name: plan.name,
    tag: plan.tag,
    desc: plan.desc,
    totalDays: plan.readings.length,
    completedCount: 0,
    nextDay: 1,
    todayReading: plan.readings[0],
    upcoming: plan.readings.slice(1, 4).map((passage, i) => ({ day: i + 2, passage })),
    weekProgress: weekWindow(plan.readings.length, 1, new Set()),
    enrolled: false,
  };
}

/** @returns {ActivePlan} */
function shape(plan, completedDays) {
  const done = new Set(completedDays);
  // The next unread day, so a user who skips around still gets a sensible prompt.
  let nextDay = 1;
  while (nextDay <= plan.readings.length && done.has(nextDay)) nextDay += 1;
  const finished = nextDay > plan.readings.length;

  return {
    slug: plan.slug,
    name: plan.name,
    tag: plan.tag,
    desc: plan.desc,
    totalDays: plan.readings.length,
    completedCount: done.size,
    nextDay: finished ? plan.readings.length : nextDay,
    todayReading: finished ? plan.readings[plan.readings.length - 1] : plan.readings[nextDay - 1],
    finished,
    upcoming: plan.readings
      .slice(nextDay, nextDay + 3)
      .map((passage, i) => ({ day: nextDay + i + 1, passage })),
    weekProgress: weekWindow(plan.readings.length, nextDay, done),
    enrolled: true,
  };
}

/**
 * The user's active plan, or a preview of the default plan if they have none.
 * @returns {Promise<ActivePlan>}
 */
export async function getActivePlan(userId) {
  try {
    await dbConnect();
    const doc = await UserPlan.findOne({ userId, active: true }).sort({ updatedAt: -1 }).lean();
    if (!doc) return previewPlan();
    const plan = getPlan(doc.planSlug);
    if (!plan) return previewPlan();
    return shape(plan, doc.completedDays);
  } catch (err) {
    logError("plan.getActivePlan", err);
    return previewPlan();
  }
}

/** Enrolls the user, deactivating any other plan so exactly one is active. */
export async function enrollPlan(userId, slug) {
  const plan = getPlan(String(slug ?? ""));
  if (!plan) throw new ApiError(404, "That reading plan doesn't exist.");

  await dbConnect();
  await UserPlan.updateMany({ userId, active: true }, { $set: { active: false } });
  const doc = await UserPlan.findOneAndUpdate(
    { userId, planSlug: plan.slug },
    { $set: { active: true }, $setOnInsert: { completedDays: [] } },
    { returnDocument: "after", upsert: true }
  ).lean();

  return shape(plan, doc.completedDays);
}

/** Marks a day complete (or undoes it) on the user's active plan. */
export async function setDayComplete(userId, day, complete) {
  day = Number(day);
  if (!Number.isInteger(day) || day < 1) throw new ApiError(400, "Invalid plan day.");

  await dbConnect();
  const active = await UserPlan.findOne({ userId, active: true }).select("planSlug").lean();
  if (!active) throw new ApiError(404, "Start a reading plan first.");

  const plan = getPlan(active.planSlug);
  if (!plan) throw new ApiError(404, "That reading plan doesn't exist.");
  if (day > plan.readings.length) throw new ApiError(400, "That day is past the end of the plan.");

  // Atomic $addToSet/$pull instead of load-mutate-save, so two concurrent
  // day-completion requests can't race and silently drop one another's write.
  const doc = await UserPlan.findOneAndUpdate(
    { userId, active: true },
    complete ? { $addToSet: { completedDays: day } } : { $pull: { completedDays: day } },
    { returnDocument: "after" }
  ).lean();

  return shape(plan, doc.completedDays);
}

/**
 * Leaves the active plan. `resetProgress` also clears completed days, so the
 * user can start the same plan fresh later instead of resuming mid-way.
 * @returns {Promise<ActivePlan>}
 */
export async function leavePlan(userId, resetProgress = false) {
  await dbConnect();
  const doc = await UserPlan.findOne({ userId, active: true });
  if (!doc) throw new ApiError(404, "You aren't in a reading plan right now.");

  doc.active = false;
  if (resetProgress) doc.completedDays = [];
  await doc.save();

  return previewPlan();
}

/** @returns {PlanSummary[]} */
export function listPlans() {
  return readingPlans.map((p) => ({
    slug: p.slug,
    name: p.name,
    tag: p.tag,
    desc: p.desc,
    totalDays: p.readings.length,
  }));
}
