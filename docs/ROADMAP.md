# Roadmap

Planned and candidate improvements for CYA Daily Verse. Derived from known technical debt and design
gaps — see [`ARCHITECTURE.md`](./ARCHITECTURE.md) (Design Decisions & Trade-offs, Future Improvements).
Not committed dates; priority-ordered.

## High priority

| Item | Why | Difficulty | Risk |
|---|---|---|---|
| Metrics + alerting; wire `/api/health` to a probe | Detect DB latency / push failures early | Medium | APM vendor lock-in |
| Make `ci.yml` a required status check on `main` | A red build shouldn't be mergeable/deployable | Low | — |
| Automate database backups | Manual runbook exists (`DEPLOYMENT.md` §14); nothing scheduled yet | Low | — |

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
| Broaden E2E coverage (event RSVP, admin moderation); add contract test suites | Regression safety for user flows — 4 specs already run in `ci.yml` | Medium | Test maintenance cost, CI runtime |
| Consider Redis for rate limit / cache | If traffic outgrows Mongo comfort | Medium | Added infra dependency |

## Open questions

- Verse-of-day couples to lexical corpus order — reordering/removing verses retroactively changes the
  archive mapping. Acceptable product-wise?
- Backup automation — production runs on Vercel + MongoDB Atlas; a manual restore runbook exists (`DEPLOYMENT.md` §14), but nothing runs backups on a schedule yet.
- Email deliverability — outbound mail goes through Resend's shared `onboarding@resend.dev` sender (no verified domain, by deliberate zero-cost choice), so the sender/link domain mismatch can trip Gmail's spam filters. Only fixable by adding a custom domain.
