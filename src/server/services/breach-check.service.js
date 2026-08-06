import "server-only";
import crypto from "node:crypto";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 3000;

/**
 * Checks a password against the HIBP breached-password database using the
 * k-anonymity range API — only the first 5 hex chars of the SHA-1 hash are
 * sent, the full password (and full hash) never leave this server. Fails
 * open (treats the password as not-breached) on any network error, timeout,
 * or non-OK response — matches this codebase's existing philosophy
 * (rate-limit.js, session.js) of never blocking a legitimate user over an
 * unrelated system's outage.
 */
export async function isPasswordBreached(password) {
  const sha1 = crypto.createHash("sha1").update(String(password ?? "")).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => line.split(":")[0].trim() === suffix);
  } catch {
    return false;
  }
}
