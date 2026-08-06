import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalClient } from "./portal-client";
import { isAdmin } from "@/server/middleware/require-admin";
import { safeInternalPath } from "@/lib/safe-path";

export const metadata: Metadata = {
  title: "Admin portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");

  const { next } = await searchParams;
  // Only allow internal redirects, so ?next= can't bounce a leader off-site.
  const safeNext = safeInternalPath(next, "/admin");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <PortalClient next={safeNext} />
    </div>
  );
}
