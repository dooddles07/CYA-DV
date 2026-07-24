import "server-only";
import { dbConnect } from "@/server/config/db";
import { assertEnv, missingEnv } from "@/server/config/env";

/**
 * Backend entry point.
 *
 * This is not a custom HTTP server — Next.js owns the HTTP layer, and replacing
 * it would disable static optimization. This module boots the backend: env
 * checks and DB warmup. Routing lives entirely in src/app/api/**\/route.js,
 * which delegate to the controllers in @/server/controllers.
 */

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
    return { ok: true, db: "connected" };
  } catch (err) {
    return { ok: false, db: "unreachable", error: err.message };
  }
}
