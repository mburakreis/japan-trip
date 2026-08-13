import {
  Bed,
  Train,
  ShoppingBag,
  Utensils,
  ListChecks,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { days, reservationsForDay, shoppingForDay, inferCity, shortDate } from "../lib/derive";
import { STATUS_LABEL } from "../components/StatusBadge";
import type { Day, Reservation, ShoppingItem } from "../types";
import trip from "../data/trip.json";

const STATUS_DOT: Record<string, string> = {
  booked: "bg-emerald-500",
  pending: "bg-amber-500",
  research: "bg-zinc-400",
  cancelled: "bg-red-400",
};

function statusText(status: string): string {
  return STATUS_LABEL[status as keyof typeof STATUS_LABEL] || status;
}

function plannedBullets(d: Day): string[] {
  const all = [...d.fixed, ...d.main];
  return all
    .map((a) => {
      const time = a.time?.replace(/\[SABİT\]\s*/i, "").replace(/\[ANCHOR\]\s*/i, "").trim();
      const place = a.place || a.action;
      if (!place) return "";
      return time ? `${time} · ${place}` : place;
    })
    .filter(Boolean);
}

export function OverviewView() {
  return (
    <section className="py-4">
      <div className="px-2 mb-4">
        <h1 className="text-xl font-semibold">{trip.title} — Genel Bakış</h1>
        <p className="text-sm text-ink-muted dark:text-paper-muted mt-1">
          {trip.subtitle} · {days.length} gün
        </p>
        <p className="text-xs text-ink-muted/70 dark:text-paper-muted/70 mt-1">
          Tüm planı tek bakışta görmek için tasarlandı. Yatay kaydır ya da
          ekran görüntüsü için tarayıcıyı uzaklaştır (Ctrl/Cmd + −).
        </p>
      </div>
      <div className="overflow-x-auto pb-6">
        <ol className="flex gap-4 px-2">
          {days.map((d) => (
            <DayColumn key={d.id} day={d} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function DayColumn({ day }: { day: Day }) {
  const reservations = reservationsForDay(day.id);
  const shopping = shoppingForDay(day.id);
  const acc = reservations.filter((r) => r.type === "accommodation");
  const transport = reservations.filter((r) => r.type === "transport");
  const meals = reservations.filter((r) => r.type === "restaurant");
  const plan = plannedBullets(day);

  return (
    <li className="shrink-0 w-[320px] bg-white dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col">
      <header className="px-5 py-4 border-b border-black/5 dark:border-white/10">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold leading-none">G{day.dayNumber}</span>
          <span className="text-xs text-ink-muted dark:text-paper-muted">
            {shortDate(day.dateRaw)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-ink-muted dark:text-paper-muted">
          <MapPin size={12} strokeWidth={2} />
          <span>{inferCity(day)}</span>
        </div>
        <p className="text-[13px] mt-2 leading-snug">{day.title}</p>
      </header>

      <Section title="Konaklama" Icon={Bed} empty={acc.length === 0 ? "—" : null}>
        {acc.map((r) => (
          <ReservationLine key={r.id} r={r} />
        ))}
      </Section>

      <Section title="Ulaşım" Icon={Train} empty={transport.length === 0 ? "—" : null}>
        {transport.map((r) => (
          <ReservationLine key={r.id} r={r} />
        ))}
      </Section>

      <Section title="Yemek" Icon={Utensils} empty={meals.length === 0 ? "—" : null}>
        {meals.map((r) => (
          <ReservationLine key={r.id} r={r} />
        ))}
      </Section>

      <Section title="Alışveriş" Icon={ShoppingBag} empty={shopping.length === 0 ? "—" : null}>
        {shopping.map((s) => (
          <ShoppingLine key={s.id} s={s} />
        ))}
      </Section>

      <Section title="Plan" Icon={ListChecks} empty={plan.length === 0 ? "—" : null} last>
        <ul className="space-y-1">
          {plan.map((p, i) => (
            <li key={i} className="text-[12px] leading-snug text-ink dark:text-paper">
              <span className="text-ink-muted/60 dark:text-paper-muted/60">•</span> {p}
            </li>
          ))}
        </ul>
      </Section>
    </li>
  );
}

function Section({
  title,
  Icon,
  empty,
  last,
  children,
}: {
  title: string;
  Icon: LucideIcon;
  empty: string | null;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`px-5 py-3 ${last ? "" : "border-b border-black/5 dark:border-white/10"}`}>
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-1.5 inline-flex items-center gap-1.5">
        <Icon size={11} strokeWidth={2} />
        {title}
      </h3>
      {empty ? (
        <p className="text-[12px] text-ink-muted/50 dark:text-paper-muted/50">{empty}</p>
      ) : (
        children
      )}
    </div>
  );
}

function ReservationLine({ r }: { r: Reservation }) {
  return (
    <div className="mb-1.5 last:mb-0">
      <p className="text-[13px] font-medium leading-snug">{r.title}</p>
      <p className="text-[11px] text-ink-muted dark:text-paper-muted mt-0.5 inline-flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status] || "bg-zinc-400"}`} />
        {statusText(r.status)}
        {r.priceRaw && <span>· {r.priceRaw}</span>}
      </p>
    </div>
  );
}

function ShoppingLine({ s }: { s: ShoppingItem }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="text-[12px] leading-snug">{s.item}</p>
      {(s.where || s.priceRaw) && (
        <p className="text-[11px] text-ink-muted dark:text-paper-muted mt-0.5">
          {[s.where, s.priceRaw].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
