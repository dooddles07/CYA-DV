import "server-only";
import { NextResponse } from "next/server";
import {
  createEvent,
  deleteEvent,
  listAllEvents,
  listUpcomingEvents,
  updateEvent,
} from "@/server/services/event.service";
import { assertAdmin as guard } from "@/server/utils/require-admin";
import { toResponse } from "@/server/utils/api-error";

/** Public — upcoming published events only. */
export async function upcoming() {
  return NextResponse.json({ events: await listUpcomingEvents() });
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
