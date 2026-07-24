import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { getVerseArchive } from "@/server/services/verse.service";

export const metadata: Metadata = {
  title: "Past Daily Verses",
  description: "Browse the verses of the day from the last 30 days.",
};

export const dynamic = "force-dynamic";

function label(dayKey: string) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function VerseArchivePage() {
  const archive = await getVerseArchive(30);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <Link
          href="/verse"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to today&apos;s verse
        </Link>
      </Reveal>

      <Reveal>
        <SectionHeading
          center
          eyebrow="Verse archive"
          title="Past daily verses"
          sub="Missed a morning? Every verse of the day from the last 30 days is here."
          className="mt-8"
        />
      </Reveal>

      <Stagger className="mt-12 space-y-4">
        {archive.map(({ dayKey, today, verse }) => (
          <StaggerItem key={dayKey}>
            <Link href={`/search?q=${encodeURIComponent(verse.reference)}`} className="block">
              <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex items-center gap-2 sm:w-40 sm:shrink-0">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-sm font-extrabold text-ink">{label(dayKey)}</span>
                  {today && <Badge tone="green">Today</Badge>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="verse-text text-[15px] leading-relaxed text-ink">
                    “{verse.text.length > 160 ? verse.text.slice(0, 160) + "…" : verse.text}”
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary-700">
                    {verse.reference} · {verse.version}
                  </p>
                </div>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
