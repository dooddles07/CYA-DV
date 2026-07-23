"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { pageVariants } from "@/lib/motion";

/**
 * Route transition. Keeps spatial continuity between screens and moves
 * focus to the main region on change so screen-reader users are not
 * stranded at the end of the previous page.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    // Only steal focus after a real navigation, never on first paint.
    if (window.history.state?.__cyaVisited) {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      main.removeAttribute("tabindex");
    }
    window.history.replaceState({ ...window.history.state, __cyaVisited: true }, "");
  }, [pathname]);

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} variants={pageVariants} initial="hidden" animate="show" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
