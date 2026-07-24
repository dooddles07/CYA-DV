"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, HandHelping, Loader2, LogOut } from "lucide-react";
import { cx } from "@/lib/cx";

const tabs = [
  { key: "prayers", href: "/admin", label: "Prayer wall", icon: HandHelping },
  { key: "events", href: "/admin/events", label: "Events", icon: CalendarDays },
] as const;

/** Section switcher for the admin portal. */
export function AdminTabs({ active }: { active: (typeof tabs)[number]["key"] }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const exitPortal = async () => {
    if (leaving) return;
    setLeaving(true);
    await fetch("/api/admin/portal/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <nav aria-label="Admin sections" className="flex flex-wrap items-center justify-between gap-3">
      <ul className="flex flex-wrap gap-2">
        {tabs.map(({ key, href, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-200",
                  isActive ? "text-white" : "bg-sky-tint text-ink-soft hover:text-primary-700"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-0 -z-10 rounded-full bg-primary shadow-glow"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={exitPortal}
        disabled={leaving}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-faint transition-colors duration-200 hover:text-danger disabled:opacity-40"
      >
        {leaving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden />
        )}
        Exit portal
      </button>
    </nav>
  );
}
