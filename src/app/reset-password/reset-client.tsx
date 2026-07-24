"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";
import { toast } from "@/components/toast";

export function ResetClient({ token }: { token: string }) {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    const next: Record<string, string> = {};
    if (password.length < 8) next.password = "Password needs at least 8 characters.";
    else if (password !== confirm) next.confirm = "Those passwords don't match.";

    setErrors(next);
    setServerError("");
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "Could not reset your password.");
        setBusy(false);
        return;
      }
      toast("Password updated — you're signed in", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Network error — check your connection and try again.");
      setBusy(false);
    }
  };

  if (!token)
    return (
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Invalid reset link</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          This link is missing its token. Request a fresh one and try again.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-bold text-primary-700 hover:underline"
        >
          Send a new reset link
        </Link>
      </div>
    );

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Choose a new password</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Pick something you haven&apos;t used before. You&apos;ll be signed in straight after.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="rp-pw" className="text-sm font-bold text-ink">
            New password
            <span aria-hidden className="ml-1 text-danger">
              *
            </span>
          </label>
          <div className="relative mt-2">
            <input
              id="rp-pw"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "rp-pw-err" : "rp-pw-help"}
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
            <p id="rp-pw-err" role="alert" className="mt-1.5 text-sm font-semibold text-danger">
              {errors.password}
            </p>
          ) : (
            <p id="rp-pw-help" className="mt-1.5 text-xs text-ink-faint">
              At least 8 characters.
            </p>
          )}
        </div>

        <Field label="Confirm new password" id="rp-confirm" required error={errors.confirm}>
          <input
            id="rp-confirm"
            name="confirm"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "rp-confirm-err" : undefined}
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>

        {serverError && (
          <div
            role="alert"
            className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
          >
            {serverError}
            <Link href="/forgot-password" className="ml-1 underline">
              Request a new link
            </Link>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />}
          Update password
        </Button>
      </form>
    </div>
  );
}
