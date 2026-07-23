"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DUR,
  EASE,
  revealVariants,
  spring,
  staggerChild,
  staggerParent,
  wordChild,
  wordParent,
} from "@/lib/motion";

/* ------------------------------------------------------------------
   Reveal — fades a section in once it enters the viewport.
   Under reduced motion the content is simply present.
------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={revealVariants}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      transition={{ duration: DUR.slow, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------
   Stagger — parent + child pair for grids and lists.
------------------------------------------------------------------ */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerParent}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------
   Magnetic — element leans toward the pointer, springs back on exit.
   Pointer-only; never required to operate the control.
------------------------------------------------------------------ */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------
   Tilt3D — perspective tilt that tracks the pointer, with a moving
   specular sheen. Mouse only, disabled under reduced motion.
------------------------------------------------------------------ */
export function Tilt3D({
  children,
  className,
  max = 9,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 250, damping: 26 });
  const sy = useSpring(py, { stiffness: 250, damping: 26 });

  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  // Hoisted: hooks must not run inside JSX / conditionals.
  const sheen = useTransform([sx, sy], ([gx, gy]: number[]) => {
    return `radial-gradient(420px circle at ${gx * 100}% ${gy * 100}%, rgba(255,255,255,0.55), transparent 60%)`;
  });

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, rotateX, rotateY, transformPerspective: 1100, transformStyle: "preserve-3d" }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-45 mix-blend-soft-light"
          style={{ background: sheen }}
        />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------
   Parallax — translates a layer as it scrolls through the viewport.
------------------------------------------------------------------ */
export function Parallax({
  children,
  distance = 60,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const smooth = useSpring(y, { stiffness: 90, damping: 24, mass: 0.6 });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: smooth }}>{children}</motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Counter — counts a number up when it scrolls into view.
   Uses tabular numerals so the layout never shifts.
------------------------------------------------------------------ */
export function Counter({
  to,
  suffix = "",
  className,
  duration = 1.4,
}: {
  to: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------
   TextReveal — words rise out of an overflow mask one by one.
   The gap under each mask keeps descenders (g, y, p) unclipped.
------------------------------------------------------------------ */
export function TextReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  once = true,
}: {
  text: string;
  className?: string;
  /* Applied per word — e.g. text-gradient, which cannot span transformed children. */
  wordClassName?: string;
  delay?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: "-60px" });

  if (reduce) {
    return <span className={[className, wordClassName].filter(Boolean).join(" ")}>{text}</span>;
  }

  return (
    <motion.span
      ref={ref}
      className={className}
      variants={wordParent}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      transition={{ delayChildren: delay }}
    >
      {text.split(" ").map((word, i, words) => (
        <Fragment key={`${word}-${i}`}>
          <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
            <motion.span
              className={["inline-block will-change-transform", wordClassName]
                .filter(Boolean)
                .join(" ")}
              variants={wordChild}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </motion.span>
  );
}

/* ------------------------------------------------------------------
   Spotlight — a radial highlight that follows the pointer across a
   surface. Writes CSS vars directly on the node, so tracking costs
   zero React renders. Pair with the .spotlight class in globals.css.
------------------------------------------------------------------ */
export function Spotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={`spotlight ${className ?? ""}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------
   ScrollScale — subtle zoom/fade as a block passes through view.
------------------------------------------------------------------ */
export function useScrollScale(ref: React.RefObject<HTMLElement | null>): {
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
} {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.94, 1, 0.96]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.4, 1, 1, 0.5]);
  return { scale, opacity };
}
