import { useState } from "react";
import data from "../data/reservations.json";
import type { Reservation, ReservationStatus } from "../types";
import { ObfuscatedEmail } from "../components/ObfuscatedEmail";

const reservations = data as Reservation[];

const STATUS_LABEL: Record<ReservationStatus, string> = {
  booked: "Rezerve",
  pending: "Beklemede",
  research: "Araştırılacak",
};

const STATUS_BG: Record<ReservationStatus, string> = {
  booked: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  research: "bg-zinc-100 text-zinc-700",
};

export function ReservationsView() {
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");
  const filtered = reservations.filter((r) => filter === "all" || r.status === filter);
  const counts = {
    booked: reservations.filter((r) => r.status === "booked").length,
    pending: reservations.filter((r) => r.status === "pending").length,
    research: reservations.filter((r) => r.status === "research").length,
  };
  return (
    <div className="mt-2">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          Hepsi · {reservations.length}
        </FilterPill>
        <FilterPill active={filter === "booked"} onClick={() => setFilter("booked")}>
          ✅ {STATUS_LABEL.booked} · {counts.booked}
        </FilterPill>
        <FilterPill active={filter === "pending"} onClick={() => setFilter("pending")}>
          ⏳ {STATUS_LABEL.pending} · {counts.pending}
        </FilterPill>
        <FilterPill active={filter === "research"} onClick={() => setFilter("research")}>
          🔍 {STATUS_LABEL.research} · {counts.research}
        </FilterPill>
      </div>
      <ul className="space-y-3">
        {filtered.map((r) => (
          <li key={r.id} className="bg-white rounded-xl border border-black/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_BG[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.platform && (
                    <span className="text-[10px] uppercase tracking-wider text-ink-muted">
                      {r.platform}
                    </span>
                  )}
                </div>
                <h3 className="font-medium mt-1.5 leading-snug">{r.title}</h3>
                <p className="text-sm text-ink-muted mt-0.5">
                  {r.city} · {r.dateRaw}
                  {r.nights ? ` · ${r.nights} gece` : ""}
                </p>
                {r.priceRaw && <p className="text-sm mt-1">{r.priceRaw}</p>}
                {r.note && <p className="text-xs text-ink-muted mt-2 leading-snug">{r.note}</p>}
              </div>
            </div>
            {(r.manageLink || r.email) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
                {r.manageLink && (
                  <a
                    href={r.manageLink}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm bg-ink text-white px-3 py-1.5 rounded-lg"
                  >
                    Rezervasyonu yönet ↗
                  </a>
                )}
                {r.email && <ObfuscatedEmail email={r.email} />}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterPill({
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
      className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full border ${
        active ? "bg-ink text-white border-ink" : "bg-white text-ink-muted border-black/10"
      }`}
    >
      {children}
    </button>
  );
}
