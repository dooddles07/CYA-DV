import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";

// Paste the real profile URLs here. Icons with a "#" href are hidden, so an
// unset network simply doesn't render rather than linking nowhere.
const socials = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/cya.bicol.adnu",
    path: "M13.5 21.9v-7.4h2.5l.4-2.9h-2.9V9.75c0-.84.23-1.41 1.44-1.41h1.54V5.74c-.27-.04-1.18-.11-2.24-.11-2.22 0-3.74 1.35-3.74 3.83v2.14H8v2.9h2.5v7.4h3Z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/cya.bicol.adnu/",
    path: "M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.75a3.05 3.05 0 1 1 0-6.1 3.05 3.05 0 0 1 0 6.1ZM16.95 5.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM21.4 12c0-1.3.01-2.59-.06-3.88-.07-1.5-.41-2.83-1.51-3.92-1.1-1.1-2.42-1.44-3.92-1.51C14.6 2.6 13.3 2.62 12 2.62s-2.59-.01-3.88.06c-1.5.07-2.83.41-3.92 1.51-1.1 1.1-1.44 2.42-1.51 3.92C2.6 9.4 2.62 10.7 2.62 12s-.01 2.59.06 3.88c.07 1.5.41 2.83 1.51 3.92 1.1 1.1 2.42 1.44 3.92 1.51 1.3.07 2.59.06 3.88.06s2.59.01 3.88-.06c1.5-.07 2.83-.41 3.92-1.51 1.1-1.1 1.44-2.42 1.51-3.92.08-1.29.06-2.58.06-3.88Zm-2.06 5.54a3.06 3.06 0 0 1-1.72 1.72c-1.19.47-4.02.37-5.62.37s-4.43.1-5.62-.37a3.06 3.06 0 0 1-1.72-1.72c-.47-1.2-.37-4.03-.37-5.62s-.1-4.43.37-5.62a3.06 3.06 0 0 1 1.72-1.72c1.2-.47 4.02-.37 5.62-.37s4.43-.1 5.62.37a3.06 3.06 0 0 1 1.72 1.72c.47 1.19.37 4.02.37 5.62s.1 4.42-.37 5.62Z",
  },
];

const groups = [
  {
    title: "Explore",
    links: [
      { href: "/verse", label: "Daily Verse" },
      { href: "/search", label: "Bible Search" },
      { href: "/plans", label: "Reading Plans" },
      { href: "/devotion", label: "Devotionals" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/prayer", label: "Prayer Wall" },
      { href: "/events", label: "Events" },
      { href: "/mood", label: "Mood Verses" },
      { href: "/about", label: "About CYA" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
      { href: "/dashboard", label: "My Dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-line bg-sky-soft pb-28 lg:pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/media/cya-logo.png" alt="" width={40} height={40} className="rounded-xl" />
              <span className="text-base font-extrabold tracking-tight text-ink">
                CYA <span className="text-primary">Daily Verse</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Christ&apos;s Youth in Action. Building a generation that meets God in His Word every
              morning.
            </p>
            <p className="verse-text mt-4 text-sm italic text-primary-700">
              Kay Kristo Buong Buhay, Habambuhay!
            </p>
            <div className="mt-5 flex gap-2">
              {socials
                .filter((s) => s.href !== "#")
                .map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary motion-reduce:hover:translate-y-0"
                  >
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              <a
                href="mailto:cya_org@gbox.adnu.edu.ph"
                aria-label="Email us"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary motion-reduce:hover:translate-y-0"
              >
                <Mail className="h-[18px] w-[18px]" aria-hidden />
              </a>
            </div>
          </div>

          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-ink">{g.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href + l.label}>
                    {/* py-1 keeps the hit area above the 24px WCAG 2.5.8 minimum */}
                    <Link
                      href={l.href}
                      className="inline-block py-1 text-sm text-ink-soft transition-colors duration-200 hover:text-primary-700"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row">
          <p>
            © 2026 Christ&apos;s Youth in Action. Scripture: Berean Standard Bible (public domain).
          </p>
          <p>Made with prayer, for the youth.</p>
        </div>
      </div>
    </footer>
  );
}
