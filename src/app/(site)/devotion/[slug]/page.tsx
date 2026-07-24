import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Reveal } from "@/components/motion";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { devotions } from "@/lib/data";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return devotions.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const devotion = devotions.find((d) => d.slug === slug);
  if (!devotion) return { title: "Devotional not found" };
  return {
    title: devotion.title,
    description: devotion.excerpt,
    openGraph: {
      title: devotion.title,
      description: devotion.excerpt,
      images: [{ url: devotion.image }],
      type: "article",
    },
  };
}

export default async function DevotionDetailPage({ params }: Params) {
  const { slug } = await params;
  const devotion = devotions.find((d) => d.slug === slug);
  if (!devotion) notFound();

  const more = devotions.filter((d) => d.slug !== slug);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Link
        href="/devotion"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All devotionals
      </Link>

      <Reveal className="mt-4">
        <Card hover={false} className="overflow-hidden">
          <div className="relative h-64 sm:h-96">
            <Image
              src={devotion.image}
              alt={devotion.imageAlt}
              fill
              sizes="(min-width:1024px) 70vw, 100vw"
              className="object-cover"
              priority
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
            />
            <div className="absolute inset-x-6 bottom-6 sm:inset-x-10">
              <Badge tone="white">{devotion.verse}</Badge>
              <h1 className="mt-3 max-w-2xl text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                {devotion.title}
              </h1>
            </div>
          </div>

          <article className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-ink-faint">
              <span>{devotion.author}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {devotion.readTime} read
              </span>
              <span aria-hidden>·</span>
              <span>{devotion.date}</span>
            </div>

            <div className="mt-6 space-y-5 text-[16px] leading-relaxed text-ink-soft">
              {devotion.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}

              <blockquote className="verse-text rounded-2xl bg-sky-soft p-6 text-lg italic text-ink">
                “{devotion.verseText}” — {devotion.verse}
              </blockquote>

              <p>
                <span className="font-semibold text-ink">Today, try this:</span>{" "}
                {devotion.practice}
              </p>
            </div>
          </article>
        </Card>
      </Reveal>

      <section aria-label="More devotionals" className="mt-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">Keep reading</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {more.map((d) => (
            <Link key={d.slug} href={`/devotion/${d.slug}`} className="group block h-full">
              <Card className="flex h-full flex-col p-7">
                <Badge tone="sky" className="self-start">
                  {d.verse}
                </Badge>
                <h3 className="mt-4 text-xl font-extrabold leading-snug text-ink">{d.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{d.excerpt}</p>
                <span className="mt-5 text-sm font-bold text-primary-700 group-hover:underline">
                  Read devotional
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-12 text-center">
        <ButtonLink href="/verse" variant="secondary">
          Read today&apos;s verse
        </ButtonLink>
      </div>
    </div>
  );
}
