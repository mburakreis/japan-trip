import { Download, Moon, Sun } from "lucide-react";
import trip from "../data/trip.json";
import days from "../data/days.json";
import reservations from "../data/reservations.json";
import shopping from "../data/shopping.json";
import { tripStatus } from "../lib/countdown";
import type { Trip } from "../types";

function timestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function downloadJson(name: string, data: unknown, ts: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}_${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadAllData() {
  const ts = timestamp(new Date());
  const files: Array<{ name: string; data: unknown }> = [
    { name: "trip", data: trip },
    { name: "days", data: days },
    { name: "reservations", data: reservations },
    { name: "shopping", data: shopping },
  ];
  files.forEach((f, i) => {
    setTimeout(() => downloadJson(f.name, f.data, ts), i * 250);
  });
}

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
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={downloadAllData}
            aria-label="Tüm JSON verilerini indir"
            title="Tüm JSON verilerini indir (tarihli)"
            className="p-2 -m-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink dark:text-paper"
          >
            <Download size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="p-2 -m-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink dark:text-paper"
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </button>
        </div>
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
