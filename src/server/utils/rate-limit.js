import { ApiError } from "@/server/utils/api-error";

// In-memory sliding window. Fine for a single Railway instance; swap for
// Redis only if the app is ever scaled horizontally.
const buckets = new Map();

function clientKey(req) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Throws 429 when `req`'s client exceeds `limit` hits in `windowMs`. */
export function rateLimit(req, { name, limit, windowMs, message }) {
  const key = `${name}:${clientKey(req)}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit)
    throw new ApiError(429, message ?? "Too many requests — please wait a moment and try again.");

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (buckets.size > 5000)
    for (const [k, v] of buckets)
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
}
