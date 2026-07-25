# API Documentation

REST-ish JSON API over Next.js Route Handlers for **CYA Daily Verse**. Internal
BFF (Backend-for-Frontend) — a single first-party web client, no public
versioning. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) (Backend Architecture)
for rationale.

## Table of Contents

- [1. Overview](#1-overview)
- [2. Authentication](#2-authentication)
- [3. API Endpoints](#3-api-endpoints)
  - [Auth](#auth)
  - [Verse](#verse)
  - [Streak & Gamification](#streak--gamification)
  - [Prayer](#prayer)
  - [Events](#events)
  - [Reading Plans](#reading-plans)
  - [Saved Verses](#saved-verses)
  - [Push](#push)
  - [Account](#account)
  - [Admin](#admin)
  - [Cron & Health](#cron--health)
- [4. Request Examples](#4-request-examples)
- [5. Response Examples](#5-response-examples)
- [6. Error Handling](#6-error-handling)
- [7. Rate Limiting](#7-rate-limiting)
- [8. Pagination, Filtering, and Sorting](#8-pagination-filtering-and-sorting)
- [9. File Uploads](#9-file-uploads)
- [10. Webhooks](#10-webhooks)
- [11. Postman Collection](#11-postman-collection)
- [12. API Versioning](#12-api-versioning)
- [13. API Changelog](#13-api-changelog)

---

# 1. Overview

- **Purpose:** Serve the CYA Daily Verse web app — daily Scripture, reading
  streaks/XP, a moderated prayer wall, events + RSVP, reading plans, saved
  verses, and web-push reminders.
- **System:** Next.js 16 (App Router) monolith. Route Handlers under
  `src/app/api/**` are thin shims that re-export from `src/server/routes/*` →
  controllers → services → Mongoose models (MongoDB).
- **Architecture style:** Resource-oriented JSON over HTTP. Not strictly REST —
  a few actions are RPC-style POSTs (`/api/streak/read`, `/api/plans/enroll`).
- **Base URL:** Same origin as the site. Derived from `NEXT_PUBLIC_SITE_URL`.
- **API version:** Unversioned. Single internal client; see §12.

## Environments

```
Development:
http://localhost:3000

Production:
<NEXT_PUBLIC_SITE_URL>   # required env var; reset/verify links are built from it
```

> There is no separate staging host defined in the codebase. If a staging
> deployment is provisioned, add its base URL here.

## Conventions

- **Content type:** All request and response bodies are JSON, except
  multipart uploads (`/api/admin/events/image`) and binary image serving
  (`/api/images/[id]`).

```http
Content-Type: application/json
Accept: application/json
```

- **Base:** Same origin. Relative paths (`/api/...`).
- **Malformed JSON:** Request bodies are parsed defensively — invalid/absent
  JSON is treated as `{}`, so validation errors (not parse crashes) are
  returned.
- **Dates:** Day-based logic (verse of day, streaks, event listing) uses the
  **Asia/Manila** timezone day key (`YYYY-MM-DD`).
- **Routing:** `app/api/**/route.js` shims re-export handlers from
  `server/routes` → controllers → services.

---

# 2. Authentication

## Authentication Method

**Cookie-based JWT sessions** (signed with `jose`, `HS256`, secret
`AUTH_SECRET`). Two independent session cookies:

| Cookie | Audience | Max age | Flags |
|---|---|---|---|
| `cya-session` | Members | 30 days | `httpOnly`, `sameSite=lax`, `secure` in prod, `path=/` |
| `cya-admin` | Admin portal | 8 hours | `httpOnly`, `sameSite=lax`, `secure` in prod, `path=/` |

There is **no bearer-token auth for user endpoints** — the browser sends the
cookie automatically. Bearer tokens are used only for the cron endpoints
(`CRON_SECRET`).

## Authentication Flow

- **Register** (`POST /api/auth/register`) → creates the account, sets
  `cya-session`, and fires a verification email (fire-and-forget).
- **Login** (`POST /api/auth/login`) → validates credentials (bcrypt), sets
  `cya-session`.
- **Session token:** JWT `{ sub: userId, name, email, tv: tokenVersion }`,
  30-day expiry.
- **Revocation:** The JWT carries `tv` (token version). On every authenticated
  request the server compares it to the account's current `tokenVersion`.
  Password reset bumps `tokenVersion`, invalidating all existing sessions.
- **Strict vs. lax sessions:** Reads/browsing fail *open* on a DB outage (keep
  the session). Auth-sensitive writes (prayer post, account export/delete) use
  `getSession({ strict: true })` and fail *closed*.
- **Logout** (`POST /api/auth/logout`) → deletes the `cya-session` cookie.
- **Password reset:** `forgot` emails a link → `reset` consumes the token,
  bumps `tokenVersion`, and signs the user straight in.
- **Email verify:** `verify` consumes the emailed token; `verify/resend`
  re-sends it (session required).
- **Admin portal:** `POST /api/admin/portal/login` with a shared passphrase
  (`ADMIN_PORTAL_PASSWORD`) sets `cya-admin` (8h).

## Required Headers

Members — cookie is automatic (browser). No `Authorization` header:

```http
Cookie: cya-session=<jwt>
Content-Type: application/json
```

Cron endpoints — bearer secret:

```http
Authorization: Bearer <CRON_SECRET>
```

## Access Control

- **Public:** `verse/today`, `verse/search`, `prayers` (GET), `events` (GET),
  `images/[id]`, `push/key`, `health`, and all auth entry points.
- **Session (member):** streak, challenge, prayer post/pray, RSVP, plans,
  saved, `auth/me`, `auth/verify/resend`.
- **Verified email required:** posting to the prayer wall
  (`POST /api/prayers`).
- **Strict session:** `account/export`, `account` (DELETE).
- **Admin:** everything under `/api/admin/**`, gated by `assertAdmin()` —
  granted by a valid `cya-admin` portal session **or** a member session whose
  account has `role: "admin"`.
- **Cron secret:** `/api/cron/daily-verse`, and `/api/admin/sync-verses`
  (secret **or** admin).

---

# 3. API Endpoints

All success/error bodies are JSON unless noted. Intentional failures return
`{ "error": "<message>" }` with an appropriate status; unexpected failures
return a generic `500` (see §6).

## Auth

### `POST /api/auth/register`

Create an account, set the session cookie, send a verification email.

- **Auth:** Public. **Rate limit:** 5 / 60 min.
- **Body:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 2–60 chars |
| `email` | string | Yes | valid email, ≤120 chars, unique |
| `password` | string | Yes | ≥8 chars |

- **Success:** `201`

```json
{ "user": { "name": "John Doe", "email": "john@example.com" } }
```

- **Errors:** `400` invalid fields · `409` email already exists · `429` rate
  limited.

### `POST /api/auth/login`

- **Auth:** Public. **Rate limit:** 10 / 15 min.
- **Body:** `{ "email": string, "password": string }`
- **Success:** `200` `{ "user": { "name", "email" } }`
- **Errors:** `400` missing fields · `401` invalid email or password · `429`.

### `POST /api/auth/logout`

- **Auth:** Session (no-op if absent). Clears `cya-session`.
- **Success:** `200` `{ "ok": true }`

### `GET /api/auth/me`

Current user identity + gamification stats. Never `401` — returns
`{ "user": null }` when unauthenticated.

- **Auth:** Session (optional).
- **Success:** `200`

```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "lastReadDate": "2026-07-25",
    "streak": 4,
    "bestStreak": 12,
    "totalReads": 87,
    "xp": 2175,
    "level": 9,
    "xpToNext": 2250
  }
}
```

### `POST /api/auth/forgot`

Email a password-reset link. Always responds success-shaped to avoid leaking
which emails exist.

- **Auth:** Public. **Rate limit:** 3 / 15 min.
- **Body:** `{ "email": string }`
- **Success:** `200` (service-defined body).

### `POST /api/auth/reset`

Consume a reset token, set the new password, bump `tokenVersion`, sign in.

- **Auth:** Public. **Rate limit:** 10 / 15 min.
- **Body:** `{ "token": string, "password": string }`
- **Success:** `200` `{ "user": { "name", "email" } }`
- **Errors:** `400`/`401` invalid/expired token · `429`.

### `POST /api/auth/verify`

Consume an email-verification token.

- **Auth:** Public. **Rate limit:** 10 / 15 min.
- **Body:** `{ "token": string }`
- **Success:** `200` (service-defined body).

### `POST /api/auth/verify/resend`

Re-send the verification email to the signed-in user.

- **Auth:** Session (`401` if absent). **Rate limit:** 3 / 15 min.
- **Success:** `200` (service-defined body).

---

## Verse

### `GET /api/verse/today`

Verse of the day — deterministic Manila-dated rotation, cached ~1h. Falls back
to a bundled seed if the DB is unreachable (still `200`).

- **Auth:** Public.
- **Success:** `200`

```json
{
  "verse": {
    "reference": "John 3:16",
    "text": "For God so loved the world...",
    "version": "BSB",
    "topic": "love"
  }
}
```

### `GET /api/verse/search`

Full-text/reference search across the verse collection, optionally scoped to a
topic. Returns up to **60** verses (fixed server cap).

- **Auth:** Public. **Rate limit:** 120 / min.
- **Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | No | Search text (trimmed, ≤120 chars). Empty = browse by topic. |
| `topic` | string | No | Topic filter (trimmed, ≤40 chars). |

> **Note:** there is **no** `limit` query param — the cap is fixed at 60 in the
> service.

- **Success:** `200` `{ "verses": [ { "reference", "text", "version", "topic" }, ... ] }`

---

## Streak & Gamification

### `POST /api/streak/read`

Mark today's verse read. Idempotent per Manila day (concurrent-safe: exactly
one award per day). Awards `XP_PER_READ` (25 XP), extends/resets streak.

- **Auth:** Session (`401` if absent).
- **Body:** none.
- **Success:** `200`

```json
{
  "alreadyRead": false,
  "streak": 5, "bestStreak": 12, "totalReads": 88,
  "xp": 2200, "level": 9, "xpToNext": 2250
}
```

### `POST /api/streak/challenge`

Claim XP for a daily challenge. The challenge id (`title`) must exist in the
**server-side** catalog; XP is taken from the server definition, never the
client. Capped at one claim per challenge per Manila day.

- **Auth:** Session (`401` if absent).
- **Body:** `{ "id": string }` — the challenge `title`.
- **Success:** `200` `{ "alreadyClaimed": false, ...stats }`
- **Errors:** `400` unknown challenge · `404` account not found.

---

## Prayer

### `GET /api/prayers`

Approved prayer wall, newest first, **cursor-paginated**.

- **Auth:** Session optional (used to flag which requests the viewer prayed for).
- **Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | number | No | Page size, clamped 1–50, default 20. |
| `cursor` | string (ISO date) | No | `createdAt` of the last item on the previous page. |

- **Success:** `200`

```json
{
  "prayers": [
    {
      "id": "665f...", "name": "Anonymous", "request": "Please pray...",
      "tag": "New", "prayedCount": 3, "prayed": false,
      "createdAt": "2026-07-25T02:10:00.000Z"
    }
  ],
  "nextCursor": "2026-07-24T22:00:00.000Z",
  "total": 128
}
```

> `total` is only computed on the first page (`0` on cursor pages). `tag` is
> `"New"` for <24h-old posts, else `""`.

### `POST /api/prayers`

Post a prayer request.

- **Auth:** Session **(strict)** + **verified email** (`403` if unverified).
  **Rate limit:** 5 / 10 min.
- **Body:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `request` | string | Yes | 10–1000 chars |
| `name` | string | No | Display name, ≤60 chars (falls back to account name) |
| `anonymous` | boolean | No | If true, name shown as "Anonymous" (author still stored) |

- **Success:** `201` `{ "prayer": { ...PrayerItem } }`
- **Errors:** `400` too short/long · `401` not signed in · `403` email not
  verified · `429`.

### `POST /api/prayers/[id]/pray`

Toggle the signed-in user's prayer for a request. Idempotent — count only moves
when a per-user row is created/removed.

- **Auth:** Session (`401` if absent). **Rate limit:** 60 / min.
- **Path:** `id` — prayer ObjectId.
- **Body:** `{ "undo": boolean }` — omit/false to pray, true to un-pray.
- **Success:** `200` `{ "prayedCount": 4, "prayed": true }`
- **Errors:** `404` not found.

---

## Events

### `GET /api/events`

Published, upcoming events (Manila-dated, soonest first, max 24). `rsvped`
reflects the viewer.

- **Auth:** Session optional.
- **Success:** `200` `{ "events": [ EventItem, ... ] }`

```json
{
  "events": [{
    "id": "665f...", "title": "Youth Night", "date": "2026-08-08",
    "displayDate": "Aug 8, 2026", "time": "6:00 PM", "location": "Main Hall",
    "description": "...", "speaker": "Ptr. Cruz", "tag": "Event",
    "image": "/api/images/665f...", "published": true,
    "rsvpCount": 42, "rsvped": false
  }]
}
```

### `POST /api/events/[id]/rsvp`

Toggle the signed-in user's RSVP. Idempotent.

- **Auth:** Session (`401` if absent).
- **Path:** `id` — event ObjectId.
- **Body:** `{ "going": boolean }` — true to RSVP, false to cancel.
- **Success:** `200` `{ "rsvpCount": 43, "rsvped": true }`
- **Errors:** `404` event no longer exists.

### `GET /api/images/[id]`

Serve event/devotion artwork stored in Mongo. Content-type is clamped to a
`jpeg/png/webp` allowlist; cached 1 year immutable.

- **Auth:** Public.
- **Path:** `id` — image ObjectId.
- **Success:** `200` binary image · **`404`** plain text `Not found`.

---

## Reading Plans

All require a member session (`401` if absent). Responses return the shaped
active-plan object (`ActivePlan`).

### `POST /api/plans/enroll`

Enroll in a plan, deactivating any other so exactly one is active.

- **Body:** `{ "slug": string }`
- **Success:** `200` `{ "plan": ActivePlan }`
- **Errors:** `404` plan doesn't exist.

### `POST /api/plans/leave`

Leave the active plan.

- **Body:** `{ "reset": boolean }` — if true, also clears completed days.
- **Success:** `200` `{ "plan": ActivePlan }` (preview shape)
- **Errors:** `404` not in a plan.

### `POST /api/plans/day`

Mark a plan day complete (or undo).

- **Body:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `day` | number | Yes | Integer ≥1, ≤ plan length |
| `complete` | boolean | No | Default true; false to undo |

- **Success:** `200` `{ "plan": ActivePlan }`
- **Errors:** `400` invalid/out-of-range day · `404` no active plan.

**`ActivePlan` shape:** `{ slug, name, tag, desc, totalDays, completedCount,
nextDay, todayReading, finished?, upcoming: [{day, passage}], weekProgress:
[{day, done}], enrolled }`.

---

## Saved Verses

Single collection endpoint. All require a member session unless noted.

### `GET /api/saved`

List saved verses (newest first, max 100). Returns `{ "verses": [] }` when
unauthenticated (no `401`).

- **Success:** `200` `{ "verses": [ { "reference", "text", "version", "topic" } ] }`

### `POST /api/saved`

Toggle-save a verse (adds if absent, removes if present).

- **Auth:** Session (`401` if absent).
- **Body:** `{ "reference": string, "text"?, "version"?, "topic"? }`
- **Success:** `200` `{ "saved": true }` or `{ "saved": false }`
- **Errors:** `400` missing reference.

### `DELETE /api/saved`

Remove a saved verse by reference.

- **Auth:** Session (`401` if absent).
- **Body:** `{ "reference": string }`
- **Success:** `200` `{ "removed": true, "reference": "John 3:16" }`
- **Errors:** `400` missing reference · `404` not in saved list.

---

## Push

### `GET /api/push/key`

VAPID public key for building a browser subscription.

- **Auth:** Public.
- **Success:** `200` `{ "key": "<vapid-public-key>" }` (or `null` if unset).

### `POST /api/push/subscribe`

Store/update a push subscription. If signed in, it's tied to the user.

- **Auth:** Session optional.
- **Body:** `{ "subscription": <PushSubscription JSON> }`
- **Success:** `200` (service-defined body).

### `DELETE /api/push/subscribe`

Remove a subscription. Ownership-checked when a session is present.

- **Auth:** Session optional.
- **Body:** `{ "endpoint": string }`
- **Success:** `200` (service-defined body).

---

## Account

### `GET /api/account/export`

Download all of the signed-in user's data as a JSON file attachment.

- **Auth:** Strict session (`401` if absent).
- **Success:** `200`, `Content-Disposition: attachment;
  filename="cya-daily-verse-data.json"`.

### `DELETE /api/account`

Permanently delete the signed-in user's account and clear the session.

- **Auth:** Strict session (`401` if absent).
- **Success:** `200` `{ "deleted": true }`

---

## Admin

All under `assertAdmin()` — a valid `cya-admin` portal session **or** a member
with `role: "admin"`. On failure: `401` (no session) / `403` (not an admin).

### Portal auth

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/portal/login` | `{ "passphrase": string }` → sets `cya-admin` (8h). Rate limit **5 / 15 min**. `401` wrong passphrase · `503` portal not configured. |
| POST | `/api/admin/portal/logout` | Clears `cya-admin`. `200 { "ok": true }` |

### Prayers (moderation)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/prayers` | All prayers incl. hidden → `{ "prayers": [ModeratedPrayer] }` |
| PATCH | `/api/admin/prayers/[id]` | `{ "status": "approved" \| "hidden" }` → `{ "prayer" }` |

### Events

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/events` | All events incl. drafts/past → `{ "events": [] }` |
| POST | `/api/admin/events` | Create → `201 { "event" }`. Body below. |
| PATCH | `/api/admin/events/[id]` | Update → `{ "event" }` |
| DELETE | `/api/admin/events/[id]` | Delete (+ RSVPs, orphan image) → `{ "deleted": true, "id" }` |
| POST | `/api/admin/events/image` | Upload pubmat (multipart). Rate limit **30 / 10 min**. See §9. |

**Event body** (create/update): `title` (≥3), `date` (`YYYY-MM-DD`, valid),
`time` (required), `location` (≥2), `image` (required — `/media/*` or
`/api/images/<24hex>`), optional `description` (≤800), `speaker`, `tag`
(default `"Event"`), `published` (default true). Invalid → `400`.

### Devotions

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/devotions` | All incl. drafts → `{ "devotions": [] }` |
| POST | `/api/admin/devotions` | Create → `201 { "devotion" }`. `409` duplicate slug. |
| PATCH | `/api/admin/devotions/[id]` | Update → `{ "devotion" }` |
| DELETE | `/api/admin/devotions/[id]` | Delete → `{ "deleted": true }` |

**Devotion body:** `title` (≥3), `image` (required, same allowlist), optional
`slug` (auto from title), `excerpt`, `author`, `readTime` (default `"3 min"`),
`date`, `verse`, `verseText`, `imageAlt`, `body` (array or newline string, ≤40
paragraphs), `practice`, `published`.

> Devotion images are uploaded via the shared `/api/admin/events/image`
> endpoint (there is no `/api/admin/devotions/image`).

### Users

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/users` | All accounts, newest first (max 200) → `{ "users": [AdminUser] }` |
| PATCH | `/api/admin/users/[id]` | `{ "role": "member" \| "admin" }` → `{ "user" }`. Cannot strip your own admin role (`400`). |

### Sync

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/sync-verses` | Upsert `verses.json` into DB, revalidate `verses` cache. Auth: `CRON_SECRET` bearer **or** admin. → `{ "total", "inserted", "updated" }` |

---

## Cron & Health

### `GET`/`POST /api/cron/daily-verse`

Send the daily verse push to every subscriber. Called by an external scheduler.

- **Auth:** `Authorization: Bearer <CRON_SECRET>` (constant-time compare).
- **Idempotency:** guarded per Manila day via `PushLog.day`.
- **Success:** `200` (send summary).
- **Errors:** `401` bad/missing secret · `503` `CRON_SECRET` not configured.

> Accepts **both GET and POST** (some schedulers only issue GET).

### `GET /api/health`

Env readiness + DB reachability. `force-dynamic`.

- **Auth:** Public.
- **Success:** `200` `{ "ok": true, "db": "connected" }`
- **Degraded:** `503` `{ "ok": false, "db": "not attempted", "missingEnv": [...] }`
  or `{ "ok": false, "db": "unreachable", "error": "..." }`

---

# 4. Request Examples

## Authentication

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "password123" }
```

## CRUD Examples

**Create** — post a prayer request (verified member):

```http
POST /api/prayers
Content-Type: application/json

{ "request": "Please pray for my family's health.", "anonymous": true }
```

**Read** — paginated prayer wall:

```http
GET /api/prayers?limit=20&cursor=2026-07-24T22:00:00.000Z
```

**Update** — moderate a prayer (admin):

```http
PATCH /api/admin/prayers/665f0a1b2c3d4e5f60718293
Content-Type: application/json

{ "status": "hidden" }
```

**Delete** — remove a saved verse:

```http
DELETE /api/saved
Content-Type: application/json

{ "reference": "John 3:16" }
```

## Cron

```http
POST /api/cron/daily-verse
Authorization: Bearer <CRON_SECRET>
```

---

# 5. Response Examples

## Success (data)

```json
{ "user": { "name": "John Doe", "email": "john@example.com" } }
```

Endpoints wrap their payload under a resource key (`user`, `verse`, `verses`,
`prayer`, `prayers`, `event`, `events`, `plan`, `devotion`, `devotions`,
`users`) or return a small flat status object (`{ "saved": true }`,
`{ "ok": true }`, `{ "deleted": true }`).

## Error

```json
{ "error": "Invalid email or password." }
```

> This API does **not** use an envelope like `{ "success": false, "error": {
> "code", "message" } }`. Errors are always `{ "error": "<message>" }` with an
> HTTP status. There are no machine-readable error `code` strings or per-field
> validation maps — the `message` is the contract.

---

# 6. Error Handling

**Standard error structure**

```json
{ "error": "Human-readable message" }
```

- Intentional failures throw `ApiError(status, message)`; the message is
  user-safe and returned verbatim.
- Unexpected failures are logged server-side and return a generic
  `500 { "error": "Something went wrong. Please try again." }` (or an
  endpoint-specific fallback message).

| Status | Meaning | Usage in this API |
|---|---|---|
| 200 | OK | Successful read/write |
| 201 | Created | register, prayer post, event/devotion create, image upload |
| 400 | Bad Request | Validation failure (bad fields, too short/long, bad day/role/status) |
| 401 | Unauthorized | Missing/invalid session; bad cron secret; wrong passphrase |
| 403 | Forbidden | Not an admin; email not verified (prayer post) |
| 404 | Not Found | Resource missing (prayer/event/user/image/plan) |
| 409 | Conflict | Duplicate email; duplicate devotion slug |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected/unhandled failure (generic message) |
| 503 | Service Unavailable | `CRON_SECRET`/admin portal not configured; health degraded |

> **Validation errors** return a single human message (`400`), **not** a
> per-field map. **Auth failures** return `401`; **permission failures**
> `403`.

---

# 7. Rate Limiting

Fixed-window limiter backed by MongoDB (`RateBucket`), shared across instances;
falls back to an in-memory window if the DB is unreachable (degraded, never
blocks). Client IP is derived from `X-Forwarded-For` counting from the right by
`TRUSTED_PROXY_HOPS` (default 1), else `X-Real-IP`. Over-limit →
`429 { "error": "Too many requests..." }`.

| Limiter | Endpoint | Limit / window |
|---|---|---|
| `auth:register` | `POST /api/auth/register` | 5 / 60 min |
| `auth:login` | `POST /api/auth/login` | 10 / 15 min |
| `auth:forgot` | `POST /api/auth/forgot` | 3 / 15 min |
| `auth:reset` | `POST /api/auth/reset` | 10 / 15 min |
| `auth:verify` | `POST /api/auth/verify` | 10 / 15 min |
| `auth:verify-resend` | `POST /api/auth/verify/resend` | 3 / 15 min |
| `verse:search` | `GET /api/verse/search` | 120 / min |
| `prayer:create` | `POST /api/prayers` | 5 / 10 min |
| `prayer:pray` | `POST /api/prayers/[id]/pray` | 60 / min |
| `admin:portal` | `POST /api/admin/portal/login` | 5 / 15 min |
| `admin:image` | `POST /api/admin/events/image` | 30 / 10 min |

**No** `X-RateLimit-*` response headers are emitted. Endpoints not listed above
(RSVP, plans, saved, streak, push, account) are **not** rate-limited — they are
session-gated and idempotent/self-limiting instead.

---

# 8. Pagination, Filtering, and Sorting

## Pagination

Only the **prayer wall** is paginated, using **cursor** pagination (not
`page`/`offset`) so new posts never shift rows across pages.

```
GET /api/prayers?limit=20&cursor=2026-07-24T22:00:00.000Z
```

- Default page size: **20**. Max: **50** (clamped). Cursor = `createdAt` (ISO)
  of the last item seen.
- Response metadata: `nextCursor` (null when done), `total` (first page only).

Other list endpoints return a single capped page (no pagination params):
verse search ≤60, events ≤24, saved ≤100, admin users/prayers ≤200,
devotions ≤60.

## Filtering

Verse search supports a topic filter:

```
GET /api/verse/search?q=love&topic=faith
```

No generic filter query language exists elsewhere.

## Sorting

Sort order is fixed per endpoint (not client-controllable): verse of day by
deterministic rotation; prayers/events/devotions/users by recency; upcoming
events by soonest date. **No `sort`/`order` query params.**

---

# 9. File Uploads

One upload endpoint, used for both event and devotion artwork.

```http
POST /api/admin/events/image
Content-Type: multipart/form-data

file: <binary>
```

- **Auth:** Admin. **Rate limit:** 30 / 10 min.
- **Field name:** `file`.
- **Allowed types:** `image/jpeg`, `image/png`, `image/webp` — validated by
  **magic bytes**, not just the declared MIME type.
- **Max size:** 2 MB.
- **Storage:** Binary stored in MongoDB (`EventImage`), served via
  `GET /api/images/[id]` (1-year immutable cache).
- **Success:** `201`

```json
{ "url": "/api/images/665f0a1b2c3d4e5f60718293", "bytes": 148213 }
```

- **Errors:** `400` no file / wrong type / >2MB / bytes don't match a real
  image.

---

# 10. Webhooks

**Not applicable.** This API exposes no outbound webhooks and consumes none.
The only scheduler integration is inbound: `GET`/`POST /api/cron/daily-verse`,
authenticated by `CRON_SECRET` bearer (see §3). Delivery is web-push to
browsers, not HTTP webhooks.

---

# 11. Postman Collection

```
STATUS: No Postman collection is committed. Recommended location if added:
docs/postman/cya-daily-verse.postman_collection.json.

Suggested environment variables:
  BASE_URL      # e.g. http://localhost:3000
  CRON_SECRET   # for /api/cron/daily-verse and /api/admin/sync-verses

Session auth is cookie-based (cya-session / cya-admin), set automatically by
the login endpoints — enable Postman's cookie jar rather than a bearer token
for member/admin calls.
```

---

# 12. API Versioning

```
Current Version:
Unversioned (v0 / internal)

Version Strategy:
None. Single first-party client deployed with the API, so breaking changes are
shipped atomically with the frontend. No URL/header/media-type versioning.
```

**Breaking-change policy:** Since client and API deploy together, contract
changes are coordinated in the same release. If external consumers are ever
onboarded, introduce URL-based versioning (`/api/v1/...`) and a
deprecation policy.

---

# 13. API Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-07-25 | Documentation baselined against implementation. Corrected search param (`q`, not `query`; no `limit`), documented prayer cursor pagination + toggle bodies (`undo`/`going`), `DELETE /api/push/subscribe`, cron GET+POST, shared image upload for devotions, and the full rate-limit table. |

> Track added / removed / deprecated endpoints and breaking changes in this
> section going forward, alongside [`CHANGELOG.md`](./CHANGELOG.md). No
> endpoints are currently deprecated.

---

## Appendix — Discrepancies Corrected vs. Prior Docs

The previous `API.md` diverged from the implementation on these points, now
fixed above:

1. **Verse search params:** was `?query=&topic=&limit=`; actual is `?q=&topic=`
   with a fixed server cap of 60 (no `limit` param).
2. **Prayer wall:** documented as a plain list; actually cursor-paginated
   (`limit` 1–50, `cursor`, `nextCursor`, `total`).
3. **Pray / RSVP:** documented as "once per user"; both are **toggles**
   (`{ undo }` / `{ going }`) and idempotent.
4. **Push:** `DELETE /api/push/subscribe` (unsubscribe) was undocumented.
5. **Cron:** accepts **GET and POST**, not POST only.
6. **Devotion images:** uploaded via the shared `/api/admin/events/image`;
   there is no devotion-specific upload route.
7. **Rate limits:** `verse:search` (120/min), `prayer:create` (5/10m),
   `prayer:pray` (60/min), and `admin:portal` (5/15m) were previously listed as
   "Needs Verification" — now confirmed and tabulated.
8. **Error shape:** confirmed flat `{ "error": "message" }` — no `success`
   envelope, error `code`, or per-field validation map.
