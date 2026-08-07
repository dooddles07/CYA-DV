# Deployment Guide

Complete guide to building, configuring, deploying, and operating **CYA Daily
Verse**. A new engineer should be able to deploy the application by following
this document end to end. See [`ARCHITECTURE.md`](./ARCHITECTURE.md)
(Deployment Architecture, Design Decisions & Trade-offs) for rationale.

> **Ground truth vs. reference patterns.** The application currently ships as a
> single **Next.js** server deployed on **Vercel** with **MongoDB Atlas**, plus a
> **GitHub Actions** cron for the daily push. Sections for Docker, generic
> CI/CD, Railway, and AWS are included as **portable reference patterns** the
> team can adopt; where a file or provider is not yet part of the repo it is
> marked **(not in repo — template)** so nothing here misrepresents the current
> setup.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Repository Structure](#2-repository-structure)
3. [Prerequisites](#3-prerequisites)
4. [Environment Variables](#4-environment-variables)
5. [Local Development Setup](#5-local-development-setup)
6. [Docker Deployment](#6-docker-deployment)
7. [Database Setup and Migrations](#7-database-setup-and-migrations)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Vercel Deployment](#9-vercel-deployment)
10. [Railway Deployment](#10-railway-deployment)
11. [AWS Deployment](#11-aws-deployment)
12. [Deployment Workflow](#12-deployment-workflow)
13. [Production Deployment Checklist](#13-production-deployment-checklist)
14. [Rollback Strategy](#14-rollback-strategy)
15. [Monitoring and Logging](#15-monitoring-and-logging)
16. [Security Best Practices](#16-security-best-practices)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Overview

**Application.** CYA Daily Verse is a Next.js 16 (App Router) full-stack app:
server-rendered UI **and** JSON API in one deployment, backed by MongoDB. It
serves a daily verse, reading streaks/XP, a moderated prayer wall, events + RSVP,
reading plans, saved verses, and web-push reminders.

**Purpose of this guide.** Document how the app is built, configured, deployed,
monitored, and rolled back across all environments.

**Supported environments.**

| Environment | Runtime | Database | Purpose |
|---|---|---|---|
| **Development** | `npm run dev:local` | `mongodb-memory-server` @ `:27099` (disk-backed `.dev-db`) | Local feature work |
| **Staging** | Vercel (Preview deployment) | Separate MongoDB Atlas cluster/database | Pre-production verification — *not currently provisioned; recommended* |
| **Production** | Vercel | MongoDB Atlas | Live traffic |

**High-level deployment workflow.**

```
Developer
    |
    v
Git Repository (GitHub)
    |
    v
CI/CD (GitHub Actions checks)
    |
    v
Build (next build)  [optional: Docker image]
    |
    v
Cloud Deployment (Vercel)
    |
    v
Production Environment (Next.js + MongoDB Atlas)
```

**Production architecture.** Stateless app — horizontally scalable. All shared
coordination (rate-limit counters, daily-send idempotency lock) lives in Mongo,
so any instance can serve any request.

```mermaid
graph TB
  Dev["Local dev<br/>npm run dev:local<br/>(mongodb-memory-server :27099)"]
  subgraph Prod["Production (Vercel)"]
    App["Next.js server (SSR + API)"]
    Mongo[("MongoDB Atlas")]
  end
  GH["GitHub Actions<br/>daily cron"]
  App --- Mongo
  GH -->|HTTPS POST /api/cron/daily-verse<br/>Bearer CRON_SECRET| App
```

---

## 2. Repository Structure

```
CYA DV/
├── .github/
│   └── workflows/
│       └── daily-verse-push.yml     # cron: POST /api/cron/daily-verse
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md                # this file
├── public/                          # static assets (media, icons, manifest)
├── scripts/
│   ├── dev-local.mjs                # one-command local dev (in-memory Mongo)
│   ├── seed.mjs                     # upsert verses.json -> DB
│   ├── purge-seed.mjs               # remove seeded verses
│   ├── create-member.mjs            # bootstrap a member/admin account
│   └── fetch-verses.mjs             # build the verse dataset
├── src/
│   ├── app/                         # App Router: (site), (admin), api/**
│   │   └── api/**/route.js          # thin shims re-exporting server routes
│   ├── components/
│   ├── data/verses.json             # 300-verse corpus (seed source)
│   ├── lib/                         # client utils + shared catalogs
│   └── server/
│       ├── config/  (db, env, mailer)
│       ├── controllers/
│       ├── middleware/  (session, rate-limit, require-admin)
│       ├── models/                  # Mongoose schemas
│       ├── routes/                  # URL -> controller wiring
│       ├── services/                # only layer touching Mongoose
│       └── utils/
├── .env.example                     # documented env template (no secrets)
├── next.config.ts                   # security headers, image config
├── eslint.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

**Notes.**
- **No `frontend/` + `backend/` split** — Next.js is one project; the API lives
  under `src/app/api/**` and delegates to `src/server`.
- **No `database/migrations/`** — schema is defined by Mongoose models; verse
  data is reconciled from `src/data/verses.json` (see §7).
- **Docker files (`Dockerfile`, `docker-compose.yml`, `.dockerignore`) are not
  in the repo** — templates in §6 if you adopt containers.
- **CI/CD:** only `daily-verse-push.yml` exists today (a scheduled cron, not a
  build/test/deploy pipeline). Test/build/deploy workflow templates in §8.

---

## 3. Prerequisites

**Tools.**

| Tool | Version | Notes |
|---|---|---|
| Node.js | `22.6.0 – 22.x` | `package.json`'s `engines` field pins this range — Vercel's Project Settings → Node.js Version must match (set to `22.x`), otherwise it's overridden by `engines` anyway with a build warning |
| npm | `>= 10` | ships with Node 22 |
| Git | `>= 2.30` | |
| MongoDB client | any | `mongosh` for inspecting prod data (via the Atlas connection string) |
| Vercel CLI | latest | `npm i -g vercel` (optional, for CLI deploys/logs) |
| Docker | `>= 24` | **only** if adopting the §6 container path |
| Docker Compose | `>= 2` | optional |

> Local development needs **no local MongoDB install** — `npm run dev:local`
> provisions an in-memory instance automatically.

**Accounts.**
- **GitHub** — source + Actions (cron, CI).
- **Vercel** — hosting (current production).
- **MongoDB Atlas** — managed database (current production).
- **Railway** / **AWS** — only if adopting those alternate paths (§10 / §11).
- **Resend** account + API key — optional, enables reset/verify email. A
  verified sending domain is needed for delivery beyond the account's own
  signup address (see §5's `RESEND_API_KEY` row).

---

## 4. Environment Variables

Environment variables externalize configuration and secrets so the same image
runs across environments without code changes. **Required** vars are asserted at
boot by `assertEnv()` ([`src/server/config/env.js`](../src/server/config/env.js))
— a missing one fails startup with a clear message instead of a deep runtime
error. Optional integrations disable themselves gracefully when unset.

**Files.**

| File | Committed? | Use |
|---|---|---|
| `.env.example` | **Yes** | Documented template — no real values |
| `.env` | **No** (gitignored) | Local development values |
| `.env.staging` | **No** | Staging values — add if a staging environment is provisioned |
| `.env.production` | **No** | Set in the host's secret manager, not on disk |

**Variables.**

| Variable | Required | Purpose | Example format |
|---|---|---|---|
| `MONGO_URL` | **Yes** | MongoDB connection string | `mongodb://<user>:<pass>@<host>:27017/<db>` |
| `AUTH_SECRET` | **Yes** | HS256 secret signing session + admin JWTs | 64-hex string |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Canonical/OG URLs + reset/verify links (public) | `https://<your-domain>` |
| `VAPID_PUBLIC_KEY` | No | Web-push public key (push off if unset) | base64url |
| `VAPID_PRIVATE_KEY` | No | Web-push private key | base64url |
| `VAPID_CONTACT_EMAIL` | No | VAPID `mailto:` contact | `mailto:you@example.com` |
| `CRON_SECRET` | No | Bearer secret for the daily-push cron | 48-hex string |
| `ADMIN_PORTAL_PASSWORD` | No | Passphrase for `/admin-portal` (8h session) | long random string |
| `ADMIN_PORTAL_TOTP_SECRET` | No | Shared TOTP secret — portal MFA (unset = passphrase-only) | base32 string, see `.env.example` |
| `RESEND_API_KEY` | No | Resend HTTP API key (reset/verify email) — SMTP doesn't work reliably from Vercel functions | `re_...` |
| `RESEND_FROM` | No | From address on outbound mail — sandboxed to your Resend account's own email until a domain is verified | `CYA <onboarding@resend.dev>` |
| `TRUSTED_PROXY_HOPS` | No | Trusted reverse-proxy hops for client-IP derivation (default 1) | `1` |

> This project uses **cookie-JWT sessions** (no `JWT_SECRET`/`SESSION_SECRET`
> pair, no Redis) and stores rate-limit/cron state in Mongo — so `REDIS_URL` is
> not used. `NODE_ENV`/`PORT` are managed by Next.js/the host and rarely set by
> hand. Generic vars from other stacks (`DATABASE_URL`, `API_URL`, AWS keys) are
> **not** consumed unless you adopt those providers.

**Generate secrets.**

```bash
# AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# CRON_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

# VAPID key pair
node -e "console.log(require('web-push').generateVAPIDKeys())"

# ADMIN_PORTAL_TOTP_SECRET (optional — enables portal MFA)
node --input-type=module -e "import{generateSecret}from './src/server/utils/totp.js';console.log(generateSecret())"
```

**Admin MFA.** Admin-role member accounts require TOTP automatically — no
operator action needed, each account enrolls itself (QR code + backup codes)
on first login after this ships. The admin **portal** passphrase's MFA is
opt-in: set `ADMIN_PORTAL_TOTP_SECRET` above and share it out-of-band with
portal users the same way `ADMIN_PORTAL_PASSWORD` already is; leave it unset
to keep the portal passphrase-only.

**Setup.**

```bash
cp .env.example .env
# then fill in MONGO_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL at minimum
```

**Secret management rules.**
- **Never commit `.env*` files** (only `.env.example`).
- In production, store secrets in the **host's secret manager** (Vercel
  Environment Variables, Railway Variables, AWS Secrets Manager) — never in the
  image or repo.
- **Rotate** `AUTH_SECRET`, `CRON_SECRET`, `ADMIN_PORTAL_PASSWORD`, and (if set)
  `ADMIN_PORTAL_TOTP_SECRET` periodically and whenever a person with access
  leaves. Rotating `AUTH_SECRET`
  invalidates all active sessions (acceptable, forces re-login).

---

## 5. Local Development Setup

### Clone

```bash
git clone <repository-url>
cd "CYA DV"
```

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
```

`dev:local` does not read `.env` or touch the production database — it runs a
throwaway local Mongo. Fill `.env` only for plain `npm run dev` against a real
`MONGO_URL`.

### Start (recommended — one command)

```bash
npm run dev:local
```

This ([`scripts/dev-local.mjs`](../scripts/dev-local.mjs)):
1. Starts `mongodb-memory-server` on port **27099**, data persisted under
   `.dev-db` (survives restarts).
2. Reuses an already-running local mongod if present (avoids stale-lock crash).
3. Seeds the verse corpus once.
4. Launches `next dev` pointed at the local database.

App: `http://localhost:3000`.

### Alternative — plain dev against a real DB

```bash
npm run dev   # requires a reachable MONGO_URL in .env
```

> The production `MONGO_URL` targets the production MongoDB Atlas cluster —
> never point local dev at it. Use `dev:local`, or your own local/Atlas
> connection string instead.

### Database setup / seeding

No migration step. To seed verses into a real database:

```bash
npm run seed          # upsert 300 verses from src/data/verses.json (idempotent)
npm run member:create # bootstrap a member/admin account
```

---

## 6. Docker Deployment

**(not in repo — reference template.)** The app deploys today via Vercel's
native Next.js build (no Dockerfile required). Adopt the pattern below if you
want reproducible container images or a different host.

**Why Docker.** Reproducible builds, environment parity, easy horizontal
scaling, and portability across hosts. Production images should be multi-stage
(small, non-root, no dev dependencies).

### `Dockerfile` (template)

```dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- run ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Run as an unprivileged user.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["npm", "start"]
```

### `.dockerignore` (template)

```
node_modules
.next
.dev-db
.env*
!.env.example
.git
docs
```

### Build & run

```bash
docker build -t cya-daily-verse .
docker run -p 3000:3000 --env-file .env cya-daily-verse
```

### `docker-compose.yml` (template — local full stack)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    environment:
      MONGO_URL: mongodb://mongo:27017/cya
    depends_on: [mongo]
    restart: unless-stopped
  mongo:
    image: mongo:7
    volumes: ["mongo-data:/data/db"]
    restart: unless-stopped
volumes:
  mongo-data:
```

```bash
docker compose up -d
```

- **Services:** `app` (Next.js) + `mongo`.
- **Network:** default compose bridge; `app` reaches `mongo` by service name.
- **Volume:** `mongo-data` persists database state across restarts.

**Production best practices:** multi-stage build, `node:alpine` base, non-root
user, `HEALTHCHECK` hitting `/api/health`, `restart: unless-stopped`, ship logs
to stdout (host aggregates), and scan images (`docker scout cves` / Trivy).

---

## 7. Database Setup and Migrations

**Requirements.** MongoDB (Atlas cluster in prod; in-memory locally). Driver:
Mongoose. Connection is a single pooled, cached client
([`config/db.js`](../src/server/config/db.js)) with `bufferCommands: false` and a
5s server-selection timeout.

**Connection config.** Set `MONGO_URL`. Nothing else required — indexes are
declared in the models and built by Mongoose `autoIndex` on first model use.

**Migrations.** There is **no migration framework** (MongoDB is schemaless).
Schema shape lives in the Mongoose models. Data reconciliation:

- **Verses** self-reconcile: `verse.service.syncVerses()` bulk-upserts by
  `reference`; `ensureSynced()` runs it once per process on first verse read.
  Admins can force it: `POST /api/admin/sync-verses` (auth: `CRON_SECRET` bearer
  or admin session).
- **Devotions** seed themselves once when the collection is empty.

```bash
npm run seed          # manual verse sync (idempotent upsert)
npm run purge:seed    # remove seeded verse data
# npm run migrate / migrate:rollback  -> NOT APPLICABLE (no migration tool)
```

**When it runs.** Verse sync auto-fires on the first request after a redeploy —
no manual step needed for content changes bundled in `verses.json`.

**Production data-change process.**
1. Back up the database first (see §14 — backup automation is not yet in place; take a manual snapshot).
2. Deploy the code (model + `verses.json` changes ship together).
3. First request builds new indexes and runs the upsert sync.
4. Verify `GET /api/health`.

> **Breaking schema changes** (rename/remove a field) have **no automated
> backfill** — write a one-off script and back up first. Adding a `unique` index
> to a collection with duplicates fails the build; de-duplicate first.

---

## 8. CI/CD Pipeline

### Continuous Integration

Recommended gates on every pull request (all runnable locally):

```
Code Push / PR
    |
    v
Install (npm ci)
    |
    v
Lint (npm run lint)
    |
    v
Type check (npx tsc --noEmit)
    |
    v
Test (npm run test:coverage  — node:test + in-memory Mongo)
    |
    v
Build (npm run build)
    |
    v
E2E (npm run test:e2e  — Playwright against dev:local)
    |
    v
Deploy (Vercel — on merge to main)
```

### Existing workflow

`.github/workflows/daily-verse-push.yml` — **scheduled cron**, not a build
pipeline:
- Trigger: cron `0 22 * * *` UTC (06:00 Manila) + manual `workflow_dispatch`.
- Action: `POST /api/cron/daily-verse` with `Authorization: Bearer ${{ secrets.CRON_SECRET }}` and the site URL.
- Idempotent: `PushLog.day` prevents double-send; the lock releases on broadcast
  failure so a retry is safe.

### CI workflow (`.github/workflows/ci.yml`)

Runs on every push and PR against `main`: install, lint, type check, test (with coverage), dependency
audit, build, then the Playwright E2E suite. Placeholder `MONGO_URL`/`AUTH_SECRET`/`NEXT_PUBLIC_SITE_URL`
values are set at the job level — build-time only, no live database is reached.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      MONGO_URL: mongodb://127.0.0.1:27017/ci
      AUTH_SECRET: ci-placeholder-secret-do-not-use-in-prod
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test:coverage
      - run: npm audit --audit-level=high
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

**Branch strategy.** Feature branches → PR → CI must pass → review → merge to
`main` → deploy. Store CI/deploy secrets (`CRON_SECRET`, Vercel token) in GitHub
**repository secrets**; gate production deploys with an environment
**approval** if desired. Branch protection requiring `ci.yml` to pass before merge
is not yet configured on `main`.

### Workflows

```
.github/workflows/
├── daily-verse-push.yml   # exists — scheduled cron
├── ci.yml                 # exists — lint + typecheck + test + audit + build
└── deploy.yml             # optional — deploy on merge (currently Vercel auto-deploy)
```

---

## 9. Vercel Deployment

Current production host. Next.js is first-class on Vercel — no Dockerfile
needed. Database is **external** (MongoDB Atlas), since Vercel provides no
database.

1. **Import** the GitHub repo into Vercel; framework auto-detected (Next.js).
2. **Database.** Provision a MongoDB Atlas cluster; add Vercel's egress (or
   `0.0.0.0/0` if using Atlas's Vercel integration) to the Atlas IP access
   list; copy the SRV connection string.
3. **Environment variables:** add `MONGO_URL` (Atlas SRV string), `AUTH_SECRET`,
   `NEXT_PUBLIC_SITE_URL`, plus optional VAPID/`RESEND_API_KEY`/`CRON_SECRET` —
   set per environment (Production / Preview / Development).
4. **Build/start.** Detected automatically: `npm run build`; output managed by
   the Next.js adapter.
5. **Migrations.** None — verse sync auto-runs on first request.
6. **Preview deployments:** every PR gets an isolated preview URL — point it at
   a **staging** Atlas database, not production.
7. **Production:** merges to `main` promote to production.
8. **Custom domains:** Project → Domains → add and configure DNS; set
   `NEXT_PUBLIC_SITE_URL` to the final domain.
9. **Cron:** the daily push currently runs via the GitHub Actions workflow
   (§8); Vercel Cron can replace it — schedule a request to
   `/api/cron/daily-verse` with the bearer secret.
10. **Health / monitoring.** Point an uptime check at `GET /api/health`
    (returns `200` only when env + DB are ready).
11. **Rollback.** Vercel dashboard → Deployments → previous production deploy
    → **Promote to Production** (see §14).

```bash
npm i -g vercel
vercel login
vercel link       # link to the project
vercel env ls     # inspect env
vercel            # preview deploy
vercel deploy --prod
vercel logs
```

---

## 10. Railway Deployment

**(alternative host — not currently used.)** Builds with Nixpacks
(auto-detects Next.js) — no Dockerfile needed. Railway can also host the
database itself via its MongoDB plugin, if you'd rather not use Atlas.

- **Connect repo.** Railway → New Project → Deploy from GitHub → select this
  repo. Enable auto-deploy on `main`.
- **Database.** Either point `MONGO_URL` at the same Atlas cluster used in
  production, or add Railway's MongoDB plugin (injects a private `MONGO_URL`
  reachable at `mongodb.railway.internal`, usable only from within Railway).
- **Configure variables.** Service → Variables: set `MONGO_URL`, `AUTH_SECRET`,
  `NEXT_PUBLIC_SITE_URL`, and any optional integrations (VAPID, `RESEND_API_KEY`,
  `CRON_SECRET`, `ADMIN_PORTAL_PASSWORD`).
- **Build/start.** Detected automatically: build `npm run build`, start
  `npm start`. Override in Settings if needed.
- **Deploy.** Push to `main` (auto-deploy) or `railway up` from the CLI.
- **Logs.** `railway logs` or the dashboard Deploy Logs.
- **Rollback.** Railway dashboard → Deployments → select a previous successful
  deploy → **Redeploy** (see §14).

```bash
npm i -g @railway/cli
railway login
railway link          # link to the project
railway variables     # inspect env
railway run npm run seed
railway up            # deploy current dir
railway logs
```

---

## 11. AWS Deployment

**(reference architecture — not currently used.)** For teams standardizing on
AWS.

```
Users
  |
CloudFront (CDN, TLS)
  |
Application Load Balancer
  |
ECS Fargate (Next.js container from §6)
  |
DocumentDB / MongoDB Atlas       S3 (optional asset offload)
```

- **Compute:** ECS **Fargate** running the §6 image is the natural fit (SSR
  server). EC2 (self-managed) or Lambda (`@ App Router` adapters) are possible
  but heavier/limited for a long-lived SSR server.
- **Database:** MongoDB **Atlas** (recommended — same wire protocol) or AWS
  **DocumentDB**. Set `MONGO_URL` accordingly. RDS/Aurora are **not** applicable
  (this app is not SQL).
- **Storage:** event images currently stream from Mongo. Optionally offload to
  **S3** + CloudFront if image volume grows (code change required).
- **Security:** scope **IAM** roles least-privilege; restrict DB access with
  **Security Groups**; store secrets in **AWS Secrets Manager** and inject as env
  at task start.
- **Monitoring:** **CloudWatch** Logs (container stdout), metrics, and alarms on
  error rate / CPU / memory / health-check failures.

```bash
aws ecr create-repository --repository-name cya-daily-verse
docker build -t cya-daily-verse .
docker tag cya-daily-verse:latest <acct>.dkr.ecr.<region>.amazonaws.com/cya-daily-verse:latest
docker push <acct>.dkr.ecr.<region>.amazonaws.com/cya-daily-verse:latest
# then update the ECS service to the new image tag
```

---

## 12. Deployment Workflow

```
Feature Development (branch)
        |
        v
Pull Request
        |
        v
CI Checks (lint, typecheck, test, build)
        |
        v
Code Review
        |
        v
Merge to main
        |
        v
Deploy Staging (verify)      [when a staging environment exists]
        |
        v
Production Release (Vercel auto-deploy on main)
```

---

## 13. Production Deployment Checklist

**Before deployment**

- [ ] Tests passing (`npm test`)
- [ ] Lint + type check clean (`npm run lint`, `npx tsc --noEmit`)
- [ ] Required env vars configured on the host (`MONGO_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`)
- [ ] Database backup completed (**manual — see §14**)
- [ ] Schema/data changes reviewed (breaking field changes have no auto-backfill)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Dependencies audited (`npm audit`)

**During deployment**

- [ ] Deploy the application (push to `main` / `vercel deploy --prod`)
- [ ] Verse sync auto-runs on first request (or `npm run seed` against the prod `MONGO_URL`)
- [ ] `GET /api/health` returns `200`
- [ ] Review deploy logs for errors

**After deployment**

- [ ] App reachable at `NEXT_PUBLIC_SITE_URL`
- [ ] Database connection verified (health check `db: connected`)
- [ ] Daily-push cron secret valid (trigger `workflow_dispatch` to test)
- [ ] Monitoring/uptime check enabled on `/api/health`
- [ ] Rollback path confirmed (previous deploy available to redeploy)

---

## 14. Rollback Strategy

**Application rollback.** Immutable deploys make this instant:
- **Vercel:** Deployments → previous production → **Promote to Production**.
- **Railway** (if adopted): Deployments → pick the last good deploy → **Redeploy**.
- **Git:** `git revert <sha>` and push to trigger a fresh deploy.

**Database rollback.** No migration framework, so there is **no automated schema
reversal**:
- Additive changes need no rollback (old docs read defaults).
- For a destructive data change, **restore from the pre-deploy backup**.
- Verse/devotion content is reproducible from `verses.json` / code, so a bad
  content sync is fixed by correcting the source and re-running the upsert.

**Failed deployment recovery.**
1. Redeploy the last healthy build (above).
2. Check `GET /api/health` for `missingEnv` / `db: unreachable`.
3. Inspect logs for the boot assertion or DB error.

**Version management.** Deploys are pinned to Git SHAs by the host; tag releases
(`git tag vX.Y.Z`) for a human-readable history.

> **Recommended (not yet configured):** automate MongoDB backups (`mongodump` +
> retention) and document a tested restore with an RPO/RTO target. Confirm
> Atlas's managed backup cadence for the current cluster tier.

### Backup & restore runbook

**Automated backups (recommended, one-time setup).** Atlas M10+ clusters have
Cloud Backup available in the Atlas UI (Cluster → Backup tab → **Enable**).
Free/shared (M0/M2/M5) tiers don't offer Cloud Backup — use the manual
snapshot below on a schedule (e.g. a GitHub Actions cron, matching this repo's
existing `daily-verse` cron pattern in `.github/workflows/`) until the cluster
is upgraded. Target: daily snapshot, 7-day retention as a starting point —
tune to the ministry's actual tolerance for data loss (RPO).

**Manual snapshot** (works on any tier — run from a machine with the Atlas
IP-allowlisted, or Atlas's own temporary access):

```bash
mongodump --uri="$MONGO_URL" --gzip --archive=cya-backup-$(date +%Y%m%d).gz
```

Store the archive somewhere outside the app's own infra (a private cloud
bucket or encrypted local storage) — a backup that lives next to the thing it
backs up isn't a backup.

**Restore** (RTO target: under 30 minutes from a recent snapshot):

```bash
# Dry-run first against a scratch cluster/db to confirm the archive is good:
mongorestore --uri="$MONGO_URL_SCRATCH" --gzip --archive=cya-backup-YYYYMMDD.gz

# Once confirmed, restore for real. --drop replaces existing collections
# instead of merging, so double-check MONGO_URL points at the intended
# cluster before running this against production.
mongorestore --uri="$MONGO_URL" --gzip --archive=cya-backup-YYYYMMDD.gz --drop
```

After a restore: hit `GET /api/health`, spot-check a known record (e.g. the
latest verse-of-the-day), and confirm `AUTH_SECRET`/`tokenVersion` still match
so existing sessions aren't left in a half-valid state.

**Test the restore before you need it** — an unverified backup is a hope, not
a plan. Run the dry-run step above against a scratch database at least once
per quarter.

---

## 15. Monitoring and Logging

**Application.**
- **Logs:** structured server logging via
  [`server/utils/logger.js`](../src/server/utils/logger.js) (`logError`) on the
  unexpected-failure path (incl. DB errors); written to stdout and captured by
  the host.
- **Health:** `GET /api/health` — env readiness + DB reachability; `200`
  healthy, `503` degraded (`missingEnv` or `db: unreachable`). Use for uptime
  checks and platform probes.
- **Error tracking / APM:** not yet integrated — recommended: add Sentry (client
  + server) for exception aggregation and performance traces.

**Infrastructure.**
- CPU / memory / storage / restarts: Vercel dashboard metrics (or CloudWatch on
  AWS).
- Database health: Atlas metrics; alert on connection saturation.
- Availability: external uptime monitor hitting `/api/health`.

**Recommended stack (not yet wired):** Sentry (errors), Datadog **or**
Prometheus + Grafana (metrics/dashboards), platform-native logs
(Vercel/CloudWatch).

---

## 16. Security Best Practices

- **Never commit secrets** — only `.env.example`; real values live in host
  secret managers.
- **HTTPS everywhere** — Vercel terminates TLS; HSTS is set in
  `next.config.ts` (`max-age=63072000; includeSubDomains`).
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, and a per-request nonce'd CSP
  (`proxy.ts`).
- **Dependency hygiene** — `npm audit` in CI; update regularly; scan images
  (Trivy / `docker scout`) if containerized.
- **Least privilege** — scoped DB users, minimal IAM roles, admin gated by
  role/passphrase with self-lockout protection.
- **Auth data** — passwords bcrypt-hashed (cost 10); reset/verify tokens stored
  SHA-256 hashed, single-use, TTL-expired; sessions are httpOnly JWT cookies
  with `tokenVersion` revocation.
- **Container security** — non-root user, minimal base image, health checks (§6).
- **Credential rotation** — rotate `AUTH_SECRET`, `CRON_SECRET`,
  `ADMIN_PORTAL_PASSWORD`, and `ADMIN_PORTAL_TOTP_SECRET` on a schedule and on
  personnel changes.
- **Upload safety** — images magic-byte validated (≤2MB) and content-type
  clamped on serve.

---

## 17. Troubleshooting

### Application does not start

- **Causes:** missing required env var; unreachable `MONGO_URL`; failed build.
- **Diagnose:** check deploy logs for `Missing required environment variable(s):
  ...` (from `assertEnv()`); hit `GET /api/health` → `missingEnv` array.
- **Fix:** set the missing var in the host; redeploy. Verify Node `>= 20`.

### Database connection failure

- **Causes:** wrong `MONGO_URL`; Vercel's egress IPs not on the Atlas access
  list; network/firewall; DB down.
- **Diagnose:** `GET /api/health` → `db: "unreachable"` with an error string;
  connect with `mongosh "$MONGO_URL"`.
- **Fix:** use the correct Atlas SRV connection string; confirm the Atlas IP
  access list allows Vercel (or use Atlas's Vercel integration / `0.0.0.0/0`);
  confirm the cluster is running.

### "Data does not appear / verses missing"

- **Causes:** verse sync hasn't run; empty collection.
- **Diagnose:** call `GET /api/verse/today`; check logs for
  `verse.ensureSynced`.
- **Fix:** run `npm run seed` against the prod `MONGO_URL`, or
  `POST /api/admin/sync-verses` with the cron secret or an admin session.

### Migration failure

- **Cause:** N/A — no migration tool. A **unique-index build** can fail on
  existing duplicates; a **removed field** leaves old-shaped documents.
- **Diagnose:** index build error in logs naming the duplicate key.
- **Fix:** de-duplicate the collection, then redeploy; write a one-off backfill
  script for field changes (back up first).

### CI/CD failure

- **Causes:** failing tests/lint/typecheck; missing GitHub secret; build error.
- **Diagnose:** open the failing GitHub Actions run and read the step log.
- **Fix:** reproduce locally (`npm run lint`, `npx tsc --noEmit`, `npm test`,
  `npm run build`); add the missing repo secret (e.g. `CRON_SECRET`).

### Daily push not sending

- **Causes:** `CRON_SECRET` mismatch; VAPID keys unset; already sent today.
- **Diagnose:** run the `daily-verse-push` workflow via `workflow_dispatch` and
  read logs; a `401` = bad secret; a no-op = `PushLog.day` already claimed.
- **Fix:** align `CRON_SECRET` in GitHub secrets and the app; set VAPID keys to
  enable push.
