/** Web-push subscriptions and the daily broadcast cron. */
export const pushRoutes = {
  "GET  /api/push/key": "push.controller#publicKey",
  "POST /api/push/subscribe": "push.controller#subscribe",
  "DELETE /api/push/subscribe": "push.controller#unsubscribe",
  "POST /api/cron/daily-verse": "push.controller#sendDaily",
};
