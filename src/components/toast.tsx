"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { spring } from "@/lib/motion";

type Tone = "success" | "info" | "error";
type Item = { id: number; msg: string; tone: Tone };

const EVENT = "cya:toast";
let seq = 0;

/** Fire a toast from anywhere: toast("Saved", "success") */
export function toast(msg: string, tone: Tone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id: ++seq, msg, tone } }));
}

const icons = { success: Check, info: Info, error: TriangleAlert };

/**
 * Toast host. Announced politely so it never steals focus,
 * and auto-dismisses inside the 3–5s window.
 */
export function Toaster() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<Item[]>([]);

  const dismiss = useCallback(
    (id: number) => setItems((list) => list.filter((i) => i.id !== id)),
    []
  );

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<Item>).detail;
      setItems((list) => [...list, detail]);
      window.setTimeout(() => dismiss(detail.id), 3200);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, [dismiss]);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[130] flex flex-col items-center gap-2 px-4 lg:bottom-10"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
              transition={spring}
              className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-ink py-3 pl-5 pr-2.5 text-sm font-semibold text-bg shadow-lift"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {t.msg}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-bg/70 transition-colors hover:bg-bg/15 hover:text-bg"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
