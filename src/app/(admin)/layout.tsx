import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { ExitPortalButton } from "./exit-portal-button";
import { isAdmin } from "@/server/utils/require-admin";

export const dynamic = "force-dynamic";

/**
 * Back-office shell. Deliberately shares nothing with the public site:
 * no navbar, footer, bottom nav, cursor glow or install prompt. The
 * .admin-shell class swaps the theme variables to a dark console palette.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();

  return (
    <div className="admin-shell min-h-dvh bg-bg text-ink">
      {signedIn && (
        <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/media/cya-logo.png"
                alt=""
                width={32}
                height={32}
                className="shrink-0 rounded-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold tracking-tight text-ink">
                  CYA Admin
                </p>
                <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Events console
                </p>
              </div>
            </div>
            <ExitPortalButton />
          </div>
        </header>
      )}

      <main id="main">{children}</main>
    </div>
  );
}
