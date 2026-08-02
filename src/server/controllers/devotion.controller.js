import "server-only";
import { NextResponse } from "next/server";
import {
  createDevotion,
  deleteDevotion,
  listAllDevotions,
  updateDevotion,
} from "@/server/services/devotion.service";
import { assertAdmin as guard } from "@/server/middleware/require-admin";
import { toResponse } from "@/server/utils/api-error";
import { logAdminAction } from "@/server/utils/admin-audit";

export async function index() {
  try {
    await guard();
    return NextResponse.json({ devotions: await listAllDevotions() });
  } catch (err) {
    return toResponse(err, "Not authorized.");
  }
}

export async function create(req) {
  try {
    await guard(req);
    const body = await req.json().catch(() => ({}));
    const devotion = await createDevotion(body);
    await logAdminAction({ action: "devotion.create", targetType: "devotion", targetId: devotion.id });
    return NextResponse.json({ devotion }, { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not create that devotional.");
  }
}

export async function update(req, id) {
  try {
    await guard(req);
    const body = await req.json().catch(() => ({}));
    const devotion = await updateDevotion(id, body);
    await logAdminAction({ action: "devotion.update", targetType: "devotion", targetId: id });
    return NextResponse.json({ devotion });
  } catch (err) {
    return toResponse(err, "Could not save that devotional.");
  }
}

export async function destroy(req, id) {
  try {
    await guard(req);
    const result = await deleteDevotion(id);
    await logAdminAction({ action: "devotion.delete", targetType: "devotion", targetId: id });
    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err, "Could not delete that devotional.");
  }
}
