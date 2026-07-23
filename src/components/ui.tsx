"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { spring } from "@/lib/motion";
import { cx } from "@/lib/cx";

/* ------------------------------------------------------------------ Button */

const buttonBase =
  "relative inline-flex cursor-pointer select-none items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-40";

const buttonVariants = {
  primary: "bg-primary text-white shadow-glow hover:bg-primary-600",
  secondary: "bg-sky-tint text-primary-700 hover:bg-sky-mist",
  outline: "border border-line bg-surface text-ink hover:border-primary hover:text-primary-700",
  ghost: "text-ink-soft hover:bg-sky-soft hover:text-primary-700",
  white: "bg-white text-[#005ea8] shadow-soft hover:bg-white/92",
  glass: "glass text-ink hover:border-primary/60",
} as const;

/** Every size meets the 44px minimum touch target. */
const buttonSizes = {
  sm: "h-11 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
} as const;

type ButtonStyleProps = {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

/** Shine that sweeps across the button on hover. Decorative. */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden"
    />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"button"> & ButtonStyleProps) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={spring}
      className={cx("group", buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...(props as ComponentProps<typeof motion.button>)}
    >
      <Sheen />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps) {
  return (
    <Link
      className={cx(
        "group",
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        "active:scale-[0.97] motion-reduce:active:scale-100",
        className
      )}
      {...props}
    >
      <Sheen />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = "sky",
  className,
}: {
  children: ReactNode;
  tone?: "sky" | "gold" | "green" | "white";
  className?: string;
}) {
  const tones = {
    sky: "bg-sky-tint text-primary-700",
    gold: "bg-amber-soft text-amber-strong",
    green: "bg-mint-soft text-mint-strong",
    // stays white in both themes — always sits on photos
    white: "bg-white/85 text-[#0f2233] shadow-soft backdrop-blur-sm",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  children,
  className,
  hover = true,
  ring = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  ring?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-line bg-surface shadow-soft",
        ring && "ring-gradient",
        hover &&
          "transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-sky-mist hover:shadow-lift motion-reduce:hover:translate-y-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------- SectionHeading */

export function SectionHeading({
  eyebrow,
  title,
  sub,
  center,
  className,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center", className)}>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-ink-soft">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- ProgressBar */

export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label ?? "progress"}
      className={cx("h-2.5 w-full overflow-hidden rounded-full bg-sky-tint", className)}
    >
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary to-[#4db8ff]"
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={reduce ? { width: `${pct}%` } : undefined}
      />
    </div>
  );
}

/* -------------------------------------------------------------- Form field */

export function Field({
  label,
  id,
  error,
  help,
  required,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-danger">
            *
          </span>
        )}
        {!required && <span className="ml-1 font-normal text-ink-faint">(optional)</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="mt-1.5 text-xs text-ink-faint">
            {help}
          </p>
        )
      )}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink outline-none transition-colors duration-200 placeholder:text-ink-faint focus:border-primary";

/* ------------------------------------------------------------- Empty state */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card hover={false} className="flex flex-col items-center gap-3 p-12 text-center">
      <span className="text-sky-mist">{icon}</span>
      <p className="text-lg font-extrabold text-ink">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>
      {action}
    </Card>
  );
}

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton rounded-2xl", className)} />;
}
