import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award, BookOpen, Bookmark, Flame, Star, Trophy } from "lucide-react";
import { Counter, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Badge, ButtonLink, Card, ProgressBar, SectionHeading } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out-button";
import { cx } from "@/lib/cx";
import { readingPlan, verseLibrary } from "@/lib/data";
import { getSession } from "@/server/utils/session";
import { getUserStats } from "@/server/services/user.service";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Your reading streak, saved verses, and achievements.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserStats(session);
  if (!user) redirect("/login");

  const badges = [
    { name: "7-Day Streak", icon: Flame, earned: user.bestStreak >= 7 },
    { name: "First Verse Read", icon: Bookmark, earned: user.xp > 0 },
    { name: "Prayer Warrior", icon: Star, earned: false },
    { name: "30-Day Streak", icon: Trophy, earned: user.bestStreak >= 30 },
    { name: "Plan Finisher", icon: Award, earned: false },
    { name: "Scripture Scholar", icon: BookOpen, earned: user.level >= 5 },
  ];

  const suggested = verseLibrary.slice(0, 3);
  const firstName = user.name.split(" ")[0] || "friend";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeading
            eyebrow="My dashboard"
            title={`Good morning, ${firstName}`}
            sub="Read today's verse to keep your streak alive."
          />
          <SignOutButton />
        </div>
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
                  <Counter to={user.streak} />
                </p>
                <p className="text-xs font-bold text-ink-faint">
                  day streak · best {user.bestStreak}
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
                <p className="text-3xl font-extrabold text-ink">Level {user.level}</p>
                <ProgressBar
                  className="mt-2"
                  value={user.xp}
                  max={user.xpToNext}
                  label="XP progress"
                />
                <p
                  className="mt-1.5 text-xs font-bold text-ink-faint"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {user.xp.toLocaleString()} / {user.xpToNext.toLocaleString()} XP
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
              <h2 className="text-xl font-extrabold text-ink">Verses for you</h2>
              <Badge tone="sky">{suggested.length} picks</Badge>
            </div>
            <ul className="mt-5 space-y-3">
              {suggested.map((v) => (
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
