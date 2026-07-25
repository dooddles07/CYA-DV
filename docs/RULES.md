# Engineering Rules

Non-negotiable rules for contributing to CYA Daily Verse. Enforced in code review. See
[`DESIGN.md`](./DESIGN.md) §23 for the full contributor guide.

## Architecture

1. **Layer direction is one-way:** `route → controller → service → model`. Never call upward.
2. **Route shims are one line.** `src/app/api/**/route.js` only re-exports from `server/routes`.
3. **Controllers own HTTP.** Parse, auth-gate, rate-limit, respond. No business logic.
4. **Services own logic + persistence.** They throw `ApiError`; they never build `NextResponse`.
5. **Models own schema only.** No service/controller imports inside a model.
6. **No direct model access** from pages, components, or controllers — route through services.

## Boundaries

7. **`import "server-only"`** at the top of every backend module.
8. **`lib/` stays client-safe.** It must never import `server/**`.
9. **Static non-user content** (plans, categories, moods, challenges) lives in `src/lib/data.ts`.

## Correctness

10. **Manila time only** for day logic — via `server/utils/dates.js`, never raw `new Date()`.
11. **Server-authoritative rewards** — XP/ids read from the server catalog, never trusted from client.
12. **Enforce invariants atomically** — conditional `findOneAndUpdate` or unique indexes, not
    read-then-write.
13. **Validate in services** — length/format clamps before any DB call.

## Security

14. **Secrets in env only**, documented in `.env.example`. Required vars gate boot via `assertEnv()`.
15. **Participation writes require `emailVerified`.**
16. **Sensitive writes use `getSession({strict:true})`** (fail closed on DB blip).
17. **Never log secrets, tokens, or full customer PII.**

## Style

18. **File naming:** kebab-case, `*.controller/service/model/routes.js`. Markdown = ALL-CAPS.
19. **Comments:** one line, explain *why*, match density. No emojis in code.
20. **Commits:** Conventional Commits (`type(scope): message`), atomic and focused.

## Before every commit

```bash
npm run lint && npx tsc --noEmit && npm test
```

Docs and activity logs are **not** auto-committed.
