import { useEffect } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full sm:max-w-md bg-paper dark:bg-ink rounded-t-2xl sm:rounded-2xl border border-black/5 dark:border-white/10 shadow-xl max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <header className="sticky top-0 bg-paper dark:bg-ink px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted dark:text-paper-muted text-xl leading-none p-1 -m-1"
            aria-label="Kapat"
          >
            ×
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
