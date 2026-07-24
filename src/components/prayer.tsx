"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HandHelping } from "lucide-react";
import { cx } from "@/lib/cx";
import { spring } from "@/lib/motion";

/** Shared "I prayed" toggle used by the prayer wall and the home preview. */
export function PrayButton({
  count,
  done,
  reduce,
  onClick,
}: {
  count: number;
  done: boolean;
  reduce: boolean | null;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={spring}
      onClick={onClick}
      aria-pressed={done}
      className={cx(
        "relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold transition-all duration-200",
        done ? "bg-primary text-white shadow-glow" : "bg-sky-tint text-primary-700 hover:bg-sky-mist"
      )}
    >
      <HandHelping className="h-4 w-4" aria-hidden />
      {done ? "Praying" : "I prayed"}
      <span
        className={cx("rounded-full px-1.5 text-xs", done ? "bg-white/20" : "bg-surface")}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {count}
      </span>
      <AnimatePresence>
        {done && !reduce && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
