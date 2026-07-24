import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";
import { AdminClient } from "./admin-client";
import { listAllPrayers } from "@/server/services/prayer.service";
import { getUserStats } from "@/server/services/user.service";
import { getSession } from "@/server/utils/session";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserStats(session);
  if (user?.role !== "admin") redirect("/dashboard");

  const prayers = await listAllPrayers().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="Moderation"
          title="Prayer wall"
          sub="Hide anything that shouldn't be public. Hidden requests stay in the database but disappear from the wall."
          className="mb-10"
        />
      </Reveal>
      <AdminClient initialPrayers={prayers} />
    </div>
  );
}
