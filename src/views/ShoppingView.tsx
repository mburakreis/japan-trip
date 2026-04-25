import { useEffect, useRef } from "react";
import { shopping } from "../lib/derive";
import type { ShoppingItem } from "../types";
import { useShoppingState, toggleShopping } from "../lib/shoppingState";
import { DayChips } from "../components/DayChip";

type NavFn = (next: { tab: "days" | "reservations" | "budget" | "shopping"; focusId?: string }) => void;

function matches(s: ShoppingItem, q: string): boolean {
  if (!q) return true;
  return [s.item, s.where, s.day, s.note]
    .join(" ")
    .toLowerCase()
    .includes(q.toLowerCase());
}

export function ShoppingView({
  focusId,
  navigate,
  query,
}: {
  focusId?: string;
  navigate: NavFn;
  query: string;
}) {
  const checked = useShoppingState();
  const focusRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (focusId) {
      requestAnimationFrame(() => {
        focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [focusId]);

  const visible = shopping.filter((s) => matches(s, query));
  const total = shopping.length;
  const done = shopping.filter((i) => checked[i.id]).length;

  return (
    <div className="mt-3">
      <div className="card px-4 py-3 mb-3 flex items-center justify-between">
        <span className="text-sm">
          {done} / {total} tamamlandı
        </span>
        <div className="w-28 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <ul className="card divide-default overflow-hidden">
        {visible.map((it) => {
          const isChecked = !!checked[it.id];
          return (
            <li key={it.id} ref={it.id === focusId ? focusRef : undefined}>
              <div className={`px-4 py-3 flex items-start gap-3 ${it.id === focusId ? "bg-accent/5" : ""}`}>
                <button
                  type="button"
                  onClick={() => toggleShopping(it.id)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    isChecked
                      ? "bg-ink border-ink text-paper dark:bg-paper dark:border-paper dark:text-ink"
                      : "border-black/20 dark:border-white/20 bg-white dark:bg-white/5"
                  }`}
                  aria-label={isChecked ? "Kaldır" : "İşaretle"}
                >
                  {isChecked && <span className="text-[11px]">✓</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm leading-snug ${
                      isChecked ? "line-through text-ink-muted dark:text-paper-muted" : ""
                    }`}
                  >
                    {it.item}
                  </p>
                  <p className="text-[11px] text-ink-muted dark:text-paper-muted mt-0.5">
                    {it.where}
                    {it.priceRaw ? ` · ${it.priceRaw}` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <DayChips dayIds={it.dayIds} navigate={navigate} />
                    {it.note && (
                      <span className="text-[11px] text-ink-muted dark:text-paper-muted">
                        {it.note}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
