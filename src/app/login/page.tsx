import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Aurora } from "@/components/motion/aurora";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 pb-28 pt-28">
      <Aurora />
      <div className="glass relative w-full max-w-md rounded-[2rem] p-8 shadow-lift sm:p-10">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
