import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "@/server/utils/api-error";

const COOKIE = "cya-csrf";
const HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Issues a random, JS-readable CSRF token cookie alongside a session cookie.
 * Not httpOnly on purpose — the client reads it and echoes it back in a
 * header, which is exactly what makes the double-submit check work.
 */
export async function ensureCsrfCookie() {
  const store = await cookies();
  if (store.get(COOKIE)?.value) return;
  store.set(COOKIE, crypto.randomBytes(32).toString("hex"), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Double-submit CSRF check: the request's X-CSRF-Token header must match the
 * cya-csrf cookie value. Safe (read-only) methods are exempt. Call this after
 * the caller is already known to be authenticated (admin gate / member
 * session), on any state-changing request.
 */
export async function verifyCsrf(req) {
  if (!req || SAFE_METHODS.has(req.method)) return;
  const cookieToken = (await cookies()).get(COOKIE)?.value;
  const headerToken = req.headers.get(HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ApiError(403, "Missing or invalid CSRF token. Refresh the page and try again.");
  }
}
