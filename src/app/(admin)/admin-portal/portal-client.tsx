"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";

export function PortalClient({ next }: { next: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const passphrase = String(new FormData(e.currentTarget).get("passphrase") ?? "");
    if (!passphrase) {
      setError("Enter the portal passphrase.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not sign in.");
        setBusy(false);
        return;
      }
      if (data.mfaRequired) {
        router.push(`/login/mfa-verify?next=${encodeURIComponent(next)}`);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center text-center">
        <span className="relative inline-flex">
          <Image
            src="/media/cya-logo.png"
            alt="Christ's Youth in Action"
            width={64}
            height={64}
            className="rounded-2xl"
            priority
          />
          <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-ink text-bg">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          </span>
        </span>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.25em] text-ink-faint">
          Restricted area
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Admin portal</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          For CYA leaders managing the events calendar.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="portal-pass" className="text-sm font-bold text-ink">
            Portal passphrase
          </label>
          <div className="relative mt-2">
            <KeyRound
              className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              id="portal-pass"
              name="passphrase"
              type={show ? "text" : "password"}
              autoComplete="off"
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "portal-err" : undefined}
              className={cx(inputClass, "pl-12 pr-14")}
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide passphrase" : "Show passphrase"}
              aria-pressed={show}
              className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-faint hover:bg-sky-soft hover:text-ink"
            >
              {show ? (
                <EyeOff className="h-[18px] w-[18px]" aria-hidden />
              ) : (
                <Eye className="h-[18px] w-[18px]" aria-hidden />
              )}
            </button>
          </div>
          {error && (
            <p id="portal-err" role="alert" className="mt-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />}
          Enter portal
        </Button>
      </form>

      <p className="mt-8 text-center text-xs leading-relaxed text-ink-faint">
        Sessions end after 8 hours. Not a leader?{" "}
        <Link href="/login" className="font-bold text-primary-700 hover:underline">
          Member sign in
        </Link>
      </p>
    </div>
  );
}
