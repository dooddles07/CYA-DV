# Admin MFA (TOTP) — Design

## Context

`docs/SECURITY.md` §17 flags "no MFA" as a known, deliberate gap with the recommendation: *"TOTP or email-code second factor for admin accounts."* Admin access today has two paths, neither with a second factor:

1. **Portal passphrase** — `ADMIN_PORTAL_PASSWORD`, a single shared secret, issues an 8-hour `cya-admin` JWT (`admin-auth.controller.js`).
2. **Admin-role member account** — normal email/password login, `role: "admin"` on the `User` document, issues a 30-day `cya-session` JWT (`auth.controller.js`).

This spec adds TOTP-based MFA to both paths.

## Goals

- Second factor required before either admin path issues a full session.
- Zero added cost: no paid SMS/auth SaaS. One new npm dependency (`qrcode`, MIT, for QR rendering) — everything else uses `node:crypto` already in the dependency tree.
- Self-service enrollment and recovery (backup codes) — no operator/DB intervention needed for the common case.
- No behavior change for non-admin members.

## Non-goals

- Per-person accounts for the portal-passphrase path (out of scope — that's a separate redesign of the shared-secret model, not an MFA add-on).
- SMS/push-based factors.
- Changing session lifetimes (`cya-session` 30d, `cya-admin` 8h stay as-is).

## Decisions

| Question | Decision | Why |
|---|---|---|
| Scope | Both admin paths | Passphrase is the weaker credential (one secret, many holders); admin-role accounts are the higher-privilege target. Full coverage is most consistent. |
| Method | TOTP (authenticator app) | Stronger than email-code — works offline, not phishable via mailbox compromise. |
| TOTP implementation | Hand-rolled RFC 6238 on `node:crypto` | Matches house style (no `otplib`/schema-lib dependencies elsewhere in the codebase); TOTP is ~60 lines of HMAC-SHA1 + base32, well within "necessary" for a security-critical, easily-tested primitive. |
| QR rendering | `qrcode` npm package, server-side only | Rendered to a data-URL PNG inside the enroll response — the library never ships to the client bundle. Small, zero-cost, meaningfully better enrollment UX than manual-entry-only. |
| Recovery | 10 one-time backup codes, hashed at rest | Self-service, same pattern as password-reset tokens (SHA-256 hash stored, plaintext shown once). |
| Portal secret model | One shared `ADMIN_PORTAL_TOTP_SECRET` env var, optional | Matches the portal's existing shared-secret design (Non-goals). Unset → portal MFA step is skipped, same opt-in pattern as `VAPID_*`/`SMTP_*` — ships without forcing an immediate operator action. |

## Data model

`src/server/models/user.model.js` — new fields (populated only for `role: "admin"`):

| Field | Type | Purpose |
|---|---|---|
| `totpSecret` | String | AES-256-GCM ciphertext of the confirmed base32 secret |
| `totpSecretPending` | String | Same encryption, holds the secret during enrollment before the first code is confirmed |
| `totpEnabled` | Boolean, default `false` | Gates whether login goes to enroll or verify |
| `backupCodeHashes` | [String] | SHA-256 hex digests; array shrinks as codes are consumed |

**Encryption at rest:** `totpSecret`/`totpSecretPending` are encrypted, not stored as plaintext base32, so a DB-only compromise doesn't hand over live codes. Key is derived once via `crypto.createHash("sha256").update(AUTH_SECRET + ":totp-enc").digest()` (32 bytes, no new secret to provision) — reuses the same trust boundary that already protects session JWTs. Stored format: `iv:authTag:ciphertext`, all hex, single string field.

Portal secret: `ADMIN_PORTAL_TOTP_SECRET` env var, base32, provisioned by whoever runs the deploy (shared out-of-band, same as `ADMIN_PORTAL_PASSWORD` already is).

## TOTP engine

New `src/server/utils/totp.js`, zero new dependencies:

- `generateSecret()` — `crypto.randomBytes(20)` → base32 encode (RFC 4648, no padding). Needs a small hand-rolled base32 codec (encode + decode, ~20 lines) since Node has no built-in one.
- `totpCode(secretBase32, time = Date.now())` — HOTP (RFC 4226) over `floor(time / 30000)`, HMAC-SHA1, dynamic truncation, 6 digits.
- `verifyTotp(secretBase32, code, window = 1)` — checks the current step and ±1 adjacent step (±30s clock drift tolerance); compares digit strings with `crypto.timingSafeEqual` (equal-length buffers) to avoid timing leaks.
- `otpauthUri(secretBase32, label)` — builds `otpauth://totp/CYA%20Daily%20Verse:<label>?secret=...&issuer=CYA%20Daily%20Verse&digits=6&period=30`.

Small `crypto-enc.js` (or inline in `totp.js`) for the AES-256-GCM encrypt/decrypt helpers described above.

Backup codes: `crypto.randomBytes(5).toString("hex")` (10 hex chars), displayed as `XXXXX-XXXXX`; hashed via SHA-256 (dash stripped) before storage, same helper pattern as `password-reset.service.js`'s token hashing.

## Auth flow — pending-session pattern

Neither login path issues a full session on primary-credential success anymore when MFA applies. A new short-lived `cya-mfa-pending` cookie (jose-signed with `AUTH_SECRET`, 10 min `maxAge`, `httpOnly`, `secure` in prod, `sameSite: lax`) carries `{ sub, kind: "member" | "portal", purpose: "enroll" | "verify" }`.

New `src/server/middleware/mfa-pending.js` mirrors `session.js`'s shape: `createMfaPending()`, `getMfaPending()`, `destroyMfaPending()`.

**`auth.controller.js login()`:**
- `role !== "admin"` — unchanged, issues `cya-session` immediately.
- `role === "admin"` — issues `cya-mfa-pending` instead: `purpose: "enroll"` if `!totpEnabled`, else `purpose: "verify"`. Response: `{ mfaSetupRequired: true }` or `{ mfaRequired: true }` in place of the normal success body.

**`admin-auth.controller.js portalLogin()`:**
- `ADMIN_PORTAL_TOTP_SECRET` unset — unchanged, issues `cya-admin` immediately.
- Set — issues `cya-mfa-pending` (`kind: "portal"`, `purpose: "verify"`) instead. Response: `{ mfaRequired: true }`.

## New endpoints

`src/server/controllers/mfa.controller.js`, routed under `/api/auth/mfa/*`. Every endpoint requires a valid `cya-mfa-pending` cookie (401 otherwise) and is rate-limited via the existing `rateLimit()` middleware.

| Route | Rate limit | Behavior |
|---|---|---|
| `POST /api/auth/mfa/enroll` | `auth:mfa-enroll` 5/15min | Requires `purpose: "enroll"`. Generates secret + 10 backup codes, stores encrypted secret in `totpSecretPending` + hashed codes. Returns `{ otpauthUri, qrDataUrl, backupCodes }` — backup codes shown once, here only. |
| `POST /api/auth/mfa/enroll/confirm` | `auth:mfa-enroll-confirm` 5/15min | Body `{ code }`. Verifies against `totpSecretPending`; on success promotes it to `totpSecret`, sets `totpEnabled = true`, clears the pending field, issues the real `cya-session`, destroys the pending cookie. |
| `POST /api/auth/mfa/verify` | `auth:mfa-verify` 8/15min | Body `{ code }` or `{ backupCode }`. Requires `purpose: "verify"`. Verifies TOTP window match or consumes a matching backup-code hash; on success issues the real session (`cya-session` for `kind: "member"`, `cya-admin` for `kind: "portal"`) and destroys the pending cookie. |

All three reuse the existing `ApiError`/`toResponse` error pattern; wrong code returns `401` with a generic message (no distinction between "wrong code" and "no such user" — avoids enumeration).

## Client changes

- `/login` and `/admin-portal` pages: branch on the login response — `mfaSetupRequired` → navigate to `/admin/mfa-setup`; `mfaRequired` → navigate to `/admin/mfa-verify`; otherwise unchanged (normal redirect).
- New `src/app/(site)/admin/mfa-setup/` — outside the `(admin)` route group (deliberately: at this point there is no real session, only the pending cookie, so the `(admin)` layout's `isAdmin()` page-level gates would incorrectly redirect it away). Calls `enroll` on mount, renders the QR image + manual key fallback + the 10 backup codes behind an "I've saved these" confirm gate, then a 6-digit input that calls `enroll/confirm`. On success, redirects to the normal post-login admin destination.
- New `src/app/(site)/admin/mfa-verify/` — same placement reasoning. 6-digit input plus a "use a backup code instead" toggle, calls `verify`. Server infers `kind` from the pending cookie, so one page serves both the member-admin and portal flows; redirect target after success matches whichever flow it was (`/admin` for member, existing portal destination for portal).
- Both new pages redirect to `/login` immediately if no valid pending cookie is present (mirrors existing auth-gate patterns elsewhere in the app).

## CSRF

No changes needed. `ensureCsrfCookie()` already mints `cya-csrf` for every visitor on first page view (per the CSRF-coverage fix already shipped), so it's present before the pending-cookie flow even starts. All three new endpoints are state-changing and get `verifyCsrf(req)` at the top, same as every other mutating controller.

## Rollout

- Existing admin-role accounts: `totpEnabled` defaults `false` → first login after deploy is automatically routed to enrollment. No migration script, no forced-logout of existing sessions (their current `cya-session` stays valid until it expires or `tokenVersion` bumps; MFA only gates the *next* login).
- Portal MFA is off until an operator sets `ADMIN_PORTAL_TOTP_SECRET` — documented as a follow-up step in `DEPLOYMENT.md`/`SECURITY.md` with a one-liner generation command, matching the existing `.env.example` style for `AUTH_SECRET`/`CRON_SECRET`.

## Testing

- **Unit** (`tests/totp.test.mjs`): base32 encode/decode round-trip; `totpCode`/`verifyTotp` against published RFC 6238 test vectors; window-tolerance edge cases (step boundary ±1); AES-256-GCM encrypt/decrypt round-trip.
- **Integration** (extend `tests/services.integration.test.mjs`): enroll → confirm → session issued; wrong code at confirm rejected, `totpSecretPending` untouched; verify with valid TOTP code issues session; verify with a backup code consumes it (second use of the same code fails).
- **E2E** (extend `tests/e2e/smoke.spec.ts` or a new spec): promote a test user to `role: "admin"`, log in, complete enrollment (read the QR/secret from the API response rather than image-decoding), submit the first TOTP code, land on the admin dashboard.

## Files touched (new)

`src/server/utils/totp.js`, `src/server/middleware/mfa-pending.js`, `src/server/controllers/mfa.controller.js`, `src/server/routes/mfa.routes.js`, `src/app/api/auth/mfa/enroll/route.js`, `src/app/api/auth/mfa/enroll/confirm/route.js`, `src/app/api/auth/mfa/verify/route.js`, `src/app/(site)/admin/mfa-setup/*`, `src/app/(site)/admin/mfa-verify/*`, `tests/totp.test.mjs`.

## Files touched (modified)

`src/server/models/user.model.js`, `src/server/controllers/auth.controller.js`, `src/server/controllers/admin-auth.controller.js`, `.env.example`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `tests/services.integration.test.mjs`, `tests/e2e/smoke.spec.ts`, `package.json` (add `qrcode`).
