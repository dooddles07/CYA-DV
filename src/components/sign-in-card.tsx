import { Flame, Sparkles } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";

/**
 * Shown to signed-out visitors in place of the interactive plan/streak card,
 * so they meet a clear invitation instead of controls that only bounce them to
 * a login wall on click.
 */
export function SignInCard() {
  return (
    <Card hover={false} className="flex h-full flex-col p-8 sm:p-9" ring>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint text-primary">
        <Flame className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
        Track your streak and reading plan
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
        Create a free account to start a guided reading plan, keep a daily-verse streak, save the
        verses that move you, and earn XP for showing up. It takes a minute and lives on every
        device.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-ink-soft">
        {["Guided plans with daily progress", "Streaks, XP, and saved verses", "Your prayer wall, always in sync"].map(
          (line) => (
            <li key={line} className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              {line}
            </li>
          )
        )}
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <ButtonLink href="/register">Create free account</ButtonLink>
        <ButtonLink href="/login" variant="outline">
          Sign in
        </ButtonLink>
      </div>
    </Card>
  );
}
