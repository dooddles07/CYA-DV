"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";
import { toast } from "@/components/toast";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "");
    const pw = String(fd.get("password") ?? "");

    if (!isLogin && name.length < 2) next.name = "Please tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "That email doesn't look right — check for typos.";
    if (pw.length < 8) next.password = "Password needs at least 8 characters.";

    setErrors(next);
    setServerError("");
    const firstBad = Object.keys(next)[0];
    if (firstBad) {
      document.getElementById(`auth-${firstBad === "password" ? "pw" : firstBad}`)?.focus();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? { email, password: pw } : { name, email, password: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      if (isLogin && data.mfaSetupRequired) {
        router.push("/login/mfa-setup");
        return;
      }
      if (isLogin && data.mfaRequired) {
        router.push("/login/mfa-verify");
        return;
      }
      toast(isLogin ? "Welcome back!" : "Welcome to the family!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Network error — check your connection and try again.");
      setBusy(false);
    }
  };

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

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
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
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-primary-700 hover:underline"
              >
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

        {serverError && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
              {isLogin ? "Signing in…" : "Creating account…"}
            </>
          ) : isLogin ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </Button>

        {!isLogin && (
          <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="font-semibold text-primary-700 hover:underline">Terms</Link> and{" "}
            <Link href="/privacy" className="font-semibold text-primary-700 hover:underline">Privacy Policy</Link>.
          </p>
        )}
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
