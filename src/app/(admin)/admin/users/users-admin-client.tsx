"use client";

import { useState } from "react";
import { Loader2, Shield, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { toast } from "@/components/toast";
import type { AdminUser } from "@/lib/types";

export function UsersAdminClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [items, setItems] = useState(initialUsers);
  const [busy, setBusy] = useState("");

  const toggleRole = async (u: AdminUser) => {
    const role = u.role === "admin" ? "member" : "admin";
    setBusy(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not update.", "error");
        return;
      }
      setItems((list) => list.map((i) => (i.id === u.id ? { ...i, role } : i)));
      toast(role === "admin" ? `${u.name} is now an admin` : `${u.name} is now a member`, "success");
    } catch {
      toast("Network error — try again.", "error");
    } finally {
      setBusy("");
    }
  };

  if (items.length === 0)
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" aria-hidden />}
        title="No accounts yet"
        body="Members will appear here as people sign up."
      />
    );

  return (
    <div className="space-y-3">
      {items.map((u) => (
        <Card key={u.id} hover={false} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-extrabold text-ink">{u.name}</p>
                {u.role === "admin" && (
                  <Badge tone="sky">
                    <Shield className="mr-1 h-3 w-3" aria-hidden />
                    Admin
                  </Badge>
                )}
                {!u.emailVerified && <Badge tone="gold">Unverified</Badge>}
              </div>
              <p className="truncate text-xs text-ink-faint">{u.email}</p>
            </div>
            <Button
              variant={u.role === "admin" ? "outline" : "secondary"}
              size="sm"
              onClick={() => toggleRole(u)}
              disabled={busy === u.id}
            >
              {busy === u.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : u.role === "admin" ? (
                <ShieldOff className="h-4 w-4" aria-hidden />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden />
              )}
              {u.role === "admin" ? "Make member" : "Make admin"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
