import "server-only";
import { NextResponse } from "next/server";
import { getEventImage, saveEventImage } from "@/server/services/event-image.service";
import { assertAdmin } from "@/server/utils/require-admin";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/utils/rate-limit";

export async function upload(req) {
  try {
    await assertAdmin();
    await rateLimit(req, {
      name: "admin:image",
      limit: 30,
      windowMs: 10 * 60_000,
      message: "Too many uploads in a row — wait a few minutes.",
    });

    const form = await req.formData();
    return NextResponse.json(await saveEventImage(form.get("file")), { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not upload that image.");
  }
}

/** Public: event artwork is shown on the events page. */
export async function serve(_req, id) {
  const image = await getEventImage(id).catch(() => null);
  if (!image) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(image.data.buffer), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes),
      // Contents never change for a given id, so this can cache hard.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
