import type { Metadata } from "next";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";
import { PlansClient } from "./plans-client";
import { getActivePlan, listPlans, previewPlan } from "@/server/services/plan.service";
import { getUserStats } from "@/server/services/user.service";
import { getSession } from "@/server/utils/session";

export const metadata: Metadata = {
  title: "Reading Plans",
  description: "Guided Bible reading plans with daily progress and streaks.",
};

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const session = await getSession();
  const [plan, user] = await Promise.all([
    session ? getActivePlan(session.sub) : previewPlan(),
    session ? getUserStats(session) : null,
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          center
          eyebrow="Reading plans"
          title="A little every day beats a lot once a year"
          sub="Guided plans keep you moving through Scripture one faithful day at a time."
          className="mb-12"
        />
      </Reveal>

      <PlansClient
        initialPlan={plan}
        plans={listPlans()}
        streak={user ? { current: user.streak, best: user.bestStreak } : null}
      />
    </div>
  );
}
