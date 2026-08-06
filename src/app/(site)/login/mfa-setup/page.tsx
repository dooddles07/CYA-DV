import type { Metadata } from "next";
import { MfaSetupClient } from "./mfa-setup-client";

export const metadata: Metadata = { title: "Set up two-factor sign-in" };

export default function MfaSetupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <MfaSetupClient />
    </div>
  );
}
