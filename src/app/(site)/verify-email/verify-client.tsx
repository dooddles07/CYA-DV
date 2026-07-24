"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { toast } from "@/components/toast";

type Status = "verifying" | "ok" | "error";

export function VerifyClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState(
    token ? "" : "This link is missing its token. Open the link from your email again."
  );
  const ran = useRef(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

  const resend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) toast("Sign in first, then resend.", "info");
      else if (!res.ok) toast(data.error ?? "Could not send the email.", "error");
      else toast("Verification email sent — check your inbox.", "success");
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not verify your email.");
        setStatus("ok");
        // Repaint server components (navbar, verified state) without a full reload.
        router.refresh();
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [token, router]);

  if (status === "verifying")
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Confirming your email</h1>
        <p className="mt-2 text-sm text-ink-soft">One moment…</p>
      </div>
    );

  if (status === "ok")
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Email confirmed</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Your account is verified — you can now post to the prayer wall.
        </p>
        <ButtonLink href="/prayer" className="mt-6 w-full">
          Go to the prayer wall
        </ButtonLink>
      </div>
    );

  return (
    <div className="text-center">
      <XCircle className="mx-auto h-10 w-10 text-red-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Verification failed</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{message}</p>
      <Button onClick={resend} disabled={resending} className="mt-6 w-full">
        {resending ? "Sending…" : "Resend verification email"}
      </Button>
      <p className="mt-3 text-xs text-ink-faint">You need to be signed in to resend.</p>
    </div>
  );
}
