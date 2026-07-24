"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a media query without setState-in-effect.
 * Returns `false` during SSR so markup always matches the first client paint.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** True once the page has scrolled past `threshold` px. */
export function useScrolled(threshold = 12): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("scroll", onChange, { passive: true });
      return () => window.removeEventListener("scroll", onChange);
    },
    () => window.scrollY > threshold,
    () => false
  );
}

/**
 * Reads dark mode straight from the `<html>` class list, which is the real
 * source of truth (it is set pre-paint by the inline script in layout.tsx).
 * A MutationObserver keeps every consumer in sync.
 */
export function useDarkMode(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false
  );
}

/**
 * True when this browser can receive web push.
 * Returns `false` during SSR so markup matches the first client paint.
 */
export function usePushSupported(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => "serviceWorker" in navigator && "PushManager" in window,
    () => false
  );
}

/**
 * A clock that ticks every `intervalMs`.
 * Returns `null` on the server so time-dependent UI renders nothing until hydrated.
 */
export function useNow(intervalMs = 60_000): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const id = window.setInterval(onChange, intervalMs);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null
  );
}
