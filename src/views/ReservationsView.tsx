import { useEffect, useRef, useState } from "react";
import { reservations } from "../lib/derive";
import type { Reservation, ReservationStatus } from "../types";
import { ObfuscatedEmail } from "../components/ObfuscatedEmail";
import { StatusBadge } from "../components/StatusBadge";
import { DayChips } from "../components/DayChip";

type NavFn = (next: { tab: "days" | "reservations" | "budget" | "shopping"; focusId?: string }) => void;

const TYPE_LABEL: Record<Reservation["type"], string> = {
  accommodation: "Konaklama",
  transport: "Ulaşım",
  activity: "Aktivite",
};

function matches(r: Reservation, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return [r.title, r.city, r.platform, r.note, r.dateRaw]
    .join(" ")
    .toLowerCase()
    .includes(lower);
}

export function ReservationsView({
  focusId,
  navigate,
  query,
}: {
  focusId?: string;
  navigate: NavFn;
  query: string;
}) {
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");
  const focusRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (focusId) {
      setFilter("all");
      requestAnimationFrame(() => {
        focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [focusId]);

  const visible = reservations.filter(
    (r) => (filter === "all" || r.status === filter) && matches(r, query),
  );

  const counts = {
    booked: reservations.filter((r) => r.status === "booked").length,
    pending: reservations.filter((r) => r.status === "pending").length,
    research: reservations.filter((r) => r.status === "research").length,
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>
          Hepsi · {reservations.length}
        </Pill>
        <Pill active={filter === "booked"} onClick={() => setFilter("booked")}>
          ✅ Rezerve · {counts.booked}
        </Pill>
        <Pill active={filter === "pending"} onClick={() => setFilter("pending")}>
          ⏳ Beklemede · {counts.pending}
        </Pill>
        <Pill active={filter === "research"} onClick={() => setFilter("research")}>
          🔍 Araştırılacak · {counts.research}
        </Pill>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-ink-muted dark:text-paper-muted text-center py-8">
          Eşleşen rezervasyon yok.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li
              key={r.id}
              ref={r.id === focusId ? focusRef : undefined}
              className={`card p-4 ${r.id === focusId ? "ring-2 ring-accent" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={r.status} />
                    <span className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted">
                      {TYPE_LABEL[r.type]}
                    </span>
                    {r.platform && (
                      <span className="chip bg-black/5 dark:bg-white/10 text-ink-muted dark:text-paper-muted">
                        {r.platform}
                      </span>
                    )}
                    <DayChips dayIds={r.dayIds} navigate={navigate} />
                  </div>
                  <h3 className="font-medium mt-1.5 leading-snug">{r.title}</h3>
                  <p className="text-sm text-ink-muted dark:text-paper-muted mt-0.5">
                    {[r.city, r.dateRaw, r.nights ? `${r.nights} gece` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {r.priceRaw && <p className="text-sm mt-1">{r.priceRaw}</p>}
                  {r.address && (
                    <p className="text-xs mt-2 leading-snug font-medium">
                      📍 {r.address}
                    </p>
                  )}
                  {r.note && (
                    <p className="text-xs text-ink-muted dark:text-paper-muted mt-2 leading-snug">
                      {r.note}
                    </p>
                  )}
                </div>
              </div>
              {(r.manageLink || r.mapsUrl || r.email) && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5 dark:border-white/10 flex-wrap">
                  {r.manageLink && (
                    <a
                      href={r.manageLink}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-sm bg-ink dark:bg-paper text-paper dark:text-ink px-3 py-1.5 rounded-lg"
                    >
                      Rezervasyonu yönet ↗
                    </a>
                  )}
                  {r.mapsUrl && (
                    <a
                      href={r.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-sm border border-black/10 dark:border-white/10 px-3 py-1.5 rounded-lg"
                    >
                      🗺 Yol tarifi
                    </a>
                  )}
                  {r.email && <ObfuscatedEmail email={r.email} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full border transition ${
        active
          ? "bg-ink text-paper border-ink dark:bg-paper dark:text-ink dark:border-paper"
          : "bg-white dark:bg-white/5 text-ink-muted dark:text-paper-muted border-black/10 dark:border-white/10"
      }`}
    >
      {children}
    </button>
  );
}
