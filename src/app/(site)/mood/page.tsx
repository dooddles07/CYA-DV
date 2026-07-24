import type { Metadata } from "next";
import { Suspense } from "react";
import { MoodClient } from "./mood-client";
import { Reveal } from "@/components/motion";
import { SectionHeading, Skeleton } from "@/components/ui";
import { Aurora } from "@/components/motion/aurora";

export const metadata: Metadata = {
  title: "Mood Verse Finder",
  description: "Tell us how you feel and we'll find the verse that meets you there.",
};

export default function MoodPage() {
  return (
    <div className="relative overflow-hidden pb-28 pt-28">
      <Aurora />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            center
            eyebrow="Mood verse finder"
            title="Tell us how you feel — we'll find the verse"
            sub="God's Word speaks to real emotions. Pick what's true for you right now."
            className="mb-12"
          />
        </Reveal>
        <Suspense fallback={<Skeleton className="mx-auto h-72 max-w-2xl" />}>
          <MoodClient />
        </Suspense>
      </div>
    </div>
  );
}
