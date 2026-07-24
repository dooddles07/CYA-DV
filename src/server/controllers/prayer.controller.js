import "server-only";
import { NextResponse } from "next/server";
import { createPrayer, listPrayers, togglePrayed } from "@/server/services/prayer.service";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/utils/rate-limit";

export async function index() {
  return NextResponse.json({ prayers: await listPrayers() });
}

export async function create(req) {
  try {
    await rateLimit(req, {
      name: "prayer:create",
      limit: 5,
      windowMs: 10 * 60_000,
      message: "You've shared several requests already — please wait a few minutes.",
    });
    const body = await req.json().catch(() => ({}));
    const prayer = await createPrayer(body);
    return NextResponse.json({ prayer }, { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not share right now. Please try again.");
  }
}

export async function pray(req, id) {
  try {
    await rateLimit(req, { name: "prayer:pray", limit: 60, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const prayedCount = await togglePrayed(id, Boolean(body?.undo));
    return NextResponse.json({ prayedCount });
  } catch (err) {
    return toResponse(err, "Could not update right now.");
  }
}
