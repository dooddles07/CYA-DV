# Security

Security architecture, controls, and operational guidance for **CYA Daily Verse** — a
Next.js 16 application (App Router) backed by MongoDB/Mongoose. This document is written from an
audit of the actual implementation. Features not yet in the codebase are labelled
**Recommended Improvement** and never presented as shipped.

Related design rationale: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`DATABASE.md`](./DATABASE.md),
[`API.md`](./API.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Table of contents

1. [Security Overview](#1-security-overview)
2. [Security Architecture](#2-security-architecture)
3. [Authentication](#3-authentication)
4. [Authorization](#4-authorization)
5. [Password Security](#5-password-security)
6. [Input Validation & Data Sanitization](#6-input-validation--data-sanitization)
7. [SQL / NoSQL Injection Prevention](#7-sql--nosql-injection-prevention)
8. [XSS Protection](#8-xss-cross-site-scripting-protection)
9. [CSRF Protection](#9-csrf-cross-site-request-forgery-protection)
10. [Secrets Management](#10-secrets-management)
11. [API Security](#11-api-security)
12. [Database Security](#12-database-security)
13. [Dependency Security](#13-dependency-security)
14. [Logging & Monitoring](#14-logging--monitoring)
15. [Secure Development Practices](#15-secure-development-practices)
16. [Deployment Security](#16-deployment-security)
17. [Security Checklist](#17-security-checklist)
18. [Reporting Security Issues](#18-reporting-security-issues)

---

## 1. Security Overview

### Purpose

This document tells three audiences what protects the application and where its edges are:
maintainers who extend it, reviewers who audit it, and evaluators judging engineering quality. It is
descriptive of the code as it exists, not aspirational.

### Security philosophy

- **Defence in depth.** No single control is trusted alone — transport, headers, session integrity,
  authorization, and input validation each stand on their own.
- **Least privilege.** Members see and mutate only their own data; admin surfaces sit behind a single
  gate; the DB user needs only application-scope rights.
- **Fail safely, degrade gracefully.** Session reads fail *open* on a DB blip to avoid mass logout;
  sensitive writes fail *closed*. Rate limiting falls back to in-memory when Mongo is unreachable
  rather than blocking real traffic.
- **Secure by default.** Secrets gate boot; production cookies are `secure`; CSP ships without
  `script-src 'unsafe-inline'`.
- **No secrets, no PII in the repo or logs.** Enforced by `.gitignore` and a single logging choke
  point.

### Application security goals

| Goal | Mechanism |
|---|---|
| Authenticate members | bcrypt password hash + signed JWT session cookie |
| Keep sessions revocable | `tokenVersion` re-checked against DB on every read |
| Protect account takeover surfaces | rate limiting, anti-enumeration, single-use tokens |
| Gate privileged actions | `assertAdmin()`, `emailVerified` checks, ownership checks |
| Resist injection & XSS | Mongoose queries, escaped regex, React escaping, strict CSP |
| Protect data in transit | HSTS, `upgrade-insecure-requests`, secure cookies |
| Give members data control | self-service export and delete |

### Threat model summary

| Threat | Exposure | Primary control |
|---|---|---|
| Credential stuffing / brute force | Login, forgot, verify endpoints | Per-IP rate limiting (Mongo-backed) |
| Session theft / replay | Session cookie | `httpOnly`, `secure`, `sameSite=lax`, `tokenVersion` revocation |
| Password database leak | `passwordHash` at rest | bcrypt cost 10; no plaintext ever stored |
| Account enumeration | `/api/auth/forgot` | Uniform response regardless of account existence |
| Reflected / stored XSS | Rendered content, emails | React escaping, nonce CSP, `escapeHtml` in mail |
| NoSQL injection | Search, query params | Mongoose casting, `escapeRegex`, `isValidObjectId` |
| Privilege escalation | Admin surfaces | `assertAdmin()` single gate; role cannot self-elevate |
| Secret disclosure | Env, cron, admin passphrase | env-only storage, timing-safe compares, `.gitignore` |
| Clickjacking | Any page | `X-Frame-Options: DENY`, `frame-ancestors 'none'` |
| IP spoofing to evade limits | `X-Forwarded-For` | Trusted-hop counting from the right |

**Out of scope / accepted:** shared admin-portal passphrase model (documented, ministry-operated);
platform-level DDoS (delegated to the hosting edge).

---

## 2. Security Architecture

The app is a single Next.js deployment. The browser talks only to Next.js; Next.js server code talks
to MongoDB and, optionally, SMTP and the Web Push service. There are no other inbound trust
boundaries.

```mermaid
flowchart LR
  subgraph Client["Browser (untrusted)"]
    UI[React UI / PWA]
  end
  subgraph Edge["Platform edge (TLS, proxy)"]
    P[HTTPS termination]
  end
  subgraph App["Next.js server (trusted)"]
    MW[proxy.ts CSP + nonce]
    RT[API routes]
    CT[Controllers - rate limit, auth gate]
    SV[Services - validation, business logic]
  end
  subgraph Data["Data & external (trusted network)"]
    DB[(MongoDB / Mongoose)]
    SMTP[SMTP - nodemailer]
    PUSH[Web Push - VAPID]
  end

  UI -->|HTTPS| P --> MW --> RT --> CT --> SV --> DB
  SV -.-> SMTP
  SV -.-> PUSH
```

### Trust boundaries

| Boundary | Left (untrusted) | Right (trusted) | Enforcement at the line |
|---|---|---|---|
| Browser → Edge | Client input, cookies, headers | TLS-terminated request | HTTPS, HSTS |
| Edge → App | `X-Forwarded-For` chain | Derived client IP | Trusted-hop counting |
| Route → Controller | Raw request | Authenticated/limited request | `rateLimit`, `getSession`, `assertAdmin` |
| Controller → Service | Request-shaped args | Validated domain args | Length/format/type validation |
| Service → DB | JS values | Mongoose-cast query | Schema casting, `isValidObjectId` |

### Security layers

- **Frontend** — React output escaping; PWA served same-origin; no secrets shipped to the client
  (only `NEXT_PUBLIC_*`). 3D/motion assets are static.
- **Backend** — layered `route → controller → service`; controllers own rate limiting and the auth
  gate, services own validation and data access. `server-only` import guards keep session/DB code out
  of client bundles.
- **API** — same-origin JSON; per-endpoint auth and rate-limit policy; typed `ApiError` responses
  that avoid leaking internals.
- **Database** — Mongoose schemas with typed fields, `maxlength`, enums, unique indexes, and TTL
  indexes for token/rate-bucket expiry.
- **External** — SMTP and Web Push are optional and fail soft; both use credentials held only in env.

---

## 3. Authentication

### Strategy

Stateless **JWT session cookie** signed with `jose` (HS256), plus a DB-checked revocation counter so
sessions are not purely stateless. Implemented in [`session.js`](../src/server/middleware/session.js).

### Login / session flow

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as API (auth.controller)
  participant S as auth.service
  participant D as MongoDB
  B->>A: POST /api/auth/login {email, password}
  A->>A: rateLimit auth:login 10/15m
  A->>S: loginUser()
  S->>D: findOne({email})
  S->>S: bcrypt.compare(password, hash)
  S-->>A: user or 401
  A->>A: createSession(user) -> sign JWT
  A-->>B: Set-Cookie cya-session (httpOnly)
```

### Token management

| Property | Value |
|---|---|
| Cookie name | `cya-session` |
| Algorithm | HS256 (`jose`) |
| Claims | `sub` (user id), `name`, `email`, `tv` (tokenVersion), `iat`, `exp` |
| `httpOnly` | Yes |
| `secure` | Yes in production (`NODE_ENV==="production"`) |
| `sameSite` | `lax` |
| `path` | `/` |
| Lifetime | 30 days |

### Session state & revocation

Every authenticated read re-reads the account's `tokenVersion` and compares it to the JWT's `tv`
claim. A mismatch invalidates the session. `tokenVersion` is incremented on password reset, so a
reset logs out **all** existing sessions.

- **Fail-open (default):** a DB outage during the revocation lookup keeps the session valid — avoids
  mass logout on a transient blip.
- **Fail-closed (`getSession({ strict: true })`):** used on auth-sensitive writes (account export,
  account delete) so a stale session cannot act during an outage.

### Access-token expiration & refresh

No refresh tokens. The 30-day cookie is re-issued on login, and slides forward on activity:
[`proxy.ts`](../src/proxy.ts) decodes the session JWT on every page navigation and, once it's past
the halfway point of its lifetime, re-signs it with a fresh 30-day expiry. This can't live in
`getSession()` itself — Next only allows `cookies().set()` inside a Server Action or Route Handler,
and `getSession()` is also called from plain Server Component renders. No absolute lifetime cap;
`tokenVersion` revocation still invalidates a session immediately regardless of how recently it was
refreshed.

### Account recovery

Self-service password reset by email (see [§5](#5-password-security)). Tokens are single-use,
hashed at rest, and expire in 60 minutes. The request endpoint is anti-enumeration (uniform
response).

### MFA

Required for both admin paths — a hand-rolled RFC 6238 TOTP implementation on `node:crypto`
([`totp.js`](../src/server/utils/totp.js)), no third-party auth library. Primary credential success
(password or portal passphrase) issues a short-lived `cya-mfa-pending` cookie instead of the real
session; a valid code (or, for admin-role accounts, a one-time backup code) exchanges it for the
real `cya-session`/`cya-admin` cookie via [`mfa.service.js`](../src/server/services/mfa.service.js).

- **Admin-role member accounts:** self-service enrollment on first login — QR code (rendered
  server-side via `qrcode`, never shipped to the client bundle) plus a manual key, and 10 one-time
  backup codes shown once. The TOTP secret is AES-256-GCM encrypted at rest, keyed from `AUTH_SECRET`
  (no new secret to provision). Backup-code hashes (SHA-256) are stored, not the codes themselves.
- **Admin portal:** a single shared TOTP secret via the optional `ADMIN_PORTAL_TOTP_SECRET` env var —
  unset means the portal stays passphrase-only (opt-in, same pattern as `VAPID_*`/`SMTP_*`). No backup
  codes for this path; recovery is env-var rotation by an operator, same as `ADMIN_PORTAL_PASSWORD`.
- **Rate limits:** `auth:mfa-enroll` and `auth:mfa-enroll-confirm` 5/15min, `auth:mfa-verify` 8/15min.
- All three endpoints require the `X-CSRF-Token` double-submit header, consistent with every other
  mutating endpoint in the app.

---

## 4. Authorization

### Model

Two axes:

1. **Member role** on the user document — `role: "member" | "admin"`.
2. **Verification gate** — `emailVerified` must be true for participation writes (e.g. posting a
   prayer).

Admin access is granted by **either** a valid admin-portal passphrase session **or** a signed-in user
whose account carries `role: "admin"`. Both funnel through one gate,
[`assertAdmin()`](../src/server/middleware/require-admin.js).

### Authentication vs authorization

- **Authentication** answers *who are you* — the `cya-session` JWT.
- **Authorization** answers *may you do this* — `assertAdmin()`, `emailVerified` checks, and
  per-resource ownership checks.

### Permission validation flow

```mermaid
flowchart TD
  R[Request to protected resource] --> Q{Admin surface?}
  Q -- yes --> AP{hasAdminSession?}
  AP -- yes --> OK[Allow: portal]
  AP -- no --> US{Signed in?}
  US -- no --> D1[401]
  US -- yes --> RA{role == admin?}
  RA -- yes --> OK2[Allow: account]
  RA -- no --> D2[403]
  Q -- no --> M{Needs member?}
  M -- yes --> EV{emailVerified / owns resource?}
  EV -- no --> D3[401 / 403]
  EV -- yes --> OK3[Allow]
```

### Roles

| Role | Capabilities |
|---|---|
| Anonymous | Public reads: daily verse, archive, search, devotions, events, public prayer wall |
| Member | Own data: prayers (post, pray), plans, streaks, saved verses, RSVP, export/delete |
| Verified member | Adds participation writes gated on `emailVerified` (e.g. prayer post) |
| Admin | Devotions, events, users, prayers moderation, verse sync, image upload |

### Protected-resource rules

- Users **cannot** strip or grant their own admin role.
- Push subscriptions are ownership-checked before removal.
- Prayers are **hidden, never hard-deleted**, by moderators.
- Admin API endpoints (`/api/admin/*`) call `assertAdmin()` before any effect.

---

## 5. Password Security

| Concern | Implementation |
|---|---|
| Hashing algorithm | **bcrypt** (`bcryptjs`), cost factor **10** |
| Salt | Per-password salt generated by bcrypt, embedded in the hash |
| Storage | Only `passwordHash` is stored; **plaintext is never persisted or logged** |
| Comparison | `bcrypt.compare` (constant-time within bcrypt) |
| Minimum strength | ≥ 8 characters (enforced on register and reset) |
| Breach check | [HIBP k-anonymity range API](https://haveibeenpwned.com/API/v3#PwnedPasswords) — only a 5-char SHA-1 prefix is sent, full password/hash never leaves the server. Fails open (allows the password) on network error or timeout, matching this app's dependency-outage philosophy elsewhere ([`breach-check.service.js`](../src/server/services/breach-check.service.js)) |
| Reset token | `crypto.randomBytes(32)` hex, **SHA-256 hashed at rest**, 60-min TTL, single-use |
| Reset side effect | `tokenVersion++` invalidates all sessions |
| Brute-force defence | Per-IP rate limits on login (10/15m), forgot (3/15m), reset (10/15m) |

Reset flow ([`password-reset.service.js`](../src/server/services/password-reset.service.js)):

- The raw token travels only in the emailed link; the DB stores its SHA-256 hash, so a DB read cannot
  reconstruct a usable link.
- Requesting a new link deletes prior unused links for that user.
- `requestReset` always resolves identically whether or not the email is registered
  (**anti-enumeration**), and sends mail fire-and-forget so SMTP latency cannot be timed.

**Recommended Improvements:**

- Explicit account lockout after N consecutive failures (today only rate limiting applies).

---

## 6. Input Validation & Data Sanitization

### Where validation lives

Validation is centralised in **services** (the layer nearest the data), so every entry path shares
one rule set:

- **Auth** — name 2–60 chars, email `^\S+@\S+\.\S+$` and ≤ 120 chars, password ≥ 8.
- **Prayer** — request trimmed, 10–1000 chars; display name clamped to 60 chars.
- **IDs** — `isValidObjectId` before any lookup by id.
- **Pagination/limits** — bounded numeric `limit` values.
- **Coercion** — inputs coerced with `String(x ?? "")` / `.trim()` before checks, so non-string and
  `null`/`undefined` payloads cannot bypass validation.

### Client-side validation

The React forms validate for UX (required fields, formats), but **server-side validation is
authoritative** — client checks are never trusted.

### File / image upload validation

Admin pubmat uploads are stored in Mongo and streamed back with a **content-type allowlist**
(`image/jpeg`, `image/png`, `image/webp`) in
[`image.controller.js`](../src/server/controllers/image.controller.js); anything else is clamped to a
safe default so a mismatched type cannot be served for script execution. Image serving is rate-limited
(`admin:image` 30/10m).

---

## 7. SQL / NoSQL Injection Prevention

The datastore is MongoDB via **Mongoose**, so classic SQL injection does not apply; the relevant risk
is **NoSQL / operator injection**.

**Approach**

- All access goes through **Mongoose models**, which cast inputs to their schema types — a string
  field cannot silently become a `{ $gt: ... }` operator object.
- Object ids are validated with `isValidObjectId` before use.
- User-supplied text used in a regex search is escaped before it reaches `RegExp`.

**Secure pattern** ([`verse.service.js`](../src/server/services/verse.service.js)):

```js
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const rx = new RegExp(escapeRegex(query), "i");   // user input neutralised
await Verse.find({ text: rx }).limit(bounded);
```

**Dangerous patterns avoided**

```js
// DO NOT: raw user object spread into a query — enables operator injection
await User.find(req.body);
// DO NOT: unescaped user string in a RegExp — ReDoS / unintended matches
new RegExp(userInput);
```

---

## 8. XSS (Cross-Site Scripting) Protection

### Strategy

Layered: framework escaping for output, a strict nonce-based CSP as a backstop, and manual escaping
where content leaves React (transactional email).

| Vector | Control |
|---|---|
| Stored XSS | User content rendered through React (auto-escaped); no `dangerouslySetInnerHTML` on user data |
| Reflected XSS | Nonce + `strict-dynamic` CSP — a reflected `<script>` has no valid nonce, so it cannot run |
| DOM-based XSS | React-managed DOM; no `innerHTML` sinks fed by request data |
| Email HTML | `escapeHtml()` applied to interpolated names in reset/verify mail |

### Content Security Policy

Set **per request** in [`proxy.ts`](../src/proxy.ts) so `script-src` carries a fresh nonce instead of
`'unsafe-inline'`:

```
default-src 'self';
script-src 'self' 'nonce-<random>' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
style-src-elem 'self';
style-src-attr 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self';
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests;
```

- `strict-dynamic` means only the nonce'd bootstrap and scripts it loads execute.
- `style-src-elem` drops `'unsafe-inline'` — verified against a production build that Tailwind's
  compiled CSS and `next/font`'s font-face rules both ship as one external linked stylesheet, so
  zero inline `<style>` elements ever render in prod. `style-src-attr` keeps `'unsafe-inline'`
  because the app has genuine dynamic `style=""` usage (framer-motion animation values across
  several components) that can't be static classes. The base `style-src` line is the fallback for
  browsers without CSP3 split-directive support — they keep today's exact (permissive) behavior,
  so nothing regresses on older browsers.

---

## 9. CSRF (Cross-Site Request Forgery) Protection

### Current strategy

- **`SameSite=Lax`** on both session cookies (`cya-session`, `cya-admin`) — cross-site POSTs do not
  send the cookie.
- **`form-action 'self'`** and **same-origin** API design — state changes are JSON calls from the
  app's own origin.
- Session cookies are `httpOnly` and (in production) `secure`.

| Cookie | httpOnly | secure (prod) | sameSite | maxAge |
|---|---|---|---|---|
| `cya-session` | ✅ | ✅ | lax | 30 days |
| `cya-admin` | ✅ | ✅ | lax | 8 hours |

### Double-submit CSRF token

A `cya-csrf` cookie (random, non-`httpOnly` so client JS can read it) is minted for every visitor —
signed-in or not — on their first page view via `proxy.ts`, and immediately on login/register/admin
login ([`csrf.js`](../src/server/middleware/csrf.js)). Every state-changing endpoint that requires a
session or the admin gate — admin actions, account export/delete, prayer create/pray, event RSVP,
plan enroll/leave/day, saved-verse toggle/remove, streak read/challenge, push subscribe/unsubscribe,
and member/portal logout — must echo the cookie's value back in an `X-CSRF-Token` header; a mismatch
or missing header is rejected `403`. Existing sessions predating this change self-heal a token on
their next page view, so a stale 30-day session cookie isn't locked out. `SameSite=Lax` plus same-origin is the first layer;
the double-submit token is defence in depth applied uniformly across all mutating endpoints — a future
**state-changing GET** would bypass `SameSite=Lax` alone, but not the token check. All mutations must
stay POST/PUT/PATCH/DELETE.

---

## 10. Secrets Management

### Storage

Secrets live **only in environment variables**; none are committed. Documented in
[`.env.example`](../.env.example) with generation commands.

| Variable | Purpose | Required |
|---|---|---|
| `MONGO_URL` | MongoDB connection string | ✅ (boot gate) |
| `AUTH_SECRET` | HS256 signing key for session + admin JWTs | ✅ (boot gate) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for reset/verify links | ✅ (boot gate) |
| `ADMIN_PORTAL_PASSWORD` | Shared admin-portal passphrase | Admin portal |
| `CRON_SECRET` | Shared secret for the daily-verse scheduler | Cron |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL` | Web Push | Optional |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Transactional email | Optional |
| `TRUSTED_PROXY_HOPS` | Trusted reverse-proxy count for IP derivation | Optional |

### Protections

- **Boot gate** — `assertEnv()` refuses to start if `MONGO_URL`, `AUTH_SECRET`, or
  `NEXT_PUBLIC_SITE_URL` is missing ([`env.js`](../src/server/config/env.js)).
- **Timing-safe compares** — `CRON_SECRET` and the admin passphrase are compared with
  `crypto.timingSafeEqual` over SHA-256 digests, so response timing cannot leak the value.
- **Never logged** — the logging choke point records error scope/message only, no secret material.
- **`.gitignore`** excludes `.env*` (except `.env.example`), `*.pem`, `admin-credentials.json`,
  `railway-variables.json`.

### Dev vs prod & rotation

- Dev uses a local in-memory Mongo (`mongodb-memory-server`) and a local `.env`; production secrets
  live in the platform's secret store.
- **Rotation:** rotate `AUTH_SECRET` (invalidates all sessions), `ADMIN_PORTAL_PASSWORD` (rotate when
  a leader steps down), `CRON_SECRET`, and SMTP/VAPID keys on a schedule and on suspected exposure.

---

## 11. API Security

| Control | Detail |
|---|---|
| Authentication | `cya-session` JWT via `getSession()`; admin via `assertAdmin()` |
| Authorization | Per-endpoint role and `emailVerified` checks; ownership checks on user resources |
| Rate limiting | Per-IP, Mongo-backed fixed window with in-memory fallback (see table) |
| Request validation | Service-layer length/format/type checks; `isValidObjectId` |
| Error handling | Typed `ApiError` → uniform JSON; internals not leaked to clients |
| Security headers | Static set in `next.config.ts` + per-request CSP in `proxy.ts` |
| CORS | **Same-origin only** — no permissive `Access-Control-Allow-Origin` is set |
| Cron / machine auth | `CRON_SECRET` timing-safe compare on the daily-verse job |

### Rate-limit policy (implemented)

| Endpoint | Name | Limit | Window |
|---|---|---|---|
| Register | `auth:register` | 10 | 15 min |
| Login | `auth:login` | 10 | 15 min |
| Forgot password | `auth:forgot` | 3 | 15 min |
| Reset password | `auth:reset` | 10 | 15 min |
| Verify email | `auth:verify` | 10 | 15 min |
| Resend verification | `auth:verify-resend` | 3 | 15 min |
| Post prayer | `prayer:create` | 5 | 10 min |
| Pray for a prayer | `prayer:pray` | 60 | 1 min |
| Verse search | `verse:search` | 120 | 1 min |
| Admin image serve | `admin:image` | 30 | 10 min |
| Admin portal login | `admin:portal` | 5 | 15 min |
| Event RSVP | `event:rsvp` | 20 | 10 min |
| Plan enroll / leave | `plan:enroll` / `plan:leave` | 10 | 10 min |
| Plan day complete | `plan:complete-day` | 60 | 10 min |
| Save / unsave verse | `saved-verse:toggle` / `saved-verse:remove` | 30 | 1 min |
| Mark verse read | `streak:read` | 10 | 10 min |
| Claim challenge | `streak:challenge` | 10 | 10 min |
| Push subscribe | `push:subscribe` | 20 | 15 min |
| Push unsubscribe | `push:unsubscribe` | 20 | 15 min |
| Account data export | `account:export` | 10 | 15 min |
| Account delete | `account:delete` | 10 | 15 min |

**Anti-spoofing:** the client IP is taken from `X-Forwarded-For` **counting from the right** by
`TRUSTED_PROXY_HOPS`, so a client-injected leftmost address cannot forge identity
([`rate-limit.js`](../src/server/middleware/rate-limit.js)).

All state-changing endpoints are now rate-limited — RSVP, plan enroll/leave/progress, saved verses,
and streak/challenge writes previously had none; closed in this pass.

---

## 12. Database Security

| Area | Practice |
|---|---|
| Access control | Single application DB user via `MONGO_URL`; no shared admin credentials in app |
| Least privilege | DB user should hold read/write on the app database only (**operational**) |
| Query safety | Mongoose casting + `isValidObjectId` + escaped regex (see §7) |
| Schema constraints | `required`, `maxlength`, `enum`, `unique` (email), typed fields |
| Token/abuse expiry | **TTL indexes** auto-expire reset tokens, verify tokens, and rate buckets |
| Migration safety | Schema-on-write via Mongoose; seed/purge scripts are explicit and non-destructive by default |
| Backups | Managed by the hosting platform (**operational**) |

**Encryption:** data in transit to Mongo depends on TLS in the connection string (`mongodb+srv://` /
`tls=true`); at-rest encryption is provided by the managed database tier. **Recommended
Improvement:** verify TLS is enforced on the connection and enable at-rest encryption on the cluster.

---

## 13. Dependency Security

- **Runtime deps are deliberately lean** — `bcryptjs`, `jose`, `mongoose`, `nodemailer`, `web-push`,
  plus the Next/React/UI stack. No heavyweight security middleware; controls are first-party and
  auditable.
- **Lock file** — `package-lock.json` is committed for reproducible, pinned installs.
- **Pinned framework** — Next.js and `eslint-config-next` pinned to an exact version.

**Recommended tooling** (not yet wired into CI):

| Tool | Use |
|---|---|
| `npm audit` | Baseline vulnerability scan on install |
| Dependabot / Renovate | Automated dependency PRs |
| Snyk / OSV-Scanner | Deeper transitive-vulnerability analysis |
| OWASP Dependency-Check | SCA in CI |

`npm audit --audit-level=high` runs as a required step in [`ci.yml`](../.github/workflows/ci.yml)
on every push and PR. [`dependabot.yml`](../.github/dependabot.yml) opens weekly npm update PRs
(minor/patch grouped into one PR; majors get their own for manual review). **Recommended
Improvement:** consider a deeper transitive-vulnerability scan (Snyk/OSV-Scanner) over time.

---

## 14. Logging & Monitoring

Centralised in [`logger.js`](../src/server/utils/logger.js) — a single choke point emitting
structured JSON to `console.error`, designed to be swapped for a hosted reporter (Sentry, Logtail)
without touching call sites.

**What is logged**

- Genuine failures only: unreachable DB, unexpected throws, mail-send failures.
- Structured fields: `level`, `scope`, `message`, optional non-sensitive `meta` (e.g. `userId`),
  `time`.

**What is never logged**

- Passwords, password hashes, JWTs, session cookies, reset/verify tokens.
- Customer PII beyond a user id reference.
- Routine expected conditions (expired JWT, malformed body) — kept out to preserve signal.

**Admin-action audit log:** an append-only `AdminAuditLog` collection
([`admin-audit.js`](../src/server/utils/admin-audit.js)) records every privileged mutation — event
and devotion create/update/delete, prayer moderation, user role changes, verse sync, event-image
uploads, and admin portal login/logout — with actor, action, target, and metadata. Logging is
best-effort and never blocks or fails the action it records.

**Gaps / Recommended Improvements:**

- No security-specific alerting (failed-login spikes, admin actions) in the repo — the audit log is
  recorded but nothing pages on it yet.
- Wire the logger to a real error-tracking backend in production.

---

## 15. Secure Development Practices

- **Layered architecture** keeps auth/DB code server-only via `import "server-only"` guards, so it
  cannot leak into client bundles.
- **Typed errors** (`ApiError`) standardise safe client responses.
- **Environment separation** — local in-memory Mongo for dev; managed cluster for prod; env-gated
  optional integrations.
- **Linting** — ESLint (`eslint-config-next`) on the codebase.
- **Focused commits** — atomic, conventional messages.
- **CI gate** — [`ci.yml`](../.github/workflows/ci.yml) runs lint, `tsc --noEmit`, the test suite,
  `npm audit --audit-level=high`, and a production build on every push and PR.

**Recommended Improvements:**

- Branch protection + required PR review on `main`, with the CI workflow as a required check.
- A pre-commit secret scanner (e.g. gitleaks).

---

## 16. Deployment Security

### Production checklist

- [x] HTTPS enforced (HSTS `max-age=63072000; includeSubDomains`, `upgrade-insecure-requests`)
- [x] Secure cookies (`secure` in production)
- [x] Security headers set (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS) + per-request CSP
- [x] Required secrets present (boot gate refuses to start otherwise)
- [x] No secrets committed (`.gitignore` verified)
- [x] Dependency audit in CI (`npm audit --audit-level=high` in `ci.yml`)
- [x] Admin-action audit logging (`AdminAuditLog`)
- [ ] Error-tracking backend connected *(Recommended)*

### Security headers (static, `next.config.ts`)

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Content-Security-Policy is delivered per-request from `proxy.ts` (see §8).

---

## 17. Security Checklist

**Authentication**
- [x] Secure authentication implemented (bcrypt + signed JWT)
- [x] Password hashing enabled (bcrypt cost 10)
- [x] Session security configured (httpOnly, secure-in-prod, SameSite=Lax, revocable, sliding expiry)
- [x] MFA required for admin access (TOTP, both admin paths — see §9 MFA)
- [x] Breached-password check on register/reset (HIBP k-anonymity, fails open)

**Authorization**
- [x] Role permissions validated (`assertAdmin`, `emailVerified`, no self-elevation)
- [x] Protected routes secured (admin gate + ownership checks)

**Data Protection**
- [x] Input validation implemented (service-layer, coercion + bounds)
- [x] Injection prevention enabled (Mongoose casting, `escapeRegex`, `isValidObjectId`)
- [x] XSS protection implemented (React escaping + nonce CSP + email escaping)
- [x] CSRF protection implemented (SameSite=Lax + same-origin, plus a double-submit token on
  every authenticated mutating endpoint)

**Secrets**
- [x] No secrets committed (`.gitignore` enforced)
- [x] Environment variables secured (env-only, boot gate, timing-safe compares)
- [ ] Credentials rotated regularly (**operational** — establish a rotation schedule)

**Operations**
- [x] Dependencies scanned in CI (`npm audit --audit-level=high` in `ci.yml`)
- [x] Automated dependency updates (Dependabot, weekly)
- [~] Security monitoring (structured error logging + admin audit log present; no alerting yet — Recommended)
- [ ] Backups secured (**operational** — managed platform)

Legend: `[x]` implemented · `[~]` partial · `[ ]` not yet / operational.

---

## 18. Reporting Security Issues

**Do not open a public GitHub issue for security problems.**

Report privately to the CYA maintainers / ministry leadership. Include:

- Affected component or endpoint
- Steps to reproduce
- Impact assessment
- Any proof-of-concept

### Responsible disclosure

- Please give reasonable time to remediate before any public disclosure.
- Expect an acknowledgement, a coordinated fix, and credit (if desired) once resolved.

### Expected response process

1. **Acknowledge** the report.
2. **Triage & reproduce**, assign severity.
3. **Remediate**, prioritised by severity.
4. **Coordinate disclosure** after a fix ships.

### Supported versions

| Version | Supported |
|---|---|
| 1.0.x (latest) | ✅ |
| < 1.0 | ❌ |
