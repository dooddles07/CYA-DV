"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { csrfHeader } from "@/lib/csrf";

export function ExitPortalButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const exit = async () => {
    if (leaving) return;
    setLeaving(true);
    await fetch("/api/admin/portal/logout", { method: "POST", headers: csrfHeader() }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={exit}
      disabled={leaving}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:bg-sky-tint hover:text-ink disabled:opacity-40"
    >
      {leaving ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden />
      )}
      Exit portal
    </button>
  );
}
