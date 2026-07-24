import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminClient } from "./admin-client";
import { listAllPrayers } from "@/server/services/prayer.service";
import { isAdmin } from "@/server/middleware/require-admin";

export const metadata: Metadata = {
  title: "Prayer moderation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Linked from the console with a badge showing new posts in the last 24 hours,
 * so the wall is actually watched. New requests still appear immediately for
 * members; this screen is for hiding anything that shouldn't be public.
 */
export default async function AdminPrayersPage() {
  if (!(await isAdmin())) redirect("/admin-portal?next=/admin/prayers");

  const prayers = await listAllPrayers().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Events console
      </Link>

      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Prayer moderation</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          The wall is the members&apos; own space. Use this only to hide something that
          shouldn&apos;t be public — hidden requests stay in the database.
        </p>
      </div>

      <AdminClient initialPrayers={prayers} />
    </div>
  );
}
