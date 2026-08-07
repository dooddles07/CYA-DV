# Features

Everything **CYA Daily Verse** does, organised by capability. This is the product-behaviour reference:
*what* the app offers each kind of user and *how* each feature behaves.

Companion docs: [`DESIGN.md`](./DESIGN.md) (how it looks/feels), [`ARCHITECTURE.md`](./ARCHITECTURE.md)
(how it runs), [`API.md`](./API.md) (endpoint contracts), [`ROADMAP.md`](./ROADMAP.md) (what's next).

> **Evidence conventions**
> - **Fact** — read directly from source (`src/lib/data.ts`, `src/app/**`, `src/server/**`).
> - **Inferred** — reasoned from the code, not explicitly stated.

---

## 1. Overview

A Progressive Web App and daily-devotional platform built by *Christ's Youth in Action* to turn a daily
spiritual habit into something effortless and social. The product is shaped around one loop:

> **Discover → Engage → Grow → Belong** — read today's verse, mark it read, build a streak, and join a
> praying community.

---

## 2. Access model

Three roles (`src/lib/types.ts`, enforced by `getSession` / `emailVerified` gate / `assertAdmin`).

| Capability | Visitor | Member (verified) | Admin/Moderator |
|---|:--:|:--:|:--:|
| Read daily verse, archive | ✅ | ✅ | ✅ |
| Search / mood / topic discovery | ✅ | ✅ | ✅ |
| Browse devotionals | ✅ | ✅ | ✅ |
| View prayer wall + events | ✅ | ✅ | ✅ |
| Save verses | — | ✅ | ✅ |
| Streak / XP / levels / challenges | — | ✅ | ✅ |
| Reading plans (enroll, track) | — | ✅ | ✅ |
| Post prayers · tap "I prayed" | — | ✅ | ✅ |
| RSVP to events | — | ✅ | ✅ |
| Daily push reminders | — | ✅ | ✅ |
| Data export / account delete | — | ✅ | ✅ |
| Moderate prayers · manage events/devotions/roles | — | — | ✅ |

> Members must **verify email** before participation writes (post/pray). Admins enter via a private
> passphrase portal **or** a signed-in `role:admin` account.

---

## 3. Feature map

| Area | Features | Primary routes |
|---|---|---|
| Scripture | Verse of the day, archive, reflection + prayer | `/`, `/verse`, `/verse/archive` |
| Gamification | Streak, XP/levels, daily challenges | `/verse`, `/dashboard` |
| Discovery | Search, by mood, by topic, surprise, recent | `/search`, `/mood` |
| Plans | 5 reading plans, per-day progress | `/plans` |
| Devotionals | Featured + archive articles | `/devotion`, `/devotion/[slug]` |
| Community | Prayer wall, events + RSVP | `/prayer`, `/events` |
| Accounts | Register, verify, login, reset | `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Platform | Push reminders, PWA/offline, privacy controls | `/dashboard` |
| Admin | Moderation, events, devotions, roles, verse sync | `/admin`, `/admin-portal` |

---

## 4. Scripture & Daily Verse

- **Verse of the day.** Deterministic (`dayNumber % corpusCount`, sorted by reference), **Manila-dated**,
  identical for every user that day. Cached 1h + day key; falls back to the bundled 300-verse BSB seed
  if the DB is down.
- **Verse actions.** Listen (Web Speech read-aloud, toggle), Save, Copy, Share (Web Share with copy
  fallback) — on the signature verse card.
- **Reflection & prayer.** `/verse` pairs the verse with a short reflection and a written prayer.
- **Archive.** Any past day's verse is reproducible from the same formula — no history table needed.
- **Translation.** Berean Standard Bible (public domain).

**Endpoints:** `verse/today`, `verse/search`.

---

## 5. Gamification

- **Reading streak.** Tap **"I read today's verse"** to mark the day — **once per Manila day**,
  idempotent (conditional write). Consecutive days extend the streak; a missed day resets it.
- **XP & levels.** **25 XP** per read; `level = floor(xp / 250) + 1`.
- **Daily challenges.** Extra-XP tasks, **claimable once per day per challenge**, XP read from the
  server catalog (client-supplied values never trusted). Current catalog (`lib/data.challenges`):

  | Challenge | Type | XP |
  |---|---|---|
  | Hide Isaiah 40:31 in your heart | Memorize | 50 |
  | Encourage one friend with a verse today | Kindness | 30 |
  | Pray for 3 people on the prayer wall | Prayer | 40 |
  | Journal: where did you see God this week? | Reflection | 35 |

- **Progress surfaces.** Rolling 7-day week view + streak flame in the nav; XP/level on the dashboard.

**Endpoints:** `streak/read`, `streak/challenge`.

---

## 6. Discovery

- **Search.** By keyword, reference, or topic — MongoDB text index, weighted `{reference:10, text:5}`.
- **By mood.** Pick a feeling → a fitting verse. 6 moods (anxious, need hope, lonely, need strength,
  need forgiveness, need peace), each with a tinted card.
- **By topic.** **15 categories:** Faith, Hope, Love, Wisdom, Peace, Strength, Forgiveness, Prayer,
  Grace, Joy, Healing, Family, Youth, Leadership, Encouragement.
- **Surprise me.** Random verse. *(Inferred — client-side pick over the corpus.)*
- **Recent.** Recent searches + recently viewed verses remembered per device (`localStorage`).

**Endpoints:** `verse/search`.

---

## 7. Reading plans

- Enroll in a plan, mark each day complete, see a rolling 7-day window + overall progress bar.
- Day N maps to a real chapter schedule (`readings[N-1]`), so shown progress always matches the passage.
- Switch plans, take a break (leave), or restart anytime. One active enrollment per plan
  (`{userId,planSlug}` unique).
- **5 plans** (`lib/data.readingPlans`):

  | Plan | Tag | Focus |
  |---|---|---|
  | Through the Gospels *(default)* | Core | One chapter/day: Matthew→John |
  | Psalms of Peace | Calm | One psalm/day for anxious seasons |
  | Proverbs for Students | Wisdom | One chapter/day, practical wisdom |
  | Acts: The Church on Fire | Mission | The early church, one chapter/day |
  | First Steps: New Believer | Foundations | Essentials of following Jesus |

**Endpoints:** `plans/enroll`, `plans/leave`, `plans/day`.

---

## 8. Devotionals

- Short reflection articles pairing a verse with a story and a practical **"try this"** step.
- Featured devotion + browsable archive; each has author, read time, hero image, body, and a practice.
- Content is DB-backed; seed articles ship in `lib/data.devotions` (currently 3 by CYA leaders).

**Endpoints:** admin devotion management (`admin/devotions`).

---

## 9. Community — Prayer wall

- Verified members post requests, under their name or **anonymously**.
- Others tap **"I prayed"** — counted **once per user** (`{prayerId,userId}` unique).
- **Moderated:** posts are **hidden, never deleted**; sensitive writes use strict fail-closed session
  checks.

**Endpoints:** `prayers`, `prayers/[id]/pray`; moderation via `admin/prayers`.

---

## 10. Community — Events

- Upcoming CYA events with artwork (**pubmat** image), date/time/location, and a countdown.
- Members RSVP (**"I'm coming"**) and see the headcount (`{eventId,userId}` unique).
- Pubmats stored as blobs and served by id with a content-type allowlist + long-lived cache.

**Endpoints:** `events`, `events/[id]/rsvp`, `images/[id]`; management via `admin/events`.

---

## 11. Accounts & authentication

- **Register → verify email → full participation.** bcrypt-hashed passwords; email verification is a
  hashed, single-use, TTL token.
- **Login / logout.** Self-contained HS256 JWT session cookie (httpOnly, `sameSite=lax`).
- **Password reset.** Emailed single-use token; on reset, `tokenVersion` bumps to **invalidate all old
  sessions**.
- **Session security.** Per-request revocation check; strict fail-closed mode on sensitive writes.
- **Two-factor sign-in for admins.** Required for every admin-role account — a QR code plus 10
  one-time backup codes on first login, then a 6-digit authenticator code on every login after.
  The admin portal's shared passphrase supports the same second factor, opt-in.

**Endpoints:** `auth/register`, `auth/login`, `auth/logout`, `auth/me`, `auth/verify`,
`auth/verify/resend`, `auth/forgot`, `auth/reset`, `auth/mfa/enroll`, `auth/mfa/enroll/confirm`,
`auth/mfa/verify`.

---

## 12. Notifications

- Opt-in **daily push** delivering today's verse (Web Push / VAPID), sent **once per Manila day** via a
  GitHub Actions cron, idempotent by day.
- Subscribe/unsubscribe from the dashboard; dead subscriptions (404/410) pruned on send.
- Feature self-disables if VAPID keys are unconfigured.

**Endpoints:** `push/key`, `push/subscribe`; delivery via `cron/daily-verse`.

---

## 13. PWA & offline

- **Installable** to the home screen (web manifest, app icons) — no app store needed.
- **Service worker** caches the app shell + `offline.html` for weak or no connection.
- Theme-aware install prompt and notify toggle.

---

## 14. Privacy & data control

- Members can **export** a full copy of their data or **delete** their account at any time.
- Secrets/config via env only; no third-party analytics in-repo *(Inferred)*.

**Endpoints:** `account`, `account/export`.

---

## 15. Admin & moderation

Dark back-office console (`/admin`), deliberately sharing no chrome with the public site. Entry via a
private passphrase portal (`/admin-portal`) or a `role:admin` account.

| Tool | Does |
|---|---|
| Prayer moderation | Review and hide inappropriate posts |
| Events | Create, update, publish, delete, upload artwork |
| Devotionals | Write and manage articles |
| Roles | Grant/remove admin — **cannot strip your own role** |
| Verse sync | Force-reconcile the seed corpus into the DB |

**Endpoints:** `admin/prayers`, `admin/events`, `admin/events/image`, `admin/devotions`, `admin/users`,
`admin/sync-verses`, `admin/portal/login`, `admin/portal/logout`.

---

## 16. Feature ↔ endpoint reference

| Feature | Route module | HTTP surface |
|---|---|---|
| Verse of day / search | `verse.routes` | `verse/today`, `verse/search` |
| Streak / challenges | `streak.routes` | `streak/read`, `streak/challenge` |
| Saved verses | `saved.routes` | `saved` |
| Reading plans | `plan.routes` | `plans/enroll`, `plans/leave`, `plans/day` |
| Prayer wall | `prayer.routes` | `prayers`, `prayers/[id]/pray` |
| Events + RSVP | `event.routes` | `events`, `events/[id]/rsvp` |
| Event images | `image.routes` | `images/[id]` |
| Accounts | `account.routes` | `account`, `account/export` |
| Auth | `auth.routes` | `auth/*` |
| Push | `push.routes` | `push/key`, `push/subscribe` |
| Daily send | (cron) | `cron/daily-verse` |
| Health | `health.routes` | `health` |
| Admin | `admin.routes` / `admin-auth.routes` | `admin/*` |
| Verse sync | `sync.routes` | `admin/sync-verses` |

Full request/response contracts: [`API.md`](./API.md).

---

## 17. Content catalog (at a glance)

| Catalog | Count | Source |
|---|---|---|
| Seed verses (BSB) | ~300 | `src/data/verses.json` |
| Topic categories | 15 | `lib/data.categories` |
| Moods | 6 | `lib/data.moods` |
| Reading plans | 5 | `lib/data.readingPlans` |
| Daily challenges | 4 | `lib/data.challenges` |
| Seed devotionals | 3 | `lib/data.devotions` |

---

*Maintenance note: keep this document evidence-driven. When catalogs in `src/lib/data.ts` or routes in
`src/server/routes/**` change, update the affected section and the counts in [§17](#17-content-catalog-at-a-glance).*
