import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using CYA Daily Verse.",
};

const CONTACT = "hello@cya.ph";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Legal" title="Terms of Use" sub="Last updated: July 24, 2026" />

      <article className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-soft">
        <p>
          Welcome to CYA Daily Verse, a free devotional app by Christ&apos;s Youth in Action. By using
          the app you agree to these terms. If you don&apos;t agree, please don&apos;t use it.
        </p>

        <Section title="Using the app">
          The app is free. Create an account with accurate details and keep your password to
          yourself. You&apos;re responsible for activity under your account. Don&apos;t attempt to break,
          overload, or misuse the service.
        </Section>

        <Section title="Your content">
          You keep ownership of what you post (such as prayer requests). By posting on the prayer
          wall, you allow other signed-in members to see it, and you allow us to display and store
          it so the feature works. Only post what you&apos;re comfortable sharing.
        </Section>

        <Section title="Community conduct">
          Be kind. Don&apos;t post anything hateful, harassing, sexual, spam, misleading, or unlawful.
          We may hide or remove content and, if needed, suspend accounts to keep the community safe.
        </Section>

        <Section title="Scripture">
          Bible text is from the Berean Standard Bible (BSB), a public-domain translation.
        </Section>

        <Section title="No warranty">
          The app is provided &ldquo;as is&rdquo;. We work to keep it running and accurate, but we can&apos;t
          guarantee it will always be available or error-free, and it isn&apos;t a substitute for
          pastoral care or professional help.
        </Section>

        <Section title="Deleting your account">
          You can delete your account and data at any time from your{" "}
          <Link href="/dashboard" className="font-bold text-primary hover:underline">dashboard</Link>. See our{" "}
          <Link href="/privacy" className="font-bold text-primary hover:underline">Privacy Policy</Link> for how we
          handle your data.
        </Section>

        <Section title="Changes">
          We may update these terms as the app grows. Continued use after an update means you accept
          the revised terms.
        </Section>

        <Section title="Contact">
          Questions? Email{" "}
          <a href={`mailto:${CONTACT}`} className="font-bold text-primary hover:underline">{CONTACT}</a>.
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
