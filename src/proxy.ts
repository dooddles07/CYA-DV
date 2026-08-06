import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

// Per-request nonce lets us drop 'unsafe-inline' from script-src. Next reads the
// nonce back out of the request's Content-Security-Policy header and stamps it
// onto every script it emits (including the inline theme script in layout.tsx),
// so no component needs to thread it manually.
const isDev = process.env.NODE_ENV !== "production";

const SESSION_COOKIE = "cya-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — must match session.js's MAX_AGE

function authSecret() {
  const s = process.env.AUTH_SECRET;
  return s ? new TextEncoder().encode(s) : null;
}

/**
 * Slides the session forward once it's past the halfway point of its
 * lifetime, so an active user is never logged out mid-use. Can't live in
 * session.js's getSession() — Next only allows cookies().set() inside a
 * Server Action or Route Handler, and getSession() is also called from plain
 * Server Component renders (e.g. login/page.tsx's redirect-if-logged-in
 * check), which would throw there. Middleware's res.cookies API has no such
 * restriction, so this mirrors the CSRF-cookie self-heal below.
 */
async function refreshSessionIfHalfExpired(req: NextRequest, res: NextResponse) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const secret = authSecret();
  if (!secret) return;

  try {
    const { payload } = await jwtVerify(token, secret);
    const iat = Number(payload.iat ?? 0) * 1000;
    const exp = Number(payload.exp ?? 0) * 1000;
    if (!payload.sub || !iat || !exp || Date.now() < iat + (exp - iat) / 2) return;

    const fresh = await new SignJWT({ name: payload.name, email: payload.email, tv: payload.tv })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(payload.sub))
      .setIssuedAt()
      .setExpirationTime(`${SESSION_MAX_AGE}s`)
      .sign(secret);

    res.cookies.set(SESSION_COOKIE, fresh, {
      httpOnly: true,
      secure: !isDev,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } catch {
    // Invalid/expired token — leave it alone, getSession() rejects it normally downstream.
  }
}

export async function proxy(req: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const csp = [
    "default-src 'self'",
    // strict-dynamic: only the nonce'd bootstrap and scripts it loads run, so a
    // reflected <script> tag can't execute. 'self' is kept as a fallback for
    // browsers without strict-dynamic. Dev still needs unsafe-eval for Fast Refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Verified against a production build: Tailwind's compiled CSS and
    // next/font's font-face rules both ship as one external linked
    // stylesheet — zero inline <style> elements in prod. style-src-elem
    // hardens that. style-src-attr stays permissive because the app has
    // genuine dynamic style="" usage (framer-motion animation values across
    // 9 files) that can't be static classes. The base style-src line is the
    // fallback for browsers that don't support the split directives — they
    // keep today's exact (permissive) behavior, no regression either way.
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);

  // Mint the CSRF cookie for every visitor, not just signed-in ones — some
  // state-changing endpoints (push subscribe/unsubscribe) are reachable while
  // anonymous, and the double-submit check needs the cookie to exist before
  // that first mutation. Also self-heals sessions that predate this cookie
  // (existing 30-day cookies from before it was added). New logins get it
  // immediately from the login/admin-login response itself.
  if (!req.cookies.get("cya-csrf")) {
    const csrfBytes = new Uint8Array(32);
    crypto.getRandomValues(csrfBytes);
    const csrfToken = Array.from(csrfBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    res.cookies.set("cya-csrf", csrfToken, {
      httpOnly: false,
      secure: !isDev,
      sameSite: "lax",
      path: "/",
    });
  }

  await refreshSessionIfHalfExpired(req, res);

  return res;
}

export const config = {
  matcher: [
    {
      // Documents only. Static assets and images carry no inline scripts and are
      // served straight from cache, so a per-request CSP there is wasted work.
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|webmanifest)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
