import "server-only";
import { NextResponse } from "next/server";
import {
  createDevotion,
  deleteDevotion,
  listAllDevotions,
  updateDevotion,
} from "@/server/services/devotion.service";
import { assertAdmin as guard } from "@/server/utils/require-admin";
import { toResponse } from "@/server/utils/api-error";

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
    await guard();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ devotion: await createDevotion(body) }, { status: 201 });
  } catch (err) {
    return toResponse(err, "Could not create that devotional.");
  }
}

export async function update(req, id) {
  try {
    await guard();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ devotion: await updateDevotion(id, body) });
  } catch (err) {
    return toResponse(err, "Could not save that devotional.");
  }
}

export async function destroy(req, id) {
  try {
    await guard();
    return NextResponse.json(await deleteDevotion(id));
  } catch (err) {
    return toResponse(err, "Could not delete that devotional.");
  }
}
