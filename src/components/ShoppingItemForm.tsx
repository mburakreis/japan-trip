import { useState } from "react";
import { days } from "../lib/derive";

export type FormValues = {
  item: string;
  where: string;
  priceRaw: string;
  day: string;
  note: string;
  dayIds: string[];
};

const EMPTY: FormValues = { item: "", where: "", priceRaw: "", day: "", note: "", dayIds: [] };

export function ShoppingItemForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Kaydet",
}: {
  initial?: Partial<FormValues>;
  onSubmit: (v: FormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [v, setV] = useState<FormValues>({ ...EMPTY, ...initial });

  const toggleDay = (id: string) => {
    setV((s) => ({
      ...s,
      dayIds: s.dayIds.includes(id) ? s.dayIds.filter((x) => x !== id) : [...s.dayIds, id],
    }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.item.trim()) return;
        onSubmit(v);
      }}
      className="space-y-2.5"
    >
      <Field label="Ürün *">
        <input
          autoFocus
          value={v.item}
          onChange={(e) => setV({ ...v, item: e.target.value })}
          className={inputCls}
          placeholder="Örn: Çikolatalı muz"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nereden">
          <input
            value={v.where}
            onChange={(e) => setV({ ...v, where: e.target.value })}
            className={inputCls}
            placeholder="Don Quijote"
          />
        </Field>
        <Field label="Tahmini fiyat">
          <input
            value={v.priceRaw}
            onChange={(e) => setV({ ...v, priceRaw: e.target.value })}
            className={inputCls}
            placeholder="¥800"
          />
        </Field>
      </div>
      <Field label="Gün/Şehir notu">
        <input
          value={v.day}
          onChange={(e) => setV({ ...v, day: e.target.value })}
          className={inputCls}
          placeholder="Gün 11 — Akihabara"
        />
      </Field>
      <Field label="Hangi günler?">
        <div className="flex flex-wrap gap-1.5">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDay(d.id)}
              className={`text-[11px] font-mono px-2 py-1 rounded-md border transition ${
                v.dayIds.includes(d.id)
                  ? "bg-accent text-white border-accent"
                  : "bg-white dark:bg-white/5 border-black/10 dark:border-white/10 text-ink-muted dark:text-paper-muted"
              }`}
            >
              G{d.dayNumber}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Not">
        <textarea
          value={v.note}
          onChange={(e) => setV({ ...v, note: e.target.value })}
          rows={2}
          className={inputCls + " resize-y"}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-3 py-1.5 rounded-lg text-ink-muted dark:text-paper-muted"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={!v.item.trim()}
          className="text-sm bg-ink dark:bg-paper text-paper dark:text-ink px-3 py-1.5 rounded-lg disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 placeholder:text-ink-muted/50 dark:placeholder:text-paper-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
