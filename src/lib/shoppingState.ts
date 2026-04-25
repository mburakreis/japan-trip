import { useEffect, useState } from "react";
import { shopping } from "./derive";
import type { ShoppingItem } from "../types";

export type ShoppingItemOverride = {
  checked: boolean;
  actualPriceRaw: string;
  customNote: string;
};

export type UserShoppingItem = {
  id: string;
  item: string;
  where: string;
  priceRaw: string;
  day: string;
  note: string;
  dayIds: string[];
  actualPriceRaw: string;
  checked: boolean;
  mapsUrl?: string;
};

type State = {
  overrides: Record<string, ShoppingItemOverride>;
  added: UserShoppingItem[];
  hidden: string[];
};

const STORAGE_KEY = "japan-trip:shopping:v2";
const LEGACY_KEY = "japan-trip:shopping:v1";

function defaultOverride(item: ShoppingItem): ShoppingItemOverride {
  return { checked: !!item.checked, actualPriceRaw: "", customNote: "" };
}

function loadInitial(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateMissingDefaults(JSON.parse(raw) as State);
  } catch {
    /* ignore */
  }
  // Migrate v1 if present
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as Record<string, boolean>;
      const overrides: Record<string, ShoppingItemOverride> = {};
      for (const [id, checked] of Object.entries(old)) {
        overrides[id] = { checked, actualPriceRaw: "", customNote: "" };
      }
      const state: State = { overrides, added: [], hidden: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.removeItem(LEGACY_KEY);
      return state;
    }
  } catch {
    /* ignore */
  }
  // Fresh
  const overrides: Record<string, ShoppingItemOverride> = {};
  for (const item of shopping) overrides[item.id] = defaultOverride(item);
  return { overrides, added: [], hidden: [] };
}

function migrateMissingDefaults(s: State): State {
  for (const item of shopping) {
    if (!s.overrides[item.id]) s.overrides[item.id] = defaultOverride(item);
  }
  return s;
}

const listeners = new Set<(s: State) => void>();
let current: State = loadInitial();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

function emit() {
  for (const fn of listeners) fn(current);
}

function update(mutator: (s: State) => State) {
  current = mutator(current);
  persist();
  emit();
}

export function useShoppingState(): State {
  const [s, set] = useState<State>(current);
  useEffect(() => {
    const fn = (next: State) => set(next);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return s;
}

export function toggleShopping(id: string) {
  update((s) => {
    const o = s.overrides[id] ?? { checked: false, actualPriceRaw: "", customNote: "" };
    if (id.startsWith("user-")) {
      const added = s.added.map((it) =>
        it.id === id ? { ...it, checked: !it.checked } : it,
      );
      return { ...s, added };
    }
    return { ...s, overrides: { ...s.overrides, [id]: { ...o, checked: !o.checked } } };
  });
}

export function setActualPrice(id: string, value: string) {
  update((s) => {
    if (id.startsWith("user-")) {
      const added = s.added.map((it) =>
        it.id === id ? { ...it, actualPriceRaw: value } : it,
      );
      return { ...s, added };
    }
    const o = s.overrides[id] ?? { checked: false, actualPriceRaw: "", customNote: "" };
    return { ...s, overrides: { ...s.overrides, [id]: { ...o, actualPriceRaw: value } } };
  });
}

export function setHidden(id: string, hidden: boolean) {
  update((s) => ({
    ...s,
    hidden: hidden ? [...new Set([...s.hidden, id])] : s.hidden.filter((x) => x !== id),
  }));
}

export function resetOverride(id: string) {
  update((s) => {
    const planItem = shopping.find((p) => p.id === id);
    if (!planItem) return s;
    return {
      ...s,
      overrides: { ...s.overrides, [id]: defaultOverride(planItem) },
    };
  });
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `user-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function addUserItem(input: Omit<UserShoppingItem, "id" | "checked" | "actualPriceRaw">): UserShoppingItem {
  const item: UserShoppingItem = { ...input, id: uid(), checked: false, actualPriceRaw: "" };
  update((s) => ({ ...s, added: [...s.added, item] }));
  return item;
}

export function updateUserItem(id: string, patch: Partial<UserShoppingItem>) {
  update((s) => ({
    ...s,
    added: s.added.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  }));
}

export function deleteUserItem(id: string) {
  update((s) => ({ ...s, added: s.added.filter((it) => it.id !== id) }));
}

export type MergedItem = {
  source: "plan" | "user";
  id: string;
  item: string;
  where: string;
  priceRaw: string;
  day: string;
  note: string;
  dayIds: string[];
  checked: boolean;
  actualPriceRaw: string;
  hidden: boolean;
  mapsUrl?: string;
};

export function mergedItems(state: State): MergedItem[] {
  const plan: MergedItem[] = shopping.map((p) => {
    const o = state.overrides[p.id] ?? defaultOverride(p);
    return {
      source: "plan",
      id: p.id,
      item: p.item,
      where: p.where,
      priceRaw: p.priceRaw,
      day: p.day,
      note: o.customNote || p.note,
      dayIds: p.dayIds,
      checked: o.checked,
      actualPriceRaw: o.actualPriceRaw,
      hidden: state.hidden.includes(p.id),
      mapsUrl: p.mapsUrl,
    };
  });
  const user: MergedItem[] = state.added.map((u) => ({
    source: "user",
    id: u.id,
    item: u.item,
    where: u.where,
    priceRaw: u.priceRaw,
    day: u.day,
    note: u.note,
    dayIds: u.dayIds,
    checked: u.checked,
    actualPriceRaw: u.actualPriceRaw,
    hidden: false,
    mapsUrl: u.mapsUrl,
  }));
  return [...plan, ...user];
}
