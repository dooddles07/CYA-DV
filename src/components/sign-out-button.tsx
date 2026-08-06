"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { csrfHeader } from "@/lib/csrf";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST", headers: csrfHeader() }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={busy}>
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden />
      )}
      Sign out
    </Button>
  );
}
