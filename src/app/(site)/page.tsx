import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin, Mic } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { VerseCard } from "@/components/verse-card";
import {
  CategoryGrid,
  ChallengeGrid,
  MoodChips,
  PrayerPreview,
  QuoteCarousel,
} from "@/components/home/sections";
import { Reveal, Parallax, Stagger, StaggerItem } from "@/components/motion";
import { WeekProgress } from "@/components/week-progress";
import { SignInCard } from "@/components/sign-in-card";
import { Badge, ButtonLink, Card, ProgressBar, SectionHeading } from "@/components/ui";
import { getTodayLabel, testimonials } from "@/lib/data";
import { listDevotions } from "@/server/services/devotion.service";
import { listUpcomingEvents } from "@/server/services/event.service";
import { getVerseOfDay } from "@/server/services/verse.service";
import { getCommunityStats, getTopicCounts } from "@/server/services/stats.service";
import { listPrayers } from "@/server/services/prayer.service";
import { getActivePlan, previewPlan } from "@/server/services/plan.service";
import { savedReferences } from "@/server/services/saved-verse.service";
import { getSession } from "@/server/utils/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const [todaysVerse, stats, topicCounts, prayers, plan, saved, events, devotions] =
    await Promise.all([
      getVerseOfDay(),
      getCommunityStats(),
      getTopicCounts(),
      listPrayers(4, session?.sub ?? null),
      session ? getActivePlan(session.sub) : previewPlan(),
      session ? savedReferences(session.sub) : ([] as string[]),
      listUpcomingEvents(3),
      listDevotions(1),
    ]);
  const [featured] = devotions;

  return (
    <>
      <Hero verse={todaysVerse} stats={stats} />

      {/* ---------------------------------------------------- Today's verse */}
      <section id="today" className="relative scroll-mt-24 py-8" aria-label="Today's verse">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <VerseCard
              verse={todaysVerse}
              dateLabel={getTodayLabel()}
              initialSaved={saved.includes(todaysVerse.reference)}
            />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- Categories */}
      <section className="py-24" aria-label="Verse categories">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              center
              eyebrow="Explore Scripture"
              title="Find a verse for every season"
              sub="Fifteen curated topics — from faith to family — so the right word finds you at the right time."
            />
          </Reveal>
          <CategoryGrid counts={topicCounts} />
        </div>
      </section>

      {/* ------------------------------------------------------------- Mood */}
      <section className="bg-sky-soft py-24" aria-label="Mood verse finder">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              center
              eyebrow="How is your heart today?"
              title="Tell us how you feel — we'll find the verse"
              sub="God's Word speaks to real emotions. Pick what's true for you right now."
              className="mb-10"
            />
          </Reveal>
          <MoodChips />
        </div>
      </section>

      {/* -------------------------------------------- Devotion + reading plan */}
      <section className="py-24" aria-label="Devotion and reading plan">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          {featured && (
          <Reveal>
            <Card className="flex h-full flex-col overflow-hidden" ring>
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={featured.image}
                  alt={featured.imageAlt}
                  fill
                  sizes="(min-width:1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 hover:scale-105 motion-reduce:transition-none"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                />
                <Badge tone="white" className="absolute left-5 top-5">
                  Featured devotion
                </Badge>
              </div>
              <div className="flex flex-1 flex-col p-7">
                <p className="flex items-center gap-2 text-xs font-semibold text-ink-faint">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {featured.readTime} read · {featured.date}
                </p>
                <h3 className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-ink">
                  {featured.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{featured.excerpt}</p>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-ink">{featured.author}</span>
                  <ButtonLink href={`/devotion/${featured.slug}`} variant="secondary" size="sm">
                    Continue reading
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </ButtonLink>
                </div>
              </div>
            </Card>
          </Reveal>
          )}

          <Reveal delay={0.06}>
            {!session ? (
              <SignInCard />
            ) : (
            <Card hover={false} className="flex h-full flex-col p-8 sm:p-9">
              <Badge tone="green">
                {plan.enrolled
                  ? `Reading plan · Day ${plan.nextDay} of ${plan.totalDays}`
                  : `Reading plan · ${plan.totalDays} days`}
              </Badge>
              <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">{plan.name}</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Today: <span className="font-bold text-ink">{plan.todayReading}</span> — {plan.desc}
              </p>

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-ink-faint">Overall progress</span>
                  <span className="text-primary-700">
                    {Math.round((plan.completedCount / plan.totalDays) * 100)}%
                  </span>
                </div>
                <ProgressBar
                  className="mt-2"
                  value={plan.completedCount}
                  max={plan.totalDays}
                  label="Plan progress"
                />
              </div>

              <p className="mt-6 text-xs font-bold text-ink-faint">Recent days</p>
              <div className="mt-2">
                <WeekProgress weekProgress={plan.weekProgress} />
              </div>

              <ul className="mt-6 flex-1 space-y-2">
                {plan.upcoming.map((u) => (
                  <li
                    key={u.day}
                    className="flex items-center justify-between rounded-2xl bg-sky-soft px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-ink">{u.passage}</span>
                    <span className="text-xs text-ink-faint">Day {u.day}</span>
                  </li>
                ))}
              </ul>

              <ButtonLink href="/plans" className="mt-6 w-full">
                Continue today&apos;s reading
              </ButtonLink>
            </Card>
            )}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ Prayer wall */}
      <section className="bg-sky-soft py-24" aria-label="Community prayer wall">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Community prayer wall"
                title="Carry each other's burdens"
                sub="Real requests from real people. One tap says: you're not praying alone."
              />
              <ButtonLink href="/prayer" variant="outline">
                Submit a prayer request
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={0.06} className="mt-10">
            <PrayerPreview prayers={prayers} signedIn={!!session} />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- Challenges */}
      <section className="py-24" aria-label="Daily challenges">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              center
              eyebrow="Grow daily"
              title="Today's challenges"
              sub="Small, faithful steps — memorize, encourage, pray, reflect. Earn XP and keep your streak alive."
            />
          </Reveal>
          <ChallengeGrid />
        </div>
      </section>

      {/* ----------------------------------------------------------- Quotes */}
      <section className="border-y border-line bg-surface py-24" aria-label="Inspirational quotes">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <QuoteCarousel />
        </div>
      </section>

      {/* ----------------------------------------------------------- Events */}
      <section className="py-24" aria-label="Upcoming events">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Upcoming events"
                title="Step in. Shine out."
                sub="Worship nights, youth camps, trainings — come as you are, leave set on fire."
              />
              <ButtonLink href="/events" variant="outline">
                All events
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            </div>
          </Reveal>

          <Stagger className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <StaggerItem key={e.id}>
                <Card className="group flex h-full flex-col overflow-hidden">
                  <div className="relative h-52 overflow-hidden">
                    <Image
                      src={e.image}
                      alt={e.title}
                      fill
                      sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <Badge tone="white" className="absolute left-4 top-4">
                      {e.tag}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <h3 className="text-xl font-extrabold leading-snug text-ink">{e.title}</h3>
                    <ul className="mt-4 flex-1 space-y-2.5 text-sm text-ink-soft">
                      <li className="flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {e.displayDate} · {e.time}
                      </li>
                      <li className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {e.location}
                      </li>
                      {e.speaker && (
                        <li className="flex items-center gap-2.5">
                          <Mic className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          {e.speaker}
                        </li>
                      )}
                    </ul>
                    <ButtonLink href="/events" variant="secondary" className="mt-6 w-full">
                      I&apos;m coming
                    </ButtonLink>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ----------------------------------------------------- Testimonials */}
      <section className="bg-sky-soft py-24" aria-label="Testimonials">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              center
              eyebrow="Changed mornings, changed lives"
              title="Stories from the CYA family"
            />
          </Reveal>
          <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <StaggerItem key={t.name}>
                <Card className="flex h-full flex-col p-7">
                  <blockquote className="verse-text flex-1 text-[15px] italic leading-relaxed text-ink">
                    “{t.quote}”
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <Image
                      src={t.image}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full border-2 border-surface object-cover"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-ink">{t.name}</p>
                      <p className="text-xs text-ink-faint">{t.role}</p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* -------------------------------------------------------------- CTA */}
      <section className="py-24" aria-label="Get started">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Parallax distance={24}>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-[#0089ec] to-[#33b1ff] px-6 py-20 text-center shadow-glow sm:px-16">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl motion-safe:animate-float" />
                <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#005ea8]/40 blur-3xl" />
              </div>
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                  Tomorrow morning, let the first word you read be His.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85">
                  Free forever. Works on any device. Install it as an app and keep your streak going —
                  Kay Kristo Buong Buhay, Habambuhay!
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/register" variant="white" size="lg">
                    Create free account
                  </ButtonLink>
                  <Link
                    href="/verse"
                    className="inline-flex h-13 items-center rounded-full border border-white/50 bg-white/10 px-8 text-base font-bold text-white transition-colors duration-200 hover:bg-white/20"
                  >
                    Read today&apos;s verse first
                  </Link>
                </div>
              </div>
            </div>
          </Parallax>
        </div>
      </section>
    </>
  );
}
