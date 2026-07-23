/**
 * Tiny class-name joiner.
 * Lives outside any "use client" module so Server Components can call it
 * directly during SSR.
 */
export function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}
