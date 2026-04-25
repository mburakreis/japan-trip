import { budget, budgetTotalsByCurrency } from "../lib/derive";
import { useShoppingState, mergedItems } from "../lib/shoppingState";
import type { Budget } from "../types";
import { DayChips } from "../components/DayChip";

type NavFn = (next: { tab: "days" | "reservations" | "budget" | "shopping"; focusId?: string }) => void;

const _budget: Budget = budget;

function fmt(n: number, currency: string) {
  if (!n) return "—";
  return `${currency || ""}${n.toLocaleString("tr-TR")}`;
}

function matchesQuery(text: string, q: string) {
  return !q || text.toLowerCase().includes(q.toLowerCase());
}

export function BudgetView({
  navigate,
  query,
}: {
  focusId?: string;
  navigate: NavFn;
  query: string;
}) {
  const totals = budgetTotalsByCurrency();
  const state = useShoppingState();
  const merged = mergedItems(state).filter((it) => !it.hidden);

  // Confirmed shopping spend: sum from checked items.
  // Prefer actualPriceRaw if user typed one, otherwise use planned priceRaw.
  let confirmedMin = 0;
  let confirmedMax = 0;
  for (const item of merged) {
    if (!item.checked) continue;
    const source = item.actualPriceRaw || item.priceRaw;
    const m = source.match(/(\d[\d.,]*)\s*-?\s*(\d[\d.,]*)?/);
    if (m) {
      const a = parseInt(m[1].replace(/[.,]/g, "")) || 0;
      const b = m[2] ? parseInt(m[2].replace(/[.,]/g, "")) || a : a;
      const looksThousand = /K/i.test(source);
      confirmedMin += looksThousand ? a * 1000 : a;
      confirmedMax += looksThousand ? b * 1000 : b;
    }
  }

  return (
    <div className="mt-3 space-y-4">
      <section className="card p-4">
        <h2 className="text-sm font-medium mb-2">Genel toplam</h2>
        <ul className="space-y-1">
          {totals.map((t) => (
            <li key={t.currency} className="flex items-baseline justify-between text-sm">
              <span className="text-ink-muted dark:text-paper-muted">{t.currency}</span>
              <span className="font-mono">
                {t.min === t.max ? fmt(t.min, t.currency) : `${fmt(t.min, t.currency)} – ${fmt(t.max, t.currency)}`}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10">
          <div className="flex items-baseline justify-between text-xs text-ink-muted dark:text-paper-muted mb-1">
            <span>İşaretlediğin alışveriş (onaylanmış harcama tahmini)</span>
            <span className="font-mono">¥{confirmedMin.toLocaleString("tr-TR")}–¥{confirmedMax.toLocaleString("tr-TR")}</span>
          </div>
          <div className="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${
                  totals.find((t) => t.currency === "¥")?.max
                    ? Math.min(100, (confirmedMax / (totals.find((t) => t.currency === "¥")!.max)) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
        {_budget.fxNote && (
          <p className="text-xs text-ink-muted dark:text-paper-muted mt-3">{_budget.fxNote}</p>
        )}
      </section>
      {_budget.sections.map((s) => {
        const cur = s.currency || s.subtotal?.currency || "";
        const visibleItems = s.items.filter((it) => matchesQuery(`${it.name} ${it.note} ${it.when}`, query));
        if (query && visibleItems.length === 0) return null;
        return (
          <section key={s.id} className="card overflow-hidden">
            <header className="px-4 py-2.5 bg-paper dark:bg-white/[0.02] border-b border-black/5 dark:border-white/10">
              <h2 className="text-sm font-medium leading-snug">{s.title}</h2>
              {s.subtotal && (s.subtotal.min || s.subtotal.max) && (
                <p className="text-xs text-ink-muted dark:text-paper-muted mt-0.5">
                  Alt toplam: {fmt(s.subtotal.min || 0, cur)} – {fmt(s.subtotal.max || 0, cur)}
                </p>
              )}
            </header>
            <ul className="divide-default">
              {visibleItems.map((it, i) => (
                <li key={i} className="px-4 py-2.5 flex items-baseline gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{it.name}</p>
                    <div className="flex flex-wrap gap-2 items-center mt-0.5">
                      <DayChips dayIds={it.dayIds} navigate={navigate} />
                      {(it.when || it.note) && (
                        <span className="text-[11px] text-ink-muted dark:text-paper-muted">
                          {it.when}
                          {it.when && it.note ? " · " : ""}
                          {it.note}
                        </span>
                      )}
                    </div>
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
