import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotClient } from "./forgot-client";
import { Aurora } from "@/components/motion/aurora";
import { getSession } from "@/server/middleware/session";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 pb-28 pt-28">
      <Aurora />
      <div className="glass relative w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
        <ForgotClient />
      </div>
    </div>
  );
}
