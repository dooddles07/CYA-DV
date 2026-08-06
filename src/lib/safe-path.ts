/**
 * Validates a redirect target is an internal, same-origin path before it's
 * ever handed to router.push()/redirect(). A plain `startsWith("/")` check
 * is not enough — `/\evil.com` or `/\t/\evil.com`-style values can be
 * normalized to a protocol-relative `//evil.com` by a URL parser (browsers
 * treat `\` as a path/authority separator for http(s) URLs per the WHATWG
 * URL spec), so this resolves the value against a fixed base and confirms
 * the result never leaves that origin — the same check a browser itself
 * would apply, rather than a heuristic that tries to anticipate every
 * normalization quirk.
 */
export function safeInternalPath(value: string | undefined | null, fallback: string): string {
  if (!value) return fallback;
  try {
    const base = "http://internal.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || fallback;
  } catch {
    return fallback;
  }
}
