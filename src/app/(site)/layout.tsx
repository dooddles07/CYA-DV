import { Navbar } from "@/components/nav/navbar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Footer } from "@/components/nav/footer";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { CursorGlow } from "@/components/motion/cursor-glow";
import { PageTransition } from "@/components/motion/page-transition";
import { InstallPrompt } from "@/components/pwa/install-prompt";

/** Chrome for every public-facing page. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <main id="main">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <BottomNav />
      <InstallPrompt />
    </>
  );
}
