import { useState } from "react";
import daysData from "../data/days.json";
import type { Day, Activity } from "../types";

const days = daysData as Day[];

const CITY_RE = /^(Tokyo|Kyoto|Kinosaki|Osaka|Seul|Incheon|Narita|Shinjuku|Ginza|Akihabara|Namba)/;

function inferCity(d: Day): string {
  const m = d.title.match(CITY_RE);
  if (m) return m[0];
  return d.title.split(/[—-]/)[0].trim();
}

export function DaysView() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ol className="space-y-3 mt-2">
      {days.map((d) => {
        const open = openId === d.id;
        const allActs: { section: string; items: Activity[] }[] = [
          { section: "Sabit", items: d.fixed },
          { section: "Ana Plan", items: d.main },
          { section: "Yemek", items: d.meals },
          { section: "B Planı", items: d.alternatives },
        ];
        const totalActs = d.fixed.length + d.main.length + d.meals.length;
        return (
          <li key={d.id} className="bg-white rounded-xl border border-black/5 overflow-hidden">
            <button
              onClick={() => setOpenId(open ? null : d.id)}
              className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-black text-white px-1.5 py-0.5 rounded">
                    G{d.dayNumber}
                  </span>
                  <span className="font-medium">{inferCity(d)}</span>
                  <span className="text-xs text-ink-muted">{d.dateRaw.split(" ").slice(0, 2).join(" ")}</span>
                </div>
                <p className="text-sm text-ink-muted mt-1 line-clamp-2">{d.title}</p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-ink-muted">
                  {totalActs} aktivite
                </span>
                <span className="text-ink-muted text-xs mt-0.5">{open ? "▾" : "▸"}</span>
              </div>
            </button>
            {open && (
              <div className="border-t border-black/5">
                {allActs
                  .filter((s) => s.items.length > 0)
                  .map((s) => (
                    <SectionBlock key={s.section} title={s.section} items={s.items} />
                  ))}
                {d.budgetSummary && (
                  <div className="px-4 py-3 text-xs text-ink-muted border-t border-black/5 bg-paper">
                    {d.budgetSummary}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SectionBlock({ title, items }: { title: string; items: Activity[] }) {
  return (
    <section className="px-4 py-3 border-t border-black/5 first:border-t-0">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted mb-2">{title}</h3>
      <ul className="space-y-3">
        {items.map((a, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="font-mono text-xs text-ink-muted w-14 shrink-0 pt-0.5">
              {a.time || "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.place || a.action}</p>
              {a.place && a.action && <p className="text-ink-muted text-xs mt-0.5">{a.action}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-ink-muted">
                {a.transport && a.transport !== "—" && <span>🚇 {a.transport}</span>}
                {a.duration && a.duration !== "—" && <span>⏱ {a.duration}</span>}
                {a.cost && <span>💴 {a.cost.raw}</span>}
              </div>
              {a.note && (
                <p className="mt-1 text-[12px] text-ink-muted leading-snug">{a.note}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
