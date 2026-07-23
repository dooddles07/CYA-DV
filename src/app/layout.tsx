import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope, Lora } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/nav/navbar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Footer } from "@/components/nav/footer";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { CursorGlow } from "@/components/motion/cursor-glow";
import { PageTransition } from "@/components/motion/page-transition";
import { Toaster } from "@/components/toast";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cya-daily-verses-production.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "CYA Daily Verse — God's Word, Every Morning",
    template: "%s · CYA Daily Verse",
  },
  description:
    "Daily verses, gentle devotionals, reading plans, and a praying community — built by Christ's Youth in Action to help your generation grow one quiet morning at a time.",
  keywords: ["bible", "daily verse", "devotional", "prayer", "CYA", "Christ's Youth in Action", "youth ministry"],
  applicationName: "CYA Daily Verse",
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "CYA Daily Verse",
    title: "CYA Daily Verse — God's Word, Every Morning",
    description: "Kay Kristo Buong Buhay, Habambuhay! Daily verses, devotionals, reading plans and a praying community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CYA Daily Verse",
    description: "God's Word, every morning. Built by Christ's Youth in Action.",
  },
  icons: { icon: "/media/cya-logo.png", apple: "/media/cya-logo.png" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1522" },
  ],
};

/** Sets the theme before paint so there is no flash of the wrong theme. */
const themeScript = `
(function(){
  try {
    var s = localStorage.getItem('cya-theme');
    var d = s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (d) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${lora.variable}`} suppressHydrationWarning>
      <body>
        <Script id="cya-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
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
        <Toaster />
      </body>
    </html>
  );
}
