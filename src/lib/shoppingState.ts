import { useEffect, useState } from "react";
import { shopping } from "./derive";

const STORAGE_KEY = "japan-trip:shopping:v1";
type Map = Record<string, boolean>;

const listeners = new Set<(m: Map) => void>();
let current: Map = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return Object.fromEntries(shopping.map((i) => [i.id, i.checked]));
})();

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

export function toggleShopping(id: string) {
  current = { ...current, [id]: !current[id] };
  persist();
  emit();
}

export function useShoppingState(): Map {
  const [value, setValue] = useState<Map>(current);
  useEffect(() => {
    const fn = (m: Map) => setValue(m);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return value;
}

export function shoppingProgress(): { done: number; total: number } {
  const total = shopping.length;
  const done = shopping.filter((s) => current[s.id]).length;
  return { done, total };
}
