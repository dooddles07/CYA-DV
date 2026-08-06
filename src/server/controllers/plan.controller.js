import "server-only";
import { NextResponse } from "next/server";
import { enrollPlan, leavePlan, setDayComplete } from "@/server/services/plan.service";
import { getSession } from "@/server/middleware/session";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/middleware/rate-limit";
import { verifyCsrf } from "@/server/middleware/csrf";

export async function enroll(req) {
  const session = await getSession({ strict: true });
  if (!session)
    return NextResponse.json({ error: "Sign in to start a reading plan." }, { status: 401 });
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "plan:enroll", limit: 10, windowMs: 10 * 60_000 });
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ plan: await enrollPlan(session.sub, body.slug) });
  } catch (err) {
    return toResponse(err, "Could not start that plan.");
  }
}

export async function leave(req) {
  const session = await getSession({ strict: true });
  if (!session)
    return NextResponse.json({ error: "Sign in to manage your plan." }, { status: 401 });
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "plan:leave", limit: 10, windowMs: 10 * 60_000 });
    const body = await req.json().catch(() => ({}));
    const plan = await leavePlan(session.sub, Boolean(body.reset));
    return NextResponse.json({ plan });
  } catch (err) {
    return toResponse(err, "Could not leave that plan.");
  }
}

export async function completeDay(req) {
  const session = await getSession({ strict: true });
  if (!session)
    return NextResponse.json({ error: "Sign in to track your progress." }, { status: 401 });
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "plan:complete-day", limit: 60, windowMs: 10 * 60_000 });
    const body = await req.json().catch(() => ({}));
    const plan = await setDayComplete(session.sub, body.day, body.complete !== false);
    return NextResponse.json({ plan });
  } catch (err) {
    return toResponse(err, "Could not update your progress.");
  }
}
