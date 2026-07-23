"use client";

import { Moon, Sun } from "lucide-react";
import { cx } from "@/lib/cx";
import { useDarkMode } from "@/lib/hooks";

const STORAGE_KEY = "cya-theme";

/**
 * Light/dark toggle. The theme is applied pre-paint by the inline script in
 * layout.tsx, and `<html class="dark">` is the single source of truth.
 *
 * The icons are swapped with CSS (`dark:` variants) rather than JS state so
 * the server and client always render identical markup — no hydration flag,
 * no mismatch, no flash.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useDarkMode();

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* private mode */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className={cx(
        "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors duration-200 hover:border-primary hover:text-primary",
        className
      )}
    >
      <Moon
        className="h-[18px] w-[18px] transition-transform duration-200 dark:hidden motion-reduce:transition-none"
        aria-hidden
      />
      <Sun
        className="hidden h-[18px] w-[18px] transition-transform duration-200 dark:block motion-reduce:transition-none"
        aria-hidden
      />
    </button>
  );
}
