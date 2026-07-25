# Testing

Testing guide for **CYA Daily Verse** — a Next.js 16 / React 19 application backed by MongoDB (Mongoose). This document reflects the tests that actually exist in the repository. Where a capability is missing, it is labelled as a gap with a concrete recommendation rather than glossed over.

Related design context: [`DESIGN.md`](./DESIGN.md) §17.

---

## Testing Strategy

Testing on this project protects the small set of rules that must never silently regress. The application is a daily-habit product, so a handful of domain invariants — one read per day, deterministic verse rotation, correct streak and XP math — directly determine whether the product behaves correctly for a user.

**Philosophy**

- **Test the rules, not the framework.** Coverage is concentrated on pure domain logic and persistence-critical service paths, not on React rendering or third-party libraries.
- **Deterministic and fast.** Unit tests are pure functions with no I/O. The one integration suite spins up a throwaway in-memory MongoDB so it stays hermetic and repeatable.
- **No heavy tooling.** Tests run on Node's built-in `node:test` runner with native TypeScript stripping — no Jest, Vitest, or Babel in the toolchain.

**How tests improve reliability**

- Prevent regressions in date/streak logic that only surface across day boundaries (easy to break, hard to notice manually).
- Guarantee the verse corpus stays internally consistent (unique references, populated fields, single-line text) before it reaches the database's unique index.
- Exercise real Mongoose queries and indexes for auth and streak flows, catching schema/index bugs that pure unit tests cannot.

**Levels of testing used**

| Level | Present | Notes |
|---|---|---|
| Unit | Yes | Pure domain logic |
| Integration | Yes | Services against in-memory MongoDB |
| End-to-end | No | UI verified manually (see [End-to-End Tests](#end-to-end-tests)) |
| Performance / load | No | Recommended in [Future Improvements](#future-improvements) |

---

## Testing Architecture

All tests live in a single flat [`tests/`](../tests) directory. There are **no** `unit/`, `integration/`, `e2e/`, `fixtures/`, or `mocks/` subfolders — the suite is small enough that test type is expressed by filename convention (`*.integration.test.mjs` vs `*.test.mjs`) rather than by directory.

Actual layout:

```
tests/
├── dates.test.mjs                  # unit: Manila day keys, day-number math
├── gamification.test.mjs           # unit: XP / level curve
├── reading-plans.test.mjs          # unit: reading-plan integrity
├── verse-rotation.test.mjs         # unit: deterministic daily rotation
├── verses.test.mjs                 # unit: verse corpus integrity
├── services.integration.test.mjs   # integration: auth + streak vs in-memory MongoDB
└── helpers/
    ├── register.mjs                # entry loaded via --import; registers the resolver hook
    ├── hooks.mjs                   # module resolver: @/* alias, extension fill-in, stubs
    ├── mongoose.mjs                # re-export shim so bare Node sees mongoose named exports
    ├── next-server.mjs             # minimal NextResponse stub for out-of-runtime imports
    └── empty.mjs                   # stub for server-only / client-only packages
```

**Why the helpers exist.** The app modules under test use Next.js/Turbopack conveniences that bare Node cannot resolve on its own. The `helpers/` layer bridges that gap so tests can import real production code without a bundler:

- `hooks.mjs` maps the `@/*` tsconfig alias to `src/*`, fills in the file extension Turbopack would infer, redirects `server-only`/`client-only` to a harmless stub, and shims `next/server` and `mongoose`.
- `register.mjs` is the `--import` entry point that activates that resolver hook before any test file loads an app module.

---

## Unit Tests

- **Framework:** Node.js built-in [`node:test`](https://nodejs.org/api/test.html) with `node:assert/strict`.
- **TypeScript:** run directly via `--experimental-strip-types` (no separate compile step for tests).
- **Location:** [`tests/*.test.mjs`](../tests) (excluding the integration file).
- **Naming:** `test("<behaviour in plain English>", ...)` — assertions describe the rule, e.g. `"manila day rolls over at 16:00 UTC, not midnight UTC"`.

**What is covered**

| File | Covers |
|---|---|
| [`dates.test.mjs`](../tests/dates.test.mjs) | Manila day-key formatting, 16:00-UTC rollover, consecutive-day and month/year boundary math |
| [`gamification.test.mjs`](../tests/gamification.test.mjs) | Level starts at 1, increments every `XP_PER_LEVEL`, `xpToNext` always advances to a boundary |
| [`reading-plans.test.mjs`](../tests/reading-plans.test.mjs) | Unique slugs, default plan exists, non-empty non-repeating readings in valid passage format |
| [`verse-rotation.test.mjs`](../tests/verse-rotation.test.mjs) | Same day → same verse, consecutive days differ, index always in range, no early repeats |
| [`verses.test.mjs`](../tests/verses.test.mjs) | Corpus ≥ 90 verses, unique references, all fields populated, single-line clean text |

**Run all tests (includes unit):**

```bash
npm test
```

> There is currently **no** unit-only script (e.g. `test:unit`). `npm test` runs the entire suite. To run a single unit file:
>
> ```bash
> node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/dates.test.mjs
> ```

---

## Integration Tests

- **Purpose:** exercise the service layer against a real MongoDB engine — real Mongoose queries, validators, and indexes — without depending on an external or shared database.
- **File:** [`services.integration.test.mjs`](../tests/services.integration.test.mjs).
- **Systems tested together:** `auth.service`, `user.service`, and the `User` model, over a live `mongod`.

**What it verifies**

- **Auth:** `registerUser` normalizes email and sets a fresh token version, rejects duplicate emails and short passwords; `loginUser` accepts the correct password and rejects the wrong one.
- **Streaks:** first read starts a streak of 1, a second read the same day is idempotent (no double-count), reading the next day extends the streak, and a multi-day gap resets to 1 while preserving `bestStreak`.

**How it stays hermetic**

- Uses [`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server) — a throwaway `mongod` created per run.
- `MONGO_URL` is set **before** any app module is dynamically imported, so `dbConnect()` targets the in-memory server.
- `beforeEach` clears collections for isolation; `after` disconnects Mongoose and stops the memory server.

**Setup:** none beyond `npm install`. The memory server downloads a MongoDB binary on first run (cached afterwards), so the first integration run needs network access.

**Run:** included in `npm test`. To run only the integration file:

```bash
node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/services.integration.test.mjs
```

---

## End-to-End Tests

There is **no committed E2E test suite** in this repository — no Playwright, Cypress, or Selenium project, config, or dependency.

UI is currently verified **manually during development** using the Playwright MCP (real browser rendering plus console-error inspection), but those sessions are ad hoc and not checked into the repo, so there are no automated E2E specs, generated reports, screenshots, or video artifacts to document.

> **Gap / recommendation:** add a Playwright project (`@playwright/test`) covering the core happy paths — register → log in → view daily verse → mark read → streak increments → view profile/leaderboard. See [Future Improvements](#future-improvements).

---

## Test Coverage

**No coverage tooling is currently configured.** There is no coverage dependency, no threshold, no reporter, and no coverage output directory in the repository.

The `node:test` runner does support coverage natively without adding dependencies. To generate an ad-hoc report today:

```bash
node --experimental-strip-types --import ./tests/helpers/register.mjs \
  --test --experimental-test-coverage tests/*.test.mjs
```

This prints a per-file coverage table to the terminal. It is **not** wired into `npm test`, CI, or any threshold gate.

> **Gap / recommendation:** add a `test:coverage` script using `--experimental-test-coverage` (optionally with `--test-reporter` for LCOV output), and enforce a threshold in CI once a baseline is measured. Do not publish a coverage percentage until it has actually been measured.

---

## Running Tests Locally

Copy-pasteable commands. Only the first two exist as npm scripts; the rest invoke the runner directly.

```bash
# 1. Install dependencies
npm install

# 2. Run the full test suite (unit + integration)
npm test

# 3. Run a single unit file
node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/dates.test.mjs

# 4. Run only the integration suite
node --experimental-strip-types --import ./tests/helpers/register.mjs --test tests/services.integration.test.mjs

# 5. Generate an ad-hoc coverage report (not configured as a script)
node --experimental-strip-types --import ./tests/helpers/register.mjs --test --experimental-test-coverage tests/*.test.mjs
```

**Full pre-commit gate** (lint + type-check + tests):

```bash
npm run lint && npx tsc --noEmit && npm test
```

---

## CI/CD Testing

- **Platform:** GitHub Actions.
- **Workflow files:** [`.github/workflows/daily-verse-push.yml`](../.github/workflows/daily-verse-push.yml) — the **only** workflow in the repository.

**Important:** this workflow does **not run the test suite**. It is a scheduled operational job that fires a daily push-notification cron (06:00 Manila) by calling the app's `/api/cron/daily-verse` endpoint and failing if the response is not HTTP 200.

There is currently **no CI workflow that installs dependencies and runs `npm test`, lint, or type-check** on push or pull request. Test execution before merge is therefore a manual, local step (the pre-commit gate above).

> **Gap / recommendation:** add a `ci.yml` workflow that runs `npm ci`, `npm run lint`, `npx tsc --noEmit`, and `npm test` on every push and PR, and make it a required status check before merge. This is the single highest-value testing improvement for the project.

---

## Testing Best Practices

### Writing Tests

- **Test behaviour, not implementation.** Assert on observable outcomes (`streak`, `alreadyRead`, `totalReads`), the way the existing service tests do — not on private internals.
- **One rule per test.** Keep each `test(...)` focused on a single invariant so a failure name points straight at the broken rule.
- **Descriptive names.** Use full sentences that state the expectation (`"a second read on the same day is idempotent"`), matching the style already in the suite.
- **Prefer pure functions.** Where logic can be extracted to a pure function (as with date and gamification math), test it as a unit — no database required.

### Maintaining Tests

- **Update tests with the feature.** When a domain rule changes (streak windows, XP curve, rotation), change its test in the same commit.
- **Keep tests deterministic.** Pass explicit dates/inputs; never rely on the real clock or ambient timezone. The date tests pin exact UTC instants for this reason.
- **Isolate state.** The integration suite already clears collections in `beforeEach` — preserve that isolation when adding cases so tests never depend on order.
- **Remove dead tests.** Delete tests for removed behaviour rather than leaving them skipped.

### Mocking and Dependencies

- **Mock only what you cannot run.** The resolver hook stubs `server-only`, `client-only`, and `next/server` because they cannot load outside the Next runtime — not to avoid testing real logic.
- **Prefer real integrations where cheap.** The service tests deliberately use a real in-memory MongoDB instead of mocking Mongoose, so queries, validators, and indexes are genuinely exercised.
- **Keep external I/O out of unit tests.** Network, email (`nodemailer`), and push (`web-push`) calls should be injected or stubbed at the boundary if they enter the test path.

---

## Troubleshooting

Issues specific to this repository's setup:

- **First integration run is slow or fails offline.** `mongodb-memory-server` downloads a MongoDB binary on first use. Run once with network access to populate its cache; subsequent runs are offline-capable.
- **`Cannot find module '@/...'` when running a test directly.** You omitted the loader. Always include `--import ./tests/helpers/register.mjs` (and `--experimental-strip-types`) — that is what activates the `@/*` alias resolver.
- **`SyntaxError` on TypeScript syntax.** The `--experimental-strip-types` flag is missing. It is required because tests import `.ts` source (e.g. `src/lib/data.ts`) directly.
- **Named import from `mongoose` is `undefined`.** Mongoose v9 is CommonJS and bare Node's lexer misses some getters; the suite routes `mongoose` through `tests/helpers/mongoose.mjs`. Import mongoose the same way rather than from the package directly in new tests.
- **Node version.** The strip-types and native test-runner flags require a current Node.js LTS. Upgrade Node if the flags are unrecognized.

---

## Future Improvements

Concrete, repository-specific next steps, roughly in priority order:

1. **Add a CI test workflow.** No workflow currently runs the suite; add `ci.yml` (`npm ci` → lint → `tsc --noEmit` → `npm test`) on push/PR and make it a required check. Highest impact.
2. **Wire up coverage.** Add a `test:coverage` script using `--experimental-test-coverage`, capture a baseline, then enforce a threshold in CI. Measure before publishing any number.
3. **Add E2E tests.** Introduce Playwright covering register → login → daily verse → mark read → streak → profile/leaderboard, with CI-published traces.
4. **Broaden integration coverage.** Extend service tests to reading-plan progress, verse assignment/rotation persistence, and the notification-subscription flow.
5. **Add API route tests.** Cover the Next.js route handlers (auth, cron, verse endpoints) including auth/authorization failure paths and rate-limit behaviour.
6. **Add npm script aliases.** Provide `test:unit`, `test:integration`, and `test:coverage` so the long `node --test` invocations are discoverable.
7. **Performance testing.** Once E2E exists, add a lightweight load check for the daily-verse and cron endpoints to catch regressions under concurrency.
```