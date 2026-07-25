# Features

What CYA Daily Verse does, by capability. Product walkthrough context in [`DESIGN.md`](./DESIGN.md) §1
and the roadmap in [`ROADMAP.md`](./ROADMAP.md).

## Access model

| Role | Can |
|---|---|
| **Visitor** | Read daily verse, search Scripture, browse devotions, view prayer wall + events |
| **Member** (verified) | + save verses, streaks/XP, plans, post/pray, RSVP, daily reminders, data export/delete |
| **Admin/Moderator** | Moderate prayers, manage events/devotions, manage member roles |

## Core loop: Discover → Engage → Grow → Belong

### Verse of the day

- Deterministic daily verse (`dayNumber % corpusCount`), Manila-dated, same for everyone.
- Actions: listen (read aloud), save, copy, share.
- Cached 1h + day key; falls back to bundled seed if the DB is down.

### Reading streak & XP

- Tap **"I read today's verse"** to mark the day (once per Manila day, idempotent).
- Consecutive days extend the streak; a missed day resets it.
- **25 XP** per read; level = `floor(xp / 250) + 1`.
- **Daily challenges** award extra XP — defined server-side, claimable once/day/challenge.

### Discovery

- **Search** by keyword, reference, or topic (text-indexed, weighted).
- **By mood** — pick a feeling, get a fitting verse.
- **By topic** — 15 categories (Faith, Hope, Love, Wisdom, Peace, Strength, …).
- **Surprise me** — random verse.
- **Archive** — reproducible past daily verses (no history table needed).
- Recent searches + recently viewed remembered per device (`localStorage`).

### Reading plans

- Enroll, mark each day complete, see a rolling 7-day window + overall progress bar.
- Switch plans, take a break, or restart anytime.

### Devotionals

- Short reflection articles pairing a verse with a story and a practical "try this" step.
- Featured devotion + browsable archive.

## Community

### Prayer wall

- Verified members post requests (under their name or **anonymously**).
- Others tap **"I prayed"** — counted once per user.
- Moderated: posts are **hidden, never deleted**; new posts flagged within 24h.

### Events

- Upcoming CYA events with artwork (pubmat), date/time/location, and a countdown.
- Members RSVP (**"I'm coming"**) and see the headcount.

## Platform

### Accounts & auth

- Register → verify email → full participation.
- Login, logout, password reset (invalidates old sessions via `tokenVersion`).

### Notifications

- Opt-in **daily push** delivering today's verse (Web Push / VAPID), sent once per Manila day.

### PWA / offline

- Installable to the home screen; service worker caches the shell + `offline.html` for weak/no
  connection. No app store needed.

### Privacy

- Members can **export** a copy of their data or **delete** their account at any time.

## Admin

- **Prayer moderation** — review + hide inappropriate posts.
- **Events** — create, update, publish, delete, upload artwork.
- **Devotionals** — write and manage articles.
- **Roles** — grant/remove admin (cannot strip your own role).
- **Verse sync** — force reconcile the corpus.
- Accessed via a private admin portal (passphrase) or a `role:admin` account.
