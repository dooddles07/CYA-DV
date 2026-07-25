# Roadmap

Planned and candidate improvements for CYA Daily Verse. Derived from known technical debt and design
gaps — see [`DESIGN.md`](./DESIGN.md) §21–§22. Not committed dates; priority-ordered.

## High priority

| Item | Why | Difficulty | Risk |
|---|---|---|---|
| Metrics + alerting; wire `/api/health` to a probe | Detect DB latency / push failures early | Medium | APM vendor lock-in |
| Extend rate limiting to all state-changing endpoints; confirm CSRF posture beyond SameSite | Close abuse/CSRF gaps | Low | Over-limiting legitimate bursts |
| Document/verify prod topology + commit deploy/rollback workflow | Reproducible, recoverable ops | Low | — |

## Medium priority

| Item | Why | Difficulty | Risk |
|---|---|---|---|
| Migrate `server/**` to TypeScript | End-to-end type safety across the API boundary | Medium | Large diff, JSDoc churn |
| Lightweight migration mechanism for non-verse collections | Safe schema evolution as data grows | Medium | Migration bugs on prod data |
| Cache / cheapen `tokenVersion` revocation check | Cut per-request DB reads under load | Medium | Stale revocation window |
| Admin-action audit log | Accountability for moderation/role changes | Low | Extra write volume |

## Low priority

| Item | Why | Difficulty | Risk |
|---|---|---|---|
| Replace `unstable_cache` with a stable abstraction | Insulate from Next churn | Low | Rework if API stabilizes anyway |
| Add E2E + contract test suites | Regression safety for user flows | Medium | Test maintenance cost |
| Consider Redis for rate limit / cache | If traffic outgrows Mongo comfort | Medium | Added infra dependency |

## Open questions

- Verse-of-day couples to lexical corpus order — reordering/removing verses retroactively changes the
  archive mapping. Acceptable product-wise?
- Non-auth write endpoints (prayer, RSVP, enroll) rate-limit coverage — confirm.
- Production host, backups, and DR posture — verify (Railway inferred).
