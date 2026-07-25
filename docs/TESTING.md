# Testing

Test strategy for CYA Daily Verse. See [`DESIGN.md`](./DESIGN.md) §17.

## Runner

Built-in **`node:test`** with `--experimental-strip-types` — no Jest/Vitest. Registered via
`tests/helpers/register.mjs` (resolves the `@/*` path alias for test imports).

```bash
npm test   # node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/*.test.mjs
```

## Test types

| Type | Files | Covers |
|---|---|---|
| **Unit** | `dates.test.mjs`, `gamification.test.mjs`, `reading-plans.test.mjs`, `verse-rotation.test.mjs`, `verses.test.mjs` | Pure domain logic — Manila day keys, XP/level math, plan progress, deterministic verse rotation, corpus integrity |
| **Integration** | `services.integration.test.mjs` | Auth + streak services against a real in-memory MongoDB |

## Integration approach

- Uses **`mongodb-memory-server`** — a throwaway `mongod` per run, so tests hit real Mongoose queries
  and indexes without a shared/external DB.
- Env (`MONGO_URL`) is wired **before** app modules are dynamically imported, so `dbConnect()` targets
  the memory server.
- `beforeEach` clears collections for isolation; `after` disconnects and stops the memory server.

## Helpers (`tests/helpers/`)

| File | Role |
|---|---|
| `register.mjs` | Loader/alias registration for `node --import` |
| `hooks.mjs` | Shared before/after lifecycle |
| `mongoose.mjs` | In-memory Mongo setup/teardown |
| `next-server.mjs` | Stubs for Next server primitives |
| `empty.mjs` | Empty-module stub for non-testable imports |

## Coverage philosophy

- Cover **pure domain logic** and **persistence-critical service paths** (the rules that must not
  regress: once-per-day streak, deterministic rotation, gamification math).
- **UI** is verified manually via the Playwright MCP (real rendering + console errors) — not committed.

## Gaps (Needs Verification)

- No end-to-end, contract, performance, or automated security test suites in-repo.

## Pre-commit gate

```bash
npm run lint && npx tsc --noEmit && npm test
```
