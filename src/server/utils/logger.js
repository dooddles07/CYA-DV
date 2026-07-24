import "server-only";

/**
 * Minimal structured error logger and single choke point for observability.
 * Swap the console calls here for a real reporter (Sentry, Logtail, etc.)
 * without touching call sites.
 *
 * Log only genuine failures — an unreachable DB, an unexpected throw. Routine,
 * expected conditions (expired JWT, malformed request body) must NOT come here,
 * or the signal drowns in noise.
 *
 * @param {string} scope  where it happened, e.g. "prayer.listPrayersPage"
 * @param {unknown} err
 * @param {Record<string, unknown>} [meta]
 */
export function logError(scope, err, meta) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message: e.message,
      ...(meta ? { meta } : {}),
      time: new Date().toISOString(),
    })
  );
  if (e.stack) console.error(e.stack);
}
