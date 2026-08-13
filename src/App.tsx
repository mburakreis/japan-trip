import { useState } from "react";
import { Nav } from "./components/Nav";
import { Header } from "./components/Header";
import { SearchBar } from "./components/SearchBar";
import { DaysView } from "./views/DaysView";
import { ReservationsView } from "./views/ReservationsView";
import { ShoppingView } from "./views/ShoppingView";
import { OverviewView } from "./views/OverviewView";
import { useRoute, useTheme } from "./state";

export function App() {
  const [route, navigate] = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [query, setQuery] = useState("");
  const isOverview = route.tab === "overview";

  return (
    <div className="min-h-screen pb-24 bg-paper text-ink dark:bg-ink dark:text-paper transition-colors">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className={isOverview ? "px-4" : "max-w-3xl mx-auto px-4"}>
        {!isOverview && <SearchBar value={query} onChange={setQuery} />}
        {route.tab === "days" && (
          <DaysView focusId={route.focusId} navigate={navigate} query={query} />
        )}
        {route.tab === "reservations" && (
          <ReservationsView focusId={route.focusId} navigate={navigate} query={query} />
        )}
        {route.tab === "shopping" && (
          <ShoppingView focusId={route.focusId} navigate={navigate} query={query} />
        )}
        {route.tab === "overview" && <OverviewView />}
      </main>
      <Nav tab={route.tab} onChange={(tab) => navigate({ tab })} />
    </div>
  );
}
