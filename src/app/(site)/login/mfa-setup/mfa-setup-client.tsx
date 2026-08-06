"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { toast } from "@/components/toast";
import { csrfHeader } from "@/lib/csrf";

type EnrollData = { otpauthUri: string; qrDataUrl: string; backupCodes: string[] };

export function MfaSetupClient() {
  const router = useRouter();
  const [data, setData] = useState<EnrollData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // React Strict Mode double-invokes effects in dev, firing this fetch
    // twice — harmless since beginEnrollment() atomically converges both
    // calls on the same secret (see its docstring), and the "alive" flag
    // below ensures only the invocation that's still mounted applies its
    // response, so the later of the two wins.
    let alive = true;
    fetch("/api/auth/mfa/enroll", { method: "POST", headers: csrfHeader() })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Could not start MFA setup.");
        if (alive) setData(body);
      })
      .catch((err) => alive && setLoadError(err instanceof Error ? err.message : "Could not start MFA setup."));
    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the live DOM value via FormData rather than the `code` state
    // closure — a controlled input's onChange can lag a fast programmatic
    // fill (real users typing key-by-key don't hit this), so trusting the
    // closure risks submitting a stale empty string.
    const submitted = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    if (busy || !submitted) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa/enroll/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ code: submitted }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not confirm that code.");
        setBusy(false);
        return;
      }
      toast("Two-factor sign-in enabled", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
      setBusy(false);
    }
  };

  if (loadError)
    return (
      <div className="glass w-full max-w-md rounded-[2rem] p-8 text-center shadow-lift sm:p-10">
        <p className="text-sm font-semibold text-danger">{loadError}</p>
      </div>
    );

  if (!data)
    return (
      <div className="glass flex w-full max-w-md items-center justify-center rounded-[2rem] p-8 shadow-lift sm:p-10">
        <Loader2 className="h-6 w-6 animate-spin text-ink-faint" aria-hidden />
      </div>
    );

  return (
    <div className="glass w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Set up two-factor sign-in</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Admin accounts require an authenticator app. Scan this QR code, or enter the key manually.
      </p>

      {!saved ? (
        <div className="mt-6 space-y-5">
          <Image
            src={data.qrDataUrl}
            alt="Scan with your authenticator app"
            width={220}
            height={220}
            unoptimized
            className="mx-auto rounded-2xl border border-black/5"
          />
          <p className="break-all rounded-2xl bg-sky-soft p-4 text-center text-xs font-mono text-ink-soft">
            {new URL(data.otpauthUri).searchParams.get("secret")}
          </p>

          <div>
            <p className="text-sm font-bold text-ink">Backup codes</p>
            <p className="mt-1 text-xs text-ink-faint">
              Save these somewhere safe — each works once if you lose your device. They will not be
              shown again.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-sky-soft p-4 font-mono text-sm text-ink">
              {data.backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>

          <Button size="lg" className="w-full" onClick={() => setSaved(true)}>
            I&apos;ve saved my backup codes
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          <Field label="Authentication code" id="mfa-setup-code" required error={error}>
            <input
              id="mfa-setup-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={!!error}
              className={inputClass}
              placeholder="123456"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : "Confirm"}
          </Button>
        </form>
      )}
    </div>
  );
}
