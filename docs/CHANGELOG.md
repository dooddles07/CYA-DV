# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
Maintainer guide:
- Track active work under [Unreleased]. Write entries from the user's
  perspective and describe the impact, not the implementation.
- To cut a release: rename [Unreleased] to [x.y.z] - YYYY-MM-DD, add a fresh
  empty [Unreleased] block above it, tag the commit (git tag vx.y.z), and
  update the link references at the bottom.
- Mark breaking changes with **BREAKING:** and add migration notes inline.
- Remove empty subsections before publishing a release.
-->

## [Unreleased]

### Added
- Product screenshots (`docs/images/`) embedded in `README.md` and `DESIGN.md`
  — home (light/dark), daily verse, Bible search, reading plans, prayer wall.
- `.github/workflows/ci.yml` — lint, type check, test, `npm audit`, and build
  on every push and PR against `main`.
- Rate limiting on previously-unprotected authenticated write endpoints: event
  RSVP, reading-plan enroll/leave/day-complete, saved-verse toggle/remove, and
  streak mark-read/challenge-claim.
- CSRF double-submit token (`cya-csrf` cookie + `X-CSRF-Token` header,
  [`csrf.js`](../src/server/middleware/csrf.js)) required on the admin gate and
  account export/delete, on top of the existing `SameSite=Lax` + same-origin
  defense. Existing sessions self-heal a token via `proxy.ts` so no one is
  locked out by the change.
- Admin-action audit log (`AdminAuditLog`,
  [`admin-audit.js`](../src/server/utils/admin-audit.js)) — records every
  privileged mutation (event/devotion create/update/delete, prayer moderation,
  user role changes, verse sync, event-image upload) with actor, action,
  target, and metadata.
- `public/favicon.ico`.
- `tests/e2e/smoke.spec.ts` (`npm run test:e2e`) — Playwright smoke spec for
  register → mark today's verse read → streak increments → dashboard, run
  against `dev:local` via `playwright.config.ts`'s `webServer`.
- `npm run test:coverage` — coverage report for the unit/integration suite via
  `node:test`'s native `--experimental-test-coverage`.
- Admin two-factor sign-in (TOTP) — required for every admin-role account (QR
  code + 10 one-time backup codes on first login, a 6-digit code on every
  login after); opt-in for the admin portal's shared passphrase.
  `tests/e2e/admin-mfa.spec.ts` covers enrollment and verification.
- `.github/dependabot.yml` — weekly npm update PRs, minor/patch grouped into
  one PR; `eslint`/`typescript` majors ignored until upstream catches up
  (`typescript-eslint` doesn't support TS 7 yet; `eslint-plugin-react` breaks
  `npm run lint` under ESLint 10's removed `context.getFilename()`).
- Sliding session expiry — `cya-session` re-signs itself with a fresh 30-day
  expiry once it's past the halfway point of its lifetime, so an active user
  is never logged out mid-use.
- Breached-password check (HIBP k-anonymity range API) on register and
  password reset — fails open on any network error or timeout.
- `tests/e2e/prayer.spec.ts` — a verified member posts a prayer request and
  prays for one on the wall; a separate case confirms an unverified member is
  blocked. Needed a new seeded fixture, `scripts/seed-e2e-member.mjs`.
- `scripts/generate-logo-data-uri.mjs` (`npm run logo:embed`) — regenerates
  the inline base64 CYA logo used in outbound email.
- Manual backup/restore runbook (`DEPLOYMENT.md` §14) — `mongodump`/
  `mongorestore` steps, storage guidance, RPO/RTO targets.
- `loading.tsx`/`error.tsx` route-segment boundaries for the `(site)` and
  `(admin)` route groups — previously only the root layout had them.
- Rate limiting on `GET /api/account/export` and `DELETE /api/account`,
  matching every other mutating endpoint.

### Changed
- **Documentation overhaul.** Rewrote the project docs from an implementation
  audit so they match the real codebase: README as a full landing page, plus
  canonical `ARCHITECTURE`, `API`, `DATABASE`, `DEPLOYMENT`, `SECURITY`, and
  `TESTING` guides. Corrected earlier discrepancies in search, pagination,
  toggle, and rate-limit behavior and documented known gaps.
- **Rewrote `DESIGN.md` as a UI/UX design reference** (design language, color
  and typography tokens, layout system, component and pattern catalog,
  accessibility, motion) sourced from `globals.css`, `ui.tsx`, and `motion.ts`.
  The former system-design content is superseded by `ARCHITECTURE.md`.
- **Rewrote `FEATURES.md`** as a structured capability reference with a
  role/permission matrix, verified content-catalog counts, and a
  feature-to-endpoint map.
- Repointed doc cross-references that targeted the old `DESIGN.md` sections to
  the equivalent `ARCHITECTURE.md` sections.
- **Finalized docs for production.** Confirmed Railway as the production host
  (removed "inferred" hedging across README/ARCHITECTURE/DEPLOYMENT/ROADMAP) and
  replaced scattered `TODO` markers with clear "not yet configured / recommended"
  status language. Genuinely repo-unknowable items remain labelled per each
  doc's evidence convention.
- Restructured `docs/` into a standard layout and normalized Markdown
  filenames and cross-links.
- Moved `LICENSE.md` to the repository root for discoverability.
- **Production host corrected: Vercel + MongoDB Atlas, not Railway.** Updated
  `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `DATABASE.md`, and
  `ROADMAP.md` to match; Railway is now documented as an alternative host
  (`DEPLOYMENT.md` §10), not current production. Live demo link corrected to
  `https://cya-dv.vercel.app/`.
- `LICENSE` copyright line updated to credit the builder.
- **Email delivery switched from SMTP to Resend's HTTP API.** Vercel's
  serverless functions can't reliably complete a raw SMTP handshake (the
  connection opens but the greeting never arrives) — Resend's API goes over
  plain HTTPS instead. `nodemailer` and `@types/nodemailer` are no longer
  dependencies.
  - **BREAKING:** `SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` env vars are replaced by
    `RESEND_API_KEY`/`RESEND_FROM`. Update `.env` and hosting-platform env
    vars before deploying.
- Password-reset and verification emails redesigned with the CYA logo
  (embedded inline as base64, not linked externally — an externally-linked
  image on a domain different from the sender is a spam-filter trigger) and
  plainer, warmer copy.
- `style-src` CSP hardened — split into `style-src-elem`/`style-src-attr`,
  dropping `unsafe-inline` from the element form in production (kept for the
  app's genuine dynamic `style=""` animation usage).
- Service worker now also cache-firsts `/_next/static/*` assets, so the
  offline shell can actually hydrate and become interactive instead of only
  rendering static markup; its cache name is now stamped with the deploy's
  git SHA at build time (`scripts/stamp-sw.mjs`) instead of a hand-bumped
  literal, so a new deploy reliably evicts the previous one's cache.
- `install-prompt.tsx` — `role="dialog"` replaced with `role="region"` (it
  was never a true modal — no focus trap), and Escape now dismisses it.
- `package.json`'s `engines.node` pinned to `>=22.6.0 <23.0.0` so a hosting
  platform can't silently jump to a new Node major.
- Footer copyright line reworded ("public domain" → "free to share"); broken
  reset/verify-link messaging reworded away from "token" dev-speak.
- `ci.yml` runs `npm run test:coverage` instead of plain `npm test`, so a
  coverage table is visible in every run's log (still not an enforced gate).

### Deprecated
<!-- Features slated for removal in a future release. -->

### Removed
- Unused `springSoft` motion token (`src/lib/motion.ts`) — dead export, no
  call sites.

### Fixed
- Removed a stray Markdown code fence and a reference to a non-existent
  "leaderboard" screen in `TESTING.md`.
- Patched a `brace-expansion` high-severity DoS vulnerability
  (`GHSA-mh99-v99m-4gvg`) via `npm audit fix`; `npm audit` is now clean.
- **MFA enrollment race condition.** `beginEnrollment()`'s secret decision is
  now a single atomic conditional update instead of read-then-write — closes
  a race where React Strict Mode's double-fired setup-page effect could
  display a QR code for a secret that wasn't the one actually stored,
  causing the first confirmation code to fail.
- **Password-reset / email-verification token replay.** Token consumption is
  now an atomic `findOneAndUpdate` instead of find-then-save, closing a
  window where two concurrent requests with the same token could both
  succeed.
- **Reading-plan and daily-challenge lost-update race.** Both now use atomic
  `$addToSet`/`$pull`/`$push` instead of load-then-save, so a concurrent
  write can no longer silently overwrite another.
- `logout` and the admin portal's logout now require the CSRF token like
  every other mutating endpoint (previously exempt).

### Security
- See **Added** — rate limiting, CSRF, and the admin audit log all close
  gaps `SECURITY.md` previously labelled as open.
- See **Fixed** — the token-replay race, the lost-update race, and the MFA
  enrollment race were all real bugs with security or correctness impact,
  not just cleanup.

---

## [1.0.0] - 2026-07-25

Initial public release of CYA Daily Verse: a Progressive Web App for daily
Scripture reading, prayer, devotionals, reading plans, and community events.

### Added
- Daily verse experience with a rotating verse of the day, cinematic motion, 3D scene, and accessibility support.
- User accounts with registration, sign-in, email verification, and password reset by email.
- Daily reading streaks and per-user reading plans, with the ability to leave or reset a plan.
- Verse library of 300 public-domain Scriptures across 15 categories, with server-side search, verse archive, and recently-viewed history.
- Bookmarks to save and remove favorite verses.
- Prayer wall with authenticated posting, pagination, per-user prayer counts, and a persisted "prayed" state.
- DB-backed devotionals with a detail view.
- Community events with RSVPs and visible headcounts for members and leaders.
- Challenges that award XP for participation.
- Community statistics on the home page.
- Installable PWA with an offline page and offline caching of the day's verse and data for real offline reading.
- Web push reminders for daily reading.
- Admin portal (passphrase-gated) for managing events, uploading event images from device with client-side compression, managing devotionals, moderating the prayer wall, and promoting or demoting admin users.
- Account data export and account deletion with full cascade removal.
- Privacy policy and terms pages.
- Configurable footer social links (Facebook, Instagram) that hide when unset.

### Changed
- Switched Scripture text to the public-domain Berean Standard Bible (BSB).
- Prayer-wall "New" badge now derived from post age rather than a stored flag.
- Home page navigation resolves authentication on the server, removing per-page auth fetches.
- Reworked the admin area into a dedicated, CYA-branded back-office shell.

### Removed
- Legacy seeded sample prayers and events.
- Unused legacy features and dead code paths.

### Fixed
- Reading dates now honor the Asia/Manila time zone so the day boundary matches the server.
- Streak reads no longer return server errors.
- Registration and forgot-password emails send without blocking the request, with SMTP timeouts.
- Verse corpus auto-reconciles with the seed data on deploy.
- Names and emails are length-validated on registration, returning clear input errors.
- Server components refresh after email verification.
- Footer contact address corrected.

### Security
- Content Security Policy with per-request nonce, plus HSTS, nosniff, and frame-ancestors response headers.
- Rate limiting backed by MongoDB, with correct handling of forwarded client IPs to prevent bypass.
- Session revocation via token versioning; all stale sessions are logged out on password reset.
- Server-side XP validation to prevent XP farming.
- Fail-closed session checks on prayer posting, account deletion, and data export.
- Cron and admin endpoints protected with timing-safe secret comparison and header-only secrets.
- Served images restricted to a safe content-type allowlist with format validation.
- User-supplied names escaped in outgoing email HTML.
- Required site URL configuration to prevent unsafe links in production.

<!--
Link references. Create the git tag on release so these resolve:
  git tag v1.0.0 <release-commit> && git push origin v1.0.0
-->
[Unreleased]: https://github.com/dooddles07/CYA-DV/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/dooddles07/CYA-DV/releases/tag/v1.0.0
