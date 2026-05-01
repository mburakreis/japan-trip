import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Map as MapIcon,
  Pin,
  ShoppingBag,
  Train,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
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
type TimedItem = Activity & { _source: Source };
type ToggleEntry = { primary: TimedItem; alternative?: Activity };
type RowEntry =
  | { kind: "fixed"; item: TimedItem; _time: number }
  | { kind: "main"; entry: ToggleEntry; _time: number };

function normalizeTime(t: string): string {
  return t
    .replace(/\[SABİT\]\s*/i, "")
    .replace(/^~/, "")
    .replace(/\s*▸\s*$/, "")
    .trim();
}

function parseTimeMin(t: string): number {
  if (!t) return Number.MAX_SAFE_INTEGER;
  const cleaned = t
    .replace(/\[SABİT\]\s*/i, "")
    .replace(/^~/, "")
    .replace(/\s*▸\s*$/, "")
    .replace(/\s*\(\+\d+\).*$/, "")
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
  return Number.MAX_SAFE_INTEGER;
}

function buildTimeline(day: Day): {
  rows: RowEntry[];
  offTimeAlts: TimedItem[];
} {
  // Days with (+1) times span midnight — preserve JSON order instead of sorting
  const hasNextDay = [...day.fixed, ...day.main].some((a) => /\(\+\d+\)/.test(a.time));

  const mainTimeToIndex = new Map<string, number>();
  day.main.forEach((a, i) => {
    if (/\[SABİT\]/i.test(a.time) || /\[SABİT\]/i.test(a.action)) return;
    const key = normalizeTime(a.time);
    if (!mainTimeToIndex.has(key)) mainTimeToIndex.set(key, i);
  });

  const matchedAlts = new Map<number, Activity>();
  const offTimeAlts: TimedItem[] = [];
  day.alternatives.forEach((alt) => {
    const idx = mainTimeToIndex.get(normalizeTime(alt.time));
    if (idx !== undefined && !matchedAlts.has(idx)) {
      matchedAlts.set(idx, alt);
    } else {
      offTimeAlts.push({ ...alt, _source: "alternatives" });
    }
  });

  const rows: RowEntry[] = [];

  day.fixed.forEach((a) => {
    rows.push({ kind: "fixed", item: { ...a, _source: "fixed" }, _time: parseTimeMin(a.time) });
  });

  day.main.forEach((a, i) => {
    if (/\[SABİT\]/i.test(a.time) || /\[SABİT\]/i.test(a.action)) return;
    rows.push({
      kind: "main",
      entry: { primary: { ...a, _source: "main" }, alternative: matchedAlts.get(i) },
      _time: parseTimeMin(a.time),
    });
  });

  if (!hasNextDay) {
    rows.sort((a, b) => a._time - b._time);
  }

  return { rows, offTimeAlts };
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
  const { rows, offTimeAlts } = buildTimeline(day);
  const totalActs = rows.length;

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
        <span className="text-ink-muted dark:text-paper-muted mt-1 shrink-0">
          {open ? <ChevronDown size={16} strokeWidth={1.75} /> : <ChevronRight size={16} strokeWidth={1.75} />}
        </span>
      </button>
      {open && (
        <div className="border-t border-black/5 dark:border-white/10">
          <TopBudgetMini summary={day.budgetSummary} />
          {reservations.length > 0 && (
            <LinkedReservations reservations={reservations} navigate={navigate} />
          )}
          <LinkedShopping dayId={day.id} items={shopping} navigate={navigate} />
          {(rows.length > 0 || offTimeAlts.length > 0) && (
            <Timeline
              rows={rows}
              offTimeAlts={offTimeAlts}
            />
          )}
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
      <p className="text-sm flex items-center gap-1.5">
        <Banknote size={14} strokeWidth={1.75} className="text-ink-muted dark:text-paper-muted" />
        <span className="font-medium">{compact}</span>
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
      <span className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted gap-1">
        <Clock size={11} strokeWidth={1.75} /> {actCount}
      </span>
      {booked > 0 && (
        <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 gap-1">
          <Bookmark size={11} strokeWidth={2} /> {booked}
        </span>
      )}
      {pending > 0 && (
        <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 gap-1">
          <Clock size={11} strokeWidth={2} /> {pending}
        </span>
      )}
      {shoppingCount > 0 && (
        <span className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted gap-1">
          <ShoppingBag size={11} strokeWidth={1.75} /> {shoppingCount}
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
              <ExternalLink size={14} strokeWidth={1.75} className="text-ink-muted dark:text-paper-muted shrink-0 mt-0.5" />
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
        {checked && <Check size={12} strokeWidth={2.5} />}
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

function Timeline({
  rows,
  offTimeAlts,
}: {
  rows: RowEntry[];
  offTimeAlts: TimedItem[];
}) {
  const [showAlts, setShowAlts] = useState(false);
  return (
    <section className="px-4 py-3 border-t border-black/5 dark:border-white/10">
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-2">
        Plan
      </h3>
      <ul className="space-y-3">
        {rows.map((row, i) =>
          row.kind === "fixed"
            ? <TimelineRow key={`f-${i}`} a={row.item} />
            : <ToggleableRow key={`m-${i}`} entry={row.entry} />
        )}
      </ul>
      {offTimeAlts.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAlts((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-ink-muted dark:text-paper-muted hover:text-accent"
          >
            {showAlts ? <ChevronDown size={13} strokeWidth={1.75} /> : <ChevronRight size={13} strokeWidth={1.75} />}
            Alternatifler ({offTimeAlts.length})
          </button>
          {showAlts && (
            <ul className="mt-2 space-y-3">
              {offTimeAlts.map((a, i) => (
                <TimelineRow key={`o-${i}`} a={a} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ToggleableRow({ entry }: { entry: ToggleEntry }) {
  const [showB, setShowB] = useState(false);
  const showing: TimedItem =
    showB && entry.alternative
      ? { ...entry.alternative, _source: "alternatives" }
      : entry.primary;

  const toggle = entry.alternative ? (
    <button
      type="button"
      onClick={() => setShowB((s) => !s)}
      className={`shrink-0 self-start mt-0.5 w-7 h-7 rounded-full border text-[11px] font-mono font-medium transition ${
        showB
          ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200"
          : "border-black/10 dark:border-white/10 text-ink-muted dark:text-paper-muted hover:border-accent hover:text-accent"
      }`}
      aria-label={showB ? "Ana plana dön" : "B planını göster"}
    >
      {showB ? "A" : "B"}
    </button>
  ) : null;

  return <TimelineRow a={showing} rightSlot={toggle} />;
}

function TimelineRow({ a, rightSlot }: { a: TimedItem; rightSlot?: React.ReactNode }) {
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
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug inline-flex items-center gap-1.5">
          {isFixed && <Pin size={12} strokeWidth={2} className="text-accent shrink-0" aria-label="Sabit" />}
          {isMeal && <Utensils size={12} strokeWidth={2} className="text-ink-muted dark:text-paper-muted shrink-0" aria-label="Yemek" />}
          <span>{placeText}</span>
        </p>
        {a.place && a.action && (
          <p className="text-ink-muted dark:text-paper-muted text-xs mt-0.5">{a.action}</p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-ink-muted dark:text-paper-muted">
          {a.transport && a.transport !== "—" && (
            <span className="inline-flex items-center gap-1">
              <Train size={11} strokeWidth={1.75} /> {a.transport}
            </span>
          )}
          {a.duration && a.duration !== "—" && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} strokeWidth={1.75} /> {a.duration}
            </span>
          )}
          {a.cost && (
            <span className="inline-flex items-center gap-1">
              <Banknote size={11} strokeWidth={1.75} /> {a.cost.raw}
            </span>
          )}
          {a.mapsUrl && (
            <a
              href={a.mapsUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 hover:text-accent"
            >
              <MapIcon size={11} strokeWidth={1.75} /> Haritada gör
            </a>
          )}
          {a.tabelogUrl && (
            <a
              href={a.tabelogUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 hover:text-accent"
            >
              <UtensilsCrossed size={11} strokeWidth={1.75} /> Tabelog
            </a>
          )}
        </div>
        {a.note && (
          <p className="mt-1 text-[12px] text-ink-muted dark:text-paper-muted leading-snug">
            {a.note}
          </p>
        )}
      </div>
      {rightSlot}
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
