import { CheckCircle2, Clock, Search, type LucideIcon } from "lucide-react";
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

const ICON: Record<ReservationStatus, LucideIcon> = {
  booked: CheckCircle2,
  pending: Clock,
  research: Search,
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const Icon = ICON[status];
  return (
    <span className={`chip uppercase tracking-wider gap-1 ${CLASS[status]}`}>
      <Icon size={11} strokeWidth={2} />
      {STATUS_LABEL[status]}
    </span>
  );
}
