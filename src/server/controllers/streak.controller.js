import "server-only";
import { NextResponse } from "next/server";
import { claimChallenge, markVerseRead } from "@/server/services/user.service";
import { getSession } from "@/server/middleware/session";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/middleware/rate-limit";
import { verifyCsrf } from "@/server/middleware/csrf";

export async function markRead(req) {
  const session = await getSession({ strict: true });
  if (!session)
    return NextResponse.json({ error: "Sign in to keep a streak." }, { status: 401 });
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "streak:read", limit: 10, windowMs: 10 * 60_000 });
    return NextResponse.json(await markVerseRead(session.sub));
  } catch (err) {
    return toResponse(err, "Could not save your progress.");
  }
}

export async function challenge(req) {
  const session = await getSession({ strict: true });
  if (!session)
    return NextResponse.json({ error: "Sign in to earn XP." }, { status: 401 });
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "streak:challenge", limit: 10, windowMs: 10 * 60_000 });
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await claimChallenge(session.sub, body.id));
  } catch (err) {
    return toResponse(err, "Could not save your progress.");
  }
}
