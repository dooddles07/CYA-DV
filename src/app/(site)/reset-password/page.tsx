import type { Metadata } from "next";
import { ResetClient } from "./reset-client";
import { Aurora } from "@/components/motion/aurora";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 pb-28 pt-28">
      <Aurora />
      <div className="glass relative w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
        <ResetClient token={token} />
      </div>
    </div>
  );
}
