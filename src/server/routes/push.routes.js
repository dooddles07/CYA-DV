import {
  publicKey,
  subscribe,
  unsubscribe,
  sendDaily,
} from "@/server/controllers/push.controller";

export const vapidKey = publicKey; // GET    /api/push/key
export const subscribePush = subscribe; // POST   /api/push/subscribe
export const unsubscribePush = unsubscribe; // DELETE /api/push/subscribe
export const sendDailyVerse = sendDaily; // GET|POST /api/cron/daily-verse
