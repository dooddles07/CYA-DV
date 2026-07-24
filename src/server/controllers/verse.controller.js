import "server-only";
import { NextResponse } from "next/server";
import { getVerseOfDay, searchVerses } from "@/server/services/verse.service";

export async function today() {
  return NextResponse.json({ verse: await getVerseOfDay() });
}

export async function search(req) {
  const { searchParams } = new URL(req.url);
  const verses = await searchVerses({
    query: searchParams.get("q") ?? "",
    topic: searchParams.get("topic") ?? "",
  });
  return NextResponse.json({ verses });
}
