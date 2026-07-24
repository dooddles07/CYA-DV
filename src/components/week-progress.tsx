import { cx } from "@/lib/cx";

type Day = { day: number; done: boolean };

/** Rolling 7-day dot row shared by the home plan card and the plans page. */
export function WeekProgress({
  weekProgress,
  size = "sm",
}: {
  weekProgress: Day[];
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-10 w-10" : "h-9 w-9";
  return (
    <div className="flex gap-2">
      {weekProgress.map(({ day, done }) => (
        <span
          key={day}
          aria-label={`Day ${day}: ${done ? "read" : "not yet"}`}
          className={cx(
            "grid place-items-center rounded-full text-xs font-extrabold tabular-nums",
            dim,
            done ? "bg-primary text-white shadow-glow" : "bg-sky-tint text-ink-faint"
          )}
        >
          {day}
        </span>
      ))}
    </div>
  );
}
