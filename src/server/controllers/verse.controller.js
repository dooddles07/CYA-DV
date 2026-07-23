import "server-only";
import { NextResponse } from "next/server";
import { getVerseOfDay } from "@/server/services/verse.service";

export async function today() {
  return NextResponse.json({ verse: await getVerseOfDay() });
}
