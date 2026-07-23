"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Church,
  Compass,
  Droplets,
  Flame,
  HandHeart,
  HandHelping,
  Heart,
  HeartPulse,
  House,
  Leaf,
  Lightbulb,
  MessageCircleHeart,
  Mountain,
  PenLine,
  Quote,
  Smile,
  Sparkles,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { cx } from "@/lib/cx";
import { Stagger, StaggerItem } from "@/components/motion";
import { toast } from "@/components/toast";
import { categories, challenges, prayerWall, quotes } from "@/lib/data";
import { spring } from "@/lib/motion";

const iconMap: Record<string, LucideIcon> = {
  Sparkles, Sunrise, Heart, Lightbulb, Leaf, Mountain, HandHeart, Church,
  Droplets, Smile, HeartPulse, House, Flame, Compass, MessageCircleHeart,
  Brain, PenLine,
};

/* ---------------------------------------------------------- Categories */

export function CategoryGrid() {
  return (
    <Stagger className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((c) => {
        const Icon = iconMap[c.icon] ?? Sparkles;
        return (
          <StaggerItem key={c.name}>
            <Link
              href={`/search?topic=${encodeURIComponent(c.name)}`}
              className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-sky-mist hover:shadow-lift motion-reduce:hover:translate-y-0"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-tint text-primary transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-ink">{c.name}</span>
                <span className="block text-xs text-ink-faint">{c.count} verses</span>
              </span>
            </Link>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/* --------------------------------------------------------- Mood chips */

export function MoodChips() {
  const feelings = [
    "I feel anxious",
    "I need hope",
    "I feel lonely",
    "I need strength",
    "I need forgiveness",
    "I need peace",
  ];
  return (
    <Stagger className="flex flex-wrap justify-center gap-2.5">
      {feelings.map((f) => (
        <StaggerItem key={f}>
          <Link
            href={`/mood?feeling=${encodeURIComponent(f)}`}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink-soft shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary-700 hover:shadow-lift motion-reduce:hover:translate-y-0"
          >
            {f}
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/* ------------------------------------------------------- Prayer preview */

export function PrayerPreview() {
  const reduce = useReducedMotion();
  const [prayed, setPrayed] = useState<Record<number, boolean>>({});

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {prayerWall.map((p, i) => {
        const done = prayed[i];
        return (
          <Card key={p.name + i} spotlight className="flex flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-ink">{p.name}</p>
              <Badge tone="sky">{p.tag}</Badge>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{p.request}</p>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-ink-faint">{p.time}</span>
              <motion.button
                type="button"
                whileTap={reduce ? undefined : { scale: 0.94 }}
                transition={spring}
                onClick={() => {
                  setPrayed((s) => ({ ...s, [i]: !s[i] }));
                  if (!done) toast(`Praying with ${p.name}`, "success");
                }}
                aria-pressed={!!done}
                className={cx(
                  "relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold transition-all duration-200",
                  done ? "bg-primary text-white shadow-glow" : "bg-sky-tint text-primary-700 hover:bg-sky-mist"
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
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------ Challenge cards */

export function ChallengeGrid() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState<Record<number, boolean>>({});

  return (
    <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {challenges.map((c, i) => {
        const Icon = iconMap[c.icon] ?? Sparkles;
        const complete = done[i];
        return (
          <StaggerItem key={c.title}>
            <Card spotlight className={cx("flex h-full flex-col p-6", complete && "border-mint-soft")}>
              <span
                className={cx(
                  "inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-300",
                  complete ? "bg-mint-soft text-mint-strong" : "bg-sky-tint text-primary"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.1em] text-primary">
                {c.type}
              </p>
              <p className="mt-2 flex-1 text-[15px] font-bold leading-snug text-ink">{c.title}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <Badge tone="gold">+{c.xp} XP</Badge>
                <motion.button
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.94 }}
                  transition={spring}
                  aria-pressed={!!complete}
                  onClick={() => {
                    setDone((s) => ({ ...s, [i]: !s[i] }));
                    if (!complete) toast(`+${c.xp} XP — nice work!`, "success");
                  }}
                  className={cx(
                    "inline-flex h-11 cursor-pointer items-center rounded-full px-4 text-xs font-bold transition-colors duration-200",
                    complete
                      ? "bg-mint-soft text-mint-strong"
                      : "bg-sky-tint text-primary-700 hover:bg-sky-mist"
                  )}
                >
                  {complete ? "Done" : "Accept"}
                </motion.button>
              </div>
            </Card>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/* ------------------------------------------------------- Quote carousel */

export function QuoteCarousel() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % quotes.length), 6000);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + quotes.length) % quotes.length);

  return (
    <div
      className="relative mx-auto max-w-3xl text-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Quote className="mx-auto h-8 w-8 text-sky-mist" aria-hidden />
      <div className="relative mt-4 min-h-36 sm:min-h-32" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? undefined : { opacity: 0, y: -10, scale: 0.99, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.21, 0.66, 0.29, 0.99] }}
          >
            <blockquote className="verse-text text-xl italic text-ink sm:text-2xl">
              “{quotes[index].text}”
            </blockquote>
            <figcaption className="mt-4 text-sm font-bold text-primary-700">
              — {quotes[index].author}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous quote"
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-primary hover:text-primary"
        >
          <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
        </button>

        <div className="flex gap-2">
          {quotes.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show quote ${i + 1} of ${quotes.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="group grid h-11 w-11 cursor-pointer place-items-center"
            >
              <span
                className={cx(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-2 bg-sky-mist group-hover:bg-primary/40"
                )}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next quote"
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-primary hover:text-primary"
        >
          <ChevronRight className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>

      <div className="mt-8">
        <ButtonLink href="/prayer" variant="secondary">
          Visit the prayer wall
        </ButtonLink>
      </div>
    </div>
  );
}
