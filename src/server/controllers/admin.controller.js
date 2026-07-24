import "server-only";
import { NextResponse } from "next/server";
import { listAllPrayers, setPrayerStatus } from "@/server/services/prayer.service";
import { listUsers, setUserRole } from "@/server/services/user.service";
import { assertAdmin as guard } from "@/server/middleware/require-admin";
import { getSession } from "@/server/middleware/session";
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

export async function users() {
  try {
    await guard();
    return NextResponse.json({ users: await listUsers() });
  } catch (err) {
    return toResponse(err, "Not authorized.");
  }
}

export async function setRole(req, id) {
  try {
    await guard();
    // Acting user's id (null for a passphrase-only session) — blocks self-demotion.
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ user: await setUserRole(id, body.role, session?.sub ?? null) });
  } catch (err) {
    return toResponse(err, "Not authorized.");
  }
}
