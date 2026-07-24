"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, HandHelping, Loader2, Send } from "lucide-react";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";
import { toast } from "@/components/toast";
import { spring } from "@/lib/motion";
import type { PrayerItem } from "@/lib/types";

function relTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PrayerClient({ initialPrayers }: { initialPrayers: PrayerItem[] }) {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<PrayerItem[]>(initialPrayers);
  const [prayed, setPrayed] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [request, setRequest] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (request.trim().length < 10) {
      setError("Please write at least a short sentence so people know how to pray.");
      document.getElementById("pr-request")?.focus();
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, request, anonymous }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not share right now. Please try again.");
        return;
      }
      setItems((list) => [data.prayer, ...list]);
      setRequest("");
      setName("");
      setSubmitted(true);
      toast("Shared with the family", "success");
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const onPray = (p: PrayerItem, done: boolean) => {
    setPrayed((s) => ({ ...s, [p.id]: !done }));
    if (!done) toast(`Praying with ${p.name}`, "success");
    // Static fallback items (DB offline) only update locally.
    if (p.id.startsWith("static-")) return;
    fetch(`/api/prayers/${p.id}/pray`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ undo: done }),
    }).catch(() => {});
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
      {/* Submit form */}
      <div>
        <Card hover={false} className="p-8 lg:sticky lg:top-24">
          <h2 className="text-xl font-extrabold text-ink">Submit a prayer request</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Share what&apos;s on your heart. The CYA family will stand with you.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            <Field label="Your name" id="pr-name">
              <input
                id="pr-name"
                type="text"
                value={name}
                disabled={anonymous}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="e.g. Kim"
                className={cx(inputClass, "disabled:bg-sky-soft disabled:text-ink-faint")}
              />
            </Field>

            <Field
              label="Prayer request"
              id="pr-request"
              required
              error={error}
              help="Please avoid full names of other people for their privacy."
            >
              <textarea
                id="pr-request"
                required
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                rows={4}
                aria-invalid={!!error}
                aria-describedby={error ? "pr-request-err" : "pr-request-help"}
                placeholder="How can we pray for you?"
                className="w-full resize-none rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed text-ink outline-none transition-colors duration-200 placeholder:text-ink-faint focus:border-primary"
              />
            </Field>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-ink-soft">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded accent-[#0095ff]"
              />
              Post anonymously
            </label>

            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> Sharing…
                </>
              ) : submitted ? (
                <>
                  <Check className="h-[18px] w-[18px]" aria-hidden /> Shared with the family
                </>
              ) : (
                <>
                  <Send className="h-[18px] w-[18px]" aria-hidden /> Share prayer request
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>

      {/* Wall */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">Community wall</h2>
          <span className="text-sm font-semibold text-ink-faint" aria-live="polite">
            {items.length} requests
          </span>
        </div>

        <motion.div layout className="mt-5 space-y-4">
          <AnimatePresence initial={false}>
            {items.map((p) => {
              const done = prayed[p.id];
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={reduce ? false : { opacity: 0, y: -14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.32 }}
                >
                  <Card hover={false} className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-ink">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge tone={p.tag === "New" ? "green" : "sky"}>{p.tag}</Badge>
                        <span className="text-xs text-ink-faint">{relTime(p.createdAt)}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{p.request}</p>
                    <div className="mt-4">
                      <motion.button
                        type="button"
                        whileTap={reduce ? undefined : { scale: 0.94 }}
                        transition={spring}
                        onClick={() => onPray(p, !!done)}
                        aria-pressed={!!done}
                        className={cx(
                          "relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold transition-all duration-200",
                          done
                            ? "bg-primary text-white shadow-glow"
                            : "bg-sky-tint text-primary-700 hover:bg-sky-mist"
                        )}
                      >
                        <HandHelping className="h-4 w-4" aria-hidden />
                        {done ? "Praying" : "I prayed"}
                        <span
                          className={cx(
                            "rounded-full px-1.5 text-xs",
                            done ? "bg-white/20" : "bg-surface"
                          )}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {p.prayedCount + (done ? 1 : 0)}
                        </span>
                        <AnimatePresence>
                          {done && !reduce && (
                            <motion.span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
                              initial={{ opacity: 0.7, scale: 1 }}
                              animate={{ opacity: 0, scale: 1.5 }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
