import type { Metadata } from "next";
import { Award, BookOpen, Bookmark, Flame, Star, Trophy } from "lucide-react";
import { Counter, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Badge, ButtonLink, Card, ProgressBar, SectionHeading } from "@/components/ui";
import { cx } from "@/lib/cx";
import { readingPlan, streak, verseLibrary } from "@/lib/data";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Your reading streak, saved verses, and achievements.",
};

const badges = [
  { name: "7-Day Streak", icon: Flame, earned: true },
  { name: "First Verse Saved", icon: Bookmark, earned: true },
  { name: "Prayer Warrior", icon: Star, earned: true },
  { name: "30-Day Streak", icon: Trophy, earned: false },
  { name: "Plan Finisher", icon: Award, earned: false },
  { name: "Scripture Scholar", icon: BookOpen, earned: false },
];

const XP_TO_NEXT = 2000;

export default function DashboardPage() {
  const savedVerses = verseLibrary.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="My dashboard"
          title="Good morning, friend"
          sub="Demo data shown — sign-in unlocks your real journey."
        />
      </Reveal>

      {/* Stats */}
      <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Card hover={false} className="h-full p-7">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-soft text-amber-strong">
                <Flame className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-3xl font-extrabold text-ink">
                  <Counter to={streak.current} />
                </p>
                <p className="text-xs font-bold text-ink-faint">
                  day streak · best {streak.best}
                </p>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card hover={false} className="h-full p-7">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                <Star className="h-6 w-6" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="text-3xl font-extrabold text-ink">Level {streak.level}</p>
                <ProgressBar
                  className="mt-2"
                  value={streak.xp}
                  max={XP_TO_NEXT}
                  label="XP progress"
                />
                <p
                  className="mt-1.5 text-xs font-bold text-ink-faint"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {streak.xp.toLocaleString()} / {XP_TO_NEXT.toLocaleString()} XP
                </p>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card hover={false} className="h-full p-7">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft text-mint-strong">
                <BookOpen className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-3xl font-extrabold text-ink">
                  <Counter to={readingPlan.day} />
                </p>
                <p className="text-xs font-bold text-ink-faint">chapters read this plan</p>
              </div>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <Card hover={false} className="h-full p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-ink">Saved verses</h2>
              <Badge tone="sky">{savedVerses.length} saved</Badge>
            </div>
            <ul className="mt-5 space-y-3">
              {savedVerses.map((v) => (
                <li key={v.reference} className="rounded-2xl bg-sky-soft p-5">
                  <p className="verse-text text-[15px] leading-relaxed text-ink">
                    “{v.text.length > 120 ? v.text.slice(0, 120) + "…" : v.text}”
                  </p>
                  <p className="mt-2.5 text-sm font-extrabold text-primary-700">
                    {v.reference} · {v.version}
                  </p>
                </li>
              ))}
            </ul>
            <ButtonLink href="/search" variant="secondary" className="mt-6">
              Find more verses
            </ButtonLink>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Card hover={false} className="h-full p-8">
            <h2 className="text-xl font-extrabold text-ink">Achievements</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {badges.map(({ name, icon: Icon, earned }) => (
                <div
                  key={name}
                  className={cx(
                    "flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-transform duration-300",
                    earned
                      ? "border-sky-mist bg-sky-soft hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                      : "border-dashed border-line opacity-55"
                  )}
                >
                  <span
                    className={cx(
                      "inline-flex h-11 w-11 items-center justify-center rounded-full",
                      earned ? "bg-primary text-white shadow-glow" : "bg-sky-tint text-ink-faint"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-xs font-extrabold leading-tight text-ink">{name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    {earned ? "Earned" : "Locked"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
