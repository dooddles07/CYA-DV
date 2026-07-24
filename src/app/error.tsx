"use client";

import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { Aurora } from "@/components/motion/aurora";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden px-4 pb-28 pt-28 text-center">
      <Aurora />
      <div className="relative">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-tint text-primary">
          <CloudOff className="h-9 w-9" aria-hidden />
        </span>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.25em] text-primary">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          This page stumbled — but the Word still stands.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft">
          We hit an unexpected error. Try again, or head back home and pick up where you left off.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="outline">
            Back to home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
