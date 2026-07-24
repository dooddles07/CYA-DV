"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "@/components/toast";

export function AccountControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "export" | "delete">("");
  const [confirming, setConfirming] = useState(false);

  const onExport = async () => {
    setBusy("export");
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cya-daily-verse-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast("Your data download has started.", "success");
    } catch {
      toast("Could not export your data — try again.", "error");
    } finally {
      setBusy("");
    }
  };

  const onDelete = async () => {
    setBusy("delete");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Your account and data were deleted.", "success");
      router.push("/");
      router.refresh();
    } catch {
      toast("Could not delete your account — try again.", "error");
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onExport} disabled={busy !== ""}>
          {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          Export my data
        </Button>
      </div>

      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
        <h3 className="text-sm font-extrabold text-ink">Delete my account</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Permanently removes your account and everything tied to it — prayer requests, saved
          verses, reading plans, RSVPs, and reminders. This cannot be undone.
        </p>
        {!confirming ? (
          <Button variant="outline" className="mt-4 border-danger/40 text-danger hover:bg-danger/10" onClick={() => setConfirming(true)}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete account
          </Button>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-ink">Are you sure?</span>
            <Button className="bg-danger text-white hover:bg-danger/90" onClick={onDelete} disabled={busy === "delete"}>
              {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Yes, delete everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy === "delete"}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
