# Security Hardening Batch — Design

## Context

Four items from `docs/SECURITY.md`'s "Recommended Improvement" list, approved by the user for implementation: Dependabot wiring, sliding session expiry, breached-password checking, and `style-src` CSP hardening. Same zero-cost constraint as prior work in this project: no paid services, minimal/no new dependencies, stays on Vercel free tier + MongoDB Atlas free tier.

These are four independent, differently-sized changes bundled into one batch because each is small enough on its own that a separate spec/plan cycle per item would be more process than the work justifies. They touch disjoint files and can be implemented and verified independently within this one plan.

## 1. Dependabot wiring

Config-only. Create `.github/dependabot.yml`:
- `package-ecosystem: npm`, directory `/`, weekly schedule, targets `main`.
- Group minor/patch updates into one PR to reduce noise; major version bumps stay separate (they're more likely to need manual review).

No code changes, no design decisions beyond schedule/grouping.

## 2. Sliding session expiry

**Constraint that shapes this:** Next.js only allows `cookies().set()` inside a Server Action or Route Handler — calling it from a plain Server Component render throws. `getSession()` (`src/server/middleware/session.js`) is called from Server Components too (e.g. `login/page.tsx`'s `if (await getSession()) redirect(...)`), so the refresh can't live inside `getSession()` itself.

**Design:** extend `src/proxy.ts`, which already self-heals the `cya-csrf` cookie on every page load (the exact same shape of problem — a cookie that needs conditional re-issuing outside a Route Handler). Add: decode `cya-session` via `jose`'s `jwtVerify` (already Edge-compatible, which is why this project uses `jose` over `jsonwebtoken`), read the `exp` claim, and if less than half the original 30-day lifetime remains, re-sign a fresh token with the same claims (`sub`, `name`, `email`, `tv`) and a fresh 30-day expiry, set via `res.cookies.set()`.

- **Scope:** page navigations only, matching the CSRF self-heal's existing limitation (`proxy.ts`'s matcher excludes `/api/*`). A user who only hits API routes between page loads doesn't get refreshed on those calls, same as today's CSRF self-heal only fires on page loads.
- **No absolute lifetime cap.** The goal is "active users aren't logged out mid-use" — a hard cap adds complexity (tracking original-issue time, a second expiry concept) this app's risk profile doesn't need. Revocation still works exactly as today (`tokenVersion` bump on password reset invalidates every outstanding session immediately, refreshed or not).
- Sign/verify logic is duplicated in `proxy.ts` rather than imported from `session.js`, because `session.js` depends on `next/headers`'s `cookies()`, which isn't available in Middleware — `proxy.ts` already does its own manual token construction for the CSRF cookie for the same reason.

## 3. Breached-password check

New `src/server/services/breach-check.service.js`: `isPasswordBreached(password)` — SHA-1 hash the password (`node:crypto`, k-anonymity model requires SHA-1, not for storage — this is separate from and unrelated to the bcrypt hash actually stored), take the first 5 hex characters as the range prefix, `GET https://api.pwnedpasswords.com/range/{prefix}` (no API key, no request body — the full password/hash never leaves the server), and check whether the remaining 35 characters appear as a suffix in the response body.

- **Fails open** on network error or timeout (3s timeout via `AbortSignal.timeout(3000)`) — registration/reset proceeds normally. Matches this codebase's existing philosophy: `rate-limit.js` and `session.js` both fail open on their own dependency's outage rather than block a legitimate user over an unrelated system being down.
- **Applied to both** `registerUser()` (`auth.service.js`) and `completeReset()` (`password-reset.service.js`) — both are password-setting operations, same risk, same check.
- Rejection message: "This password has appeared in a data breach. Please choose a different one." — generic, doesn't reveal which breach or count.
- No new dependency — native `fetch` (Node 22 has it built in) + `crypto.createHash("sha1")`.

## 4. `style-src` CSP hardening

Verified empirically against a production build (`next start`, not dev): the rendered HTML contains **zero** inline `<style>` elements — Tailwind v4's compiled CSS and `next/font`'s font-face declarations both ship as one external linked stylesheet — but **9** files use genuine dynamic `style={{...}}` attributes (framer-motion animation values, gradients, computed positions) that can't be static Tailwind classes without a large, risky refactor to the app's motion/animation layer.

**Change in `src/proxy.ts`:** split the current `style-src 'self' 'unsafe-inline'` into three directives:
```
style-src 'self' 'unsafe-inline';   // fallback for browsers without CSP3 split-directive support
style-src-elem 'self';              // hardened — blocks arbitrary injected <style> elements
style-src-attr 'unsafe-inline';     // unchanged — the app's legitimate style="" usage
```
Per the CSP spec, a browser that doesn't recognize `style-src-elem`/`style-src-attr` falls back to the base `style-src` — so browsers without CSP3 support see exactly today's behavior (no regression), while browsers that do support it (current Chrome, Firefox, Edge, recent Safari) get `<style>`-element hardening. This is a real reduction in XSS blast radius (blocks a `<style>`-tag injection vector) with no behavior change for the app's actual legitimate style usage.

## Testing

- **Dependabot:** none needed — GitHub validates the YAML on first scheduled run.
- **Sliding expiry:** extend `tests/e2e/smoke.spec.ts` or a small new unit test isn't practical (proxy.ts is Edge middleware, not unit-testable via `node:test` per this project's established controller/service testing boundary — see Global Constraints in the MFA plan). Verify manually: log in, decode the `cya-session` cookie's `exp` before/after a page load once the token is past the halfway point, confirm it advances; confirm a session well within its first half does *not* get re-signed on every request (would be wasteful).
- **Breach check:** unit test `isPasswordBreached()` against a **known** breached password (e.g. `"password123"` — certainly in HIBP's dataset) and a random UUID (certainly not), plus a test that a timeout/fetch failure resolves to "not breached" (fail open). Integration test extending `services.integration.test.mjs`: `registerUser()` rejects a known-breached password with a clear error.
- **CSP:** manual verification — load the app in a real browser, confirm the console has no CSP violation errors, confirm animations (Aurora background, motion components) still render, confirm the `Content-Security-Policy` response header shows all three directives.

## Files touched

**Create:** `.github/dependabot.yml`, `src/server/services/breach-check.service.js`, `tests/breach-check.test.mjs`.

**Modify:** `src/proxy.ts` (sliding expiry + CSP split), `src/server/services/auth.service.js` (breach check on register), `src/server/services/password-reset.service.js` (breach check on reset), `tests/services.integration.test.mjs` (breach-check integration test), `docs/SECURITY.md` (mark all four as implemented, remove from Recommended Improvements).
