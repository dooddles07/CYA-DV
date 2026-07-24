import "server-only";
import { NextResponse } from "next/server";
import { getVerseOfDay, searchVerses } from "@/server/services/verse.service";
import { toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/utils/rate-limit";

export async function today() {
  return NextResponse.json({ verse: await getVerseOfDay() });
}

export async function search(req) {
  try {
    // Generous: the UI debounces to one request per keystroke pause.
    await rateLimit(req, {
      name: "verse:search",
      limit: 120,
      windowMs: 60_000,
      message: "Slow down a moment — too many searches.",
    });
    const { searchParams } = new URL(req.url);
    const verses = await searchVerses({
      query: searchParams.get("q") ?? "",
      topic: searchParams.get("topic") ?? "",
    });
    return NextResponse.json({ verses });
  } catch (err) {
    return toResponse(err, "Could not search right now.");
  }
}
