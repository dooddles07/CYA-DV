"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Search as SearchIcon, Shuffle, X } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { cx } from "@/lib/cx";
import { categories, verseLibrary } from "@/lib/data";
import { EASE } from "@/lib/motion";

const topics = ["Strength", "Hope", "Peace", "Love", "Wisdom", "Faith", "Youth", "Grace", "Courage", "Rest"];

export function SearchClient() {
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [topic, setTopic] = useState(params.get("topic") ?? "");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verseLibrary.filter((v) => {
      const matchQ =
        !q || v.text.toLowerCase().includes(q) || v.reference.toLowerCase().includes(q);
      const matchTopic = !topic || v.topic === topic;
      return matchQ && matchTopic;
    });
  }, [query, topic]);

  const randomVerse = () => {
    const v = verseLibrary[Math.floor(Math.random() * verseLibrary.length)];
    setQuery(v.reference);
    setTopic("");
  };

  return (
    <div>
      {/* Search field */}
      <div className="relative mx-auto max-w-2xl">
        <SearchIcon
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          id="verse-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keyword or reference, e.g. “hope” or “John 3:16”"
          aria-label="Search verses"
          className="h-14 w-full rounded-full border border-line bg-surface pl-13 pr-12 text-[15px] text-ink shadow-soft outline-none transition-shadow duration-200 placeholder:text-ink-faint focus:border-primary focus:shadow-lift"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink-faint hover:bg-sky-soft hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <motion.button
          type="button"
          onClick={randomVerse}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink-soft shadow-soft transition-all duration-200 hover:border-primary hover:text-primary-700"
        >
          <Shuffle className="h-4 w-4" aria-hidden />
          Surprise me with a random verse
        </motion.button>
      </div>

      {/* Topic filters */}
      <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by topic">
        <FilterChip active={topic === ""} onClick={() => setTopic("")}>
          All topics
        </FilterChip>
        {topics.map((t) => (
          <FilterChip key={t} active={topic === t} onClick={() => setTopic(topic === t ? "" : t)}>
            {t}
          </FilterChip>
        ))}
      </div>

      {/* Results */}
      <p className="mt-10 text-sm font-semibold text-ink-faint" aria-live="polite">
        {results.length} verse{results.length === 1 ? "" : "s"} found
      </p>

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<BookOpen className="h-10 w-10" aria-hidden />}
            title="No verses matched"
            body="Try a different keyword, or browse by topic — the Word always has something for you."
          />
        </div>
      ) : (
        <motion.div layout className="mt-4 grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {results.map((v) => (
              <motion.div
                key={v.reference}
                layout
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <Card className="flex h-full flex-col p-7">
                  <blockquote className="verse-text flex-1 text-[16px] leading-relaxed text-ink">
                    “{v.text}”
                  </blockquote>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-primary-700">
                      {v.reference} · {v.version}
                    </p>
                    <Badge tone="sky">{v.topic}</Badge>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Category shortcuts */}
      <div className="mt-14 border-t border-line pt-10">
        <p className="text-center text-sm font-bold text-ink-faint">
          Or explore all {categories.length} topics
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setTopic(c.name);
                setQuery("");
              }}
              className="min-h-11 cursor-pointer rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-bold text-ink-soft transition-colors duration-200 hover:border-primary hover:text-primary-700"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "relative min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200",
        active ? "text-white" : "bg-sky-tint text-ink-soft hover:text-primary-700"
      )}
    >
      {active && (
        <motion.span
          layoutId="topic-active"
          className="absolute inset-0 -z-10 rounded-full bg-primary shadow-glow"
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      {children}
    </button>
  );
}
