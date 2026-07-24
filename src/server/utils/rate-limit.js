import { dbConnect } from "@/server/config/db";
import { RateHit } from "@/server/models/rate-hit.model";
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
    // attacker-controlled leftmost value.
    const ip = ips[ips.length - TRUSTED_PROXIES];
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
 * Sliding-window limiter backed by Mongo, so the count is shared across every
 * instance rather than reset per process. Falls back to an in-memory window
 * if the database is unreachable — degraded, but never blocks a real request.
 *
 * Throws ApiError(429) when the client is over the limit.
 */
export async function rateLimit(req, { name, limit, windowMs, message }) {
  const key = `${name}:${clientKey(req)}`;
  const since = new Date(Date.now() - windowMs);
  const tooMany = message ?? "Too many requests — please wait a moment and try again.";

  try {
    await dbConnect();
    const used = await RateHit.countDocuments({ key, at: { $gte: since } });
    if (used >= limit) throw new ApiError(429, tooMany);
    await RateHit.create({ key, at: new Date() });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (!localLimit(key, limit, windowMs)) throw new ApiError(429, tooMany);
  }
}
