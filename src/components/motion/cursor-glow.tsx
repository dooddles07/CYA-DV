"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect } from "react";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Soft light that trails the pointer — reinforces the "light in the dark"
 * brand idea without ever intercepting input.
 * Mouse-only, disabled under reduced motion and on touch devices.
 */
export function CursorGlow() {
  const reduce = useReducedMotion();
  const finePointer = useMediaQuery("(pointer: fine)");
  const wide = useMediaQuery("(min-width: 1024px)");
  const enabled = !reduce && finePointer && wide;

  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 110, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 110, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="cursor-glow pointer-events-none fixed z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: sx,
        top: sy,
        background:
          "radial-gradient(circle, rgba(0,149,255,0.10) 0%, rgba(0,149,255,0.04) 40%, transparent 70%)",
      }}
    />
  );
}
