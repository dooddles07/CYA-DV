import "server-only";
import { dbConnect } from "@/server/config/db";
import { assertEnv, missingEnv } from "@/server/config/env";
import { routes } from "@/server/routes";

/**
 * Backend entry point.
 *
 * This is not a custom HTTP server — Next.js owns the HTTP layer, and replacing
 * it would disable static optimization. This module boots the backend: env
 * checks and DB warmup. The route registry lives in @/server/routes.
 */

// Re-exported so existing importers keep working.
export { routes };

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
