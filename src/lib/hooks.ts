"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

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

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Wires a modal dialog for keyboard users: focuses the first control on open,
 * traps Tab inside, closes on Escape, and restores focus to the trigger on
 * close. `onClose` must be stable (wrap it in useCallback). Attach the returned
 * ref to the dialog container.
 */
export function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const restore = document.activeElement as HTMLElement | null;
    const items = () => (node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : []);

    items()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = items();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restore?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

const EMPTY_LIST: string[] = [];
const LIST_EVENT = "cya:recentlist";
// Cached snapshots keep useSyncExternalStore referentially stable across reads.
const listCache = new Map<string, string[]>();

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: string[] = raw ? JSON.parse(raw) : EMPTY_LIST;
    const prev = listCache.get(key);
    if (prev && prev.length === parsed.length && prev.every((v, i) => v === parsed[i])) return prev;
    listCache.set(key, parsed);
    return parsed;
  } catch {
    return listCache.get(key) ?? EMPTY_LIST;
  }
}

function writeList(key: string, next: string[]) {
  listCache.set(key, next);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Storage may be full or blocked; the cached value still drives the UI.
  }
  window.dispatchEvent(new CustomEvent(LIST_EVENT, { detail: key }));
}

/**
 * A capped, most-recent-first list of strings persisted to localStorage — the
 * store behind recently-viewed verses and search history. SSR-safe (empty on
 * the server) and synced across tabs and components sharing the same key.
 */
export function useRecentList(key: string, cap = 8) {
  const items = useSyncExternalStore(
    (onChange) => {
      const handler = (e: Event) => {
        if (!(e instanceof CustomEvent) || e.detail === key) onChange();
      };
      window.addEventListener(LIST_EVENT, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(LIST_EVENT, handler);
        window.removeEventListener("storage", handler);
      };
    },
    () => readList(key),
    () => EMPTY_LIST
  );

  const push = useCallback(
    (value: string) => {
      const v = value.trim();
      if (!v) return;
      const cur = readList(key);
      writeList(key, [v, ...cur.filter((x) => x !== v)].slice(0, cap));
    },
    [key, cap]
  );

  const remove = useCallback(
    (value: string) => writeList(key, readList(key).filter((x) => x !== value)),
    [key]
  );

  const clear = useCallback(() => writeList(key, EMPTY_LIST), [key]);

  return { items, push, remove, clear };
}
