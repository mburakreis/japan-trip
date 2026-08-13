import { Download, Moon, Sun } from "lucide-react";
import JSZip from "jszip";
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

async function downloadAllData() {
  const ts = timestamp(new Date());
  const zip = new JSZip();
  zip.file("trip.json", JSON.stringify(trip, null, 2));
  zip.file("days.json", JSON.stringify(days, null, 2));
  zip.file("reservations.json", JSON.stringify(reservations, null, 2));
  zip.file("shopping.json", JSON.stringify(shopping, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `japan-trip_${ts}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function Header({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  const t = trip as Trip;
  const status = tripStatus(t);

  let badge: string;
  if (status.kind === "before") badge = `${status.daysUntil} days until the trip`;
  else if (status.kind === "active") badge = `Today: Day ${status.dayNumber}/${status.totalDays}`;
  else badge = `${status.daysSince} days since the trip`;

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
            aria-label="Download all JSON data"
            title="Download all JSON data (timestamped)"
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
          {t.startDate} → {t.endDate} · 1 {t.fx.from} ≈ {t.fx.rate} {t.fx.to}
        </span>
      </div>
    </header>
  );
}
