import type { Metadata } from "next";
import { MfaVerifyClient } from "./mfa-verify-client";
import { safeInternalPath } from "@/lib/safe-path";

export const metadata: Metadata = { title: "Verify sign-in" };

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeInternalPath(next, "/admin");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <MfaVerifyClient next={safeNext} />
    </div>
  );
}
