import "server-only";
import { NextResponse } from "next/server";
import { createPrayer, listPrayersPage, togglePrayed } from "@/server/services/prayer.service";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/middleware/rate-limit";
import { getSession } from "@/server/middleware/session";
import { verifyCsrf } from "@/server/middleware/csrf";

export async function index(req) {
  const { searchParams } = new URL(req.url);
  const session = await getSession();
  return NextResponse.json(
    await listPrayersPage({
      limit: searchParams.get("limit") ?? 20,
      cursor: searchParams.get("cursor"),
      userId: session?.sub ?? null,
    })
  );
}

export async function create(req) {
  try {
    const session = await getSession({ strict: true });
    if (!session)
      return NextResponse.json({ error: "Sign in to share a prayer request." }, { status: 401 });

    await verifyCsrf(req);
    await rateLimit(req, {
      name: "prayer:create",
      limit: 5,
      windowMs: 10 * 60_000,
      message: "You've shared several requests already — please wait a few minutes.",
    });
    const body = await req.json().catch(() => ({}));
    const prayer = await createPrayer(body, session);
    return NextResponse.json({ prayer }, { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not share right now. Please try again.");
  }
}

export async function pray(req, id) {
  try {
    const session = await getSession({ strict: true });
    if (!session)
      return NextResponse.json({ error: "Sign in to pray for a request." }, { status: 401 });

    await verifyCsrf(req);
    await rateLimit(req, { name: "prayer:pray", limit: 60, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const result = await togglePrayed(id, session.sub, Boolean(body?.undo));
    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err, "Could not update right now.");
  }
}
