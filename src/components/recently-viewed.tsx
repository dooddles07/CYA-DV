"use client";

import Link from "next/link";
import { useEffect } from "react";
import { History } from "lucide-react";
import { useRecentList } from "@/lib/hooks";

/**
 * Records `current` as viewed on mount, then shows the reader's recent verses
 * as chips that link back into search. Client-only via localStorage, so it
 * works signed-out and never hits the server.
 */
export function RecentlyViewed({ current }: { current?: string }) {
  const { items, push } = useRecentList("cya:recent-verses", 8);

  useEffect(() => {
    if (current) push(current);
  }, [current, push]);

  const shown = items.filter((r) => r !== current);
  if (shown.length === 0) return null;

  return (
    <section aria-label="Recently viewed verses" className="mt-10">
      <p className="flex items-center gap-2 text-sm font-bold text-ink-faint">
        <History className="h-4 w-4" aria-hidden />
        Recently viewed
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((r) => (
          <Link
            key={r}
            href={`/search?q=${encodeURIComponent(r)}`}
            className="min-h-11 inline-flex items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-soft shadow-soft transition-colors duration-200 hover:border-primary hover:text-primary-700"
          >
            {r}
          </Link>
        ))}
      </div>
    </section>
  );
}
