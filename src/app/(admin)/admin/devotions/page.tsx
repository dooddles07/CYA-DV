import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DevotionsAdminClient } from "./devotions-admin-client";
import { listAllDevotions } from "@/server/services/devotion.service";
import { isAdmin } from "@/server/middleware/require-admin";

export const metadata: Metadata = {
  title: "Devotionals",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDevotionsPage() {
  if (!(await isAdmin())) redirect("/admin-portal?next=/admin/devotions");

  const devotions = await listAllDevotions().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Events console
      </Link>

      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Devotionals</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Write, edit, hide, or delete the devotionals on the public reading page — no redeploy needed.
        </p>
      </div>

      <DevotionsAdminClient initialDevotions={devotions} />
    </div>
  );
}
