// Runs once per server instance at cold start, before any request is handled
// (Next.js instrumentation hook) — the right place to fail fast on a missing
// required env var instead of only catching it later via /api/health.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("@/server/config/env");
    assertEnv();
  }
}
