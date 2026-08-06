"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui";

const DISMISSED_KEY = "cya-install-dismissed";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the service worker and offers the browser's install prompt.
 * Chrome/Edge/Android only — iOS Safari has no API for this, so nothing shows.
 */
export function InstallPrompt() {
  const reduce = useReducedMotion();
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (localStorage.getItem(DISMISSED_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDeferred(null);
  };

  useEffect(() => {
    if (!deferred) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        localStorage.setItem(DISMISSED_KEY, "1");
        setDeferred(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deferred]);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {deferred && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 24 }}
          transition={{ duration: 0.28 }}
          role="region"
          aria-label="Install CYA Daily Verse"
          className="glass fixed inset-x-4 bottom-24 z-[120] flex items-center gap-4 rounded-3xl p-4 shadow-lift sm:left-auto sm:right-6 sm:w-96 lg:bottom-6"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-tint text-primary">
            <Download className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink">Install the app</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
              Add CYA Daily Verse to your home screen for one-tap mornings.
            </p>
          </div>
          <Button size="sm" onClick={install}>
            Install
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Not now"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint hover:bg-sky-soft hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
