"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown, BookOpen, Flame, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Aurora } from "@/components/motion/aurora";
import { Counter, Magnetic, TextReveal } from "@/components/motion";
import { LightScene } from "@/components/three/light-scene";
import { type Verse } from "@/lib/data";
import { EASE } from "@/lib/motion";
import type { CommunityStats } from "@/lib/types";

export function Hero({ verse, stats }: { verse: Verse; stats: CommunityStats }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Content sinks and softens as the hero scrolls away — adds depth
  // without touching layout (transform/opacity only).
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.25]);

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, ease: EASE, delay },
        };

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-16" aria-label="Welcome">
      <Aurora dense />

      {/* 3D light layer — desktop only, decorative */}
      <LightScene className="pointer-events-none absolute right-[-8%] top-24 hidden h-[620px] w-[42%] opacity-90 lg:block" />

      <motion.div
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-28 lg:pt-24"
      >
        <div>
          <motion.span
            {...rise(0)}
            className="inline-flex items-center gap-2 rounded-full border border-sky-mist bg-surface/80 px-4 py-1.5 text-xs font-bold text-primary-700 shadow-soft backdrop-blur-sm"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Kay Kristo Buong Buhay, Habambuhay!
          </motion.span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            <TextReveal text="Meet God in His Word," delay={0.05} />{" "}
            <TextReveal text="every morning." delay={0.34} wordClassName="text-gradient" />
          </h1>

          <motion.p {...rise(0.12)} className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            Daily verses, gentle devotionals, reading plans, and a praying community — built by
            Christ&apos;s Youth in Action to help your generation grow one quiet morning at a time.
          </motion.p>

          <motion.div {...rise(0.18)} className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <ButtonLink href="/verse" size="lg">
                <BookOpen className="h-5 w-5" aria-hidden />
                Read today&apos;s verse
              </ButtonLink>
            </Magnetic>
            <Magnetic strength={0.18}>
              <ButtonLink href="/plans" variant="outline" size="lg">
                Start a reading plan
              </ButtonLink>
            </Magnetic>
          </motion.div>

          {/* Real community numbers. Before anyone signs up there is nothing
              honest to count, so we show an invitation instead of zeros. */}
          {stats.readers > 0 ? (
            <motion.dl {...rise(0.24)} className="mt-10 flex flex-wrap gap-8 text-sm">
              <div>
                <dt className="text-ink-faint">Longest streak</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-xl font-extrabold text-ink">
                  <Flame className="h-5 w-5 text-warning" aria-hidden />
                  <Counter to={stats.bestStreak} /> days
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Verses read together</dt>
                <dd className="mt-1 text-xl font-extrabold text-ink">
                  <Counter to={stats.versesRead} />
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Young readers</dt>
                <dd className="mt-1 text-xl font-extrabold text-ink">
                  <Counter to={stats.readers} />
                </dd>
              </div>
            </motion.dl>
          ) : (
            <motion.p {...rise(0.24)} className="mt-10 text-sm font-semibold text-ink-faint">
              Be the first to start a streak — the community numbers grow from here.
            </motion.p>
          )}
        </div>

        {/* Glass verse preview + photo */}
        <motion.div
          className="relative"
          initial={reduce ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        >
          <div className="glass relative z-10 rounded-[2rem] p-8 shadow-lift sm:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
              Verse of the day
            </p>
            <blockquote className="verse-text mt-5 text-xl text-ink sm:text-2xl">
              “{verse.text.split(".")[0]}.”
            </blockquote>
            <p className="mt-5 text-sm font-bold text-primary-700">
              {verse.reference} · {verse.version}
            </p>
            <div className="mt-6 h-px bg-line" aria-hidden />
            <p className="mt-5 text-sm text-ink-soft">
              Take 60 quiet seconds. Read it slowly. Let it carry you into the day.
            </p>
          </div>

          {/* Polaroid tucked under the card. Kept in normal flow so it can
              never overlap the scripture text at any breakpoint. */}
          <div className="relative z-20 mt-6 hidden w-40 -rotate-[4deg] overflow-hidden rounded-3xl border-4 border-surface shadow-lift motion-safe:animate-float-slow sm:block">
            <Image
              src="/media/church-picnic.jpg"
              alt="CYA members sharing a meal together on the grass"
              width={160}
              height={196}
              className="h-48 w-full object-cover"
            />
          </div>

          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary to-[#66ccff] opacity-20 blur-xl"
          />
        </motion.div>
      </motion.div>

      <a
        href="#today"
        aria-label="Scroll to today's verse"
        className="relative z-10 mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-faint shadow-soft transition-colors hover:text-primary motion-safe:animate-float"
      >
        <ArrowDown className="h-[18px] w-[18px]" aria-hidden />
      </a>
    </section>
  );
}
