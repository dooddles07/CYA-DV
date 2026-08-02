import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { ApiError } from "@/server/utils/api-error";
import { ensureCsrfCookie } from "@/server/middleware/csrf";

const COOKIE = "cya-admin";
// Shorter than a member session: a shared passphrase should not leave a
// month-long session sitting on a borrowed device.
const MAX_AGE = 60 * 60 * 8;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new ApiError(503, "Server is not configured.");
  return new TextEncoder().encode(s);
}

export function portalConfigured() {
  return Boolean(process.env.ADMIN_PORTAL_PASSWORD);
}

/** Timing-safe compare so response time can't be used to guess the passphrase. */
export function passphraseMatches(candidate) {
  const expected = process.env.ADMIN_PORTAL_PASSWORD ?? "";
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(String(candidate ?? "")).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const token = await new SignJWT({ portal: true })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin-portal")
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  await ensureCsrfCookie();
}

/** True when this browser holds a valid admin-portal session. */
export async function hasAdminSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.portal === true;
  } catch {
    return false;
  }
}

export async function destroyAdminSession() {
  (await cookies()).delete(COOKIE);
}
