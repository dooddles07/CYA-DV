import type { Metadata } from "next";
import Image from "next/image";
import { HeartHandshake, Sprout, Users } from "lucide-react";
import { Reveal, Stagger, StaggerItem, Parallax } from "@/components/motion";
import { ButtonLink, Card, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "About CYA",
  description: "Christ's Youth in Action — who we are and why we built Daily Verse.",
};

const values = [
  {
    icon: Sprout,
    title: "Daily growth",
    desc: "We believe transformation happens in small, faithful, everyday moments with God's Word.",
  },
  {
    icon: Users,
    title: "Real community",
    desc: "Faith was never meant to be walked alone. We pray, serve, and grow together.",
  },
  {
    icon: HeartHandshake,
    title: "Youth in action",
    desc: "Young people aren't the church of tomorrow — they're the movement of today.",
  },
];

const photos = [
  { src: "/media/campus-picnic.jpg", alt: "CYA members sitting together on a picnic blanket on campus" },
  { src: "/media/community-group.jpg", alt: "CYA members posing together after a session" },
  { src: "/media/prayer-meeting.jpg", alt: "CYA chapter prayer meeting with a guitar" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          center
          eyebrow="About us"
          title="Christ's Youth in Action"
          sub="Kay Kristo Buong Buhay, Habambuhay! — In Christ, whole life, forever."
        />
      </Reveal>

      <Stagger className="mt-12 grid gap-4 sm:grid-cols-3">
        {photos.map((p, i) => (
          <StaggerItem key={p.src}>
            <Parallax distance={i === 1 ? 20 : 10}>
              <div className="relative h-64 overflow-hidden rounded-3xl sm:h-80">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(min-width:640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-700 hover:scale-105 motion-reduce:transition-none"
                />
              </div>
            </Parallax>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mx-auto mt-14 max-w-2xl">
        <div className="space-y-5 text-[16px] leading-relaxed text-ink-soft">
          <p>
            CYA — <span className="font-bold text-ink">Christ&apos;s Youth in Action</span> — is a
            community of students, young professionals, and youth leaders who believe one simple
            thing: a generation that meets God every morning becomes a generation that changes its
            world.
          </p>
          <p>
            Daily Verse is our digital home. It began as a small group chat where someone posted a
            verse each morning. It grew into this: a place to read, reflect, pray, and carry each
            other — wherever you are, whenever you wake.
          </p>
        </div>
      </Reveal>

      <Stagger className="mt-14 grid gap-4 md:grid-cols-3">
        {values.map(({ icon: Icon, title, desc }) => (
          <StaggerItem key={title}>
            <Card className="h-full p-8 text-center" hover={false}>
              <span className="mx-auto inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-sky-tint text-primary">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-5 text-lg font-extrabold text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{desc}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-16 text-center">
        <ButtonLink href="/events" size="lg">
          Join us at the next gathering
        </ButtonLink>
      </Reveal>
    </div>
  );
}
