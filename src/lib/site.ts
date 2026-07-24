/** Canonical public origin. Required per environment — see env.js REQUIRED. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Origin for links in outbound email; throws rather than emit a wrong-origin link. */
export function requireSiteUrl(): string {
  if (!SITE_URL) throw new Error("NEXT_PUBLIC_SITE_URL is not set; refusing to send an email link.");
  return SITE_URL;
}
