# CYA Daily Verse

**Kay Kristo Buong Buhay, Habambuhay!**

A daily-devotional web app built by **Christ's Youth in Action** — daily verses,
devotionals, reading plans, and a praying community, designed to make meeting God
in His Word the first thing you reach for each morning.

Implemented from the [CYA Daily Verse Figma design system](https://www.figma.com/design/Ip0B5nsZfu8h1UfxGpW3I5/CYA-DAILY-VERSE).

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 with CSS-variable design tokens |
| Motion | Framer Motion |
| 3D | React Three Fiber + drei |
| Icons | Lucide |
| Fonts | Manrope (UI) · Lora (scripture) |

## Getting started

```bash
npm install
npm run dev:local   # local MongoDB + seeded verses + next dev
```

Open http://localhost:3000.

`dev:local` stands up a disposable MongoDB (mongodb-memory-server) under `.dev-db`,
seeds the verse corpus, and runs the app against it — no external database needed.
Use plain `npm run dev` only when `MONGO_URL` in `.env` already points at a
database you can reach (the production value targets Railway's private network and
will not resolve locally).

```bash
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit  # type check
```

## Design tokens

`src/app/globals.css` mirrors the Figma **Semantic** variable collection one-to-one —
each CSS custom property matches the Figma variable name and its `WEB` code syntax.
Light and dark are the two modes of that collection; toggling `.dark` on `<html>`
is the code equivalent of switching mode in Figma.

Brand primary is `#0095FF` throughout. Scripture is set in Lora via `.verse-text`.

## Routes

**Public** `/` `/verse` `/verse/archive` `/search` `/mood` `/plans`
`/devotion` `/devotion/[slug]` `/prayer` `/events` `/about` `/privacy` `/terms`

**Auth** `/login` `/register` `/forgot-password` `/reset-password` `/verify-email`
`/dashboard`

**Admin** `/admin-portal` `/admin` `/admin/prayers` `/admin/devotions` `/admin/users`

Plus 404. Pages are server-rendered on demand (they read live data and the
session cookie); only metadata routes — `manifest.webmanifest`, `robots.txt`,
`sitemap.xml`, `opengraph-image` — prerender as static.

## Accessibility

- Every animation degrades under `prefers-reduced-motion`; decorative layers
  (aurora mesh, cursor glow, 3D motion) are removed entirely.
- Touch targets ≥44px; secondary text links ≥24px (WCAG 2.5.8).
- Route changes move focus to `<main>`; toasts are `aria-live="polite"` and
  never steal focus.
- Form errors use `role="alert"` and focus the first invalid field.
- The 3D hero is `aria-hidden`, desktop-only, and skipped on low-core devices.

## Structure

```
src/
  app/                 routes (App Router)
  components/
    motion/            Reveal, Stagger, Magnetic, Tilt3D, Parallax, Counter
    three/             React Three Fiber hero scene
    nav/               navbar, bottom nav, footer, theme toggle
    ui.tsx             Button, Badge, Card, ProgressBar, Field, …
    verse-card.tsx     the signature verse surface
  lib/                 data, motion tokens, hooks, cx
```

## Note on content

Scripture is served from MongoDB (300 verses across 15 topics, seeded by
`npm run seed`). Community content — prayers, events, devotions, RSVPs — is
persisted through the Mongoose models in `src/server/models`. Auth is fully
functional: registration, login, email verification, and password reset run on
bcrypt-hashed credentials with `jose`-signed session cookies.

`src/lib/data.ts` holds the static config that isn't user data — reading-plan
definitions, home-grid categories, and mood shortcuts.

## License

MIT — see [LICENSE](./LICENSE).
