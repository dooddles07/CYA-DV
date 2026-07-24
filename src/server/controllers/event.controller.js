import "server-only";
import { NextResponse } from "next/server";
import {
  createEvent,
  deleteEvent,
  listAllEvents,
  listUpcomingEvents,
  toggleRsvp,
  updateEvent,
} from "@/server/services/event.service";
import { assertAdmin as guard } from "@/server/utils/require-admin";
import { getSession } from "@/server/utils/session";
import { toResponse } from "@/server/utils/api-error";

/** Public — upcoming published events only. RSVP state reflects the viewer. */
export async function upcoming() {
  const session = await getSession();
  return NextResponse.json({ events: await listUpcomingEvents(24, session?.sub ?? null) });
}

export async function rsvp(req, id) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Sign in to RSVP." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await toggleRsvp(id, session.sub, Boolean(body?.going)));
  } catch (err) {
    return toResponse(err, "Could not update your RSVP.");
  }
}

export async function index() {
  try {
    await guard();
    return NextResponse.json({ events: await listAllEvents() });
  } catch (err) {
    return toResponse(err, "Not authorized.");
  }
}

export async function create(req) {
  try {
    await guard();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ event: await createEvent(body) }, { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not create that event.");
  }
}

export async function update(req, id) {
  try {
    await guard();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ event: await updateEvent(id, body) });
  } catch (err) {
    return toResponse(err, "Could not save that event.");
  }
}

export async function destroy(req, id) {
  try {
    await guard();
    return NextResponse.json(await deleteEvent(id));
  } catch (err) {
    return toResponse(err, "Could not delete that event.");
  }
}
