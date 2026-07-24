# Activity log

## 2026-07-24 — Full E2E test sweep (Playwright vs live prod) + fixes

Tested against live prod (https://cya-daily-verses-production.up.railway.app), DB shared. One
test account created and deleted (cascade cleanup verified). prod left clean.

### Bugs found + fixed (code)
1. Registration hung 60s+ — `register` awaited the verification-email send inline, so a
   slow/invalid SMTP recipient stalled the whole HTTP response. Account was created but the
   spinner never cleared. Fix: fire-and-forget the send (`src/server/controllers/auth.controller.js`).
2. Mailer had no timeouts — root enabler of #1. Added connection/greeting/socket timeouts
   (`src/server/config/mailer.js`).
3. `POST /api/streak/read` returned 500 — "mark verse read" / streak was fully broken. Cause:
   aggregation-pipeline `findOneAndUpdate` not portable to prod Mongo / mongoose 9. Rewrote to
   JS-computed `$set`/`$inc`, keeping the atomic once-per-day guard (`src/server/services/user.service.js`).

### Not code — operational
4. Verses display "WEB" (e.g. Psalm 55:17) though the bundled seed + code are all "BSB". prod
   Verse collection still holds the old WEB seed; needs a re-sync (admin `/api/admin/sync-verses`
   or reseed). Cannot fix without admin/prod access.
5. Footer social links (Facebook/Instagram/YouTube) are `#` placeholders. Cosmetic; real URLs unknown.

### Verified working
Home, register (acct+session), login, logout, dashboard, verse page, save/unsave verse,
achievements, mark-read (was broken -> fixed), plans enroll/completeDay/leave, prayer wall,
pray toggle + undo, prayer-post email-verify gate (403), events, search (topic + query), mood,
devotion list + detail, archive, about/privacy/terms, forgot (anti-enumeration), verify/reset
bad-token handling, 404, theme toggle, account export, account delete (cascade), security headers.

Post-fix: typecheck clean, lint clean, 26/26 tests pass. markVerseRead/mailer fixes not runnable
against prod (prod still runs old code) — verified by static analysis + local checks; deploy to confirm.
