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
- Restructured `docs/` into a standard layout and normalized Markdown
  filenames and cross-links.
- Moved `LICENSE.md` to the repository root for discoverability.

### Fixed
- Removed a stray Markdown code fence and a reference to a non-existent
  "leaderboard" screen in `TESTING.md`.

### Deprecated
<!-- Features slated for removal in a future release. -->

### Removed
<!-- Removed features or dead code. -->

### Fixed
<!-- Bug fixes and corrections. -->

### Security
<!-- Security-related updates. -->

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
