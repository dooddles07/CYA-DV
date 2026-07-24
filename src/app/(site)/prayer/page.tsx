import type { Metadata } from "next";
import { PrayerClient } from "./prayer-client";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";
import { listPrayersPage } from "@/server/services/prayer.service";
import { getSession } from "@/server/utils/session";

export const metadata: Metadata = {
  title: "Prayer Wall",
  description: "Share a prayer request and pray for the CYA community.",
};

export const dynamic = "force-dynamic";

export default async function PrayerPage() {
  const session = await getSession();
  const { prayers, nextCursor, total } = await listPrayersPage({
    limit: 20,
    userId: session?.sub ?? null,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="Community prayer wall"
          title="Carry each other's burdens"
          sub="Real requests from real people. One tap says: you're not praying alone."
          className="mb-10"
        />
      </Reveal>
      <PrayerClient
        initialPrayers={prayers}
        initialCursor={nextCursor}
        total={total}
        signedIn={!!session}
        displayName={session?.name ?? ""}
      />
    </div>
  );
}
