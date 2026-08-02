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
import { assertAdmin as guard } from "@/server/middleware/require-admin";
import { getSession } from "@/server/middleware/session";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/middleware/rate-limit";
import { logAdminAction } from "@/server/utils/admin-audit";

/** Public — upcoming published events only. RSVP state reflects the viewer. */
export async function upcoming() {
  const session = await getSession();
  return NextResponse.json({ events: await listUpcomingEvents(24, session?.sub ?? null) });
}

export async function rsvp(req, id) {
  try {
    const session = await getSession({ strict: true });
    if (!session)
      return NextResponse.json({ error: "Sign in to RSVP." }, { status: 401 });
    await rateLimit(req, { name: "event:rsvp", limit: 20, windowMs: 10 * 60_000 });
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
    await guard(req);
    const body = await req.json().catch(() => ({}));
    const event = await createEvent(body);
    await logAdminAction({ action: "event.create", targetType: "event", targetId: event.id });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not create that event.");
  }
}

export async function update(req, id) {
  try {
    await guard(req);
    const body = await req.json().catch(() => ({}));
    const event = await updateEvent(id, body);
    await logAdminAction({ action: "event.update", targetType: "event", targetId: id });
    return NextResponse.json({ event });
  } catch (err) {
    return toResponse(err, "Could not save that event.");
  }
}

export async function destroy(req, id) {
  try {
    await guard(req);
    const result = await deleteEvent(id);
    await logAdminAction({ action: "event.delete", targetType: "event", targetId: id });
    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err, "Could not delete that event.");
  }
}
