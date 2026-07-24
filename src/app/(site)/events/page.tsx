import type { Metadata } from "next";
import { EventsClient } from "./events-client";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";
import { listUpcomingEvents } from "@/server/services/event.service";
import { getSession } from "@/server/utils/session";

export const metadata: Metadata = {
  title: "Events",
  description: "Worship nights, youth camps, and trainings from Christ's Youth in Action.",
};

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await getSession();
  const events = await listUpcomingEvents(24, session?.sub ?? null);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          center
          eyebrow="Upcoming events"
          title="Step in. Shine out."
          sub="Worship nights, youth camps, trainings — come as you are, leave set on fire."
          className="mb-12"
        />
      </Reveal>
      <EventsClient events={events} signedIn={!!session} />
    </div>
  );
}
