import "server-only";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { removeSubscription, saveSubscription, sendDailyVerse } from "@/server/services/push.service";
import { getSession } from "@/server/middleware/session";
import { rateLimit } from "@/server/middleware/rate-limit";
import { ApiError, toResponse } from "@/server/utils/api-error";

/** Constant-time string compare so response time can't leak the cron secret. */
function secretMatches(provided, expected) {
  const a = crypto.createHash("sha256").update(String(provided ?? "")).digest();
  const b = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

/** The browser needs the public key to build a subscription. */
export async function publicKey() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
}

export async function subscribe(req) {
  try {
    // Unauthenticated write — throttle so a bot can't flood the store with junk
    // (and useless) subscriptions.
    await rateLimit(req, { name: "push:subscribe", limit: 20, windowMs: 15 * 60_000 });
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
    const session = await getSession();
    return NextResponse.json(await removeSubscription(body.endpoint, session?.sub ?? null));
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
    if (!provided || !secretMatches(provided, secret)) throw new ApiError(401, "Not authorized.");

    return NextResponse.json(await sendDailyVerse());
  } catch (err) {
    return toResponse(err, "Could not send reminders.");
  }
}
