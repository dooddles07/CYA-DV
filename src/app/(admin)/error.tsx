"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";

export default function AdminError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-sky-tint text-primary">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-xl font-extrabold tracking-tight text-ink">Admin console hit an error</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        Something broke loading this screen. Try again, or head back to the console home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/admin" variant="outline">
          Back to console
        </ButtonLink>
      </div>
    </div>
  );
}
