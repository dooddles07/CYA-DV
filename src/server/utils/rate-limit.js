import { dbConnect } from "@/server/config/db";
import { RateHit } from "@/server/models/rate-hit.model";
import { ApiError } from "@/server/utils/api-error";

// Per-process fallback, used only when the DB is unreachable.
const local = new Map();

function clientKey(req) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
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
