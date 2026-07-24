import "server-only";
import { NextResponse } from "next/server";
import { listAllPrayers, setPrayerStatus } from "@/server/services/prayer.service";
import { requireAdmin } from "@/server/services/user.service";
import { getSession } from "@/server/utils/session";
import { ApiError, toResponse } from "@/server/utils/api-error";

async function guard() {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Sign in required.");
  await requireAdmin(session);
  return session;
}

export async function prayers() {
  try {
    await guard();
    return NextResponse.json({ prayers: await listAllPrayers() });
  } catch (err) {
    return toResponse(err, "Not authorized.");
  }
}

export async function moderatePrayer(req, id) {
  try {
    await guard();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ prayer: await setPrayerStatus(id, body.status) });
  } catch (err) {
    return toResponse(err, "Not authorized.");
  }
}
