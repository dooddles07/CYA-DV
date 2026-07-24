"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Clock, Search as SearchIcon, Shuffle, X } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { cx } from "@/lib/cx";
import { categories, type Verse } from "@/lib/data";
import { EASE } from "@/lib/motion";
import { useRecentList } from "@/lib/hooks";

const topics = ["Strength", "Hope", "Peace", "Love", "Wisdom", "Faith", "Youth", "Grace", "Courage", "Rest"];

export function SearchClient({
  initialQuery,
  initialTopic,
  initialResults,
}: {
  initialQuery: string;
  initialTopic: string;
  initialResults: Verse[];
}) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState(initialQuery);
  const [topic, setTopic] = useState(initialTopic);
  const [results, setResults] = useState<Verse[]>(initialResults);
  const skipFirst = useRef(true);
  const history = useRecentList("cya:search-history", 8);
  const pushHistory = history.push;

  // Debounced server search so results cover the whole collection, not just what shipped to the client.
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const controller = new AbortController();
    const id = window.setTimeout(() => {
      const q = query.trim();
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (topic) params.set("topic", topic);
      fetch(`/api/verse/search?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setResults(d.verses ?? []))
        .catch(() => {});
      if (q) pushHistory(q);
    }, 250);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [query, topic, pushHistory]);

  // Picks from the full collection, not the current filtered view.
  const randomVerse = async () => {
    const res = await fetch("/api/verse/search").catch(() => null);
    const all: Verse[] = res ? ((await res.json()).verses ?? []) : [];
    if (all.length === 0) return;
    setQuery(all[Math.floor(Math.random() * all.length)].reference);
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

      {/* Recent searches — only when the field is empty, so they don't fight typing */}
      {!query.trim() && history.items.length > 0 && (
        <div className="mx-auto mt-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-faint">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Recent searches
            </p>
            <button
              type="button"
              onClick={history.clear}
              className="min-h-9 cursor-pointer text-xs font-bold text-ink-faint hover:text-primary-700"
            >
              Clear
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {history.items.map((q) => (
              <span
                key={q}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface pl-3 pr-1 text-sm font-semibold text-ink-soft shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => {
                    setQuery(q);
                    setTopic("");
                  }}
                  className="min-h-9 cursor-pointer py-1 hover:text-primary-700"
                >
                  {q}
                </button>
                <button
                  type="button"
                  onClick={() => history.remove(q)}
                  aria-label={`Remove "${q}" from recent searches`}
                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-sky-soft hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
