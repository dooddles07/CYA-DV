import { NextResponse, type NextRequest } from "next/server";

// Per-request nonce lets us drop 'unsafe-inline' from script-src. Next reads the
// nonce back out of the request's Content-Security-Policy header and stamps it
// onto every script it emits (including the inline theme script in layout.tsx),
// so no component needs to thread it manually.
const isDev = process.env.NODE_ENV !== "production";

export function proxy(req: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const csp = [
    "default-src 'self'",
    // strict-dynamic: only the nonce'd bootstrap and scripts it loads run, so a
    // reflected <script> tag can't execute. 'self' is kept as a fallback for
    // browsers without strict-dynamic. Dev still needs unsafe-eval for Fast Refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // next/font and Tailwind inject inline <style> a nonce can't reach, so style
    // keeps 'unsafe-inline'. Style-based XSS is far weaker than script.
    "style-src 'self' 'unsafe-inline'",
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
