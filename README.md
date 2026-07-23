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
npm run dev
```

Open http://localhost:3000.

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

`/` `/verse` `/search` `/mood` `/plans` `/devotion` `/prayer` `/events`
`/login` `/register` `/dashboard` `/about` + 404

All 13 prerender as static.

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

Scripture and community content in `src/lib/data.ts` is demo data shaped to match
the intended database tables — swap it for Supabase/Firebase queries. Auth is a
non-functional demo form.

## License

MIT — see [LICENSE](./LICENSE).
