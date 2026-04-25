import { useEffect, useState } from "react";
import { days, inferCity } from "../lib/derive";
import type { Day } from "../types";
import { DayCard } from "../components/DayCard";

type NavFn = (next: { tab: "days" | "reservations" | "budget" | "shopping"; focusId?: string }) => void;

function dayMatches(d: Day, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  const haystack = [
    d.title,
    d.dateRaw,
    inferCity(d),
    ...d.fixed.flatMap((a) => [a.place, a.action, a.note]),
    ...d.main.flatMap((a) => [a.place, a.action, a.note]),
    ...d.meals.flatMap((a) => [a.place, a.action, a.note]),
    ...d.alternatives.flatMap((a) => [a.place, a.action, a.note]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(lower);
}

export function DaysView({
  focusId,
  navigate,
  query,
}: {
  focusId?: string;
  navigate: NavFn;
  query: string;
}) {
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);

  useEffect(() => {
    if (focusId) setOpenId(focusId);
  }, [focusId]);

  const filtered = days.filter((d) => dayMatches(d, query));

  return (
    <ol className="space-y-3 mt-3">
      {filtered.length === 0 ? (
        <li className="text-sm text-ink-muted dark:text-paper-muted text-center py-8">
          "{query}" için sonuç yok.
        </li>
      ) : (
        filtered.map((d) => (
          <DayCard
            key={d.id}
            day={d}
            open={openId === d.id}
            onToggle={() => setOpenId(openId === d.id ? null : d.id)}
            navigate={navigate}
          />
        ))
      )}
    </ol>
  );
}
