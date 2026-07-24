import "server-only";
import { NextResponse } from "next/server";
import { removeSubscription, saveSubscription, sendDailyVerse } from "@/server/services/push.service";
import { getSession } from "@/server/utils/session";
import { ApiError, toResponse } from "@/server/utils/api-error";

/** The browser needs the public key to build a subscription. */
export async function publicKey() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
}

export async function subscribe(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await getSession();
    return NextResponse.json(await saveSubscription(body.subscription, session?.sub ?? null));
  } catch (err) {
    return toResponse(err, "Could not enable reminders.");
  }
}

export async function unsubscribe(req) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await removeSubscription(body.endpoint));
  } catch (err) {
    return toResponse(err, "Could not turn off reminders.");
  }
}

/**
 * Sends the daily verse to every subscriber. Called by an external scheduler,
 * so it is guarded by a shared secret rather than a user session.
 */
export async function sendDaily(req) {
  try {
    // Header only — a query param would leak the secret into access logs.
    const secret = process.env.CRON_SECRET;
    const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!secret) throw new ApiError(503, "CRON_SECRET is not configured.");
    if (provided !== secret) throw new ApiError(401, "Not authorized.");

    return NextResponse.json(await sendDailyVerse());
  } catch (err) {
    return toResponse(err, "Could not send reminders.");
  }
}
