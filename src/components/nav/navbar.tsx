"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame, Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { cx } from "@/lib/cx";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { EASE } from "@/lib/motion";
import { useScrolled } from "@/lib/hooks";
import { useMe } from "@/lib/use-me";

const links = [
  { href: "/verse", label: "Daily Verse" },
  { href: "/search", label: "Bible Search" },
  { href: "/plans", label: "Reading Plans" },
  { href: "/devotion", label: "Devotion" },
  { href: "/prayer", label: "Prayer Wall" },
  { href: "/events", label: "Events" },
];

export function Navbar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const scrolled = useScrolled(12);
  const [open, setOpen] = useState(false);
  const me = useMe();

  // Close the sheet when the route changes — derived during render,
  // which avoids an extra effect-driven re-render pass.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Lock body scroll and allow Escape to close the mobile sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-[110] transition-all duration-300",
        scrolled || open ? "glass shadow-soft" : "bg-transparent"
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="group flex min-h-11 items-center gap-2.5"
          aria-label="CYA Daily Verse home"
        >
          <span className="relative inline-flex">
            <Image
              src="/media/cya-logo.png"
              alt=""
              width={36}
              height={36}
              className="rounded-xl transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
              priority
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl opacity-0 shadow-glow transition-opacity duration-300 group-hover:opacity-100"
            />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight text-ink">
            CYA <span className="text-primary">Daily Verse</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href} className="relative">
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative block rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200",
                    active ? "text-primary-700" : "text-ink-soft hover:text-primary-700"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-sky-tint"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          {me && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1.5 text-xs font-bold text-amber-strong"
              title={`${me.streak}-day reading streak`}
            >
              <Flame className="h-3.5 w-3.5" aria-hidden />
              {me.streak} {me.streak === 1 ? "day" : "days"}
            </span>
          )}
          <ThemeToggle className="h-9 w-9" />
          {me ? (
            <ButtonLink href="/dashboard" size="sm">
              My dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Start free
              </ButtonLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-sky-soft"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <div className="px-4 pb-6 pt-2">
              <ul className="flex flex-col gap-1">
                {links.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.24 }}
                  >
                    <Link
                      href={l.href}
                      aria-current={pathname === l.href ? "page" : undefined}
                      className={cx(
                        "block rounded-2xl px-4 py-3 text-[15px] font-semibold",
                        pathname === l.href ? "bg-sky-tint text-primary-700" : "text-ink hover:bg-sky-soft"
                      )}
                    >
                      {l.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-4 flex gap-3">
                {me ? (
                  <ButtonLink href="/dashboard" className="flex-1">
                    My dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/login" variant="outline" className="flex-1">
                      Sign in
                    </ButtonLink>
                    <ButtonLink href="/register" className="flex-1">
                      Start free
                    </ButtonLink>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
