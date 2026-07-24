import "server-only";
import { dbConnect } from "@/server/config/db";
import { assertEnv, missingEnv } from "@/server/config/env";

/**
 * Backend entry point.
 *
 * This is not a custom HTTP server — Next.js owns the HTTP layer, and replacing
 * it would disable static optimization. This module is the single place where
 * the backend is described and booted: env checks, DB warmup, and the route map.
 */

/** Every API endpoint, with the controller that handles it. */
export const routes = {
  "GET  /api/health": "health check + env readiness",
  "POST /api/auth/register": "auth.controller#register",
  "POST /api/auth/login": "auth.controller#login",
  "POST /api/auth/logout": "auth.controller#logout",
  "GET  /api/auth/me": "auth.controller#me",
  "GET  /api/verse/today": "verse.controller#today",
  "GET  /api/verse/search": "verse.controller#search",
  "GET  /api/prayers": "prayer.controller#index",
  "POST /api/prayers": "prayer.controller#create",
  "POST /api/prayers/:id/pray": "prayer.controller#pray",
  "POST /api/streak/read": "streak.controller#markRead",
  "POST /api/streak/challenge": "streak.controller#challenge",
  "POST /api/auth/forgot": "auth.controller#forgotPassword",
  "POST /api/auth/reset": "auth.controller#resetPassword",
  "POST /api/auth/verify": "auth.controller#verifyEmailAddress",
  "POST /api/auth/verify/resend": "auth.controller#resendVerificationEmail",
  "GET  /api/saved": "saved-verse.controller#index",
  "POST /api/saved": "saved-verse.controller#toggle",
  "DELETE /api/saved": "saved-verse.controller#remove",
  "POST /api/plans/enroll": "plan.controller#enroll",
  "POST /api/plans/day": "plan.controller#completeDay",
  "POST /api/plans/leave": "plan.controller#leave",
  "GET  /api/push/key": "push.controller#publicKey",
  "POST /api/push/subscribe": "push.controller#subscribe",
  "DELETE /api/push/subscribe": "push.controller#unsubscribe",
  "POST /api/cron/daily-verse": "push.controller#sendDaily",
  "POST /api/admin/portal/login": "admin-auth.controller#portalLogin",
  "POST /api/admin/portal/logout": "admin-auth.controller#portalLogout",
  "GET  /api/events": "event.controller#upcoming",
  "GET  /api/images/:id": "image.controller#serve",
  "POST /api/admin/events/image": "image.controller#upload",
  "GET  /api/admin/events": "event.controller#index",
  "POST /api/admin/events": "event.controller#create",
  "PATCH /api/admin/events/:id": "event.controller#update",
  "DELETE /api/admin/events/:id": "event.controller#destroy",
  "GET  /api/admin/prayers": "admin.controller#prayers",
  "PATCH /api/admin/prayers/:id": "admin.controller#moderatePrayer",
  "POST /api/admin/sync-verses": "sync.controller#syncVerseCorpus",
};

let booted = null;

/**
 * Validates configuration and opens the Mongo connection.
 * Safe to call repeatedly — the work runs once per process.
 */
export function boot() {
  booted ??= (async () => {
    assertEnv();
    await dbConnect();
    return true;
  })();
  return booted;
}

/** Non-throwing status snapshot, useful for health checks and startup logs. */
export async function status() {
  const missing = missingEnv();
  if (missing.length) return { ok: false, db: "not attempted", missingEnv: missing };
  try {
    await boot();
    return { ok: true, db: "connected", routes: Object.keys(routes).length };
  } catch (err) {
    return { ok: false, db: "unreachable", error: err.message };
  }
}
