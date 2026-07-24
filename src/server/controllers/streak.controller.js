import "server-only";
import { NextResponse } from "next/server";
import { claimChallenge, markVerseRead } from "@/server/services/user.service";
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

export async function challenge(req) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in to earn XP." }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await claimChallenge(session.sub, body.id, body.xp));
  } catch (err) {
    return toResponse(err, "Could not save your progress.");
  }
}
