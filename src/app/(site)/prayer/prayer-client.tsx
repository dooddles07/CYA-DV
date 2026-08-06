"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, LogIn, Send } from "lucide-react";
import { Badge, Button, ButtonLink, Card, Field, inputClass } from "@/components/ui";
import { cx } from "@/lib/cx";
import { toast } from "@/components/toast";
import { useNow } from "@/lib/hooks";
import { relTime } from "@/lib/rel-time";
import { PrayButton } from "@/components/prayer";
import { csrfHeader } from "@/lib/csrf";
import type { PrayerItem } from "@/lib/types";

export function PrayerClient({
  initialPrayers,
  initialCursor,
  total,
  signedIn,
  displayName,
}: {
  initialPrayers: PrayerItem[];
  initialCursor: string | null;
  total: number;
  signedIn: boolean;
  displayName: string;
}) {
  const reduce = useReducedMotion();
  const now = useNow(60_000);
  const [items, setItems] = useState<PrayerItem[]>(initialPrayers);
  const [cursor, setCursor] = useState(initialCursor);
  const [count, setCount] = useState(total);
  const [prayed, setPrayed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialPrayers.map((p) => [p.id, p.prayed]))
  );
  const [name, setName] = useState(displayName);
  const [request, setRequest] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ name, request, anonymous }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not share right now. Please try again.");
        return;
      }
      setItems((list) => [data.prayer, ...list]);
      setCount((n) => n + 1);
      setRequest("");
      setSubmitted(true);
      toast("Shared with the family", "success");
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/prayers?cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json();
      const more: PrayerItem[] = data.prayers ?? [];
      setItems((list) => [...list, ...more]);
      setPrayed((s) => ({ ...s, ...Object.fromEntries(more.map((p) => [p.id, p.prayed])) }));
      setCursor(data.nextCursor ?? null);
    } catch {
      toast("Could not load more right now.", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  const onPray = async (p: PrayerItem, done: boolean) => {
    if (!signedIn) {
      toast("Sign in to pray for a request.", "info");
      return;
    }
    const next = !done;
    const delta = next ? 1 : -1;
    // Optimistic; the server response is reconciled below.
    setPrayed((s) => ({ ...s, [p.id]: next }));
    setItems((list) =>
      list.map((it) => (it.id === p.id ? { ...it, prayedCount: it.prayedCount + delta } : it))
    );
    if (next) toast(`Praying with ${p.name}`, "success");

    try {
      const res = await fetch(`/api/prayers/${p.id}/pray`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ undo: done }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrayed((s) => ({ ...s, [p.id]: data.prayed }));
      setItems((list) =>
        list.map((it) => (it.id === p.id ? { ...it, prayedCount: data.prayedCount } : it))
      );
    } catch {
      // Revert on failure.
      setPrayed((s) => ({ ...s, [p.id]: done }));
      setItems((list) =>
        list.map((it) => (it.id === p.id ? { ...it, prayedCount: it.prayedCount - delta } : it))
      );
      toast("Could not update right now.", "error");
    }
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

          {!signedIn ? (
            <div className="mt-6 rounded-2xl bg-sky-soft p-6 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary">
                <LogIn className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-bold text-ink">Sign in to share a request</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                An account keeps our wall safe for everyone. You can still post anonymously — your
                name stays hidden from the wall.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/login" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/register" variant="outline" size="sm">
                  Create a free account
                </ButtonLink>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              <Field label="Your name" id="pr-name">
                <input
                  id="pr-name"
                  type="text"
                  value={anonymous ? "" : name}
                  disabled={anonymous}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder={anonymous ? "Anonymous" : "e.g. Kim"}
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
                  maxLength={1000}
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
          )}
        </Card>
      </div>

      {/* Wall */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">Community wall</h2>
          <span className="text-sm font-semibold text-ink-faint" aria-live="polite">
            {count} request{count === 1 ? "" : "s"}
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
                        {p.tag ? (
                          <Badge tone={p.tag === "New" ? "green" : "sky"}>{p.tag}</Badge>
                        ) : null}
                        <span className="text-xs text-ink-faint">{relTime(p.createdAt, now)}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{p.request}</p>
                    <div className="mt-4">
                      <PrayButton
                        count={p.prayedCount}
                        done={!!done}
                        reduce={reduce}
                        onClick={() => onPray(p, !!done)}
                      />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {cursor && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Load more requests
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-ink-faint">
          Requests are public to everyone who visits this page.{" "}
          <Link href="/about" className="font-bold text-primary-700 hover:underline">
            Read our community guidelines
          </Link>
        </p>
      </div>
    </div>
  );
}
