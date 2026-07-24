"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck, Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";

export function ForgotClient() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("That email doesn't look right — check for typos.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send the reset email.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-mint-soft text-mint-strong">
          <MailCheck className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="text-xl font-extrabold text-ink">Check your inbox</h1>
        <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
          If that email belongs to an account, a reset link is on its way. It expires in an hour.
        </p>
        <Link href="/login" className="mt-2 text-sm font-bold text-primary-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    );

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Forgot your password?</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Enter your email and we&apos;ll send you a link to choose a new one.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Email" id="fp-email" required error={error}>
          <input
            id="fp-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!error}
            aria-describedby={error ? "fp-email-err" : undefined}
            className={inputClass}
            placeholder="you@example.com"
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />}
          Send reset link
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-primary-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
