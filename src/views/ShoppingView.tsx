import { useEffect, useRef, useState } from "react";
import {
  useShoppingState,
  toggleShopping,
  setActualPrice,
  setHidden,
  resetOverride,
  addUserItem,
  updateUserItem,
  deleteUserItem,
  mergedItems,
  type MergedItem,
} from "../lib/shoppingState";
import { DayChips } from "../components/DayChip";
import { Sheet } from "../components/Sheet";
import { ShoppingItemForm, type FormValues } from "../components/ShoppingItemForm";

type NavFn = (next: { tab: "days" | "reservations" | "budget" | "shopping"; focusId?: string }) => void;

function matches(s: MergedItem, q: string): boolean {
  if (!q) return true;
  return [s.item, s.where, s.day, s.note]
    .join(" ")
    .toLowerCase()
    .includes(q.toLowerCase());
}

export function ShoppingView({
  focusId,
  navigate,
  query,
}: {
  focusId?: string;
  navigate: NavFn;
  query: string;
}) {
  const state = useShoppingState();
  const all = mergedItems(state);
  const focusRef = useRef<HTMLLIElement>(null);

  const [showHidden, setShowHidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (focusId) {
      requestAnimationFrame(() => {
        focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [focusId]);

  const editing = editingId ? all.find((it) => it.id === editingId) : null;

  const visibleSearch = all.filter((it) => matches(it, query));
  const planVisible = visibleSearch.filter((it) => it.source === "plan" && !it.hidden);
  const planHidden = visibleSearch.filter((it) => it.source === "plan" && it.hidden);
  const userVisible = visibleSearch.filter((it) => it.source === "user");

  const total = all.filter((it) => !it.hidden).length;
  const done = all.filter((it) => !it.hidden && it.checked).length;

  return (
    <div className="mt-3">
      <div className="card px-4 py-3 mb-3 flex items-center justify-between">
        <span className="text-sm">
          {done} / {total} tamamlandı
        </span>
        <div className="w-28 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {planVisible.length > 0 && (
        <Section title="Plandan">
          <ItemList items={planVisible} focusId={focusId} focusRef={focusRef} navigate={navigate} onEdit={setEditingId} />
        </Section>
      )}

      {userVisible.length > 0 && (
        <Section title={`Eklediklerim (${userVisible.length})`}>
          <ItemList items={userVisible} focusId={focusId} focusRef={focusRef} navigate={navigate} onEdit={setEditingId} />
        </Section>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="w-full mt-3 card px-4 py-3 text-sm text-ink-muted dark:text-paper-muted hover:text-accent hover:border-accent/30 transition"
      >
        + Yeni ekle
      </button>

      {planHidden.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowHidden((s) => !s)}
            className="text-xs text-ink-muted dark:text-paper-muted hover:text-accent"
          >
            {showHidden ? "▾" : "▸"} Gizlenenler ({planHidden.length})
          </button>
          {showHidden && (
            <div className="mt-2 opacity-60">
              <ItemList items={planHidden} focusId={focusId} focusRef={focusRef} navigate={navigate} onEdit={setEditingId} />
            </div>
          )}
        </div>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Yeni ürün ekle">
        <ShoppingItemForm
          onSubmit={(v: FormValues) => {
            addUserItem(v);
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
          submitLabel="Ekle"
        />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditingId(null)} title="Ürünü düzenle">
        {editing && (
          <ShoppingItemForm
            initial={{
              item: editing.item,
              where: editing.where,
              priceRaw: editing.priceRaw,
              day: editing.day,
              note: editing.note,
              dayIds: editing.dayIds,
            }}
            onSubmit={(v) => {
              if (editing.source === "user") {
                updateUserItem(editing.id, v);
              }
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] uppercase tracking-wider text-ink-muted dark:text-paper-muted mb-1.5 px-1">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function ItemList({
  items,
  focusId,
  focusRef,
  navigate,
  onEdit,
}: {
  items: MergedItem[];
  focusId?: string;
  focusRef: React.RefObject<HTMLLIElement>;
  navigate: NavFn;
  onEdit: (id: string) => void;
}) {
  return (
    <ul className="card divide-default overflow-hidden">
      {items.map((it) => (
        <Row
          key={it.id}
          item={it}
          isFocus={it.id === focusId}
          focusRef={focusRef}
          navigate={navigate}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}

function Row({
  item: it,
  isFocus,
  focusRef,
  navigate,
  onEdit,
}: {
  item: MergedItem;
  isFocus: boolean;
  focusRef: React.RefObject<HTMLLIElement>;
  navigate: NavFn;
  onEdit: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <li ref={isFocus ? focusRef : undefined} className={isFocus ? "bg-accent/5" : ""}>
      <div className="px-4 py-3 flex items-start gap-3">
        <button
          type="button"
          onClick={() => toggleShopping(it.id)}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
            it.checked
              ? "bg-ink border-ink text-paper dark:bg-paper dark:border-paper dark:text-ink"
              : "border-black/20 dark:border-white/20 bg-white dark:bg-white/5"
          }`}
          aria-label={it.checked ? "Kaldır" : "İşaretle"}
        >
          {it.checked && <span className="text-[11px]">✓</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-snug ${it.checked ? "line-through text-ink-muted dark:text-paper-muted" : ""}`}>
            {it.item}
          </p>
          <p className="text-[11px] text-ink-muted dark:text-paper-muted mt-0.5">
            {[it.where, it.priceRaw && `Plan ${it.priceRaw}`, it.actualPriceRaw && `Gerçek ${it.actualPriceRaw}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <DayChips dayIds={it.dayIds} navigate={navigate} />
            {it.mapsUrl && (
              <a
                href={it.mapsUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[11px] text-ink-muted dark:text-paper-muted hover:text-accent"
                onClick={(e) => e.stopPropagation()}
              >
                🗺 Yol tarifi
              </a>
            )}
            {it.note && (
              <span className="text-[11px] text-ink-muted dark:text-paper-muted">{it.note}</span>
            )}
          </div>
          {it.checked && (
            <input
              type="text"
              inputMode="decimal"
              value={it.actualPriceRaw}
              onChange={(e) => setActualPrice(it.id, e.target.value)}
              placeholder="Gerçek fiyat (¥, ₺...)"
              className="mt-2 w-full text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 placeholder:text-ink-muted/50 dark:placeholder:text-paper-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((m) => !m)}
            className="text-ink-muted dark:text-paper-muted text-lg leading-none px-2 -mx-1"
            aria-label="Menü"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10"
              />
              <div className="absolute right-0 top-7 z-20 card shadow-lg overflow-hidden text-sm min-w-[10rem]">
                <MenuItem
                  onClick={() => {
                    onEdit(it.id);
                    setMenuOpen(false);
                  }}
                >
                  Düzenle
                </MenuItem>
                {it.source === "plan" && (
                  <MenuItem
                    onClick={() => {
                      setHidden(it.id, !it.hidden);
                      setMenuOpen(false);
                    }}
                  >
                    {it.hidden ? "Tekrar göster" : "Gizle"}
                  </MenuItem>
                )}
                {it.source === "plan" && (it.checked || it.actualPriceRaw) && (
                  <MenuItem
                    onClick={() => {
                      resetOverride(it.id);
                      setMenuOpen(false);
                    }}
                  >
                    Sıfırla
                  </MenuItem>
                )}
                {it.source === "user" && (
                  <MenuItem
                    danger
                    onClick={() => {
                      if (confirm(`"${it.item}" silinsin mi?`)) deleteUserItem(it.id);
                      setMenuOpen(false);
                    }}
                  >
                    Sil
                  </MenuItem>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left px-3 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] ${
        danger ? "text-accent" : ""
      }`}
    >
      {children}
    </button>
  );
}
