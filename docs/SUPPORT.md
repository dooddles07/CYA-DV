# Support

How to get help with CYA Daily Verse.

## For members / users

- **App issues** (can't log in, verse won't load, notifications): contact a CYA leader or the
  ministry's official channels.
- **Account data:** you can export or delete your own data from your dashboard privacy controls at any
  time.
- **Password reset:** use **Forgot password** on the login page; a reset link is emailed to you.

## For contributors / developers

1. **Read first:** [`DESIGN.md`](./DESIGN.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md),
   [`RULES.md`](./RULES.md), [`CLAUDE.md`](./CLAUDE.md).
2. **Local setup:**
   ```bash
   npm install
   npm run dev:local
   ```
   Stands up a disposable local MongoDB, seeds verses, and runs `next dev` at http://localhost:3000.
3. **Health check:** `GET /api/health` reports env readiness + DB reachability.

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Missing required environment variable(s)` at boot | Unset `MONGO_URL` / `AUTH_SECRET` / `NEXT_PUBLIC_SITE_URL` | Copy `.env.example` → `.env`, fill required vars |
| `npm run dev` can't reach DB | Prod `MONGO_URL` targets Railway private network | Use `npm run dev:local` instead |
| Push notifications 503 | `VAPID_*` keys unset | Set VAPID key pair in env |
| Emails not sending | `SMTP_*` unset | Set SMTP credentials (feature silently disabled otherwise) |
| Local Mongo won't start | Stale `.dev-db` lock | Kill leftover `mongod`, or delete `.dev-db`, retry |

## Reporting bugs

Open an issue (or contact the maintainers) with: what you did, what you expected, what happened, and
relevant logs. For security issues, follow [`SECURITY.md`](./SECURITY.md) instead — do **not** open a
public issue.

## Reference commands

```bash
npm run build          # production build
npm run lint           # eslint
npx tsc --noEmit       # type check
npm test               # node:test (in-memory Mongo)
npm run seed           # load verses.json into DB
npm run member:create  # create an account from CLI
```
