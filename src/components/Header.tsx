import { Moon, Sun } from "lucide-react";
import trip from "../data/trip.json";
import { tripStatus } from "../lib/countdown";
import type { Trip } from "../types";

export function Header({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  const t = trip as Trip;
  const status = tripStatus(t);

  let badge: string;
  if (status.kind === "before") badge = `Geziye ${status.daysUntil} gün`;
  else if (status.kind === "active") badge = `Bugün Gün ${status.dayNumber}/${status.totalDays}`;
  else badge = `Geziden ${status.daysSince} gün geçti`;

  return (
    <header className="px-4 pt-6 pb-3 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-ink-muted dark:text-paper-muted mt-0.5">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="p-2 -m-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink dark:text-paper"
        >
          {theme === "dark" ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            status.kind === "active"
              ? "bg-accent text-white"
              : "bg-black/5 text-ink-muted dark:bg-white/10 dark:text-paper-muted"
          }`}
        >
          {badge}
        </span>
        <span className="text-xs text-ink-muted dark:text-paper-muted">
          {t.startDate} → {t.endDate} · ¥1 ≈ ₺{t.fx.rate}
        </span>
      </div>
    </header>
  );
}
