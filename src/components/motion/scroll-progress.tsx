"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/** Thin reading-progress bar pinned under the navbar. Decorative — hidden from AT. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[120] h-0.5 origin-left bg-gradient-to-r from-primary via-[#33c0ff] to-[#66d4ff]"
      style={{ scaleX }}
    />
  );
}
