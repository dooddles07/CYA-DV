# Roadmap

Planned and candidate improvements for CYA Daily Verse. Derived from known technical debt and design
gaps — see [`ARCHITECTURE.md`](./ARCHITECTURE.md) (Design Decisions & Trade-offs, Future Improvements).
Not committed dates; priority-ordered.

## High priority

| Item | Why | Difficulty | Risk |
|---|---|---|---|
| Metrics + alerting; wire `/api/health` to a probe | Detect DB latency / push failures early | Medium | APM vendor lock-in |
| Document/verify prod topology + commit deploy/rollback workflow | Reproducible, recoverable ops | Low | — |

## Medium priority

| Item | Why | Difficulty | Risk |
|---|---|---|---|
| Migrate `server/**` to TypeScript | End-to-end type safety across the API boundary | Medium | Large diff, JSDoc churn |
| Lightweight migration mechanism for non-verse collections | Safe schema evolution as data grows | Medium | Migration bugs on prod data |
| Cache / cheapen `tokenVersion` revocation check | Cut per-request DB reads under load | Medium | Stale revocation window |

## Low priority

| Item | Why | Difficulty | Risk |
|---|---|---|---|
| Replace `unstable_cache` with a stable abstraction | Insulate from Next churn | Low | Rework if API stabilizes anyway |
| Broaden E2E coverage + wire into CI; add contract test suites | Regression safety for user flows | Medium | Test maintenance cost, CI runtime |
| Consider Redis for rate limit / cache | If traffic outgrows Mongo comfort | Medium | Added infra dependency |

## Open questions

- Verse-of-day couples to lexical corpus order — reordering/removing verses retroactively changes the
  archive mapping. Acceptable product-wise?
- Backups and DR posture — production runs on Vercel + MongoDB Atlas; automated backups and a DR runbook still need to be defined.
