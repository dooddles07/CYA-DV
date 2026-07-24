import "server-only";
import { NextResponse } from "next/server";
import { listSaved, removeSaved, toggleSaved } from "@/server/services/saved-verse.service";
import { getSession } from "@/server/middleware/session";
import { toResponse } from "@/server/utils/api-error";

export async function index() {
  const session = await getSession();
  if (!session) return NextResponse.json({ verses: [] });
  return NextResponse.json({ verses: await listSaved(session.sub) });
}

export async function remove(req) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in to manage saved verses." }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await removeSaved(session.sub, body.reference));
  } catch (err) {
    return toResponse(err, "Could not remove that verse.");
  }
}

export async function toggle(req) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in to save verses." }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await toggleSaved(session.sub, body));
  } catch (err) {
    return toResponse(err, "Could not save that verse.");
  }
}
