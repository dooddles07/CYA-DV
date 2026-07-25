import type { NextConfig } from "next";

// Content-Security-Policy is set per-request in proxy.ts so script-src can
// carry a fresh nonce + 'strict-dynamic' instead of 'unsafe-inline'. The static
// headers below have no per-request part, so they stay here.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // Uploaded pubmats stream from Mongo full-size; let the optimizer resize
  // them to the layout breakpoints, serve WebP/AVIF, and cache the variants.
  images: { minimumCacheTTL: 31536000 },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
