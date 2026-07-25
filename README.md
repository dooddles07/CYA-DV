<div align="center">
  <img src="public/media/cya-logo.png" alt="CYA Daily Verse logo" width="120" />

# CYA Daily Verse

**Kay Kristo Buong Buhay, Habambuhay!** — meeting God in His Word, the first thing you reach for each morning.

CYA Daily Verse is a daily-devotional Progressive Web App built by **Christ's Youth in Action**. It pairs a deterministic verse of the day with search, reading plans, devotionals, streaks, and a moderated praying community — so members can discover Scripture, engage with it, grow a habit, and belong to a community, all in one installable app.

[![License: MIT](https://img.shields.io/badge/License-MIT-0095FF.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-0095FF.svg)](./docs/CHANGELOG.md)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Screenshots / Demo](#screenshots--demo)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Known Limitations](#known-limitations)
- [FAQ](#faq)
- [License](#license)
- [Maintainers / Contact](#maintainers--contact)
- [Acknowledgements](#acknowledgements)

---

## Project Overview

**Purpose.** Give young believers a single, beautiful place to meet God in His Word every day and stay connected to their community between gatherings.

**The problem it solves.** Daily devotion is easy to intend and hard to keep. Scripture, reflection, community prayer, and event life are usually scattered across chat groups, notes apps, and social feeds. CYA Daily Verse consolidates the whole loop — **Discover → Engage → Grow → Belong** — into one installable app that works offline and reminds you each morning.

**Intended audience.** Members of Christ's Youth in Action and anyone looking for a focused, Scripture-first daily habit. Visitors can read and browse freely; verified members unlock saving, streaks, plans, prayer, and RSVPs; admins moderate the community.

**Architecture.** A single **Next.js 16** deployment serves both the server-rendered UI and a JSON API, backed by **MongoDB**. The app is stateless and horizontally scalable — shared coordination (rate limiting, the daily-send lock) lives in Mongo. A GitHub Actions cron triggers the daily verse push. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for detail.

---

## Features

**Discover**

- ✅ Deterministic **verse of the day** — Manila-dated, same for everyone, cached with a bundled fallback if the DB is down
- ✅ **Search** Scripture by keyword, reference, or topic (weighted text index)
- ✅ Discover **by mood** and **by topic** (15 categories), plus **Surprise me**
- ✅ **Archive** of past daily verses, reproducible without a history table
- ✅ Recent searches and recently viewed remembered per device

**Engage & Grow**

- ✅ **Reading streaks & XP** — mark today's verse once per Manila day, level up, claim daily challenges
- ✅ **Reading plans** — enroll, mark days complete, track a rolling 7-day window and overall progress
- ✅ **Devotionals** — featured reflection articles plus a browsable archive
- ✅ Verse actions: listen (read aloud), save, copy, share

**Belong (Community)**

- ✅ **Prayer wall** — post requests by name or anonymously; others tap "I prayed"; moderated (hidden, never deleted)
- ✅ **Events** — upcoming CYA events with artwork, countdown, and member RSVPs

**Platform**

- ✅ **Accounts & auth** — register, email verification, login, password reset (bcrypt + `jose`-signed session cookies)
- ✅ **Opt-in daily push** notifications (Web Push / VAPID)
- ✅ **PWA / offline** — installable, service-worker cached shell with an offline fallback
- ✅ **Privacy** — members can export their data or delete their account anytime
- ✅ **Admin** — prayer moderation, event/devotion management, role management, verse sync
- ✅ Accessible by default — full `prefers-reduced-motion` support, WCAG-sized targets, focus management

Full capability breakdown in [`docs/FEATURES.md`](./docs/FEATURES.md).

---

## Screenshots / Demo

> **TODO:** Add screenshots and demo GIFs (e.g. `docs/images/verse-of-the-day.png`, `docs/images/prayer-wall.png`).

---

## Live Demo

- **Production:** https://cya-daily-verses-production.up.railway.app
- **Documentation:** [`docs/`](./docs)

---

## Tech Stack

### Frontend

- Next.js 16 (App Router, Turbopack)
- TypeScript (strict)
- Tailwind CSS v4 with CSS-variable design tokens
- Framer Motion (animation)
- React Three Fiber + drei (3D hero)
- Lucide (icons)
- Manrope (UI) and Lora (scripture) typefaces

### Backend

- Next.js Route Handlers (JSON API)
- Node.js server layer (`src/server`: controllers, routes, services, middleware)
- Mongoose (data models)
- `jose` (JWT session signing), `bcryptjs` (password hashing)
- `nodemailer` (email), `web-push` (VAPID notifications)

### Database

- MongoDB (via Mongoose)
- `mongodb-memory-server` for local dev and tests

### Infrastructure

- Railway (hosting — inferred; see [Deployment](#deployment))
- GitHub Actions (daily verse push cron)

---

## Installation

```bash
git clone <repository-url>
cd "CYA DV"
npm install
```

Start development against a disposable local database:

```bash
npm run dev:local   # local MongoDB + seeded verses + next dev
```

Open http://localhost:3000.

`dev:local` stands up a disposable MongoDB (`mongodb-memory-server`) under `.dev-db` on port **27099**, seeds the verse corpus, and runs the app against it — no external database needed. Use plain `npm run dev` only when `MONGO_URL` in `.env` already points at a database you can reach (the production value targets Railway's private network and will not resolve locally).

Production build:

```bash
npm run build   # Next + Turbopack production build
npm start       # serve the production build
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values. Required variables gate boot via `assertEnv()` in `src/server/config/env.js`; optional integrations disable themselves gracefully when unset.

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `AUTH_SECRET` | ✅ | HS256 JWT session-signing secret |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical/OG URLs and reset/verify links (public) |
| `VAPID_PUBLIC_KEY` | ❌ | Web push public key (push off if unset) |
| `VAPID_PRIVATE_KEY` | ❌ | Web push private key |
| `VAPID_CONTACT_EMAIL` | ❌ | VAPID `mailto:` contact |
| `CRON_SECRET` | ❌ | Bearer secret for the daily push cron |
| `ADMIN_PORTAL_PASSWORD` | ❌ | Passphrase for `/admin-portal` (8-hour sessions) |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | ❌ | Email for verification/password reset (off if unset) |
| `TRUSTED_PROXY_HOPS` | ❌ | Reverse-proxy hop count for client-IP derivation |

Generation hints for secrets are documented inline in `.env.example`.

---

## Project Structure

```text
CYA DV/
├── src/
│   ├── app/                 # routes (App Router)
│   │   ├── (site)/          # public + member pages
│   │   ├── (admin)/         # admin portal pages
│   │   └── api/             # JSON API route handlers
│   ├── components/
│   │   ├── home/            # home-page sections
│   │   ├── motion/          # Reveal, Stagger, Magnetic, Tilt3D, Parallax, Counter
│   │   ├── three/           # React Three Fiber hero scene
│   │   ├── nav/             # navbar, bottom nav, footer, theme toggle
│   │   ├── pwa/             # service-worker / install UI
│   │   └── ui.tsx           # Button, Badge, Card, ProgressBar, Field, …
│   ├── data/                # static config (not user data)
│   ├── lib/                 # data access, motion tokens, hooks, cx
│   └── server/              # controllers, routes, services, models, middleware
├── docs/                    # architecture, API, database, deployment, design docs
├── scripts/                 # dev-local, seed, verse fetch, member/admin utilities
├── tests/                   # node:test suites (in-memory Mongo)
├── public/                  # icons, media, PWA assets
├── package.json
└── README.md
```

| Folder | Purpose |
|---|---|
| `src/app` | App Router routes: public/member pages, admin pages, and the JSON API |
| `src/components` | UI, motion primitives, navigation, 3D hero, and PWA components |
| `src/lib` | Client/data helpers, motion tokens, hooks, and static config |
| `src/server` | Server layer — Mongoose models, controllers, routes, services, middleware |
| `docs` | Project documentation (architecture, API, database, deployment, design) |
| `scripts` | Operational scripts (local dev DB, seeding, verse fetch, member creation) |
| `tests` | Automated test suites run with `node:test` against in-memory Mongo |
| `public` | Static assets — icons, media, and PWA files |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (requires a reachable `MONGO_URL`) |
| `npm run dev:local` | Start a disposable local Mongo, seed verses, then run `next dev` |
| `npm run build` | Build the production bundle (Next + Turbopack) |
| `npm start` | Serve the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run the test suites against in-memory Mongo |
| `npm run seed` | Seed the verse corpus |
| `npm run purge:seed` | Remove seeded verse data |
| `npm run member:create` | Create a member account from the CLI |
| `npm run verses:fetch` | Fetch/refresh the verse source data |

Type checking is run separately with `npx tsc --noEmit`.

---

## Configuration

| File | Purpose |
|---|---|
| `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | TypeScript compiler options (strict) |
| `next.config.ts` | Next.js configuration |
| `postcss.config.mjs` | PostCSS pipeline for Tailwind CSS v4 |
| `eslint.config.mjs` | ESLint (flat config, `eslint-config-next`) |
| `.env` / `.env.example` | Runtime environment variables (see above) |
| `src/app/globals.css` | Design tokens — mirrors the Figma **Semantic** variable collection one-to-one; light/dark map to Figma modes via `.dark` on `<html>` |
| `.github/workflows/daily-verse-push.yml` | GitHub Actions cron that POSTs the daily verse push |

Brand primary is `#0095FF` throughout; scripture is set in Lora via `.verse-text`. The UI is implemented from the [CYA Daily Verse Figma design system](https://www.figma.com/design/Ip0B5nsZfu8h1UfxGpW3I5/CYA-DAILY-VERSE). See [`docs/DESIGN.md`](./docs/DESIGN.md).

---

## Development Workflow

1. Install dependencies: `npm install`
2. Start the app: `npm run dev:local`
3. Create a feature branch: `git checkout -b feat/your-feature`
4. Make changes, then verify locally:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm test`
5. Commit with a clear, conventional message (e.g. `feat(prayer): add anonymous posting`)
6. Push your branch and open a Pull Request.

---

## Testing

Tests run with the built-in Node test runner (`node:test`) against an in-memory MongoDB, so no external database is required.

```bash
npm test
```

Existing suites cover dates, gamification, reading plans, verse rotation, verse data, and service integration (`tests/*.test.mjs`). See [`docs/TESTING.md`](./docs/TESTING.md).

> **TODO:** Add a coverage command and script. End-to-end and contract suites are on the [roadmap](#roadmap).

---

## Deployment

A single Next.js 16 deployment (SSR UI + JSON API) backed by MongoDB. The app is stateless and horizontally scalable; shared coordination lives in Mongo.

**Build pipeline**

| Stage | Command |
|---|---|
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |
| Test | `npm test` |
| Build | `npm run build` |
| Start | `npm start` |
| Seed | `npm run seed` (or auto `ensureSynced()` on first request post-deploy) |

**Background scheduler.** `.github/workflows/daily-verse-push.yml` runs cron `0 22 * * *` UTC (06:00 Manila) and POSTs `/api/cron/daily-verse` with `Authorization: Bearer $CRON_SECRET`. The send is idempotent (`PushLog.day` prevents double-send).

**Hosting.** Railway is inferred from `.env` comments and `NEXT_PUBLIC_SITE_URL`; no Docker/K8s or deploy workflow is committed. Full detail in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

> **TODO:** Confirm and document the production host, managed-DB plan, backups, DR, and deploy/rollback workflow.

---

## Contributing

Contributions are welcome.

1. **Fork** the repository.
2. **Create a feature branch**: `git checkout -b feat/your-feature`
3. **Commit** your changes with a clear, conventional message.
4. **Push** the branch: `git push origin feat/your-feature`
5. **Open a Pull Request** describing the change and how you verified it.

Before opening a PR, run `npm run lint`, `npx tsc --noEmit`, and `npm test`.

---

## Roadmap

Priority-ordered, no committed dates. Full detail in [`docs/ROADMAP.md`](./docs/ROADMAP.md).

**High priority**

- Metrics + alerting; wire `/api/health` to a probe
- Extend rate limiting to all state-changing endpoints; confirm CSRF posture
- Document/verify production topology and commit a deploy/rollback workflow

**Medium priority**

- Migrate `src/server/**` to TypeScript
- Lightweight migration mechanism for non-verse collections
- Cache/cheapen the `tokenVersion` revocation check
- Admin-action audit log

**Low priority**

- Replace `unstable_cache` with a stable abstraction
- Add E2E and contract test suites
- Consider Redis for rate limiting/caching

---

## Known Limitations

- **Verse coupling.** The verse of the day couples to the lexical corpus order — reordering or removing verses retroactively changes the archive mapping.
- **Rate-limit coverage.** Non-auth write endpoints (prayer, RSVP, enroll) need confirmed rate-limit coverage.
- **No formal migrations.** The verse corpus self-reconciles via `ensureSynced()`; other collections have no migration mechanism yet.
- **Cache drift.** Per-instance `unstable_cache` may briefly differ across instances until each revalidates.
- **Ops posture.** Production host, backups, and DR are inferred, not verified.

---

## FAQ

**Do I need a database to run it locally?**
No. `npm run dev:local` spins up an in-memory MongoDB, seeds it, and runs the app against it.

**Why won't plain `npm run dev` connect?**
The production `MONGO_URL` targets Railway's private network and won't resolve locally. Use `npm run dev:local`, or point `MONGO_URL` at a database you can reach.

**Is it installable on a phone?**
Yes. It's a PWA — add it to your home screen; the service worker caches the shell with an offline fallback.

**What happens if optional integrations aren't configured?**
Web push and email (verification/reset) disable themselves gracefully when their environment variables are unset.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Maintainers / Contact

Built and maintained by **Christ's Youth in Action**.

> **TODO:** Add maintainer names and a contact email or channel.

---

## Acknowledgements

- **Christ's Youth in Action** — vision, content, and community.
- Built with [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion/), [React Three Fiber](https://docs.pmnd.rs/react-three-fiber), and [Mongoose](https://mongoosejs.com).
- UI implemented from the [CYA Daily Verse Figma design system](https://www.figma.com/design/Ip0B5nsZfu8h1UfxGpW3I5/CYA-DAILY-VERSE).
