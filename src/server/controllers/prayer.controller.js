import "server-only";
import { NextResponse } from "next/server";
import { createPrayer, listPrayers, togglePrayed } from "@/server/services/prayer.service";
import { toResponse } from "@/server/utils/api-error";

export async function index() {
  return NextResponse.json({ prayers: await listPrayers() });
}

export async function create(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const prayer = await createPrayer(body);
    return NextResponse.json({ prayer }, { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not share right now. Please try again.");
  }
}

export async function pray(req, id) {
  try {
    const body = await req.json().catch(() => ({}));
    const prayedCount = await togglePrayed(id, Boolean(body?.undo));
    return NextResponse.json({ prayedCount });
  } catch (err) {
    return toResponse(err, "Could not update right now.");
  }
}
