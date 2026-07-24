import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UsersAdminClient } from "./users-admin-client";
import { listUsers } from "@/server/services/user.service";
import { isAdmin } from "@/server/middleware/require-admin";

export const metadata: Metadata = {
  title: "User management",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!(await isAdmin())) redirect("/admin-portal?next=/admin/users");

  const users = await listUsers().catch(() => []);

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
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">User management</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Promote a trusted member to admin, or step someone back down. Admins can manage
          events and moderate the wall from their account, without the portal passphrase.
        </p>
      </div>

      <UsersAdminClient initialUsers={users} />
    </div>
  );
}
