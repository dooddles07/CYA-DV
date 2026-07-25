import { dbConnect } from "@/server/config/db";
import { RateBucket } from "@/server/models/rate-bucket.model";
import { ApiError } from "@/server/utils/api-error";

// Per-process fallback, used only when the DB is unreachable.
const local = new Map();

// Number of trusted reverse proxies in front of the app (e.g. the platform
// edge). Everything to the LEFT of these hops in X-Forwarded-For is
// client-supplied and spoofable, so the real client IP is counted from the
// right. Override via env when the deployment sits behind extra proxies.
const TRUSTED_PROXIES = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);

function clientKey(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const ips = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    // Count from the right: the hop our trusted proxy appended, not the
    // attacker-controlled leftmost value. Clamp the index so a header with
    // fewer hops than configured falls back to the leftmost real entry rather
    // than undefined — which would otherwise dump every such client into one
    // shared "unknown" bucket and let them exhaust each other's limit.
    const ip = ips[Math.max(0, ips.length - TRUSTED_PROXIES)];
    if (ip) return ip;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function localLimit(key, limit, windowMs) {
  const now = Date.now();
  const hits = (local.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  local.set(key, hits);
  if (local.size > 5000)
    for (const [k, v] of local) if (v.every((t) => now - t >= windowMs)) local.delete(k);
  return true;
}

/**
 * Fixed-window limiter backed by Mongo, so the count is shared across every
 * instance rather than reset per process. Falls back to an in-memory window
 * if the database is unreachable — degraded, but never blocks a real request.
 *
 * Throws ApiError(429) when the client is over the limit.
 */
export async function rateLimit(req, { name, limit, windowMs, message }) {
  const client = clientKey(req);
  const bucketStart = Math.floor(Date.now() / windowMs) * windowMs;
  const id = `${name}:${client}:${bucketStart}`;
  const tooMany = message ?? "Too many requests — please wait a moment and try again.";

  try {
    await dbConnect();
    // Atomic reserve: $inc bumps the shared counter in one round-trip, so
    // concurrent requests can't race a count-then-insert gap and overshoot.
    // The request that pushes the count past the limit is the one that's turned
    // away, so exactly `limit` requests pass per window.
    const doc = await RateBucket.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(bucketStart + windowMs) } },
      { upsert: true, returnDocument: "after" }
    );
    if (doc.count > limit) throw new ApiError(429, tooMany);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (!localLimit(`${name}:${client}`, limit, windowMs)) throw new ApiError(429, tooMany);
  }
}
