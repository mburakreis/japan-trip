import data from "../data/budget.json";
import type { Budget } from "../types";

const budget = data as Budget;

function fmt(n: number, currency: string) {
  if (!n) return "—";
  return `${currency || ""}${n.toLocaleString("tr-TR")}`;
}

export function BudgetView() {
  return (
    <div className="mt-2 space-y-4">
      {budget.fxNote && <p className="text-xs text-ink-muted">{budget.fxNote}</p>}
      {budget.sections.map((s) => {
        const cur = s.currency || s.subtotal?.currency || "";
        return (
          <section key={s.id} className="bg-white rounded-xl border border-black/5 overflow-hidden">
            <header className="px-4 py-2.5 bg-paper border-b border-black/5">
              <h2 className="text-sm font-medium leading-snug">{s.title}</h2>
              {s.subtotal && (s.subtotal.min || s.subtotal.max) && (
                <p className="text-xs text-ink-muted mt-0.5">
                  Alt toplam: {fmt(s.subtotal.min || 0, cur)} – {fmt(s.subtotal.max || 0, cur)}
                </p>
              )}
            </header>
            <ul className="divide-y divide-black/5">
              {s.items.map((it, i) => (
                <li key={i} className="px-4 py-2.5 flex items-baseline gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{it.name}</p>
                    {(it.when || it.note) && (
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        {it.when}
                        {it.when && it.note ? " · " : ""}
                        {it.note}
                      </p>
                    )}
                  </div>
                  <div className="text-xs font-mono text-right shrink-0">
                    {it.min === it.max
                      ? fmt(it.min, it.currency)
                      : `${fmt(it.min, it.currency)}–${fmt(it.max, it.currency)}`}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
