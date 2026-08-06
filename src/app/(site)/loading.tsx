import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 pb-28 pt-28">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
