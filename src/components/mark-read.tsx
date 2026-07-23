"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "@/components/toast";

/** "I read today's verse" — awards XP and extends the signed-in user's streak. */
export function MarkRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);

  const onClick = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      const res = await fetch("/api/streak/read", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        toast("Sign in to keep a streak", "info");
        router.push("/login");
        return;
      }
      if (!res.ok) {
        toast(data.error ?? "Could not save your progress.", "error");
        return;
      }
      setDone(true);
      setStreak(data.streak);
      toast(
        data.alreadyRead
          ? "Already counted for today — see you tomorrow!"
          : `Day ${data.streak} of your streak · +25 XP`,
        "success"
      );
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 flex justify-center">
      <Button onClick={onClick} size="lg" disabled={busy || done}>
        {busy ? (
          <>
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> Saving…
          </>
        ) : done ? (
          <>
            <Check className="h-[18px] w-[18px]" aria-hidden />
            {streak ? `Day ${streak} — streak saved` : "Counted for today"}
          </>
        ) : (
          <>
            <BookOpenCheck className="h-[18px] w-[18px]" aria-hidden /> I read today&apos;s verse
          </>
        )}
      </Button>
    </div>
  );
}
