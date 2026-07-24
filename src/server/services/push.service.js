import "server-only";
import webpush from "web-push";
import { dbConnect } from "@/server/config/db";
import { PushSubscription } from "@/server/models/push-subscription.model";
import { ApiError } from "@/server/utils/api-error";

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

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          payload
        );
        sent += 1;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
      }
    })
  );

  if (dead.length) await PushSubscription.deleteMany({ endpoint: { $in: dead } });
  return { sent, removed: dead.length, total: subs.length };
}
