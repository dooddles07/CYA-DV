"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { cx } from "@/lib/cx";
import { moods } from "@/lib/data";
import { EASE } from "@/lib/motion";

export function MoodClient() {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const initial = params.get("feeling");
  const [selected, setSelected] = useState(
    moods.find((m) => m.feeling === initial) ?? null
  );

  return (
    <div>
      <div
        className="flex flex-wrap justify-center gap-2.5"
        role="group"
        aria-label="How are you feeling?"
      >
        {moods.map((m) => {
          const active = selected?.feeling === m.feeling;
          return (
            <motion.button
              key={m.feeling}
              type="button"
              onClick={() => setSelected(m)}
              aria-pressed={active}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className={cx(
                "relative min-h-11 cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold shadow-soft transition-all duration-200",
                active
                  ? "text-white"
                  : "border border-line bg-surface text-ink-soft hover:-translate-y-0.5 hover:border-primary hover:text-primary-700 motion-reduce:hover:translate-y-0"
              )}
            >
              {active && (
                <motion.span
                  layoutId="mood-active"
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-glow"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {m.feeling}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-12 min-h-80" aria-live="polite">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.feeling}
              initial={reduce ? false : { opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-sky-tint p-10 text-center shadow-lift"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-700">
                For when you say: “{selected.feeling}”
              </p>
              <blockquote className="verse-text mt-6 text-xl leading-relaxed text-ink sm:text-2xl">
                “{selected.verse.text}”
              </blockquote>
              <p className="mt-5 text-sm font-extrabold text-primary-700">
                {selected.verse.reference} · {selected.verse.version}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/verse">Read with reflection</ButtonLink>
                <ButtonLink href="/prayer" variant="outline">
                  Ask the community to pray
                </ButtonLink>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[2rem] border border-dashed border-sky-mist p-12 text-center"
            >
              <HeartHandshake className="h-10 w-10 text-sky-mist" aria-hidden />
              <p className="text-lg font-extrabold text-ink">Pick what&apos;s true right now</p>
              <p className="text-sm leading-relaxed text-ink-soft">
                No wrong answers. God meets you where you actually are — not where you pretend to be.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
