/**
 * Relative "x ago" label. Pass the client clock from `useNow` so the server
 * and first client paint agree — computing Date.now() during render drifts.
 */
export function relTime(iso: string, now: number | null): string {
  if (now === null) return "";
  const mins = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
