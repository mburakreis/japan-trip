import { Calendar, Bookmark, ShoppingBag, type LucideIcon } from "lucide-react";
import type { Tab } from "../types";

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "days", label: "Günler", Icon: Calendar },
  { id: "reservations", label: "Rezerve", Icon: Bookmark },
  { id: "shopping", label: "Alışveriş", Icon: ShoppingBag },
];

export function Nav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/90 dark:bg-ink/95 backdrop-blur border-t border-black/5 dark:border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto grid grid-cols-3">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex flex-col items-center gap-1 py-3 text-[11px] transition ${
                active ? "text-accent" : "text-ink-muted dark:text-paper-muted"
              }`}
            >
              <t.Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
