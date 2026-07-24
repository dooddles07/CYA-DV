import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { Event } from "@/server/models/event.model";
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
function serialize(doc) {
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
  };
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

/** Public list: published, still upcoming, soonest first. */
export async function listUpcomingEvents(limit = 24) {
  try {
    await dbConnect();
    const docs = await Event.find({ published: true, date: { $gte: manilaDayKey() } })
      .sort({ date: 1 })
      .limit(limit)
      .lean();
    return docs.map(serialize);
  } catch (err) {
    logError("event.listUpcomingEvents", err);
    return [];
  }
}

/** Admin list: everything, including drafts and past events. */
export async function listAllEvents() {
  await dbConnect();
  const docs = await Event.find().sort({ date: -1 }).lean();
  return docs.map(serialize);
}

export async function createEvent(input) {
  await dbConnect();
  const doc = await Event.create(validate(input));
  return serialize(doc);
}

export async function updateEvent(id, input) {
  if (!isValidObjectId(id)) throw new ApiError(404, "That event no longer exists.");
  await dbConnect();
  const doc = await Event.findByIdAndUpdate(id, { $set: validate(input) }, { new: true }).lean();
  if (!doc) throw new ApiError(404, "That event no longer exists.");
  return serialize(doc);
}

export async function deleteEvent(id) {
  if (!isValidObjectId(id)) throw new ApiError(404, "That event no longer exists.");
  await dbConnect();
  const doc = await Event.findByIdAndDelete(id).lean();
  if (!doc) throw new ApiError(404, "That event no longer exists.");
  // Drop the uploaded pubmat too, unless another event still uses it.
  await deleteEventImageIfUnused(doc.image, Event).catch(() => {});
  return { deleted: true, id };
}
