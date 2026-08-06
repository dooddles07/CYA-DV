# Security Hardening Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four independent SECURITY.md "Recommended Improvement" items: Dependabot wiring, sliding session expiry, a breached-password check, and `style-src` CSP hardening.

**Architecture:** Each item is self-contained and touches disjoint files except two (sliding expiry and CSP hardening both edit `src/proxy.ts`, sequenced as separate tasks). No shared abstractions needed between the four.

**Tech Stack:** Next.js 16 Edge Middleware, `jose` (already in the tree), native `fetch`/`node:crypto` (no new dependency), `node:test`.

**Spec:** [docs/superpowers/specs/2026-08-06-SECURITY-HARDENING-BATCH-DESIGN.md](../specs/2026-08-06-SECURITY-HARDENING-BATCH-DESIGN.md)

## Global Constraints

- Zero added cost: no paid services. Exactly zero new npm dependencies across all four items.
- `src/proxy.ts` runs in Next.js's Edge Middleware runtime by default — no `node:crypto`, no `next/headers`, no Mongoose/`dbConnect`. Only Web Crypto (`crypto.getRandomValues`) and Edge-compatible packages (`jose`) are usable there.
- `getSession()` (`src/server/middleware/session.js`) cannot write cookies itself — it's called from plain Server Component renders (e.g. `login/page.tsx`), where `cookies().set()` throws. Any session-cookie mutation belongs in `proxy.ts` instead, matching the existing CSRF-cookie self-heal there.
- Per-task verification: `npm run lint` and `npx tsc --noEmit` clean, `npm test` green. Final gate: `npm run build` + `npm run test:e2e` + the manual checklist in Task 7 (proxy.ts isn't unit-testable via this project's `node:test` setup — same controller/service testing boundary documented in `docs/superpowers/plans/2026-08-06-ADMIN-MFA-PLAN.md`).
- Tests that touch `breach-check.service.js` must never make a real network call — mock `global.fetch`, matching this codebase's existing offline-test philosophy (`mongodb-memory-server` instead of a real DB, no live SMTP in tests).

---

### Task 1: Dependabot config

**Files:**
- Create: `.github/dependabot.yml`

**Interfaces:** None — standalone GitHub-native config, nothing else in the repo references it.

- [ ] **Step 1: Write the config**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    target-branch: "main"
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"
```

Major version bumps are intentionally left out of the group — they get their own individual PR since they're more likely to need manual review (breaking changes).

- [ ] **Step 2: Validate structure**

Compare against GitHub's documented schema (top-level `version: 2`, `updates` array, each entry needs `package-ecosystem` + `directory` + `schedule`). There's no local linter for this file — GitHub validates it server-side on the first scheduled run or on push. Confirm indentation is consistent (2 spaces) and there are no tabs.

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "chore(deps): wire up Dependabot for weekly npm update PRs"
```

---

### Task 2: Sliding session expiry

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `AUTH_SECRET` env var (same secret `session.js` signs with); the `cya-session` cookie's existing JWT shape (`sub`, `name`, `email`, `tv` claims — see `src/server/middleware/session.js:19-28`).
- Produces: no new exports — this is an internal addition to the existing `proxy()` function.

- [ ] **Step 1: Add the jose import and sliding-refresh helper**

In `src/proxy.ts`, add the import at the top:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";
```

Add these constants and the helper function, after the `isDev` line and before `export function proxy`:

```ts
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
```

- [ ] **Step 2: Call the helper from `proxy()`**

Change the function signature to `async` and call the helper before returning:

```ts
export async function proxy(req: NextRequest) {
```

Add the call right before `return res;` (after the existing CSRF self-heal block):

```ts
  await refreshSessionIfHalfExpired(req, res);

  return res;
```

- [ ] **Step 3: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS, unchanged (proxy.ts has no `node:test` coverage — see Global Constraints; this step just confirms the edit didn't break anything else in the same module graph).

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(auth): slide cya-session expiry forward on activity"
```

---

### Task 3: `style-src` CSP hardening

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:** None new — purely a change to the CSP header string `proxy()` already builds.

- [ ] **Step 1: Split the style-src line**

In `src/proxy.ts`, inside the `csp` array, replace:

```ts
    // next/font and Tailwind inject inline <style> a nonce can't reach, so style
    // keeps 'unsafe-inline'. Style-based XSS is far weaker than script.
    "style-src 'self' 'unsafe-inline'",
```

with:

```ts
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
```

- [ ] **Step 2: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS, unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "fix(security): harden style-src-elem, keep style-src-attr for animation"
```

---

### Task 4: Breached-password check service

**Files:**
- Create: `src/server/services/breach-check.service.js`
- Test: `tests/breach-check.test.mjs`

**Interfaces:**
- Produces: `isPasswordBreached(password: string): Promise<boolean>` — resolves `true` only on a confirmed match in the HIBP range response; resolves `false` on no match, a non-OK response, a network error, or a timeout (fails open). Task 5 imports this directly.

- [ ] **Step 1: Write the failing test**

Create `tests/breach-check.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { isPasswordBreached } from "../src/server/services/breach-check.service.js";

function mockFetchOnce(responseText, ok = true) {
  const original = global.fetch;
  global.fetch = async () => ({ ok, text: async () => responseText });
  return () => {
    global.fetch = original;
  };
}

test("isPasswordBreached flags a password whose hash suffix is in the HIBP response", async () => {
  const sha1 = crypto.createHash("sha1").update("password123").digest("hex").toUpperCase();
  const suffix = sha1.slice(5);
  const restore = mockFetchOnce(`${suffix}:3730471\nAAAA0000AAAA0000AAAA0000AAAA0000AAA:1`);
  try {
    assert.equal(await isPasswordBreached("password123"), true);
  } finally {
    restore();
  }
});

test("isPasswordBreached does not flag a password whose suffix is absent", async () => {
  const restore = mockFetchOnce(
    "AAAA0000AAAA0000AAAA0000AAAA0000AAA:1\nBBBB1111BBBB1111BBBB1111BBBB1111BBB:2"
  );
  try {
    assert.equal(await isPasswordBreached("some-random-safe-password"), false);
  } finally {
    restore();
  }
});

test("isPasswordBreached fails open when the request throws", async () => {
  const original = global.fetch;
  global.fetch = async () => {
    throw new Error("network down");
  };
  try {
    assert.equal(await isPasswordBreached("anything"), false);
  } finally {
    global.fetch = original;
  }
});

test("isPasswordBreached fails open on a non-OK response", async () => {
  const restore = mockFetchOnce("", false);
  try {
    assert.equal(await isPasswordBreached("anything"), false);
  } finally {
    restore();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/breach-check.test.mjs`
Expected: FAIL — `src/server/services/breach-check.service.js` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/server/services/breach-check.service.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/breach-check.test.mjs`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/server/services/breach-check.service.js tests/breach-check.test.mjs
git commit -m "feat(security): add HIBP k-anonymity breached-password check"
```

---

### Task 5: Wire the breach check into register and reset

**Files:**
- Modify: `src/server/services/auth.service.js`
- Modify: `src/server/services/password-reset.service.js`
- Modify: `tests/services.integration.test.mjs`

**Interfaces:**
- Consumes: `isPasswordBreached` from `@/server/services/breach-check.service` (Task 4).

- [ ] **Step 1: Write the failing integration test**

In `tests/services.integration.test.mjs`, add (near the other `auth.service` tests):

```js
test("registerUser rejects a breached password", async () => {
  const { registerUser } = await app();
  const crypto = await import("node:crypto");
  const password = "definitely-breached-pw";
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const suffix = sha1.slice(5);
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, text: async () => `${suffix}:99999` });
  try {
    await assert.rejects(
      registerUser({ name: "Grace", email: "breached@example.com", password }),
      /data breach/
    );
  } finally {
    global.fetch = originalFetch;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `registerUser` doesn't reject breached passwords yet (the mocked fetch response is ignored since nothing calls `fetch` from `registerUser`).

- [ ] **Step 3: Wire the check into `registerUser`**

In `src/server/services/auth.service.js`, add the import:

```js
import { isPasswordBreached } from "@/server/services/breach-check.service";
```

Add the check right after the length check (before `await dbConnect();`):

```js
  if (password.length < 8) throw new ApiError(400, "Password needs at least 8 characters.");
  if (await isPasswordBreached(password))
    throw new ApiError(400, "This password has appeared in a data breach. Please choose a different one.");

  await dbConnect();
```

- [ ] **Step 4: Wire the check into `completeReset`**

In `src/server/services/password-reset.service.js`, add the same import:

```js
import { isPasswordBreached } from "@/server/services/breach-check.service";
```

Add the check right after the length check (before `await dbConnect();`):

```js
  if (password.length < 8) throw new ApiError(400, "Password needs at least 8 characters.");
  if (await isPasswordBreached(password))
    throw new ApiError(400, "This password has appeared in a data breach. Please choose a different one.");

  await dbConnect();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS, including the new test.

- [ ] **Step 6: Run the full test suite to confirm no regression**

Verify no existing test passes a password that happens to be genuinely breached and now unexpectedly fails — the codebase's existing test passwords (`"supersecret"`, `"e2e-smoke-pass-1234"`, etc.) all go through the REAL (unmocked) `isPasswordBreached` in every OTHER test, which fails open on any network issue but would make a REAL network call in a normal test run. Check this explicitly:

Run: `npm test`
Expected: PASS, all tests (including the ones that call `registerUser`/`completeReset` with ordinary test passwords elsewhere in the suite). If any of those start failing intermittently, it means a test password genuinely matched HIBP's dataset or the real network call is slow/unreliable in this environment — if so, stop and add a `global.fetch` mock (return `{ok: false}`) in that test's own `before`/`beforeEach`, or in this file's shared `before()` hook, so the whole suite stays offline like `breach-check.test.mjs` does. Do not weaken the check itself to work around this.

- [ ] **Step 7: Commit**

```bash
git add src/server/services/auth.service.js src/server/services/password-reset.service.js tests/services.integration.test.mjs
git commit -m "feat(security): reject breached passwords on register and reset"
```

---

### Task 6: Update docs/SECURITY.md

**Files:**
- Modify: `docs/SECURITY.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Find and update the relevant sections**

Search `docs/SECURITY.md` for each of these and update:
- The CSRF/session "Recommended Improvement: sliding expiry / explicit refresh for long-lived sessions" line — mark implemented, briefly describe the half-life refresh via `proxy.ts`.
- The `style-src` `'unsafe-inline'` note (§8, CSP section) — update to describe the `style-src-elem`/`style-src-attr` split and why the base `style-src` fallback remains.
- Add a short note under Authentication or a new subsection: breached-password check via HIBP k-anonymity, applied to register + reset, fails open.
- If a Dependency Security section exists (§13 per the table of contents seen in earlier work), note Dependabot is now wired (not just `npm audit` in CI).

Since exact line numbers will have shifted from prior edits, grep first:

```bash
grep -n "sliding expiry\|unsafe-inline\|Dependabot\|breached" docs/SECURITY.md
```

Update each match's surrounding paragraph to reflect what Tasks 1-5 actually shipped, matching this doc's existing prose style (see how the MFA section was written in the prior plan's Task 8 for tone/format reference).

- [ ] **Step 2: Commit**

```bash
git add docs/SECURITY.md
git commit -m "docs(security): document sliding sessions, CSP split, breach check, Dependabot"
```

---

### Task 7: Final verification gate

**Files:** None — verification only.

- [ ] **Step 1: Full automated gate**

Run, in order:

```bash
npm run lint
npx tsc --noEmit
npm test
npm audit --audit-level=high
npm run build
npm run test:e2e
```

Expected: all six commands exit 0.

- [ ] **Step 2: Manual verification — sliding session expiry**

`proxy.ts` isn't unit-testable (Edge middleware, no `node:test` coverage — see Global Constraints), and waiting 15 real days isn't practical. Fabricate an already-half-expired token and confirm the middleware replaces it:

```bash
node --input-type=module -e "
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'local-dev-secret-change-me');
const now = Math.floor(Date.now() / 1000);
const halfExpiredIat = now - 16 * 24 * 60 * 60; // issued 16 days ago, past the 15-day half-life
const token = await new SignJWT({ name: 'Test', email: 'test@example.com', tv: 0 })
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject('000000000000000000000000')
  .setIssuedAt(halfExpiredIat)
  .setExpirationTime(halfExpiredIat + 30 * 24 * 60 * 60)
  .sign(secret);
console.log(token);
"
```

(Use the same `AUTH_SECRET` your local `.env`/`dev:local` session actually uses.) Then:
1. `npm run dev:local`, open the app in a browser, open DevTools → Application → Cookies.
2. Replace the `cya-session` cookie's value with the token printed above.
3. Reload any page.
4. Check the response headers for that request (Network tab) — confirm a `Set-Cookie: cya-session=...` header is present with a **new** value (different from what you pasted in), and decode its payload (e.g. paste into jwt.io, or `node --input-type=module -e "import {decodeJwt} from 'jose'; console.log(decodeJwt(process.argv[1]))" -- <token>`) to confirm `exp` is now ~30 days out again.
5. Reload once more immediately — confirm the cookie does **not** change again this time (a session well within its fresh first half shouldn't be re-signed every request).

- [ ] **Step 3: Manual verification — CSP**

1. `MONGO_URL=... AUTH_SECRET=... NEXT_PUBLIC_SITE_URL=... npm run build && npx next start`
2. Open the app in a real browser (not just curl) — visit `/login` (Aurora background animation) and `/dashboard` after logging in.
3. Open DevTools Console — confirm **zero** CSP violation errors.
4. Confirm the Aurora background and any other motion/animation elements render and animate normally (visual check — this is exactly the `style=""` usage `style-src-attr 'unsafe-inline'` was kept for).
5. Network tab → any document request → Response Headers → confirm `content-security-policy` contains all three: `style-src 'self' 'unsafe-inline'`, `style-src-elem 'self'`, `style-src-attr 'unsafe-inline'`.

- [ ] **Step 4: Manual verification — breached-password check**

1. On `/register`, attempt to create an account with password `password123` (well-known breached password). Confirm it's rejected with "This password has appeared in a data breach."
2. Register successfully with a strong, unique password. Confirm no false positive.
3. Repeat both checks on `/reset-password` with a valid (freshly requested) reset token.

Report back: all four items shipped, gate results, manual checklist results.

---

## Self-Review Notes

- **Spec coverage:** all four spec sections map to tasks (Dependabot → Task 1, sliding expiry → Task 2, CSP split → Task 3, breach check → Tasks 4-5). Docs update and final gate are Tasks 6-7, matching the spec's Testing/Files-touched sections.
- **Type consistency checked:** `isPasswordBreached(password: string): Promise<boolean>` signature is identical between Task 4's implementation, Task 4's tests, and Task 5's two call sites.
- **File-conflict handling:** Tasks 2 and 3 both edit `src/proxy.ts` — Task 3's diff is written against the exact post-Task-2 state of the file (confirmed by reading the full resulting file before writing Task 3's steps), not the original.
