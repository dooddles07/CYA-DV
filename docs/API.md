# API Reference

REST-ish JSON API over Next.js Route Handlers for CYA Daily Verse. Internal BFF — single client, no
versioning. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`DESIGN.md`](./DESIGN.md) §12.

## Conventions

- **Base:** same origin. All bodies + responses are JSON.
- **Auth:** `cya-session` httpOnly JWT cookie (members) or `cya-admin` cookie / `role:admin` (admin).
- **Errors:** `{ "error": "message" }` with an HTTP status. Intentional failures use curated messages;
  unexpected failures return a generic 500.
- **Routing:** `app/api/**/route.js` shims re-export handlers from `server/routes` → controllers.

## Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | public | name, email, password → creates account, sends verify email |
| POST | `/api/auth/login` | public | sets session cookie |
| POST | `/api/auth/logout` | session | clears session |
| GET | `/api/auth/me` | session | current user stats/identity |
| POST | `/api/auth/forgot` | public | emails password-reset link |
| POST | `/api/auth/reset` | public | consumes reset token, bumps `tokenVersion` |
| POST | `/api/auth/verify` | public | consumes email-verify token |
| POST | `/api/auth/verify/resend` | session | re-sends verify email |

## Verse

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/verse/today` | public | verse of the day (Manila-dated, cached) |
| GET | `/api/verse/search` | public | `?query=&topic=&limit=` (limit ≤ 60) |

## Streak & gamification

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/streak/read` | session | mark today read; idempotent per Manila day |
| POST | `/api/streak/challenge` | session | `{ id }` — claim daily challenge XP (server catalog) |

## Prayer

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/prayers` | public | approved prayer wall |
| POST | `/api/prayers` | session + verified | post request (named or anonymous) |
| POST | `/api/prayers/[id]/pray` | session | "I prayed" — once per user |

## Events

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events` | public | published upcoming events |
| POST | `/api/events/[id]/rsvp` | session | RSVP; once per user |
| GET | `/api/images/[id]` | public | event pubmat (content-type allowlist, 1-year immutable) |

## Reading plans

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/plans/enroll` | session | enroll in a plan |
| POST | `/api/plans/leave` | session | leave/deactivate |
| POST | `/api/plans/day` | session | mark a plan day complete |

## Saved verses

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET/POST/DELETE | `/api/saved` | session | list / save / remove saved verses |

## Push

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/push/key` | public | VAPID public key |
| POST | `/api/push/subscribe` | optional session | store/update subscription; ownership-checked on removal |

## Account

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/account/export` | strict session | download own data |
| DELETE | `/api/account` | strict session | delete own account |

## Admin

All under `assertAdmin` (portal passphrase session or `role:admin`).

| Method | Path | Notes |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/admin/prayers`, `/api/admin/prayers/[id]` | moderate (approve/hide) |
| GET/POST/PATCH/DELETE | `/api/admin/events`, `/api/admin/events/[id]` | manage events |
| POST | `/api/admin/events/image` | upload pubmat (30/10m) |
| GET/POST/PATCH/DELETE | `/api/admin/devotions`, `/api/admin/devotions/[id]` | manage devotions |
| GET/PATCH | `/api/admin/users`, `/api/admin/users/[id]` | list / set role |
| POST | `/api/admin/sync-verses` | force verse reconcile |
| POST | `/api/admin/portal/login`, `/api/admin/portal/logout` | passphrase portal session |

## Cron & health

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/cron/daily-verse` | `CRON_SECRET` bearer | daily push; idempotent via `PushLog.day` |
| GET | `/api/health` | public | env readiness + DB reachability (`force-dynamic`) |

## Rate limits (Fact)

| Endpoint | Limit / window |
|---|---|
| `auth:register` | 5 / 60 min |
| `auth:login` | 10 / 15 min |
| `auth:forgot` | 3 / 15 min |
| `auth:reset`, `auth:verify` | 10 / 15 min |
| `auth:verify-resend` | 3 / 15 min |
| `admin:image` | 30 / 10 min |

**Needs Verification:** rate limits on non-auth write endpoints (prayer post, RSVP, enroll).
