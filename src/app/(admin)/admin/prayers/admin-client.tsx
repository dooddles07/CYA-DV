"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { toast } from "@/components/toast";
import { ShieldCheck } from "lucide-react";
import type { ModeratedPrayer } from "@/lib/types";

export function AdminClient({ initialPrayers }: { initialPrayers: ModeratedPrayer[] }) {
  const [items, setItems] = useState(initialPrayers);
  const [busy, setBusy] = useState("");
  // Snapshot once so the "New" cutoff is stable across re-renders.
  const [freshCutoff] = useState(() => Date.now() - 86_400_000);

  const setStatus = async (p: ModeratedPrayer) => {
    const status = p.status === "approved" ? "hidden" : "approved";
    setBusy(p.id);
    try {
      const res = await fetch(`/api/admin/prayers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not update.", "error");
        return;
      }
      setItems((list) => list.map((i) => (i.id === p.id ? { ...i, status } : i)));
      toast(status === "hidden" ? "Hidden from the wall" : "Restored to the wall", "success");
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy("");
    }
  };

  if (items.length === 0)
    return (
      <EmptyState
        icon={<ShieldCheck className="h-10 w-10" aria-hidden />}
        title="Nothing to moderate"
        body="Prayer requests will appear here as the community shares them."
      />
    );

  return (
    <div className="space-y-4">
      {items.map((p) => (
        <Card key={p.id} hover={false} className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-ink">{p.name}</p>
            <div className="flex items-center gap-2">
              {new Date(p.createdAt).getTime() > freshCutoff && (
                <Badge tone="sky">New</Badge>
              )}
              <Badge tone={p.status === "hidden" ? "gold" : "green"}>
                {p.status === "hidden" ? "Hidden" : "Visible"}
              </Badge>
              <span className="text-xs text-ink-faint">
                {new Date(p.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{p.request}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-ink-faint">{p.prayedCount} prayed</span>
            <Button
              variant={p.status === "approved" ? "outline" : "secondary"}
              size="sm"
              onClick={() => setStatus(p)}
              disabled={busy === p.id}
            >
              {busy === p.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : p.status === "approved" ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
              {p.status === "approved" ? "Hide" : "Restore"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
