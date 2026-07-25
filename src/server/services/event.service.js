import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { Event } from "@/server/models/event.model";
import { EventRsvp } from "@/server/models/event-rsvp.model";
import { ApiError } from "@/server/utils/api-error";
import { deleteEventImageIfUnused } from "@/server/services/event-image.service";
import { manilaDayKey } from "@/server/utils/dates";
import { logError } from "@/server/utils/logger";

/** @typedef {import("@/lib/types").EventItem} EventItem */

// A bundled asset, or artwork uploaded through the admin console.
const IMAGE_RE = /^(\/media\/[\w.-]+|\/api\/images\/[a-f\d]{24})$/i;

/** "2026-08-08" -> "Aug 8, 2026". Derived so admins never keep two fields in sync. */
function displayDate(date) {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** @returns {EventItem} */
function serialize(doc, rsvped = false) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    date: doc.date,
    displayDate: displayDate(doc.date),
    time: doc.time,
    location: doc.location,
    description: doc.description ?? "",
    speaker: doc.speaker,
    tag: doc.tag,
    image: doc.image,
    published: doc.published,
    rsvpCount: doc.rsvpCount ?? 0,
    rsvped,
  };
}

/** Set of eventId strings the user has RSVP'd to, among `docs`. */
async function rsvpedSet(docs, userId) {
  if (!userId || docs.length === 0) return new Set();
  const rows = await EventRsvp.find({
    userId,
    eventId: { $in: docs.map((d) => d._id) },
  })
    .select("eventId")
    .lean();
  return new Set(rows.map((r) => r.eventId.toString()));
}

function validate(input) {
  const title = String(input.title ?? "").trim();
  const date = String(input.date ?? "").trim();
  const time = String(input.time ?? "").trim();
  const location = String(input.location ?? "").trim();
  const description = String(input.description ?? "").trim();
  const speaker = String(input.speaker ?? "").trim();
  const tag = String(input.tag ?? "").trim() || "Event";
  const image = String(input.image ?? "").trim();

  if (title.length < 3) throw new ApiError(400, "Give the event a title (at least 3 characters).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, "Pick a valid date.");
  if (Number.isNaN(new Date(`${date}T00:00:00Z`).getTime()))
    throw new ApiError(400, "That date doesn't exist.");
  if (!time) throw new ApiError(400, "Add a start time.");
  if (location.length < 2) throw new ApiError(400, "Add a location.");
  if (description.length > 800)
    throw new ApiError(400, "Keep the description under 800 characters.");
  if (!image) throw new ApiError(400, "Upload a pubmat for this event.");
  // Restricted to our own assets so a stray URL can't point the page elsewhere.
  // /media paths remain valid for the events seeded before uploads existed.
  if (!IMAGE_RE.test(image)) throw new ApiError(400, "That image isn't valid.");

  return {
    title: title.slice(0, 120),
    date,
    time: time.slice(0, 40),
    location: location.slice(0, 160),
    description: description.slice(0, 800),
    speaker: speaker.slice(0, 120),
    tag: tag.slice(0, 40),
    image,
    published: input.published !== false,
  };
}

/**
 * Public list: published, still upcoming, soonest first.
 * @param {number} [limit]
 * @param {string | null} [userId]
 */
export async function listUpcomingEvents(limit = 24, userId = null) {
  try {
    await dbConnect();
    const docs = await Event.find({ published: true, date: { $gte: manilaDayKey() } })
      .sort({ date: 1 })
      .limit(limit)
      .lean();
    const mine = await rsvpedSet(docs, userId);
    return docs.map((d) => serialize(d, mine.has(d._id.toString())));
  } catch (err) {
    logError("event.listUpcomingEvents", err);
    return [];
  }
}

/** Admin list: everything, including drafts and past events. */
export async function listAllEvents() {
  await dbConnect();
  const docs = await Event.find().sort({ date: -1 }).lean();
  return docs.map((d) => serialize(d));
}

/**
 * Toggles the signed-in user's RSVP. The per-user EventRsvp row is the source
 * of truth: the count only moves when a row is created or removed, so repeat
 * calls are idempotent and the headcount can't be inflated.
 * @returns {Promise<{ rsvpCount: number, rsvped: boolean }>}
 */
export async function toggleRsvp(eventId, userId, going) {
  if (!userId) throw new ApiError(401, "Sign in to RSVP.");
  if (!isValidObjectId(eventId)) throw new ApiError(404, "That event no longer exists.");
  await dbConnect();

  if (!going) {
    const removed = await EventRsvp.findOneAndDelete({ eventId, userId });
    if (!removed) {
      const doc = await Event.findById(eventId).select("rsvpCount").lean();
      if (!doc) throw new ApiError(404, "That event no longer exists.");
      return { rsvpCount: doc.rsvpCount ?? 0, rsvped: false };
    }
    const doc = await Event.findOneAndUpdate(
      { _id: eventId, rsvpCount: { $gt: 0 } },
      { $inc: { rsvpCount: -1 } },
      { returnDocument: "after" }
    ).lean();
    return { rsvpCount: doc?.rsvpCount ?? 0, rsvped: false };
  }

  try {
    await EventRsvp.create({ eventId, userId });
  } catch (err) {
    if (err?.code === 11000) {
      const doc = await Event.findById(eventId).select("rsvpCount").lean();
      if (!doc) throw new ApiError(404, "That event no longer exists.");
      return { rsvpCount: doc.rsvpCount ?? 0, rsvped: true };
    }
    throw err;
  }
  const doc = await Event.findOneAndUpdate(
    { _id: eventId },
    { $inc: { rsvpCount: 1 } },
    { returnDocument: "after" }
  ).lean();
  if (!doc) {
    // Event removed between the two writes — drop the orphan RSVP.
    await EventRsvp.deleteOne({ eventId, userId }).catch(() => {});
    throw new ApiError(404, "That event no longer exists.");
  }
  return { rsvpCount: doc.rsvpCount, rsvped: true };
}

export async function createEvent(input) {
  await dbConnect();
  const doc = await Event.create(validate(input));
  return serialize(doc);
}

export async function updateEvent(id, input) {
  if (!isValidObjectId(id)) throw new ApiError(404, "That event no longer exists.");
  await dbConnect();
  const doc = await Event.findByIdAndUpdate(id, { $set: validate(input) }, { returnDocument: "after" }).lean();
  if (!doc) throw new ApiError(404, "That event no longer exists.");
  return serialize(doc);
}

export async function deleteEvent(id) {
  if (!isValidObjectId(id)) throw new ApiError(404, "That event no longer exists.");
  await dbConnect();
  const doc = await Event.findByIdAndDelete(id).lean();
  if (!doc) throw new ApiError(404, "That event no longer exists.");
  // Drop this event's RSVP rows and the uploaded pubmat (unless still in use).
  await EventRsvp.deleteMany({ eventId: id }).catch(() => {});
  await deleteEventImageIfUnused(doc.image, Event).catch(() => {});
  return { deleted: true, id };
}
