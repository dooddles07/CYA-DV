import "server-only";
import { NextResponse } from "next/server";
import { listAllPrayers, setPrayerStatus } from "@/server/services/prayer.service";
import { listUsers, setUserRole } from "@/server/services/user.service";
import { assertAdmin as guard } from "@/server/middleware/require-admin";
import { getSession } from "@/server/middleware/session";
import { toResponse } from "@/server/utils/api-error";
import { logAdminAction } from "@/server/utils/admin-audit";

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
    await guard(req);
    const body = await req.json().catch(() => ({}));
    const prayer = await setPrayerStatus(id, body.status);
    await logAdminAction({
      action: "prayer.moderate",
      targetType: "prayer",
      targetId: id,
      meta: { status: body.status },
    });
    return NextResponse.json({ prayer });
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
    await guard(req);
    // Acting user's id (null for a passphrase-only session) — blocks self-demotion.
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const user = await setUserRole(id, body.role, session?.sub ?? null);
    await logAdminAction({
      action: "user.set-role",
      targetType: "user",
      targetId: id,
      meta: { role: body.role },
    });
    return NextResponse.json({ user });
  } catch (err) {
    return toResponse(err, "Not authorized.");
  }
}
