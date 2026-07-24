"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarCheck, Check, Flame, Loader2, LogOut, RotateCcw, Sunrise } from "lucide-react";
import { Badge, Button, ButtonLink, Card, ProgressBar } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { WeekProgress } from "@/components/week-progress";
import { toast } from "@/components/toast";
import type { ActivePlan, PlanSummary } from "@/lib/types";

export function PlansClient({
  initialPlan,
  plans,
  streak,
}: {
  initialPlan: ActivePlan;
  plans: PlanSummary[];
  streak: { current: number; best: number } | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [busy, setBusy] = useState("");

  const call = async (url: string, body: object, label: string) => {
    setBusy(label);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        toast("Sign in to track your progress", "info");
        router.push("/login");
        return null;
      }
      if (!res.ok) {
        toast(data.error ?? "Something went wrong.", "error");
        return null;
      }
      setPlan(data.plan);
      return data.plan as ActivePlan;
    } catch {
      toast("Network error — try again.", "error");
      return null;
    } finally {
      setBusy("");
    }
  };

  const enroll = async (slug: string) => {
    const next = await call("/api/plans/enroll", { slug }, `enroll:${slug}`);
    if (next) toast(`Started ${next.name}`, "success");
  };

  const markDay = async () => {
    const day = plan.nextDay;
    const next = await call("/api/plans/day", { day, complete: true }, "day");
    if (next) toast(`Day ${day} complete — ${next.completedCount}/${next.totalDays}`, "success");
  };

  const leave = async (reset: boolean) => {
    if (reset && !confirm(`Reset your progress in ${plan.name}? Completed days will be cleared.`))
      return;
    const next = await call("/api/plans/leave", { reset }, "leave");
    if (next) toast(reset ? "Progress reset" : "Left the plan — progress kept", "info");
  };

  const percent = Math.round((plan.completedCount / plan.totalDays) * 100);

  return (
    <>
      <Card hover={false} className="overflow-hidden" ring>
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="p-8 sm:p-10">
            <Badge tone={plan.enrolled ? "green" : "sky"}>
              {plan.enrolled ? "Active plan" : "Suggested plan"}
            </Badge>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">{plan.name}</h2>
            <p className="mt-3 text-ink-soft">
              Day {plan.nextDay} of {plan.totalDays} ·{" "}
              <span className="font-bold text-ink">{plan.todayReading}</span>
            </p>

            <div className="mt-6 max-w-md">
              <ProgressBar value={plan.completedCount} max={plan.totalDays} label="Plan progress" />
              <p className="mt-1.5 text-xs font-bold text-ink-faint">
                {plan.completedCount} of {plan.totalDays} days · {percent}%
              </p>
            </div>

            <p className="mt-6 text-xs font-bold text-ink-faint">First week</p>
            <div className="mt-2">
              <WeekProgress weekProgress={plan.weekProgress} size="md" />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {plan.enrolled ? (
                <Button size="lg" onClick={markDay} disabled={busy === "day" || plan.finished}>
                  {busy === "day" ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : plan.finished ? (
                    <Check className="h-5 w-5" aria-hidden />
                  ) : (
                    <Check className="h-5 w-5" aria-hidden />
                  )}
                  {plan.finished ? "Plan complete" : `Mark ${plan.todayReading} read`}
                </Button>
              ) : (
                <Button size="lg" onClick={() => enroll(plan.slug)} disabled={busy !== ""}>
                  {busy.startsWith("enroll") ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <BookOpen className="h-5 w-5" aria-hidden />
                  )}
                  Start this plan
                </Button>
              )}
              <ButtonLink href="/dashboard" variant="outline" size="lg">
                View my stats
              </ButtonLink>
            </div>

            {plan.enrolled && (
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => leave(false)}
                  disabled={busy !== ""}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold text-ink-faint transition-colors hover:text-primary-700 disabled:opacity-40"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Leave plan (keep progress)
                </button>
                <button
                  type="button"
                  onClick={() => leave(true)}
                  disabled={busy !== ""}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold text-ink-faint transition-colors hover:text-danger disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Reset progress
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-4 bg-sky-soft p-8 sm:p-10">
            <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-soft">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-soft text-amber-strong">
                <Flame className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xl font-extrabold text-ink">
                  {streak ? `${streak.current}-day streak` : "Start your streak"}
                </p>
                <p className="text-xs text-ink-faint">
                  {streak ? `Best: ${streak.best} days — keep going!` : "Sign in to track your streak"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-soft">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                <CalendarCheck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xl font-extrabold text-ink">{plan.completedCount} days read</p>
                <p className="text-xs text-ink-faint">
                  {plan.totalDays - plan.completedCount} days to finish {plan.name}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-surface p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Coming up</p>
              <ul className="mt-3 space-y-2 text-sm">
                {plan.upcoming.map((u) => (
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

      <h2 className="mt-16 text-2xl font-extrabold tracking-tight text-ink">
        {plan.enrolled ? "Switch to another plan" : "Start a new plan"}
      </h2>

      <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isActive = plan.enrolled && p.slug === plan.slug;
          return (
            <StaggerItem key={p.slug}>
              <Card className="flex h-full flex-col p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                  <Sunrise className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-extrabold leading-snug text-ink">{p.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{p.desc}</p>
                <div className="mt-5 flex items-center justify-between">
                  <Badge tone="sky">{p.tag}</Badge>
                  <span className="text-xs font-bold text-ink-faint">{p.totalDays} days</span>
                </div>
                <Button
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  className="mt-4 w-full"
                  disabled={isActive || busy !== ""}
                  onClick={() => enroll(p.slug)}
                >
                  {busy === `enroll:${p.slug}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {isActive ? "Current plan" : "Start plan"}
                </Button>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </>
  );
}
