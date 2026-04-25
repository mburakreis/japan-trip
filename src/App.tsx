import { useEffect, useState } from "react";
import { Nav, type Tab } from "./components/Nav";
import { DaysView } from "./views/DaysView";
import { ReservationsView } from "./views/ReservationsView";
import { BudgetView } from "./views/BudgetView";
import { ShoppingView } from "./views/ShoppingView";
import trip from "./data/trip.json";

function readHashTab(): Tab {
  const h = window.location.hash.replace("#/", "").replace("#", "");
  if (h === "reservations" || h === "budget" || h === "shopping") return h;
  return "days";
}

export function App() {
  const [tab, setTab] = useState<Tab>(readHashTab());

  useEffect(() => {
    const handler = () => setTab(readHashTab());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    const target = `#/${tab}`;
    if (window.location.hash !== target) window.location.hash = target;
  }, [tab]);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-3 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight">{trip.title}</h1>
        <p className="text-sm text-ink-muted mt-0.5">{trip.subtitle}</p>
        <p className="text-xs text-ink-muted mt-1">
          {trip.startDate} → {trip.endDate} · ¥1 ≈ ₺{trip.fx.rate}
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-4">
        {tab === "days" && <DaysView />}
        {tab === "reservations" && <ReservationsView />}
        {tab === "budget" && <BudgetView />}
        {tab === "shopping" && <ShoppingView />}
      </main>

      <Nav tab={tab} onChange={setTab} />
    </div>
  );
}
