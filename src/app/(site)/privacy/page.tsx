import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CYA Daily Verse collects, uses, and protects your data.",
};

const CONTACT = "hello@cya.ph";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Legal" title="Privacy Policy" sub="Last updated: July 24, 2026" />

      <article className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-soft">
        <p>
          CYA Daily Verse (&ldquo;we&rdquo;, &ldquo;the app&rdquo;) is run by Christ&apos;s Youth in Action, a
          Philippine church youth ministry. We respect your privacy and handle your data under the
          Data Privacy Act of 2012 (Republic Act No. 10173). This page explains what we collect,
          why, and the choices you have.
        </p>

        <Section title="Who this is for">
          The app is made for young believers. If you are a minor, you may use it; by creating an
          account you confirm your guardians are comfortable with you doing so. We only collect what
          the app needs to work.
        </Section>

        <Section title="What we collect">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Account:</strong> your name and email address, and a securely hashed password (we never store the plain password).</li>
            <li><strong>Activity:</strong> your reading streak, XP, saved verses, reading-plan progress, prayer requests you post, and event RSVPs.</li>
            <li><strong>Notifications:</strong> if you turn them on, your device&apos;s push subscription.</li>
            <li><strong>Technical:</strong> basic request data (e.g. IP address) used only to prevent abuse and rate-limit sign-ins.</li>
          </ul>
        </Section>

        <Section title="Why we use it">
          To run your account, keep your streak and progress, show the prayer wall and events, send
          the daily-verse notification you opted into, and protect the service from abuse. We do not
          sell your data or use it for advertising.
        </Section>

        <Section title="Who we share it with">
          We do not sell or trade your data. We use a small number of service providers only to run
          the app: our database and hosting provider (Railway), and an email provider to send
          password-reset and verification messages. Prayer requests you post are visible to other
          signed-in members on the prayer wall — post only what you are comfortable sharing.
        </Section>

        <Section title="How long we keep it">
          We keep your data while your account is active. When you delete your account, we remove
          your profile and all associated records (prayers, saved verses, plans, RSVPs, and
          notification subscriptions).
        </Section>

        <Section title="Your rights">
          Under the Data Privacy Act you may access, correct, export, or delete your data. From your{" "}
          <Link href="/dashboard" className="font-bold text-primary hover:underline">dashboard</Link> you can
          <strong> export</strong> a full copy of your data as a file, or <strong>delete</strong> your account
          and everything tied to it at any time. For corrections or questions, email us at{" "}
          <a href={`mailto:${CONTACT}`} className="font-bold text-primary hover:underline">{CONTACT}</a>.
          You may also raise concerns with the National Privacy Commission (privacy.gov.ph).
        </Section>

        <Section title="Security">
          Passwords are hashed with bcrypt, sessions are signed and can be revoked, and the site is
          served over HTTPS with standard security headers. No system is perfectly secure, but we
          take reasonable steps to protect your information.
        </Section>

        <Section title="Changes">
          We may update this policy as the app grows. Material changes will be noted here with a new
          &ldquo;last updated&rdquo; date.
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
