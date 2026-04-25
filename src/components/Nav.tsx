export type Tab = "days" | "reservations" | "budget" | "shopping";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "days", label: "Günler", icon: "📅" },
  { id: "reservations", label: "Rezerve", icon: "🔖" },
  { id: "budget", label: "Bütçe", icon: "💴" },
  { id: "shopping", label: "Alışveriş", icon: "🛍️" },
];

export function Nav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto grid grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center gap-0.5 py-3 text-xs transition ${
              tab === t.id ? "text-accent" : "text-ink-muted"
            }`}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
