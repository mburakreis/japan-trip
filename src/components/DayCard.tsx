import { useEffect, useRef } from "react";
import {
  inferCity,
  shortDate,
  reservationsForDay,
  shoppingForDay,
} from "../lib/derive";
import type { Day, Activity, Reservation, ShoppingItem } from "../types";
import { todayDayId } from "../lib/countdown";
import trip from "../data/trip.json";
import { useShoppingState, toggleShopping } from "../lib/shoppingState";
import { useNote } from "../lib/notesState";
import { StatusBadge, STATUS_LABEL } from "./StatusBadge";

type NavFn = (next: { tab: "days" | "reservations" | "shopping"; focusId?: string }) => void;

type Source = "fixed" | "main" | "meals" | "alternatives";
type TimedItem = Activity & { _source: Source; _time: number };

const SOURCE_ORDER: Record<Source, number> = { fixed: 0, main: 1, meals: 2, alternatives: 3 };

function parseTimeMin(t: string): number {
  if (!t) return Number.MAX_SAFE_INTEGER;
  const cleaned = t
    .replace(/\[SABİT\]\s*/i, "")
    .replace(/^~/, "")
    .replace(/\s*▸\s*$/, "")
    .trim();
  const m = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const lc = cleaned.toLowerCase();
  if (/^(kahvalt|sabah)/.test(lc)) return 7 * 60;
  if (/^öğle/.test(lc)) return 12 * 60 + 30;
  if (/^(ara|atıştırma)/.test(lc)) return 15 * 60;
  if (/^akşam/.test(lc)) return 19 * 60;
  if (/^geç akşam/.test(lc)) return 22 * 60;
  if (/^gece/.test(lc)) return 23 * 60;
  if (/^alternatif/.test(lc) || /^alt/.test(lc)) return Number.MAX_SAFE_INTEGER - 1;
  return Number.MAX_SAFE_INTEGER;
}

function buildTimeline(day: Day): TimedItem[] {
  const items: TimedItem[] = [];
  day.fixed.forEach((a) => items.push({ ...a, _source: "fixed", _time: parseTimeMin(a.time) }));
  day.main.forEach((a) => {
    // Skip [SABİT] cross-reference rows in main — they duplicate fixed entries
    if (/\[SABİT\]/i.test(a.time) || /\[SABİT\]/i.test(a.action)) return;
    items.push({ ...a, _source: "main", _time: parseTimeMin(a.time) });
  });
  day.meals.forEach((a) => items.push({ ...a, _source: "meals", _time: parseTimeMin(a.time) }));
  day.alternatives.forEach((a) =>
    items.push({ ...a, _source: "alternatives", _time: parseTimeMin(a.time) }),
  );
  items.sort((a, b) => {
    if (a._time !== b._time) return a._time - b._time;
    return SOURCE_ORDER[a._source] - SOURCE_ORDER[b._source];
  });
  return items;
}

function extractTotal(summary: string): { compact: string; full: string } {
  if (!summary) return { compact: "", full: "" };
  const cleaned = summary.replace(/^💰\s*Gün\s*\d+\s*Bütçe:\s*/i, "");
  const m = cleaned.match(/TOPLAM\s*~?\s*([^|]+?)\s*$/i);
  return { compact: m ? m[1].trim() : cleaned, full: cleaned };
}

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
  const timeline = buildTimeline(day);
  const totalActs = timeline.length;

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
            actCount={totalActs}
          />
        </div>
        <span className="text-ink-muted dark:text-paper-muted text-xs mt-1">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="border-t border-black/5 dark:border-white/10">
          <TopBudgetMini summary={day.budgetSummary} />
          {reservations.length > 0 && (
            <LinkedReservations reservations={reservations} navigate={navigate} />
          )}
          <LinkedShopping dayId={day.id} items={shopping} navigate={navigate} />
          {timeline.length > 0 && <Timeline items={timeline} />}
          <DayNote dayId={day.id} />
        </div>
      )}
    </li>
  );
}

function TopBudgetMini({ summary }: { summary: string }) {
  if (!summary) return null;
  const { compact, full } = extractTotal(summary);
  return (
    <div className="px-4 py-2.5 bg-paper dark:bg-white/[0.02] border-b border-black/5 dark:border-white/10">
      <p className="text-sm">
        💴 <span className="font-medium">{compact}</span>
      </p>
      <p className="text-[11px] text-ink-muted dark:text-paper-muted mt-0.5 leading-snug">
        {full !== compact ? full : "Çoğu küçük yer cash, otel/depto card"}
      </p>
    </div>
  );
}

function DayBadges({
  reservations,
  shoppingCount,
  actCount,
}: {
  reservations: Reservation[];
  shoppingCount: number;
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

function Timeline({ items }: { items: TimedItem[] }) {
  return (
    <section className="px-4 py-3 border-t border-black/5 dark:border-white/10">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-2">
        Plan
      </h3>
      <ul className="space-y-3">
        {items.map((a, i) => (
          <TimelineRow key={i} a={a} />
        ))}
      </ul>
    </section>
  );
}

function TimelineRow({ a }: { a: TimedItem }) {
  // Strip "[SABİT]" from time string display (we visualize via 📌 marker)
  const displayTime = a.time.replace(/\[SABİT\]\s*/i, "").replace(/\s*▸\s*$/, "").trim();
  const isFixed = a._source === "fixed";
  const isMeal = a._source === "meals";
  const isAlt = a._source === "alternatives";
  const placeText = a.place || a.action;

  return (
    <li className={`flex gap-3 text-sm ${isAlt ? "opacity-80" : ""}`}>
      <div className="w-14 shrink-0 pt-0.5 flex flex-col items-start gap-0.5">
        <span className="font-mono text-xs text-ink-muted dark:text-paper-muted">
          {displayTime || "—"}
        </span>
        {isAlt && (
          <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-[9px]">
            B
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">
          {isFixed && <span className="mr-1" title="Sabit">📌</span>}
          {isMeal && <span className="mr-1" title="Yemek">🍽</span>}
          {placeText}
        </p>
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
