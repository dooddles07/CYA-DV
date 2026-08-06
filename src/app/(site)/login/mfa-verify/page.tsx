import type { Metadata } from "next";
import { MfaVerifyClient } from "./mfa-verify-client";

export const metadata: Metadata = { title: "Verify sign-in" };

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/admin" } = await searchParams;
  // Only allow internal redirects, matching the same guard on /admin-portal.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <MfaVerifyClient next={safeNext} />
    </div>
  );
}
