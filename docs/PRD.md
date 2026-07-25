# Product Requirements Document (PRD)

**Product:** CYA Daily Verse
**Owner:** Christ's Youth in Action (CYA)
**Status:** Live (v1.0.0)
**Tagline:** *Kay Kristo Buong Buhay, Habambuhay!*

See [`SYSTEM-FLOW.md`](./system-flow.md) for the plain-language product walkthrough and
[`DESIGN.md`](./DESIGN.md) for the technical design.

## 1. Problem

Young people struggle to build a consistent daily habit with Scripture and to stay connected to their
faith community between gatherings. Existing apps are content-heavy but weak on community and daily
return.

## 2. Vision

One place where a young person receives a verse each day, reflects, searches Scripture, follows a
reading plan, prays with others, and stays connected through events — installable, offline-capable,
no app store required.

## 3. Goals

| Goal | Success signal |
|---|---|
| **Show up daily** | Fresh verse + reason to return each day; growing streaks |
| **Grow in faith** | Verses saved, plans followed, devotions read |
| **Belong** | Prayers posted/answered, event RSVPs |

**Non-goals:** social feed/DMs, in-app purchases, multi-tenant/other ministries, native app store
distribution.

## 4. Users

| Role | Capabilities |
|---|---|
| **Visitor** | Read daily verse, search, browse devotions/prayer/events |
| **Member** | + save verses, streaks/XP, plans, post/pray, RSVP, daily reminders |
| **Admin/Moderator** | Moderate prayers, manage events/devotions, manage roles |

## 5. Features & requirements

| # | Feature | Requirement | Status |
|---|---|---|---|
| F1 | Verse of the day | Deterministic daily verse, Manila-dated, listen/save/copy/share | Done |
| F2 | Reading streak + XP | Mark read once/day; streak extend/reset; 25 XP/read; levels | Done |
| F3 | Daily challenges | Server-defined catalog; XP once/day/challenge | Done |
| F4 | Search & discovery | Keyword/reference/topic search, mood shortcuts, surprise, archive | Done |
| F5 | Reading plans | Enroll, mark day, week view, progress, switch/leave | Done |
| F6 | Devotionals | Featured + archive; verse + story + practice | Done |
| F7 | Prayer wall | Post (named/anonymous), "I prayed" count; moderated | Done |
| F8 | Events | Listing with pubmat, countdown, RSVP headcount | Done |
| F9 | Accounts | Register, email verify, login, password reset | Done |
| F10 | Push reminders | Opt-in daily verse notification (VAPID) | Done |
| F11 | PWA/offline | Installable, offline shell | Done |
| F12 | Privacy controls | Export + delete own data | Done |
| F13 | Admin portal | Passphrase or role:admin; moderation dashboards | Done |

## 6. Key rules (product logic)

- **Daily boundary:** Asia/Manila midnight. Streak resets on a missed day.
- **Participation gate:** posting/praying requires a verified email.
- **Moderation:** prayers are hidden, never deleted; new posts flagged within 24h.
- **Rewards authority:** XP always computed server-side; client cannot inflate.

## 7. Constraints

- Single Next.js deployment + MongoDB; small team; no dedicated ops.
- Scripture limited to public-domain BSB text.
- No always-on scheduler — daily push driven by external GitHub Actions cron.

## 8. Metrics (target signals)

Daily active members, streak retention, verses saved, prayers posted/answered, event RSVPs, push
opt-in rate. *(Instrumentation is future work — see `DESIGN.md` §22.)*

## 9. Open questions

- Rate-limit coverage for non-auth write endpoints (prayer, RSVP, enroll).
- Verse-of-day archive stability if the corpus is reordered.
- Production topology, backups, and DR (host currently inferred as Railway).
