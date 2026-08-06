import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "cya-mfa-pending";
const MAX_AGE = 60 * 10; // 10 minutes — long enough to read a QR/type a code, short enough to bound a stolen cookie's use

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

/**
 * Issued instead of a full session when a primary credential check (password
 * or portal passphrase) succeeds but MFA hasn't been satisfied yet. `sub` is
 * the member's user id for kind "member", or the literal "admin-portal" for
 * kind "portal" (matching createAdminSession()'s subject).
 */
export async function createMfaPending({ sub, kind, purpose }) {
  const token = await new SignJWT({ kind, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
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
}

export async function getMfaPending() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.kind || !payload.purpose) return null;
    return { sub: payload.sub, kind: payload.kind, purpose: payload.purpose };
  } catch {
    return null;
  }
}

export async function destroyMfaPending() {
  (await cookies()).delete(COOKIE);
}
