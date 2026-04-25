import { dayById } from "../lib/derive";
import type { Day } from "../types";

type NavFn = (next: { tab: "days" | "reservations"  | "shopping"; focusId?: string }) => void;

export function DayChip({ dayId, navigate }: { dayId: string; navigate: NavFn }) {
  const d = dayById(dayId);
  if (!d) return null;
  return (
    <button
      type="button"
      onClick={() => navigate({ tab: "days", focusId: dayId })}
      className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted hover:bg-accent hover:text-white transition-colors"
    >
      G{d.dayNumber}
    </button>
  );
}

export function DayChips({ dayIds, navigate }: { dayIds: string[]; navigate: NavFn }) {
  if (!dayIds.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {dayIds.map((id) => (
        <DayChip key={id} dayId={id} navigate={navigate} />
      ))}
    </span>
  );
}

export function dayLabel(d: Day): string {
  return `G${d.dayNumber}`;
}
