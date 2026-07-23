import "server-only";
import { NextResponse } from "next/server";
import { markVerseRead } from "@/server/services/user.service";
import { getSession } from "@/server/utils/session";
import { toResponse } from "@/server/utils/api-error";

export async function markRead() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in to keep a streak." }, { status: 401 });
  try {
    return NextResponse.json(await markVerseRead(session.sub));
  } catch (err) {
    return toResponse(err, "Could not save your progress.");
  }
}
