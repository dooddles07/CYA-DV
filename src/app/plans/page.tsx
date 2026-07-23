import type { Metadata } from "next";
import { BookOpen, CalendarCheck, Flame, Sunrise } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Badge, ButtonLink, Card, ProgressBar, SectionHeading } from "@/components/ui";
import { otherPlans, readingPlan, streak } from "@/lib/data";

export const metadata: Metadata = {
  title: "Reading Plans",
  description: "Guided Bible reading plans with daily progress and streaks.",
};

const days = ["M", "T", "W", "T", "F", "S", "S"];

export default function PlansPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          center
          eyebrow="Reading plans"
          title="A little every day beats a lot once a year"
          sub="Guided plans keep you moving through Scripture one faithful day at a time."
        />
      </Reveal>

      <Reveal className="mt-12">
        <Card hover={false} className="overflow-hidden" ring>
          <div className="grid lg:grid-cols-[1.3fr_1fr]">
            <div className="p-8 sm:p-10">
              <Badge tone="green">Active plan</Badge>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
                {readingPlan.name}
              </h2>
              <p className="mt-3 text-ink-soft">
                Day {readingPlan.day} of {readingPlan.totalDays} ·{" "}
                <span className="font-bold text-ink">{readingPlan.todayReading}</span> —{" "}
                {readingPlan.todayTheme}
              </p>

              <div className="mt-6 max-w-md">
                <ProgressBar
                  value={readingPlan.day}
                  max={readingPlan.totalDays}
                  label="Plan progress"
                />
              </div>

              <div className="mt-6 flex gap-2">
                {readingPlan.weekProgress.map((done, i) => (
                  <span
                    key={i}
                    className={`grid h-10 w-10 place-items-center rounded-full text-xs font-extrabold ${
                      done ? "bg-primary text-white shadow-glow" : "bg-sky-tint text-ink-faint"
                    }`}
                    aria-label={`${days[i]}: ${done ? "read" : "not yet"}`}
                  >
                    {days[i]}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/verse" size="lg">
                  <BookOpen className="h-5 w-5" aria-hidden />
                  Read {readingPlan.todayReading}
                </ButtonLink>
                <ButtonLink href="/dashboard" variant="outline" size="lg">
                  View my stats
                </ButtonLink>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 bg-sky-soft p-8 sm:p-10">
              <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-soft">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-soft text-amber-strong">
                  <Flame className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-ink">{streak.current}-day streak</p>
                  <p className="text-xs text-ink-faint">Best: {streak.best} days — keep going!</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-soft">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                  <CalendarCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-ink">{readingPlan.day} days read</p>
                  <p className="text-xs text-ink-faint">
                    {readingPlan.totalDays - readingPlan.day} days to finish the Gospels
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-surface p-5 shadow-soft">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Coming up</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {readingPlan.upcoming.map((u) => (
                    <li key={u.day} className="flex justify-between">
                      <span className="font-semibold text-ink">{u.passage}</span>
                      <span className="text-ink-faint">Day {u.day}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal className="mt-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">Start a new plan</h2>
      </Reveal>

      <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {otherPlans.map((p) => (
          <StaggerItem key={p.name}>
            <Card className="flex h-full flex-col p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                <Sunrise className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-extrabold leading-snug text-ink">{p.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{p.desc}</p>
              <div className="mt-5 flex items-center justify-between">
                <Badge tone="sky">{p.tag}</Badge>
                <span className="text-xs font-bold text-ink-faint">{p.days} days</span>
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
