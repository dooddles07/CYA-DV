import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, HandHelping, PenLine } from "lucide-react";
import { VerseCard } from "@/components/verse-card";
import { MarkRead } from "@/components/mark-read";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Card, SectionHeading } from "@/components/ui";
import { getTodayLabel, reflectionQuestions, verseLibrary } from "@/lib/data";
import { getVerseOfDay } from "@/server/services/verse.service";
import { savedReferences } from "@/server/services/saved-verse.service";
import { getSession } from "@/server/utils/session";

export const metadata: Metadata = {
  title: "Daily Verse",
  description: "Today's verse with reflection, prayer, and related scriptures.",
};

export const dynamic = "force-dynamic";

const panels = [
  {
    icon: BookOpen,
    title: "How to sit with this verse",
    body: [
      "Don't rush. Read today's verse twice — once for the words, once for the Voice behind them. Scripture was written to real people in real seasons, and the same Spirit speaks through it now.",
      "Notice one word or phrase that stands out to you. That's usually where God is inviting you to slow down. Carry that phrase into your day — on your commute, between classes, before you sleep.",
    ],
  },
];

export default async function VersePage() {
  const session = await getSession();
  const [todaysVerse, saved] = await Promise.all([
    getVerseOfDay(),
    session ? savedReferences(session.sub) : ([] as string[]),
  ]);
  return (
    <div className="pb-28 pt-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            center
            eyebrow="Daily verse"
            title="Sit with the Word"
            sub="Read slowly. Reflect honestly. Pray simply. That's the whole practice."
          />
        </Reveal>
      </div>

      <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <VerseCard
            verse={todaysVerse}
            dateLabel={getTodayLabel()}
            compact
            initialSaved={saved.includes(todaysVerse.reference)}
          />
          <MarkRead />
        </Reveal>
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl gap-6 px-4 sm:px-6 lg:px-8">
        {panels.map((p) => (
          <Reveal key={p.title}>
            <Card className="p-8" hover={false}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                  <p.icon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="text-xl font-extrabold text-ink">{p.title}</h2>
              </div>
              <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-soft">
                {p.body.map((b, i) => (
                  <p key={i}>{b}</p>
                ))}
              </div>
            </Card>
          </Reveal>
        ))}

        <Reveal>
          <Card className="p-8" hover={false}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                <PenLine className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-xl font-extrabold text-ink">Reflection questions</h2>
            </div>
            <ol className="mt-5 space-y-3">
              {reflectionQuestions.map((q, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-2xl bg-sky-soft p-4 text-[15px] leading-relaxed text-ink"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">
                    {i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-8" hover={false} ring>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                <HandHelping className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-xl font-extrabold text-ink">A prayer for today</h2>
            </div>
            <p className="verse-text mt-5 text-lg italic leading-relaxed text-ink">
              Father, thank You for speaking to me today. Let this word take root in my heart — not
              just read, but lived. Give me grace to obey what I&apos;ve seen, and to carry Your
              peace into everything this day holds. In Jesus&apos; name, Amen.
            </p>
          </Card>
        </Reveal>

        <section aria-label="Related verses">
          <Reveal>
            <h2 className="text-xl font-extrabold text-ink">More verses to carry with you</h2>
          </Reveal>
          <Stagger className="mt-5 grid gap-4 sm:grid-cols-2">
            {verseLibrary.slice(1, 5).map((v) => (
              <StaggerItem key={v.reference}>
                <Link
                  href={`/search?q=${encodeURIComponent(v.reference)}`}
                  className="group block h-full rounded-3xl border border-line bg-surface p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-mist hover:shadow-lift motion-reduce:hover:translate-y-0"
                >
                  <p className="verse-text text-[15px] leading-relaxed text-ink">
                    “{v.text.length > 140 ? v.text.slice(0, 140) + "…" : v.text}”
                  </p>
                  <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-primary-700">
                    {v.reference}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden
                    />
                  </p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      </div>
    </div>
  );
}
