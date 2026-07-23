import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Aurora } from "@/components/motion/aurora";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden px-4 pb-28 pt-28 text-center">
      <Aurora />
      <div className="relative">
        <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-tint text-primary motion-safe:animate-float">
          <Compass className="h-9 w-9" aria-hidden />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-primary/40 motion-safe:animate-ping-slow"
          />
        </span>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.25em] text-primary">
          404 — page not found
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Lost? That&apos;s okay — sheep get found here.
        </h1>
        <p className="verse-text mx-auto mt-5 max-w-md text-lg italic text-ink-soft">
          “I will seek the lost, bring back the strays…” — Ezekiel 34:16
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/verse" variant="outline">
            Read today&apos;s verse
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
