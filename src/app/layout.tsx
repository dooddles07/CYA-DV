import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope, Lora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toast";
import { SITE_URL as SITE } from "@/lib/site";

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
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CYA Verse", statusBarStyle: "default" },
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

/**
 * Shell only. The public site chrome lives in (site)/layout.tsx and the
 * admin console has its own in (admin)/layout.tsx, so neither leaks into
 * the other.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${lora.variable}`} suppressHydrationWarning>
      <body>
        <Script id="cya-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
