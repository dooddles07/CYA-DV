import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";
import { AdminTabs } from "@/app/admin/admin-tabs";
import { EventsAdminClient } from "./events-admin-client";
import { listAllEvents } from "@/server/services/event.service";
import { isAdmin } from "@/server/utils/require-admin";

export const metadata: Metadata = {
  title: "Manage events",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  if (!(await isAdmin())) redirect("/admin-portal?next=/admin/events");

  const events = await listAllEvents().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="Admin portal"
          title="Events"
          sub="Post, edit, hide, or delete what the CYA family sees on the events page."
          className="mb-6"
        />
      </Reveal>
      <AdminTabs active="events" />
      <div className="mt-10">
        <EventsAdminClient initialEvents={events} />
      </div>
    </div>
  );
}
