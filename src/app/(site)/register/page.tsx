import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Aurora } from "@/components/motion/aurora";
import { getSession } from "@/server/utils/session";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 pb-28 pt-28">
      <Aurora />
      <div className="glass relative w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
