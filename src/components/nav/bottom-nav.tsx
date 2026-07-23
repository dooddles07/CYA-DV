"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, HandHelping, House, Search, User } from "lucide-react";
import { cx } from "@/lib/cx";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/verse", label: "Verse", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/prayer", label: "Pray", icon: HandHelping },
  { href: "/dashboard", label: "Me", icon: User },
];

/** Thumb-friendly mobile navigation. Hidden on desktop. Max 5 items. */
export function BottomNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="Mobile"
      className="glass fixed inset-x-3 bottom-3 z-[110] rounded-3xl shadow-lift pb-safe lg:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors duration-200",
                  active ? "text-primary" : "text-ink-faint hover:text-ink"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-x-2 inset-y-1 -z-10 rounded-2xl bg-sky-tint"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon
                  className={cx(
                    "h-5 w-5 transition-transform duration-200",
                    active && "scale-110 motion-reduce:scale-100"
                  )}
                  aria-hidden
                />
                {label}
                <span
                  aria-hidden
                  className={cx("h-1 w-1 rounded-full", active ? "bg-primary" : "bg-transparent")}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
