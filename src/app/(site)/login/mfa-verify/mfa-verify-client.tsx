"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { toast } from "@/components/toast";
import { csrfHeader } from "@/lib/csrf";

export function MfaVerifyClient({ next }: { next: string }) {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !value) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(useBackup ? { backupCode: value } : { code: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not verify that code.");
        setBusy(false);
        return;
      }
      toast("Signed in", "success");
      router.push(data.user ? "/dashboard" : next);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="glass w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Verify it&apos;s you</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {useBackup
          ? "Enter one of your backup codes."
          : "Enter the 6-digit code from your authenticator app."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field label={useBackup ? "Backup code" : "Authentication code"} id="mfa-code" required error={error}>
          <input
            id="mfa-code"
            name="code"
            type="text"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            className={inputClass}
            placeholder={useBackup ? "xxxxx-xxxxx" : "123456"}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : "Verify"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setUseBackup((v) => !v);
            setValue("");
            setError("");
          }}
          className="w-full text-center text-sm font-bold text-primary-700 hover:underline"
        >
          {useBackup ? "Use your authenticator app instead" : "Use a backup code instead"}
        </button>
      </form>
    </div>
  );
}
