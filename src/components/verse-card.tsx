"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, BookOpen, Check, Copy, HandHelping, Share2, Volume2 } from "lucide-react";
import { Tilt3D } from "@/components/motion";
import { toast } from "@/components/toast";
import { cx } from "@/lib/cx";
import { spring } from "@/lib/motion";
import { csrfHeader } from "@/lib/csrf";
import type { Verse } from "@/lib/data";

/**
 * The signature surface of the product: today's verse on a deep blue
 * gradient, with a 3D tilt, a specular sheen and the four quick actions.
 */
export function VerseCard({
  verse,
  dateLabel,
  compact = false,
  initialSaved = false,
}: {
  verse: Verse;
  dateLabel: string;
  compact?: boolean;
  initialSaved?: boolean;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [speaking, setSpeaking] = useState(false);
  const [burst, setBurst] = useState(0);

  const fullText = `“${verse.text}” — ${verse.reference} (${verse.version})`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast("Verse copied to clipboard", "success");
    } catch {
      toast("Couldn't copy — select the text instead", "error");
    }
  };

  const onShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "CYA Daily Verse", text: fullText });
      } catch {
        /* user cancelled — no toast, that would be noise */
      }
    } else {
      onCopy();
    }
  };

  const onListen = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast("Audio isn't supported on this browser", "error");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(`${verse.text} ${verse.reference}`);
    u.rate = 0.92;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const onSave = async () => {
    // Optimistic: flip immediately, roll back if the server disagrees.
    const next = !saved;
    setSaved(next);
    if (next) setBurst((b) => b + 1);

    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeader() },
      body: JSON.stringify(verse),
    }).catch(() => null);

    if (res?.status === 401) {
      setSaved(!next);
      toast("Sign in to save verses", "info");
      router.push("/login");
      return;
    }
    if (!res?.ok) {
      setSaved(!next);
      toast("Could not save that verse — try again.", "error");
      return;
    }
    const data = await res.json();
    setSaved(data.saved);
    toast(data.saved ? "Saved to your verses" : "Removed from your verses", data.saved ? "success" : "info");
  };

  const actions = [
    { label: "Listen", icon: Volume2, onClick: onListen, active: speaking, pressed: speaking },
    { label: saved ? "Saved" : "Save", icon: saved ? Check : Bookmark, onClick: onSave, active: saved, pressed: saved },
    { label: "Copy", icon: Copy, onClick: onCopy, active: false },
    { label: "Share", icon: Share2, onClick: onShare, active: false },
  ];

  return (
    <Tilt3D
      max={compact ? 4 : 7}
      className="relative overflow-hidden rounded-[2.5rem] shadow-glow"
      style={{
        background:
          "linear-gradient(135deg, #0095ff 0%, #0089ec 50%, #33b1ff 100%)",
      }}
    >
      {/* artwork */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-2xl motion-safe:animate-float-slow" />
        <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-[#005ea8]/40 blur-2xl" />
        <svg
          className="absolute right-8 top-8 h-24 w-24 text-white/20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M6.5 10c-.8 1.5-1.2 3-1.2 4.6 0 2.6 1.6 4.4 3.8 4.4 2 0 3.5-1.5 3.5-3.5S11.1 12 9.2 12c-.3 0-.6 0-.9.1.3-1.2 1-2.5 2-3.7L8.6 6.7C7.7 7.7 7 8.8 6.5 10zm9 0c-.8 1.5-1.2 3-1.2 4.6 0 2.6 1.6 4.4 3.8 4.4 2 0 3.5-1.5 3.5-3.5S20.1 12 18.2 12c-.3 0-.6 0-.9.1.3-1.2 1-2.5 2-3.7l-1.7-1.7c-.9 1-1.6 2.1-2.1 3.3z" />
        </svg>
      </div>

      <div className={cx("relative", compact ? "p-8 sm:p-10" : "p-8 sm:p-14")}>
        <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-white/80">
          Today&apos;s Verse · {dateLabel}
        </p>

        <blockquote
          className={cx(
            "verse-text mt-6 text-white",
            compact ? "text-xl leading-snug sm:text-2xl" : "text-2xl leading-snug sm:text-[2rem]"
          )}
        >
          “{verse.text}”
        </blockquote>

        <p className="mt-6 text-sm font-extrabold uppercase tracking-wider text-white/90">
          {verse.reference} · {verse.version}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-2.5">
          <Link
            href="/verse"
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#005ea8] shadow-soft transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:hover:scale-100"
          >
            <BookOpen className="h-[18px] w-[18px]" aria-hidden />
            Read reflection &amp; prayer
          </Link>

          {actions.map(({ label, icon: Icon, onClick, active, pressed }) => (
            <motion.button
              key={label}
              type="button"
              onClick={onClick}
              aria-pressed={pressed}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              transition={spring}
              className={cx(
                "relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
                active
                  ? "border-white bg-white text-[#005ea8]"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/20"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              {/* bookmark burst */}
              {label !== "Listen" && (
                <AnimatePresence>
                  {burst > 0 && saved && label === "Saved" && (
                    <motion.span
                      key={burst}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-full border-2 border-white"
                      initial={{ opacity: 0.8, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.6 }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                    />
                  )}
                </AnimatePresence>
              )}
            </motion.button>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-white/12 p-4 backdrop-blur-sm">
          <HandHelping className="mt-0.5 h-5 w-5 shrink-0 text-white/80" aria-hidden />
          <p className="text-sm leading-relaxed text-white/90">
            <span className="font-bold">Short prayer:</span> Lord, thank You for this word today.
            Plant it deep in my heart, and help me live it out before the day is done. Amen.
          </p>
        </div>
      </div>
    </Tilt3D>
  );
}
