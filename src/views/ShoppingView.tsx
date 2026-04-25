import { useEffect, useState } from "react";
import data from "../data/shopping.json";
import type { ShoppingItem } from "../types";

const items = data as ShoppingItem[];

const STORAGE_KEY = "japan-trip:shopping:v1";

function loadChecked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return Object.fromEntries(items.map((i) => [i.id, i.checked]));
}

export function ShoppingView() {
  const [checked, setChecked] = useState<Record<string, boolean>>(loadChecked);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const total = items.length;
  const done = items.filter((i) => checked[i.id]).length;

  return (
    <div className="mt-2">
      <div className="bg-white rounded-xl border border-black/5 px-4 py-3 mb-3 flex items-center justify-between">
        <span className="text-sm">
          {done} / {total} tamamlandı
        </span>
        <div className="w-28 h-1.5 bg-black/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <ul className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden">
        {items.map((it) => {
          const isChecked = !!checked[it.id];
          return (
            <li key={it.id}>
              <button
                onClick={() => setChecked((s) => ({ ...s, [it.id]: !s[it.id] }))}
                className="w-full text-left px-4 py-3 flex items-start gap-3"
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    isChecked ? "bg-ink border-ink text-white" : "border-black/20 bg-white"
                  }`}
                >
                  {isChecked && <span className="text-[11px]">✓</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${isChecked ? "line-through text-ink-muted" : ""}`}>
                    {it.item}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {it.where}
                    {it.priceRaw ? ` · ${it.priceRaw}` : ""}
                    {it.day ? ` · ${it.day}` : ""}
                  </p>
                  {it.note && <p className="text-[11px] text-ink-muted mt-0.5">{it.note}</p>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
