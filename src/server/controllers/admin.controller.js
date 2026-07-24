import "server-only";
import { NextResponse } from "next/server";
import { listAllPrayers, setPrayerStatus } from "@/server/services/prayer.service";
import { assertAdmin as guard } from "@/server/utils/require-admin";
import { toResponse } from "@/server/utils/api-error";

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
