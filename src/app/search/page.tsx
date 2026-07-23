import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchClient } from "./search-client";
import { Reveal } from "@/components/motion";
import { SectionHeading, Skeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Bible Search",
  description: "Search Scripture by keyword, reference, or topic.",
};

export default function SearchPage() {
  return (
    <div className="pb-28 pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            center
            eyebrow="Bible search"
            title="Search the Word"
            sub="Find a verse by keyword, reference, or topic — or let a random one find you."
            className="mb-10"
          />
        </Reveal>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <SearchClient />
        </Suspense>
      </div>
    </div>
  );
}
