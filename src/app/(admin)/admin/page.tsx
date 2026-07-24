import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { EventsAdminClient } from "./events-admin-client";
import { listAllEvents } from "@/server/services/event.service";
import { isAdmin } from "@/server/utils/require-admin";

export const metadata: Metadata = {
  title: "Events console",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  if (!(await isAdmin())) redirect("/admin-portal?next=/admin");

  const events = await listAllEvents().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Events</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Post, edit, hide, or delete what the CYA family sees on the events page.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sky-tint px-4 text-sm font-bold text-primary-700 hover:bg-sky-mist"
        >
          <Users className="h-4 w-4" aria-hidden />
          Users
        </Link>
      </div>
      <EventsAdminClient initialEvents={events} />
    </div>
  );
}
