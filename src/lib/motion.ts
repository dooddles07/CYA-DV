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

/** Section reveal — used by <Reveal>. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE } },
};

/** Parent that staggers its children by 40ms. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};

/** Route transition — forward moves up, back fades out faster. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: DUR.exit, ease: "easeIn" } },
};
