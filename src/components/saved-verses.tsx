"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";
import { Badge, ButtonLink } from "@/components/ui";
import { toast } from "@/components/toast";
import type { SavedVerse } from "@/lib/types";

export function SavedVerses({ initial }: { initial: SavedVerse[] }) {
  const reduce = useReducedMotion();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState("");

  const remove = async (verse: SavedVerse) => {
    setBusy(verse.reference);
    // Optimistic: drop it now, put it back if the server rejects.
    setItems((list) => list.filter((v) => v.reference !== verse.reference));
    try {
      const res = await fetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: verse.reference }),
      });
      if (!res.ok) throw new Error();
      toast(`Removed ${verse.reference}`, "info");
    } catch {
      setItems(initial);
      toast("Could not remove that verse.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-ink">Saved verses</h2>
        <Badge tone="sky">{items.length} saved</Badge>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-sky-soft p-5 text-[15px] leading-relaxed text-ink-soft">
          Nothing saved yet. Tap <span className="font-bold text-ink">Save</span> on any verse and it
          will wait for you here.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          <AnimatePresence initial={false}>
            {items.map((v) => (
              <motion.li
                key={v.reference}
                layout
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.24 }}
                className="rounded-2xl bg-sky-soft p-5"
              >
                <p className="verse-text text-[15px] leading-relaxed text-ink">
                  “{v.text.length > 120 ? v.text.slice(0, 120) + "…" : v.text}”
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-primary-700">
                    {v.reference} · {v.version}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(v)}
                    disabled={busy === v.reference}
                    aria-label={`Remove ${v.reference} from saved verses`}
                    className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface hover:text-danger disabled:opacity-40"
                  >
                    {busy === v.reference ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <ButtonLink href="/search" variant="secondary" className="mt-6">
        Find more verses
      </ButtonLink>
    </>
  );
}
