"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Eye, EyeOff } from "lucide-react";
import { Button, ButtonLink, Field, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";
import { spring } from "@/lib/motion";

const social = [
  {
    name: "Google",
    path: "M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z",
  },
  {
    name: "Facebook",
    path: "M13.5 21.9v-7.4h2.5l.4-2.9h-2.9V9.75c0-.84.23-1.41 1.44-1.41h1.54V5.74c-.27-.04-1.18-.11-2.24-.11-2.22 0-3.74 1.35-3.74 3.83v2.14H8v2.9h2.5v7.4h3Z",
  },
  {
    name: "Apple",
    path: "M16.36 12.79c-.03-2.53 2.07-3.75 2.16-3.81-1.18-1.72-3.01-1.96-3.66-1.98-1.56-.16-3.04.92-3.83.92-.79 0-2.01-.9-3.3-.87-1.7.03-3.27.99-4.14 2.5-1.77 3.07-.45 7.6 1.27 10.09.84 1.22 1.84 2.59 3.16 2.54 1.27-.05 1.75-.82 3.28-.82s1.96.82 3.3.79c1.36-.02 2.22-1.24 3.05-2.46.96-1.41 1.36-2.78 1.38-2.85-.03-.01-2.64-1.01-2.67-4.05ZM13.84 5.33c.7-.85 1.17-2.03 1.04-3.2-1.01.04-2.23.67-2.95 1.51-.65.75-1.21 1.95-1.06 3.1 1.12.09 2.27-.57 2.97-1.41Z",
  },
];

/** Demo auth form — wire to Supabase/Firebase auth later. */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const reduce = useReducedMotion();
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    const email = String(fd.get("email") ?? "");
    const pw = String(fd.get("password") ?? "");

    if (!isLogin && String(fd.get("name") ?? "").trim().length < 2)
      next.name = "Please tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "That email doesn't look right — check for typos.";
    if (pw.length < 8) next.password = "Password needs at least 8 characters.";

    setErrors(next);
    const firstBad = Object.keys(next)[0];
    if (firstBad) {
      document.getElementById(`auth-${firstBad === "password" ? "pw" : firstBad}`)?.focus();
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <motion.div
        role="status"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="flex flex-col items-center gap-4 py-10 text-center"
      >
        <motion.span
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring, delay: 0.08 }}
          className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-mint-soft text-mint-strong"
        >
          <Check className="h-8 w-8" aria-hidden />
        </motion.span>
        <p className="text-xl font-extrabold text-ink">
          {isLogin ? "Welcome back!" : "Welcome to the family!"}
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
          This is a demo — connect Supabase or Firebase auth to make it real.
        </p>
        <ButtonLink href="/dashboard" className="mt-2">
          Go to my dashboard
        </ButtonLink>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Image
          src="/media/cya-logo.png"
          alt=""
          width={52}
          height={52}
          className="rounded-2xl shadow-soft"
        />
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
          {isLogin ? "Welcome back" : "Create your free account"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {isLogin
            ? "Your streak missed you. Pick up where you left off."
            : "Save verses, build streaks, and join the prayer wall."}
        </p>
      </div>

      <div className="mt-8 grid gap-2.5">
        {social.map((s) => (
          <button
            key={s.name}
            type="button"
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-3 rounded-full border border-line bg-surface text-sm font-bold text-ink transition-all duration-200 hover:border-primary hover:shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d={s.path} />
            </svg>
            Continue with {s.name}
          </button>
        ))}
      </div>

      <div className="my-7 flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          or with email
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {!isLogin && (
          <Field label="Name" id="auth-name" required error={errors.name}>
            <input
              id="auth-name"
              name="name"
              type="text"
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "auth-name-err" : undefined}
              className={inputClass}
              placeholder="Your name"
            />
          </Field>
        )}

        <Field label="Email" id="auth-email" required error={errors.email}>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "auth-email-err" : undefined}
            className={inputClass}
            placeholder="you@example.com"
          />
        </Field>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="auth-pw" className="text-sm font-bold text-ink">
              Password
              <span aria-hidden className="ml-1 text-danger">
                *
              </span>
            </label>
            {isLogin && (
              <Link href="/login" className="text-xs font-bold text-primary-700 hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative mt-2">
            <input
              id="auth-pw"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "auth-pw-err" : "auth-pw-help"}
              className={cx(inputClass, "pr-14")}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              aria-pressed={showPw}
              className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-faint hover:bg-sky-soft hover:text-ink"
            >
              {showPw ? (
                <EyeOff className="h-[18px] w-[18px]" aria-hidden />
              ) : (
                <Eye className="h-[18px] w-[18px]" aria-hidden />
              )}
            </button>
          </div>
          {errors.password ? (
            <p id="auth-pw-err" role="alert" className="mt-1.5 text-sm font-semibold text-danger">
              {errors.password}
            </p>
          ) : (
            !isLogin && (
              <p id="auth-pw-help" className="mt-1.5 text-xs text-ink-faint">
                At least 8 characters.
              </p>
            )
          )}
        </div>

        <Button type="submit" size="lg" className="w-full">
          {isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-soft">
        {isLogin ? "New here?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-bold text-primary-700 hover:underline"
        >
          {isLogin ? "Create a free account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
