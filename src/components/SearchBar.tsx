export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-paper/85 dark:bg-ink/85 backdrop-blur">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-paper-muted">
          🔍
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ara: ramen, Akihabara, Mizuno..."
          className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-ink dark:text-paper placeholder:text-ink-muted/60 dark:placeholder:text-paper-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted dark:text-paper-muted px-2 py-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
