import "server-only";
import webpush from "web-push";
import { dbConnect } from "@/server/config/db";
import { PushSubscription } from "@/server/models/push-subscription.model";
import { PushLog } from "@/server/models/push-log.model";
import { ApiError } from "@/server/utils/api-error";
import { logError } from "@/server/utils/logger";
import { manilaDayKey } from "@/server/utils/dates";
import { getVerseOfDay } from "@/server/services/verse.service";

// Cap concurrent push requests so a large subscriber base can't open thousands
// of TLS connections at once (memory spike, socket exhaustion, provider rate
// limits). Sent in sequential batches of this size.
const SEND_CONCURRENCY = 100;

let configured = false;

function configure() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey)
    throw new ApiError(503, "Push notifications are not configured on this server.");
  if (!configured) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_CONTACT_EMAIL ?? "hello@example.com"}`,
      publicKey,
      privateKey
    );
    configured = true;
  }
}

export async function saveSubscription(subscription, userId = null) {
  const endpoint = String(subscription?.endpoint ?? "");
  const p256dh = String(subscription?.keys?.p256dh ?? "");
  const auth = String(subscription?.keys?.auth ?? "");
  if (!endpoint || !p256dh || !auth) throw new ApiError(400, "Invalid push subscription.");

  await dbConnect();
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { $set: { userId, keys: { p256dh, auth } } },
    { upsert: true }
  );
  return { subscribed: true };
}

export async function removeSubscription(endpoint) {
  await dbConnect();
  await PushSubscription.deleteOne({ endpoint: String(endpoint ?? "") });
  return { subscribed: false };
}

/**
 * Fans out a notification to every stored subscription.
 * Subscriptions the push service rejects as gone (404/410) are pruned.
 */
export async function broadcast({ title, body, url }) {
  configure();
  await dbConnect();

  const subs = await PushSubscription.find().lean();
  const payload = JSON.stringify({ title, body, url });
  const dead = [];
  let sent = 0;

  // Send in bounded batches rather than one giant Promise.all.
  for (let i = 0; i < subs.length; i += SEND_CONCURRENCY) {
    const batch = subs.slice(i, i + SEND_CONCURRENCY);
    await Promise.all(
      batch.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload);
          sent += 1;
        } catch (err) {
          // Gone — prune. Anything else is a real send failure worth logging.
          if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
          else logError("push.broadcast.send", err, { endpoint: s.endpoint });
        }
      })
    );
  }

  if (dead.length) await PushSubscription.deleteMany({ endpoint: { $in: dead } });
  return { sent, removed: dead.length, total: subs.length };
}

/**
 * Sends today's verse to every subscriber, at most once per Manila day.
 *
 * Idempotent: the day is claimed atomically via a unique PushLog row before
 * sending, so a scheduler retry or overlapping trigger short-circuits instead
 * of re-sending. If the broadcast itself throws, the claim is released so a
 * later retry can succeed.
 */
export async function sendDailyVerse() {
  await dbConnect();
  const day = manilaDayKey();

  try {
    await PushLog.create({ day });
  } catch (err) {
    if (err?.code === 11000) return { skipped: true, reason: "already-sent", day };
    throw err;
  }

  try {
    const verse = await getVerseOfDay();
    const result = await broadcast({
      title: `Today's verse — ${verse.reference}`,
      body: verse.text.length > 140 ? `${verse.text.slice(0, 140)}…` : verse.text,
      url: "/verse",
    });
    return { day, ...result };
  } catch (err) {
    // Hard failure — release the claim so a retry isn't blocked as a duplicate.
    await PushLog.deleteOne({ day }).catch(() => {});
    throw err;
  }
}
