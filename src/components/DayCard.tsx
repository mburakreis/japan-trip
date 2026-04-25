import { useEffect, useRef } from "react";
import {
  inferCity,
  shortDate,
  reservationsForDay,
  shoppingForDay,
  budgetForDay,
} from "../lib/derive";
import type { Day, Activity, Reservation, ShoppingItem, BudgetItem } from "../types";
import { todayDayId } from "../lib/countdown";
import trip from "../data/trip.json";
import { useShoppingState, toggleShopping } from "../lib/shoppingState";
import { useNote } from "../lib/notesState";
import { StatusBadge, STATUS_LABEL } from "./StatusBadge";

type NavFn = (next: { tab: "days" | "reservations" | "budget" | "shopping"; focusId?: string }) => void;

const SECTIONS: { key: keyof Pick<Day, "fixed" | "main" | "meals" | "alternatives">; label: string }[] = [
  { key: "fixed", label: "Sabit" },
  { key: "main", label: "Ana Plan" },
  { key: "meals", label: "Yemek" },
  { key: "alternatives", label: "B Planı" },
];

export function DayCard({
  day,
  open,
  onToggle,
  navigate,
}: {
  day: Day;
  open: boolean;
  onToggle: () => void;
  navigate: NavFn;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const isToday = todayDayId(trip) === day.id;

  const reservations = reservationsForDay(day.id);
  const shopping = shoppingForDay(day.id);
  const shoppingState = useShoppingState();
  const userShoppingForDay = shoppingState.added.filter((u) => u.dayIds.includes(day.id));
  const visiblePlanShoppingCount = shopping.filter((p) => !shoppingState.hidden.includes(p.id)).length;
  const totalShoppingForDay = visiblePlanShoppingCount + userShoppingForDay.length;
  const budgetItems = budgetForDay(day.id);
  const totalActs = day.fixed.length + day.main.length + day.meals.length;

  useEffect(() => {
    if (open && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [open]);

  return (
    <li
      ref={ref}
      className={`card overflow-hidden ${isToday ? "ring-2 ring-accent" : ""}`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 card-hover"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono bg-ink dark:bg-paper text-paper dark:text-ink px-1.5 py-0.5 rounded">
              G{day.dayNumber}
            </span>
            <span className="font-medium">{inferCity(day)}</span>
            <span className="text-xs text-ink-muted dark:text-paper-muted">
              {shortDate(day.dateRaw)}
            </span>
            {isToday && <span className="chip bg-accent text-white">BUGÜN</span>}
          </div>
          <p className="text-sm text-ink-muted dark:text-paper-muted mt-1 line-clamp-2">
            {day.title}
          </p>
          <DayBadges
            reservations={reservations}
            shoppingCount={totalShoppingForDay}
            budgetCount={budgetItems.length}
            actCount={totalActs}
          />
        </div>
        <span className="text-ink-muted dark:text-paper-muted text-xs mt-1">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="border-t border-black/5 dark:border-white/10">
          {reservations.length > 0 && (
            <LinkedReservations
              reservations={reservations}
              navigate={navigate}
            />
          )}
          <LinkedShopping dayId={day.id} items={shopping} navigate={navigate} />
          {SECTIONS.map(({ key, label }) =>
            day[key].length > 0 ? (
              <SectionBlock key={key} title={label} items={day[key]} />
            ) : null,
          )}
          {budgetItems.length > 0 && (
            <LinkedBudget items={budgetItems} navigate={navigate} />
          )}
          <DayNote dayId={day.id} />
          {day.budgetSummary && (
            <div className="px-4 py-3 text-xs text-ink-muted dark:text-paper-muted border-t border-black/5 dark:border-white/10 bg-paper dark:bg-white/[0.02]">
              {day.budgetSummary}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function DayBadges({
  reservations,
  shoppingCount,
  budgetCount,
  actCount,
}: {
  reservations: Reservation[];
  shoppingCount: number;
  budgetCount: number;
  actCount: number;
}) {
  const booked = reservations.filter((r) => r.status === "booked").length;
  const pending = reservations.filter((r) => r.status === "pending").length;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
      <span className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted">
        ⏱ {actCount}
      </span>
      {booked > 0 && (
        <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
          🔖 {booked}
        </span>
      )}
      {pending > 0 && (
        <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          ⏳ {pending}
        </span>
      )}
      {shoppingCount > 0 && (
        <span className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted">
          🛍️ {shoppingCount}
        </span>
      )}
      {budgetCount > 0 && (
        <span className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted">
          💴 {budgetCount}
        </span>
      )}
    </div>
  );
}

function LinkedReservations({
  reservations,
  navigate,
}: {
  reservations: Reservation[];
  navigate: NavFn;
}) {
  return (
    <section className="px-4 py-3 border-t border-black/5 dark:border-white/10 first:border-t-0">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-2">
        Bu güne bağlı rezervasyonlar
      </h3>
      <ul className="space-y-2">
        {reservations.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => navigate({ tab: "reservations", focusId: r.id })}
              className="w-full text-left flex items-start gap-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] -mx-2 px-2 py-1.5 rounded-lg"
            >
              <StatusBadge status={r.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug truncate">{r.title}</p>
                <p className="text-[11px] text-ink-muted dark:text-paper-muted">
                  {r.platform || STATUS_LABEL[r.status]}
                  {r.priceRaw ? ` · ${r.priceRaw}` : ""}
                </p>
              </div>
              <span className="text-ink-muted dark:text-paper-muted text-xs mt-0.5">↗</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LinkedShopping({
  dayId,
  items,
  navigate,
}: {
  dayId: string;
  items: ShoppingItem[];
  navigate: NavFn;
}) {
  const state = useShoppingState();
  const planVisible = items.filter((p) => !state.hidden.includes(p.id));
  const userForDay = state.added.filter((u) => u.dayIds.includes(dayId));
  if (planVisible.length === 0 && userForDay.length === 0) return null;
  return (
    <section className="px-4 py-3 border-t border-black/5 dark:border-white/10">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-2">
        Bu güne planlı alışveriş
      </h3>
      <ul className="space-y-1.5">
        {planVisible.map((it) => {
          const o = state.overrides[it.id];
          return (
            <ShoppingRow
              key={it.id}
              id={it.id}
              item={it.item}
              where={it.where}
              priceRaw={it.priceRaw}
              checked={!!o?.checked}
              actual={o?.actualPriceRaw || ""}
              navigate={navigate}
            />
          );
        })}
        {userForDay.map((u) => (
          <ShoppingRow
            key={u.id}
            id={u.id}
            item={u.item}
            where={u.where}
            priceRaw={u.priceRaw}
            checked={u.checked}
            actual={u.actualPriceRaw}
            navigate={navigate}
            badge="Ekledim"
          />
        ))}
      </ul>
    </section>
  );
}

function ShoppingRow({
  id,
  item,
  where,
  priceRaw,
  checked,
  actual,
  navigate,
  badge,
}: {
  id: string;
  item: string;
  where: string;
  priceRaw: string;
  checked: boolean;
  actual: string;
  navigate: NavFn;
  badge?: string;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <button
        type="button"
        onClick={() => toggleShopping(id)}
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
          checked
            ? "bg-ink border-ink text-paper dark:bg-paper dark:border-paper dark:text-ink"
            : "border-black/20 dark:border-white/20 bg-white dark:bg-white/5"
        }`}
        aria-label={checked ? "Kaldır" : "İşaretle"}
      >
        {checked && <span className="text-[11px]">✓</span>}
      </button>
      <button
        type="button"
        onClick={() => navigate({ tab: "shopping", focusId: id })}
        className="min-w-0 flex-1 text-left"
      >
        <p className={`leading-snug ${checked ? "line-through text-ink-muted dark:text-paper-muted" : ""}`}>
          {item}
          {badge && (
            <span className="ml-1.5 chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted">
              {badge}
            </span>
          )}
        </p>
        <p className="text-[11px] text-ink-muted dark:text-paper-muted">
          {[where, priceRaw && `Plan ${priceRaw}`, actual && `Gerçek ${actual}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </button>
    </li>
  );
}

function LinkedBudget({
  items,
  navigate,
}: {
  items: BudgetItem[];
  navigate: NavFn;
}) {
  return (
    <section className="px-4 py-3 border-t border-black/5 dark:border-white/10">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-2">
        Bu güne bağlı bütçe
      </h3>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-3 text-sm">
            <button
              type="button"
              onClick={() => navigate({ tab: "budget" })}
              className="min-w-0 flex-1 text-left hover:underline"
            >
              {it.name}
            </button>
            <span className="text-xs font-mono text-ink-muted dark:text-paper-muted shrink-0">
              {it.min === it.max
                ? `${it.currency}${it.min.toLocaleString("tr-TR")}`
                : `${it.currency}${it.min.toLocaleString("tr-TR")}–${it.max.toLocaleString("tr-TR")}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionBlock({ title, items }: { title: string; items: Activity[] }) {
  return (
    <section className="px-4 py-3 border-t border-black/5 dark:border-white/10">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-2">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((a, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="font-mono text-xs text-ink-muted dark:text-paper-muted w-14 shrink-0 pt-0.5">
              {a.time || "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.place || a.action}</p>
              {a.place && a.action && (
                <p className="text-ink-muted dark:text-paper-muted text-xs mt-0.5">{a.action}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-ink-muted dark:text-paper-muted">
                {a.transport && a.transport !== "—" && <span>🚇 {a.transport}</span>}
                {a.duration && a.duration !== "—" && <span>⏱ {a.duration}</span>}
                {a.cost && <span>💴 {a.cost.raw}</span>}
                {a.mapsUrl && (
                  <a
                    href={a.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="hover:text-accent"
                  >
                    🗺 Haritada gör
                  </a>
                )}
                {a.tabelogUrl && (
                  <a
                    href={a.tabelogUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="hover:text-accent"
                  >
                    🍽 Tabelog
                  </a>
                )}
              </div>
              {a.note && (
                <p className="mt-1 text-[12px] text-ink-muted dark:text-paper-muted leading-snug">
                  {a.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DayNote({ dayId }: { dayId: string }) {
  const [text, setText] = useNote(dayId);
  return (
    <section className="px-4 py-3 border-t border-black/5 dark:border-white/10">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-1.5">
        Notlarım <span className="text-ink-muted/60 dark:text-paper-muted/60">(sadece bu cihazda)</span>
      </h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Bu gün için kişisel not, gözlem, hatırlatma..."
        rows={2}
        className="w-full text-sm bg-paper dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-lg px-3 py-2 placeholder:text-ink-muted/50 dark:placeholder:text-paper-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
      />
    </section>
  );
}
