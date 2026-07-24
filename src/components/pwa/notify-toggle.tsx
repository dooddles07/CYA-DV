"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "@/components/toast";
import { usePushSupported } from "@/lib/hooks";

/** base64url VAPID key -> ArrayBuffer, the format PushManager expects. */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function NotifyToggle() {
  const supported = usePushSupported();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reflect any subscription this device already has.
  useEffect(() => {
    if (!supported) return;
    let alive = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => alive && setEnabled(!!sub))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [supported]);

  if (!supported) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast("Notifications are blocked in your browser settings.", "info");
        return;
      }

      const { key } = await (await fetch("/api/push/key")).json();
      if (!key) {
        toast("Reminders aren't configured on the server yet.", "error");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(key),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("save failed");

      setEnabled(true);
      toast("Daily reminder on — see you tomorrow morning!", "success");
    } catch {
      toast("Could not turn on reminders.", "error");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      toast("Daily reminder off", "info");
    } catch {
      toast("Could not turn off reminders.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={enabled ? disable : enable} disabled={busy}>
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : enabled ? (
        <BellOff className="h-4 w-4" aria-hidden />
      ) : (
        <Bell className="h-4 w-4" aria-hidden />
      )}
      {enabled ? "Reminders on" : "Daily reminder"}
    </Button>
  );
}
