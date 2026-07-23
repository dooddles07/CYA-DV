import type { Metadata } from "next";
import { EventsClient } from "./events-client";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Events",
  description: "Worship nights, youth camps, and trainings from Christ's Youth in Action.",
};

export default function EventsPage() {
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
      <EventsClient />
    </div>
  );
}
