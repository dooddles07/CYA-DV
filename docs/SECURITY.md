# Security

Security posture and vulnerability reporting for CYA Daily Verse. Full design rationale in
[`DESIGN.md`](./DESIGN.md) §14 and [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Report privately to the CYA maintainers / ministry leadership. Include: affected component, steps to
reproduce, impact, and any proof-of-concept. Expect an acknowledgement and a coordinated fix before
public disclosure. Please give reasonable time to remediate before disclosing.

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x (latest) | Yes |
| < 1.0 | No |

## Security controls

### Authentication

- Passwords hashed with **bcrypt (cost 10)**.
- Session = **jose HS256 JWT** cookie (`cya-session`): httpOnly, `sameSite=lax`, `secure` in prod,
  30-day expiry.
- Email verification + password reset tokens are **hashed, TTL-bound, single-use**.

### Session revocation

- JWT carries `tokenVersion` (`tv`); every read re-checks it against the DB. Bumped on password reset
  to invalidate all existing sessions.
- **Fail-open** on DB blips for reads (avoids mass logout); **fail-closed** for sensitive writes via
  `getSession({strict:true})` (prayer post, account delete/export).

### Authorization

- Participation writes require `emailVerified`.
- Admin surfaces gated by `assertAdmin()` — valid admin-portal passphrase session **or** signed-in
  user with `role:"admin"`.
- Admin-portal cookie (`cya-admin`, 8-hour) minted via **timing-safe** passphrase compare.
- Users cannot strip their own admin role; push subscriptions are ownership-checked on removal.

### Transport & headers

- **HSTS** 2-year, `includeSubDomains`; `upgrade-insecure-requests`.
- **CSP** per-request nonce + `strict-dynamic` (no script `unsafe-inline`); `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` (`proxy.ts`).
- Static headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`) in `next.config.ts`.
- Style keeps `unsafe-inline` (font/Tailwind inject `<style>`; documented weaker risk).

### Input & output

- Validation in services: length/format clamps, regex email, `isValidObjectId`, bounded `limit`.
- User regex input escaped before search (`escapeRegex`).
- Output: React auto-escaping + strict CSP. Served image content-type clamped to an allowlist
  (`jpeg`/`png`/`webp`).

### Secrets

- Environment variables only; required vars gate boot via `assertEnv()`.
- Timing-safe compares for `CRON_SECRET` and the admin passphrase.
- Never logged; never committed. Documented in `.env.example`.

### Abuse prevention

- Distributed **fixed-window rate limiting** backed by Mongo (`RateBucket`, atomic `$inc`), with an
  in-memory fallback.
- Client IP derived from `X-Forwarded-For` counted **from the right** by `TRUSTED_PROXY_HOPS` to
  resist spoofing.
- Auth-endpoint limits (Fact): register 5/60m, login 10/15m, forgot 3/15m, reset/verify 10/15m,
  verify-resend 3/15m, admin image 30/10m.

## Known gaps / to verify

- **CSRF:** relies on `sameSite=lax` + same-origin `form-action`; no explicit anti-CSRF token on
  state-changing POSTs. **Needs Verification.**
- **Rate-limit coverage** on non-auth write endpoints (prayer, RSVP, enroll). **Needs Verification.**
- **Admin-action audit log:** none found. **Needs Verification.**
- **Observability:** console logging only; no security alerting in repo.

## Data handling

- Members can **export or delete** their own data (dashboard privacy controls; `account/export`).
- No customer PII or credentials in logs.
- Prayers are **hidden, never deleted**, by moderators.
