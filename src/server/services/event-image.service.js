import "server-only";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/server/config/db";
import { EventImage } from "@/server/models/event-image.model";
import { ApiError } from "@/server/utils/api-error";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

/** First bytes of each format, so a renamed .exe can't pass as an image. */
const SIGNATURES = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detectType(buffer) {
  return SIGNATURES.find((sig) => sig.bytes.every((b, i) => buffer[i] === b))?.type ?? null;
}

export async function saveEventImage(file) {
  if (!file || typeof file.arrayBuffer !== "function")
    throw new ApiError(400, "Choose an image to upload.");
  if (!ALLOWED.has(file.type))
    throw new ApiError(400, "Use a JPG, PNG, or WebP image.");
  if (file.size > MAX_BYTES)
    throw new ApiError(400, "That image is too large. Keep it under 2MB.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectType(buffer);
  if (!detected || detected !== file.type)
    throw new ApiError(400, "That file doesn't look like a real image.");

  await dbConnect();
  const doc = await EventImage.create({
    data: buffer,
    contentType: detected,
    bytes: buffer.length,
    originalName: String(file.name ?? "").slice(0, 200),
  });

  return { url: `/api/images/${doc._id.toString()}`, bytes: buffer.length };
}

export async function getEventImage(id) {
  if (!isValidObjectId(id)) return null;
  await dbConnect();
  return EventImage.findById(id).lean();
}

/** Removes artwork no event references, so deletes don't leave orphans behind. */
export async function deleteEventImageIfUnused(url, Event) {
  const id = /^\/api\/images\/([a-f\d]{24})$/i.exec(String(url ?? ""))?.[1];
  if (!id) return false;
  await dbConnect();
  if (await Event.countDocuments({ image: url })) return false;
  await EventImage.findByIdAndDelete(id);
  return true;
}
