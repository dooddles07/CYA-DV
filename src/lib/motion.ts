import type { Transition, Variants } from "framer-motion";

/**
 * Motion tokens — one rhythm for the whole product.
 * Durations follow the 150–300ms micro-interaction guidance;
 * exits run at ~65% of enter so dismissals feel responsive.
 */
export const DUR = {
  micro: 0.18,
  fast: 0.24,
  base: 0.36,
  slow: 0.6,
  exit: 0.22,
} as const;

/** Apple-style fluid easing used across entrances. */
export const EASE = [0.21, 0.66, 0.29, 0.99] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const spring: Transition = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 };
export const springSoft: Transition = { type: "spring", stiffness: 220, damping: 26, mass: 0.9 };

/** Section reveal — used by <Reveal>. Blur adds perceived depth for ~free. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DUR.slow, ease: EASE },
  },
};

/** Parent that staggers its children by 40ms. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DUR.base, ease: EASE },
  },
};

/** Route transition — soft blur crossfade with a hint of scale depth. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.992, filter: "blur(5px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: EASE },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.996,
    filter: "blur(4px)",
    transition: { duration: DUR.exit, ease: "easeIn" },
  },
};

/** Word-mask reveal — parent/child pair used by <TextReveal>. */
export const wordParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const wordChild: Variants = {
  hidden: { y: "112%", rotate: 3, opacity: 0 },
  show: {
    y: "0%",
    rotate: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};
