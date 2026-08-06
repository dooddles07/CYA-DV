# Admin MFA (TOTP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a TOTP second factor before either admin login path (portal passphrase or admin-role member account) issues a full session.

**Architecture:** A hand-rolled RFC 6238 TOTP engine (`node:crypto` only) backs a pending-session cookie pattern — primary credential check succeeds → short-lived `cya-mfa-pending` cookie issued instead of the real session cookie → a code (or backup code) is verified against it → the real session is issued and the pending cookie destroyed.

**Tech Stack:** Next.js 16 App Router, MongoDB/Mongoose, `jose` (JWT), `node:crypto` (TOTP + AES-256-GCM), `qrcode` (new dependency, server-side QR rendering only), `node:test` (unit/integration), Playwright (E2E).

**Spec:** [docs/superpowers/specs/2026-08-06-ADMIN-MFA-DESIGN.md](../specs/2026-08-06-ADMIN-MFA-DESIGN.md)

## Global Constraints

- Zero added infrastructure cost: no paid SMS/auth SaaS. Exactly one new npm dependency (`qrcode`, MIT) — everything else uses `node:crypto`, already in the tree.
- No `otplib` or any TOTP library — TOTP/HOTP/base32 are hand-rolled per the spec's decision to match house style (no schema/crypto libs elsewhere in the codebase).
- Non-admin member login (`role !== "admin"`) must be behaviorally unchanged — same request/response shape, same `createSession()` call, no new fields required.
- Existing tests (`tests/services.integration.test.mjs`, `tests/e2e/smoke.spec.ts`) must stay green after every task.
- Every new mutating endpoint gets `verifyCsrf(req)` and `rateLimit(req, ...)`, matching the pattern already used across the codebase (see `src/server/controllers/prayer.controller.js` for the canonical shape).
- New/modified `.md` files use ALL-CAPS naming per project convention (already applied to this plan and its spec).
- Controllers in this codebase (anything touching `next/headers` cookies) are **not** unit-tested directly — only services are (see `tests/services.integration.test.mjs` testing `auth.service.js`, not `auth.controller.js`). Controller-level correctness is verified by the Playwright E2E suite. Follow this boundary — don't invent a new testing pattern for the new controller.
- Per-task verification: `npm run lint` and `npx tsc --noEmit` must be clean, `npm test` must stay green. Final gate (Task 8): `npm run build` and `npm run test:e2e` must both pass.

---

### Task 1: TOTP crypto engine

**Files:**
- Create: `src/server/utils/totp.js`
- Test: `tests/totp.test.mjs`

**Interfaces:**
- Produces: `base32Encode(buffer: Buffer): string`, `base32Decode(input: string): Buffer`, `generateSecret(): string`, `hotpCode(secretBase32: string, counter: number): string`, `totpCode(secretBase32: string, time?: number): string`, `verifyTotp(secretBase32: string, code: string, opts?: { window?: number, time?: number }): boolean`, `otpauthUri(secretBase32: string, label: string): string`, `encryptSecret(plainBase32: string): string`, `decryptSecret(packed: string): string`. All later tasks import from `@/server/utils/totp` (or a relative path in tests).

- [ ] **Step 1: Write the failing test**

Create `tests/totp.test.mjs`:

```js
import test, { before } from "node:test";
import assert from "node:assert/strict";
import {
  base32Encode,
  base32Decode,
  generateSecret,
  hotpCode,
  totpCode,
  verifyTotp,
  otpauthUri,
  encryptSecret,
  decryptSecret,
} from "../src/server/utils/totp.js";

before(() => {
  process.env.AUTH_SECRET = "test-secret-for-totp-unit-tests";
});

// --- base32 (RFC 4648 §10 test vectors) -------------------------------------

test("base32Encode matches RFC 4648 test vectors", () => {
  assert.equal(base32Encode(Buffer.from("")), "");
  assert.equal(base32Encode(Buffer.from("f")), "MY");
  assert.equal(base32Encode(Buffer.from("fo")), "MZXQ");
  assert.equal(base32Encode(Buffer.from("foo")), "MZXW6");
  assert.equal(base32Encode(Buffer.from("foob")), "MZXW6YQ");
  assert.equal(base32Encode(Buffer.from("fooba")), "MZXW6YTB");
  assert.equal(base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
});

test("base32Decode reverses base32Encode", () => {
  const raw = Buffer.from("foobar");
  assert.equal(base32Decode(base32Encode(raw)).toString(), "foobar");
});

test("generateSecret returns a 20-byte decodable base32 string", () => {
  const secret = generateSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.equal(base32Decode(secret).length, 20);
});

// --- HOTP (RFC 4226 Appendix D test vectors) --------------------------------

const RFC4226_SECRET = base32Encode(Buffer.from("12345678901234567890"));
const RFC4226_CODES = [
  "755224", "287082", "359152", "969429", "338314",
  "254676", "287922", "162583", "399871", "520489",
];

test("hotpCode matches RFC 4226 Appendix D test vectors", () => {
  RFC4226_CODES.forEach((expected, counter) => {
    assert.equal(hotpCode(RFC4226_SECRET, counter), expected);
  });
});

// --- TOTP --------------------------------------------------------------------

test("totpCode derives the 30-second counter from the given time", () => {
  assert.equal(totpCode(RFC4226_SECRET, 0), hotpCode(RFC4226_SECRET, 0));
  assert.equal(totpCode(RFC4226_SECRET, 30_000), hotpCode(RFC4226_SECRET, 1));
});

test("verifyTotp accepts the current code and adjacent-window codes only", () => {
  const secret = generateSecret();
  const time = 1_700_000_000_000;
  const counter = Math.floor(time / 30_000);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter), { time }), true);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter - 1), { time }), true);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter + 1), { time }), true);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter - 2), { time }), false);
});

test("verifyTotp rejects malformed input", () => {
  const secret = generateSecret();
  assert.equal(verifyTotp(secret, "abcdef", {}), false);
  assert.equal(verifyTotp(secret, "12345", {}), false);
  assert.equal(verifyTotp(secret, "", {}), false);
});

test("otpauthUri encodes issuer, label, and secret", () => {
  const uri = otpauthUri("JBSWY3DPEHPK3PXP", "admin@example.com");
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /secret=JBSWY3DPEHPK3PXP/);
  assert.match(uri, /issuer=CYA/);
});

// --- Encryption at rest ------------------------------------------------------

test("encryptSecret/decryptSecret round-trip", () => {
  const secret = generateSecret();
  const packed = encryptSecret(secret);
  assert.notEqual(packed, secret);
  assert.equal(decryptSecret(packed), secret);
});

test("decryptSecret rejects a tampered ciphertext", () => {
  const packed = encryptSecret(generateSecret());
  const [iv, tag, data] = packed.split(":");
  const tampered = [iv, tag, data.slice(0, -2) + "00"].join(":");
  assert.throws(() => decryptSecret(tampered));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/totp.test.mjs`
Expected: FAIL — `src/server/utils/totp.js` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/server/utils/totp.js`:

```js
import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_MS = 30_000;
const DIGITS = 6;

export function base32Encode(buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  const remainder = bits.length % 5;
  if (remainder) {
    const chunk = bits.slice(bits.length - remainder).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
}

export function base32Decode(input) {
  const clean = String(input ?? "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/** RFC 4226 HOTP: HMAC-SHA1 over an 8-byte big-endian counter, dynamic truncation. */
export function hotpCode(secretBase32, counter) {
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** RFC 6238 TOTP: HOTP over the 30-second step counter. */
export function totpCode(secretBase32, time = Date.now()) {
  return hotpCode(secretBase32, Math.floor(time / STEP_MS));
}

/**
 * Verifies a submitted code against the current step and `window` adjacent
 * steps (default ±1, i.e. ±30s clock drift tolerance). Digit comparison is
 * timing-safe.
 */
export function verifyTotp(secretBase32, code, { window = 1, time = Date.now() } = {}) {
  const clean = String(code ?? "").trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(time / STEP_MS);
  const submitted = Buffer.from(clean);
  for (let delta = -window; delta <= window; delta++) {
    const candidate = Buffer.from(hotpCode(secretBase32, counter + delta));
    if (candidate.length === submitted.length && crypto.timingSafeEqual(candidate, submitted))
      return true;
  }
  return false;
}

export function otpauthUri(secretBase32, label) {
  const issuer = "CYA Daily Verse";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return crypto.createHash("sha256").update(`${secret}:totp-enc`).digest();
}

/** AES-256-GCM encrypt, packed as `iv:authTag:ciphertext` (all hex). */
export function encryptSecret(plainBase32) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainBase32, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(packed) {
  const [ivHex, tagHex, dataHex] = String(packed ?? "").split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted TOTP secret.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return plain.toString("utf8");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/totp.test.mjs`
Expected: PASS, all 11 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/server/utils/totp.js tests/totp.test.mjs
git commit -m "feat(mfa): add hand-rolled RFC 6238 TOTP engine"
```

---

### Task 2: User model MFA fields + `mfa.service.js`

**Files:**
- Modify: `src/server/models/user.model.js`
- Create: `src/server/services/mfa.service.js`
- Modify: `tests/services.integration.test.mjs`
- Modify: `package.json` (add `qrcode` dependency)

**Interfaces:**
- Consumes: `generateSecret`, `hotpCode`, `totpCode`, `verifyTotp`, `otpauthUri`, `encryptSecret`, `decryptSecret` from `@/server/utils/totp` (Task 1); `User` model; `ApiError` from `@/server/utils/api-error`; `dbConnect` from `@/server/config/db`.
- Produces: `beginEnrollment(userId: string): Promise<{ otpauthUri: string, qrDataUrl: string, backupCodes: string[] }>`, `confirmEnrollment(userId: string, code: string): Promise<{ id, name, email, tokenVersion }>`, `verifyMemberCode(userId: string, { code?: string, backupCode?: string }): Promise<{ id, name, email, tokenVersion }>`, `verifyPortalCode({ code: string }): boolean`. Tasks 4–6 call these directly. The returned `{ id, name, email, tokenVersion }` shape matches what `createSession()` (`src/server/middleware/session.js`) already expects — same shape `loginUser()` returns today.

- [ ] **Step 1: Add MFA fields to the User schema**

In `src/server/models/user.model.js`, add after the existing `role` field (after line 13):

```js
    // TOTP secret, AES-256-GCM encrypted (see src/server/utils/totp.js).
    // Populated once MFA enrollment starts; only trusted once totpEnabled is true.
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },
    // SHA-256 hashes of unused one-time backup codes; entries are removed on use.
    backupCodeHashes: { type: [String], default: [] },
```

- [ ] **Step 2: Add the `qrcode` dependency**

Run: `npm install qrcode`
Expected: `package.json` `dependencies` gains `"qrcode": "^1.5.4"` (or latest 1.x).

- [ ] **Step 3: Write the failing integration test**

In `tests/services.integration.test.mjs`, extend the `before()` hook (near the top) to also set `AUTH_SECRET` — `mfa.service.js` needs it to encrypt/decrypt secrets, and it isn't set anywhere else in this test file today:

```js
before(async () => {
  process.env.AUTH_SECRET = "test-secret-for-integration-tests";
  mem = await MongoMemoryServer.create();
  process.env.MONGO_URL = mem.getUri();
  const { dbConnect } = await import("@/server/config/db.js");
  await dbConnect();
});
```

Extend the `app()` loader to include the new service:

```js
async function app() {
  if (mod) return mod;
  const [auth, user, users, dates, model, mfa] = await Promise.all([
    import("@/server/services/auth.service.js"),
    import("@/server/services/user.service.js"),
    import("@/server/services/user.service.js"),
    import("@/server/utils/dates.js"),
    import("@/server/models/user.model.js"),
    import("@/server/services/mfa.service.js"),
  ]);
  mod = { ...auth, ...user, ...users, ...dates, User: model.User, ...mfa };
  return mod;
}
```

Add these tests (near the existing `--- auth.service ---` section, after the `loginUser` test):

```js
// --- mfa.service -----------------------------------------------------------

test("beginEnrollment stores an encrypted secret and returns 10 backup codes", async () => {
  const { registerUser, setUserRole, beginEnrollment } = await app();
  const u = await registerUser({ name: "Ada", email: "ada@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  const enrollment = await beginEnrollment(u.id);
  assert.match(enrollment.otpauthUri, /^otpauth:\/\/totp\//);
  assert.equal(enrollment.backupCodes.length, 10);
});

test("beginEnrollment rejects a non-admin account", async () => {
  const { registerUser, beginEnrollment } = await app();
  const u = await registerUser({ name: "Mem", email: "member@example.com", password: "supersecret" });
  await assert.rejects(beginEnrollment(u.id), /admin accounts only/);
});

test("confirmEnrollment accepts the current TOTP code and enables MFA", async () => {
  const { registerUser, setUserRole, beginEnrollment, confirmEnrollment, User } = await app();
  const { decryptSecret, totpCode } = await import("@/server/utils/totp.js");
  const u = await registerUser({ name: "Ada", email: "ada2@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  await beginEnrollment(u.id);

  const stored = await User.findById(u.id);
  const code = totpCode(decryptSecret(stored.totpSecret));
  await confirmEnrollment(u.id, code);

  const after = await User.findById(u.id);
  assert.equal(after.totpEnabled, true);
});

test("confirmEnrollment rejects a wrong code", async () => {
  const { registerUser, setUserRole, beginEnrollment, confirmEnrollment } = await app();
  const u = await registerUser({ name: "Ada", email: "ada3@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  await beginEnrollment(u.id);
  await assert.rejects(confirmEnrollment(u.id, "000000"), /didn't match/);
});

test("verifyMemberCode consumes a backup code exactly once", async () => {
  const { registerUser, setUserRole, beginEnrollment, confirmEnrollment, verifyMemberCode, User } = await app();
  const { decryptSecret, totpCode } = await import("@/server/utils/totp.js");
  const u = await registerUser({ name: "Ada", email: "ada4@example.com", password: "supersecret" });
  await setUserRole(u.id, "admin");
  const { backupCodes } = await beginEnrollment(u.id);

  const stored = await User.findById(u.id);
  await confirmEnrollment(u.id, totpCode(decryptSecret(stored.totpSecret)));

  const code = backupCodes[0];
  await verifyMemberCode(u.id, { backupCode: code });
  await assert.rejects(verifyMemberCode(u.id, { backupCode: code }), /not valid/);
});

test("verifyPortalCode checks against ADMIN_PORTAL_TOTP_SECRET", async () => {
  const { verifyPortalCode } = await app();
  const { generateSecret, totpCode } = await import("@/server/utils/totp.js");
  const secret = generateSecret();
  process.env.ADMIN_PORTAL_TOTP_SECRET = secret;
  try {
    assert.equal(await verifyPortalCode({ code: totpCode(secret) }), true);
    await assert.rejects(verifyPortalCode({ code: "000000" }), /didn't match/);
  } finally {
    delete process.env.ADMIN_PORTAL_TOTP_SECRET;
  }
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/server/services/mfa.service.js` does not exist.

- [ ] **Step 5: Write the implementation**

Create `src/server/services/mfa.service.js`:

```js
import "server-only";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { dbConnect } from "@/server/config/db";
import { User } from "@/server/models/user.model";
import { ApiError } from "@/server/utils/api-error";
import {
  decryptSecret,
  encryptSecret,
  generateSecret,
  otpauthUri,
  verifyTotp,
} from "@/server/utils/totp";

const BACKUP_CODE_COUNT = 10;

const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");
const normalizeBackupCode = (code) => String(code ?? "").replace(/[^a-f0-9]/gi, "").toLowerCase();

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

function sessionShape(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, tokenVersion: user.tokenVersion ?? 0 };
}

/**
 * Starts (or restarts) enrollment for an admin-role account. The secret and
 * backup-code hashes are written immediately but inert — confirmEnrollment
 * is what flips totpEnabled, which is the actual gate login() checks.
 */
export async function beginEnrollment(userId) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");
  if (user.role !== "admin") throw new ApiError(403, "MFA enrollment is for admin accounts only.");

  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  user.totpSecret = encryptSecret(secret);
  user.backupCodeHashes = backupCodes.map((c) => hashCode(normalizeBackupCode(c)));
  user.totpEnabled = false;
  await user.save();

  const uri = otpauthUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(uri);
  return { otpauthUri: uri, qrDataUrl, backupCodes };
}

/** Verifies the first code and flips totpEnabled — the account is now MFA-protected. */
export async function confirmEnrollment(userId, code) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");
  if (!user.totpSecret) throw new ApiError(400, "Start enrollment first.");

  const secret = decryptSecret(user.totpSecret);
  if (!verifyTotp(secret, code)) throw new ApiError(401, "That code didn't match. Try again.");

  user.totpEnabled = true;
  await user.save();
  return sessionShape(user);
}

/** Verifies a TOTP code or consumes a single-use backup code for an already-enrolled account. */
export async function verifyMemberCode(userId, { code, backupCode } = {}) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user || !user.totpEnabled) throw new ApiError(401, "MFA is not set up for this account.");

  if (backupCode) {
    const target = hashCode(normalizeBackupCode(backupCode));
    const idx = user.backupCodeHashes.indexOf(target);
    if (idx === -1) throw new ApiError(401, "That backup code is not valid.");
    user.backupCodeHashes.splice(idx, 1);
    await user.save();
  } else {
    const secret = decryptSecret(user.totpSecret);
    if (!verifyTotp(secret, code)) throw new ApiError(401, "That code didn't match. Try again.");
  }

  return sessionShape(user);
}

/** Verifies a code against the single shared portal secret (no backup codes — see design doc). */
export async function verifyPortalCode({ code }) {
  const secret = process.env.ADMIN_PORTAL_TOTP_SECRET;
  if (!secret) throw new ApiError(503, "Portal MFA is not configured.");
  if (!verifyTotp(secret, code)) throw new ApiError(401, "That code didn't match. Try again.");
  return true;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS, all tests including the 6 new ones.

- [ ] **Step 7: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/server/models/user.model.js src/server/services/mfa.service.js tests/services.integration.test.mjs package.json package-lock.json
git commit -m "feat(mfa): add User MFA fields and mfa.service.js enrollment/verification"
```

---

### Task 3: Pending-session cookie middleware

**Files:**
- Create: `src/server/middleware/mfa-pending.js`
- Modify: `src/server/utils/admin-session.js` (add `portalMfaConfigured()`)

**Interfaces:**
- Consumes: `AUTH_SECRET` env var (same secret `session.js`/`admin-session.js` already use).
- Produces: `createMfaPending({ sub: string, kind: "member" | "portal", purpose: "enroll" | "verify" }): Promise<void>`, `getMfaPending(): Promise<{ sub, kind, purpose } | null>`, `destroyMfaPending(): Promise<void>`, `portalMfaConfigured(): boolean`. Task 4's controller and Tasks 5–6's login flows call these.

This task touches `next/headers` (`cookies()`), so — per the codebase's established boundary (see Global Constraints) — it is **not** directly unit-testable via `node:test`; it's mirrored byte-for-byte on `src/server/middleware/session.js`'s already-proven shape and is exercised end-to-end by Task 8's Playwright test.

- [ ] **Step 1: Add `portalMfaConfigured()`**

In `src/server/utils/admin-session.js`, add right after `portalConfigured()` (after line 21):

```js
/** True when an operator has provisioned a shared TOTP secret for the portal. */
export function portalMfaConfigured() {
  return Boolean(process.env.ADMIN_PORTAL_TOTP_SECRET);
}
```

- [ ] **Step 2: Create the pending-cookie middleware**

Create `src/server/middleware/mfa-pending.js`:

```js
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
```

- [ ] **Step 3: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS, unchanged from Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/server/middleware/mfa-pending.js src/server/utils/admin-session.js
git commit -m "feat(mfa): add pending-session cookie middleware"
```

---

### Task 4: MFA controller, routes, and API endpoints

**Files:**
- Create: `src/server/controllers/mfa.controller.js`
- Create: `src/server/routes/mfa.routes.js`
- Create: `src/app/api/auth/mfa/enroll/route.js`
- Create: `src/app/api/auth/mfa/enroll/confirm/route.js`
- Create: `src/app/api/auth/mfa/verify/route.js`

**Interfaces:**
- Consumes: `beginEnrollment`, `confirmEnrollment`, `verifyMemberCode`, `verifyPortalCode` from `@/server/services/mfa.service` (Task 2); `createMfaPending`, `getMfaPending`, `destroyMfaPending` from `@/server/middleware/mfa-pending` (Task 3); `createSession` from `@/server/middleware/session`; `createAdminSession` from `@/server/utils/admin-session`; `logAdminAction` from `@/server/utils/admin-audit`; `rateLimit` from `@/server/middleware/rate-limit`; `verifyCsrf` from `@/server/middleware/csrf`; `ApiError`/`toResponse` from `@/server/utils/api-error`.
- Produces: `enroll(req)`, `enrollConfirm(req)`, `verify(req)` — Next.js route handlers, wired to `POST /api/auth/mfa/enroll`, `POST /api/auth/mfa/enroll/confirm`, `POST /api/auth/mfa/verify`.

Per Global Constraints, this task has no dedicated `node:test` file (controllers aren't unit-tested in this codebase) — it's verified by lint/typecheck now and exercised end-to-end in Task 8.

- [ ] **Step 1: Write the controller**

Create `src/server/controllers/mfa.controller.js`:

```js
import "server-only";
import { NextResponse } from "next/server";
import {
  beginEnrollment,
  confirmEnrollment,
  verifyMemberCode,
  verifyPortalCode,
} from "@/server/services/mfa.service";
import { createSession } from "@/server/middleware/session";
import { createAdminSession } from "@/server/utils/admin-session";
import { createMfaPending, destroyMfaPending, getMfaPending } from "@/server/middleware/mfa-pending";
import { logAdminAction } from "@/server/utils/admin-audit";
import { rateLimit } from "@/server/middleware/rate-limit";
import { verifyCsrf } from "@/server/middleware/csrf";
import { ApiError, toResponse } from "@/server/utils/api-error";

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function enroll(req) {
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "auth:mfa-enroll", limit: 5, windowMs: 15 * 60_000 });
    const pending = await getMfaPending();
    if (!pending || pending.kind !== "member" || pending.purpose !== "enroll")
      throw new ApiError(401, "Sign in again to set up two-factor authentication.");
    return NextResponse.json(await beginEnrollment(pending.sub));
  } catch (err) {
    return toResponse(err, "Could not start MFA setup.");
  }
}

export async function enrollConfirm(req) {
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "auth:mfa-enroll-confirm", limit: 5, windowMs: 15 * 60_000 });
    const pending = await getMfaPending();
    if (!pending || pending.kind !== "member" || pending.purpose !== "enroll")
      throw new ApiError(401, "Sign in again to set up two-factor authentication.");
    const body = await readJson(req);
    const user = await confirmEnrollment(pending.sub, body.code);
    await destroyMfaPending();
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err, "Could not confirm that code.");
  }
}

export async function verify(req) {
  try {
    await verifyCsrf(req);
    await rateLimit(req, { name: "auth:mfa-verify", limit: 8, windowMs: 15 * 60_000 });
    const pending = await getMfaPending();
    if (!pending || pending.purpose !== "verify") throw new ApiError(401, "Sign in again.");
    const body = await readJson(req);

    if (pending.kind === "portal") {
      if (body.backupCode) throw new ApiError(400, "Backup codes aren't available for the portal login.");
      await verifyPortalCode({ code: body.code });
      await destroyMfaPending();
      await createAdminSession();
      await logAdminAction({
        action: "admin.portal-login",
        targetType: "admin-session",
        actorLabel: "admin-portal",
      });
      return NextResponse.json({ ok: true });
    }

    const user = await verifyMemberCode(pending.sub, { code: body.code, backupCode: body.backupCode });
    await destroyMfaPending();
    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err, "Could not verify that code.");
  }
}
```

- [ ] **Step 2: Write the routes file**

Create `src/server/routes/mfa.routes.js`:

```js
import { enroll, enrollConfirm, verify } from "@/server/controllers/mfa.controller";

export const startEnrollment = enroll; // POST /api/auth/mfa/enroll
export const confirmEnrollmentRoute = enrollConfirm; // POST /api/auth/mfa/enroll/confirm
export const verifyCode = verify; // POST /api/auth/mfa/verify
```

- [ ] **Step 3: Write the three route shims**

Create `src/app/api/auth/mfa/enroll/route.js`:

```js
export { startEnrollment as POST } from "@/server/routes/mfa.routes";
```

Create `src/app/api/auth/mfa/enroll/confirm/route.js`:

```js
export { confirmEnrollmentRoute as POST } from "@/server/routes/mfa.routes";
```

Create `src/app/api/auth/mfa/verify/route.js`:

```js
export { verifyCode as POST } from "@/server/routes/mfa.routes";
```

- [ ] **Step 4: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS, unchanged from Task 3.

- [ ] **Step 6: Commit**

```bash
git add src/server/controllers/mfa.controller.js src/server/routes/mfa.routes.js src/app/api/auth/mfa
git commit -m "feat(mfa): add enroll/confirm/verify API endpoints"
```

---

### Task 5: Wire admin-role member login into the pending-cookie flow

**Files:**
- Modify: `src/server/services/auth.service.js:28-39` (`loginUser`)
- Modify: `src/server/controllers/auth.controller.js:35-50` (`login`)

**Interfaces:**
- Consumes: `createMfaPending` from `@/server/middleware/mfa-pending` (Task 3).
- Produces: `loginUser()` now also returns `role: string` and `totpEnabled: boolean` on its resolved object — additive, does not change the existing `{ id, name, email, tokenVersion }` fields Task 2's tests and `createSession()` already rely on.

- [ ] **Step 1: Extend `loginUser()`'s returned shape**

In `src/server/services/auth.service.js`, change the `loginUser` return statement (line 38):

```js
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    tokenVersion: user.tokenVersion ?? 0,
    role: user.role,
    totpEnabled: Boolean(user.totpEnabled),
  };
```

- [ ] **Step 2: Run the existing test to confirm no regression**

Run: `npm test`
Expected: PASS — `tests/services.integration.test.mjs`'s `"loginUser accepts the right password and rejects the wrong one"` test only asserts `.email`, unaffected by the additive fields.

- [ ] **Step 3: Branch the login controller on role**

In `src/server/controllers/auth.controller.js`, add the import and change `login()`:

```js
import { createMfaPending } from "@/server/middleware/mfa-pending";
```

```js
export async function login(req) {
  try {
    // Throttles password guessing without locking out a legitimate user for long.
    await rateLimit(req, {
      name: "auth:login",
      limit: 10,
      windowMs: 15 * 60_000,
      message: "Too many sign-in attempts — please wait a few minutes and try again.",
    });
    const user = await loginUser(await readJson(req));

    if (user.role === "admin") {
      const purpose = user.totpEnabled ? "verify" : "enroll";
      await createMfaPending({ sub: user.id, kind: "member", purpose });
      return NextResponse.json(purpose === "enroll" ? { mfaSetupRequired: true } : { mfaRequired: true });
    }

    await createSession(user);
    return NextResponse.json({ user: { name: user.name, email: user.email } });
  } catch (err) {
    return toResponse(err);
  }
}
```

- [ ] **Step 4: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS, unchanged. (This branch is only reachable for `role === "admin"`, which no existing test creates via the controller — it's exercised in Task 8's E2E test.)

- [ ] **Step 6: Commit**

```bash
git add src/server/services/auth.service.js src/server/controllers/auth.controller.js
git commit -m "feat(mfa): route admin-role login through the MFA pending-session flow"
```

---

### Task 6: Wire portal-passphrase login into the pending-cookie flow

**Files:**
- Modify: `src/server/controllers/admin-auth.controller.js:12-35` (`portalLogin`)

**Interfaces:**
- Consumes: `portalMfaConfigured` from `@/server/utils/admin-session` (Task 3); `createMfaPending` from `@/server/middleware/mfa-pending` (Task 3).

- [ ] **Step 1: Branch the portal login controller**

In `src/server/controllers/admin-auth.controller.js`, update the imports:

```js
import {
  createAdminSession,
  destroyAdminSession,
  passphraseMatches,
  portalConfigured,
  portalMfaConfigured,
} from "@/server/utils/admin-session";
import { ApiError, toResponse } from "@/server/utils/api-error";
import { rateLimit } from "@/server/middleware/rate-limit";
import { logAdminAction } from "@/server/utils/admin-audit";
import { createMfaPending } from "@/server/middleware/mfa-pending";
```

Insert a branch right after the passphrase check succeeds, before the existing `createAdminSession()` call:

```js
    const body = await req.json().catch(() => ({}));
    if (!passphraseMatches(body.passphrase))
      throw new ApiError(401, "That passphrase is not correct.");

    if (portalMfaConfigured()) {
      await createMfaPending({ sub: "admin-portal", kind: "portal", purpose: "verify" });
      return NextResponse.json({ mfaRequired: true });
    }

    await createAdminSession();
    await logAdminAction({
      action: "admin.portal-login",
      targetType: "admin-session",
      actorLabel: "admin-portal",
    });
    return NextResponse.json({ ok: true });
```

The existing `createAdminSession()` + `logAdminAction()` lines are unchanged, just now reached only when `ADMIN_PORTAL_TOTP_SECRET` is unset — so deployments that haven't set it keep today's exact behavior.

- [ ] **Step 2: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS, unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/server/controllers/admin-auth.controller.js
git commit -m "feat(mfa): route portal login through the MFA pending-session flow when configured"
```

---

### Task 7: Client — MFA setup and verify pages, login-flow branching

**Files:**
- Create: `src/app/(site)/login/mfa-setup/page.tsx`
- Create: `src/app/(site)/login/mfa-setup/mfa-setup-client.tsx`
- Create: `src/app/(site)/login/mfa-verify/page.tsx`
- Create: `src/app/(site)/login/mfa-verify/mfa-verify-client.tsx`
- Modify: `src/components/auth-form.tsx`
- Modify: `src/app/(admin)/admin-portal/portal-client.tsx`

**Interfaces:**
- Consumes: `csrfHeader` from `@/lib/csrf`; `Button`, `Field`, `inputClass` from `@/components/ui`; `toast` from `@/components/toast`. API responses from Task 4's endpoints: `enroll` → `{ otpauthUri, qrDataUrl, backupCodes }`; `enrollConfirm`/`verify` → `{ user: { name, email } }` (member) or `{ ok: true }` (portal).

These pages live under `(site)`, not `(admin)` — at this point there is only a `cya-mfa-pending` cookie, no real session, so the `(admin)` layout's per-page `isAdmin()` gates would incorrectly redirect them away.

- [ ] **Step 1: Create the MFA verify page**

Create `src/app/(site)/login/mfa-verify/page.tsx`:

```tsx
import type { Metadata } from "next";
import { MfaVerifyClient } from "./mfa-verify-client";

export const metadata: Metadata = { title: "Verify sign-in" };

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/admin" } = await searchParams;
  // Only allow internal redirects, matching the same guard on /admin-portal.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <MfaVerifyClient next={safeNext} />
    </div>
  );
}
```

Create `src/app/(site)/login/mfa-verify/mfa-verify-client.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { toast } from "@/components/toast";
import { csrfHeader } from "@/lib/csrf";

export function MfaVerifyClient({ next }: { next: string }) {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !value) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(useBackup ? { backupCode: value } : { code: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not verify that code.");
        setBusy(false);
        return;
      }
      toast("Signed in", "success");
      router.push(data.user ? "/dashboard" : next);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="glass w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Verify it's you</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {useBackup
          ? "Enter one of your backup codes."
          : "Enter the 6-digit code from your authenticator app."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field label={useBackup ? "Backup code" : "Authentication code"} id="mfa-code" required error={error}>
          <input
            id="mfa-code"
            name="code"
            type="text"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            className={inputClass}
            placeholder={useBackup ? "xxxxx-xxxxx" : "123456"}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : "Verify"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setUseBackup((v) => !v);
            setValue("");
            setError("");
          }}
          className="w-full text-center text-sm font-bold text-primary-700 hover:underline"
        >
          {useBackup ? "Use your authenticator app instead" : "Use a backup code instead"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create the MFA setup page**

Create `src/app/(site)/login/mfa-setup/page.tsx`:

```tsx
import type { Metadata } from "next";
import { MfaSetupClient } from "./mfa-setup-client";

export const metadata: Metadata = { title: "Set up two-factor sign-in" };

export default function MfaSetupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <MfaSetupClient />
    </div>
  );
}
```

Create `src/app/(site)/login/mfa-setup/mfa-setup-client.tsx`:

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { toast } from "@/components/toast";
import { csrfHeader } from "@/lib/csrf";

type EnrollData = { otpauthUri: string; qrDataUrl: string; backupCodes: string[] };

export function MfaSetupClient() {
  const router = useRouter();
  const [data, setData] = useState<EnrollData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/mfa/enroll", { method: "POST", headers: csrfHeader() })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Could not start MFA setup.");
        if (alive) setData(body);
      })
      .catch((err) => alive && setLoadError(err instanceof Error ? err.message : "Could not start MFA setup."));
    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !code) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/enroll/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not confirm that code.");
        setBusy(false);
        return;
      }
      toast("Two-factor sign-in enabled", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
      setBusy(false);
    }
  };

  if (loadError)
    return (
      <div className="glass w-full max-w-md rounded-[2rem] p-8 text-center shadow-lift sm:p-10">
        <p className="text-sm font-semibold text-danger">{loadError}</p>
      </div>
    );

  if (!data)
    return (
      <div className="glass flex w-full max-w-md items-center justify-center rounded-[2rem] p-8 shadow-lift sm:p-10">
        <Loader2 className="h-6 w-6 animate-spin text-ink-faint" aria-hidden />
      </div>
    );

  return (
    <div className="glass w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Set up two-factor sign-in</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Admin accounts require an authenticator app. Scan this QR code, or enter the key manually.
      </p>

      {!saved ? (
        <div className="mt-6 space-y-5">
          <Image
            src={data.qrDataUrl}
            alt="Scan with your authenticator app"
            width={220}
            height={220}
            unoptimized
            className="mx-auto rounded-2xl border border-black/5"
          />
          <p className="break-all rounded-2xl bg-sky-soft p-4 text-center text-xs font-mono text-ink-soft">
            {new URL(data.otpauthUri).searchParams.get("secret")}
          </p>

          <div>
            <p className="text-sm font-bold text-ink">Backup codes</p>
            <p className="mt-1 text-xs text-ink-faint">
              Save these somewhere safe — each works once if you lose your device. They will not be
              shown again.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-sky-soft p-4 font-mono text-sm text-ink">
              {data.backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>

          <Button size="lg" className="w-full" onClick={() => setSaved(true)}>
            I&apos;ve saved my backup codes
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          <Field label="Authentication code" id="mfa-setup-code" required error={error}>
            <input
              id="mfa-setup-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={!!error}
              className={inputClass}
              placeholder="123456"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : "Confirm"}
          </Button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Branch `AuthForm`'s login submit**

In `src/components/auth-form.tsx`, in `onSubmit`, replace the success block (currently just `toast(...); router.push("/dashboard"); router.refresh();`) with:

```tsx
      if (isLogin && data.mfaSetupRequired) {
        router.push("/login/mfa-setup");
        return;
      }
      if (isLogin && data.mfaRequired) {
        router.push("/login/mfa-verify");
        return;
      }
      toast(isLogin ? "Welcome back!" : "Welcome to the family!", "success");
      router.push("/dashboard");
      router.refresh();
```

- [ ] **Step 4: Branch `PortalClient`'s login submit**

In `src/app/(admin)/admin-portal/portal-client.tsx`, replace the success block (currently `router.push(next); router.refresh();`) with:

```tsx
      if (data.mfaRequired) {
        router.push(`/login/mfa-verify?next=${encodeURIComponent(next)}`);
        return;
      }
      router.push(next);
      router.refresh();
```

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS, unchanged.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(site)/login/mfa-setup" "src/app/(site)/login/mfa-verify" src/components/auth-form.tsx "src/app/(admin)/admin-portal/portal-client.tsx"
git commit -m "feat(mfa): add MFA setup/verify pages and wire login flows to them"
```

---

### Task 8: E2E coverage, docs, and final verification gate

**Files:**
- Create: `scripts/seed-e2e-admin.mjs`
- Modify: `scripts/dev-local.mjs`
- Create: `tests/e2e/admin-mfa.spec.ts`
- Modify: `.env.example`
- Modify: `docs/SECURITY.md`
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:**
- Consumes: everything from Tasks 1–7. This is the integration/acceptance gate for the whole feature — no new interfaces produced.

There is currently **no** self-service way to create an admin-role account — `scripts/create-member.mjs` explicitly documents that it only ever creates plain members, and the only existing admin mechanism is the portal passphrase. `scripts/seed.mjs` is also run directly against production (`npm run seed`), so a fixture admin credential must never live there. Instead, add a new script that only `dev-local.mjs` ever invokes (confirmed local-only: it connects to the disposable in-memory Mongo instance, never `.env`/production).

- [ ] **Step 1: Create the dev-local admin fixture script**

Create `scripts/seed-e2e-admin.mjs`, mirroring `create-member.mjs`'s inline-schema pattern:

```js
/**
 * Seeds one fixture admin-role account for local dev and the Playwright E2E
 * suite. Only ever invoked by dev-local.mjs against the disposable in-memory
 * database (see its MONGO_URL argument) — never wired into `npm run seed`,
 * which also runs against production, so this credential never reaches a
 * real database.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["member", "admin"], default: "member" },
  },
  { timestamps: true, strict: false }
);

// Matched verbatim by tests/e2e/admin-mfa.spec.ts.
const EMAIL = "e2e-admin@example.com";
const PASSWORD = "e2e-admin-pass-1234";

async function main() {
  const url = process.env.MONGO_URL;
  if (!url) {
    console.error("MONGO_URL is not set.");
    process.exit(1);
  }

  await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });
  const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: EMAIL },
    { $set: { name: "E2E Admin", passwordHash, role: "admin", emailVerified: true } },
    { upsert: true }
  );
  console.log(`Admin fixture ready: ${EMAIL}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Admin fixture seed failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
```

- [ ] **Step 2: Wire it into `dev-local.mjs`**

In `scripts/dev-local.mjs`, right after the existing verse-seed line:

```js
// Seed verses (idempotent upsert — safe every boot).
await run("node", ["scripts/seed.mjs"], { MONGO_URL: uri });
```

add:

```js
// Seed the E2E/dev admin fixture (dev-local only — never wired into the
// production-facing `npm run seed` script).
await run("node", ["scripts/seed-e2e-admin.mjs"], { MONGO_URL: uri });
```

- [ ] **Step 3: Write the E2E spec**

Create `tests/e2e/admin-mfa.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { totpCode } from "../../src/server/utils/totp.js";

// Matches the fixture seeded by scripts/seed-e2e-admin.mjs (dev-local only).
const ADMIN_EMAIL = "e2e-admin@example.com";
const ADMIN_PASSWORD = "e2e-admin-pass-1234";

test("admin-role login enrolls in MFA, then a later login verifies it", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login\/mfa-setup/);
  const secret = (await page.locator("p.font-mono").first().textContent())?.trim();
  expect(secret).toBeTruthy();

  await page.getByRole("button", { name: /saved my backup codes/i }).click();
  await page.getByRole("textbox", { name: "Authentication code" }).fill(totpCode(secret!));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Second login: already enrolled, so this goes through verify, not setup.
  await page.request.post("/api/auth/logout");
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login\/mfa-verify/);
  await page.getByRole("textbox", { name: "Authentication code" }).fill(totpCode(secret!));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

This exercises the full round trip — `enroll` → `enroll/confirm` on first login, `verify` on the second — using the real QR secret rendered in the DOM (read as text, not image-decoded) and the Task 1 `totpCode()` function to compute a valid code exactly like a real authenticator app would.

- [ ] **Step 4: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS, including the new spec and the existing smoke spec.

- [ ] **Step 5: Update `.env.example`**

Add, after the existing `ADMIN_PORTAL_PASSWORD` block:

```
# Optional: shared TOTP secret for the admin portal's second factor. Unset =
# portal MFA is skipped (passphrase-only, today's behavior). Generate with:
#   node -e "const {generateSecret}=require('./src/server/utils/totp.js'); console.log(generateSecret())"
ADMIN_PORTAL_TOTP_SECRET=
```

- [ ] **Step 6: Update `docs/SECURITY.md`**

Find the "no MFA" gap note (§17 recommended-improvements list) and replace it with a short section describing what's now implemented: TOTP required for both admin paths, hand-rolled RFC 6238 on `node:crypto`, secrets AES-256-GCM encrypted at rest keyed from `AUTH_SECRET`, 10 one-time backup codes (member accounts only — portal MFA recovery is env-var rotation by an operator), rate-limited (`auth:mfa-enroll`/`auth:mfa-enroll-confirm` 5/15min, `auth:mfa-verify` 8/15min).

- [ ] **Step 7: Update `docs/DEPLOYMENT.md`**

Add a note under the admin-portal setup section: portal MFA is opt-in — set `ADMIN_PORTAL_TOTP_SECRET` and share it out-of-band with portal users the same way `ADMIN_PORTAL_PASSWORD` already is; admin-role accounts enroll automatically on first login after this feature ships, no operator action needed for that path.

- [ ] **Step 8: Full verification gate**

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

- [ ] **Step 9: Commit**

```bash
git add scripts/seed-e2e-admin.mjs scripts/dev-local.mjs tests/e2e/admin-mfa.spec.ts .env.example docs/SECURITY.md docs/DEPLOYMENT.md
git commit -m "test(mfa): add dev-local admin fixture and E2E coverage; docs: document admin MFA"
```

---

## Self-Review Notes

- **Spec coverage:** every "Files touched" entry from the design spec maps to a task above (data model → Task 2, TOTP engine → Task 1, pending-session pattern → Task 3, new endpoints → Task 4, auth flow changes → Tasks 5–6, client → Task 7, testing/docs → Task 8).
- **Type consistency checked:** `{ id, name, email, tokenVersion }` (the shape `createSession()` expects) is produced identically by `loginUser()` (existing), `confirmEnrollment()`, and `verifyMemberCode()` (Task 2) — verified all three call sites in Task 4/5 pass it straight to `createSession()` unmodified.
- **Deviation from spec, noted and justified:** the spec's data model listed a separate `totpSecretPending` field; the plan (Task 2) drops it in favor of writing directly to `totpSecret` gated by `totpEnabled` — same security properties (an unconfirmed secret can't be used because `login()`'s branch and `verifyMemberCode()`'s `purpose: "verify"` gate both depend on `totpEnabled`, not on the secret's mere presence), one fewer field, per YAGNI.
