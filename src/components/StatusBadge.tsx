import type { ReservationStatus } from "../types";

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  booked: "Rezerve",
  pending: "Beklemede",
  research: "Araştırılacak",
};

const CLASS: Record<ReservationStatus, string> = {
  booked: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  research: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-200",
};

const ICON: Record<ReservationStatus, string> = {
  booked: "✅",
  pending: "⏳",
  research: "🔍",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`chip uppercase tracking-wider ${CLASS[status]}`}>
      <span className="mr-1">{ICON[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}
