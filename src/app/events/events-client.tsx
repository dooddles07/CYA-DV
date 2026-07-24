"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, Check, MapPin, Mic } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { cx } from "@/lib/cx";
import { toast } from "@/components/toast";
import { Stagger, StaggerItem } from "@/components/motion";
import { spring } from "@/lib/motion";
import { useNow } from "@/lib/hooks";
import type { EventItem } from "@/lib/types";

/** Live countdown, recalculated each minute. Returns null once the date passes. */
function useCountdown(target: string) {
  const now = useNow(60_000);

  // Render nothing on the server so SSR and client markup always agree.
  if (now === null) return null;
  const diff = new Date(`${target}T00:00:00`).getTime() - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
  };
}

function EventCard({ event }: { event: EventItem }) {
  const reduce = useReducedMotion();
  const cd = useCountdown(event.date);
  const [going, setGoing] = useState(false);

  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <div className="relative h-56 overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
        <Badge tone="white" className="absolute left-4 top-4">
          {event.tag}
        </Badge>
        {cd && (
          <span className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3.5 py-1.5 text-xs font-extrabold text-white backdrop-blur-sm">
            In {cd.days}d {cd.hours}h
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-7">
        <h2 className="text-xl font-extrabold leading-snug text-ink">{event.title}</h2>
        <ul className="mt-4 flex-1 space-y-2.5 text-sm text-ink-soft">
          <li className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {event.displayDate} · {event.time}
          </li>
          <li className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {event.location}
          </li>
          <li className="flex items-center gap-2.5">
            <Mic className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {event.speaker}
          </li>
        </ul>

        <motion.button
          type="button"
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={spring}
          aria-pressed={going}
          onClick={() => {
            setGoing((g) => !g);
            if (!going) toast(`You're going to ${event.tag}!`, "success");
          }}
          className={cx(
            "mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors duration-200",
            going
              ? "bg-mint-soft text-mint-strong"
              : "bg-sky-tint text-primary-700 hover:bg-sky-mist"
          )}
        >
          {going && <Check className="h-4 w-4" aria-hidden />}
          {going ? "You're coming" : "I'm coming"}
        </motion.button>
      </div>
    </Card>
  );
}

export function EventsClient({ events }: { events: EventItem[] }) {
  if (events.length === 0)
    return (
      <EmptyState
        icon={<Calendar className="h-10 w-10" aria-hidden />}
        title="No events scheduled yet"
        body="Nothing on the calendar right now. Check back soon — new gatherings are posted here first."
      />
    );

  return (
    <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <StaggerItem key={e.id}>
          <EventCard event={e} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
