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
