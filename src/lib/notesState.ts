import { useEffect, useState } from "react";

const STORAGE_KEY = "japan-trip:notes:v1";
type Notes = Record<string, string>;

const listeners = new Set<(n: Notes) => void>();
let current: Notes = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
})();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

export function setNote(dayId: string, text: string) {
  current = { ...current, [dayId]: text };
  persist();
  for (const fn of listeners) fn(current);
}

export function useNote(dayId: string): [string, (text: string) => void] {
  const [value, setValue] = useState<string>(current[dayId] ?? "");
  useEffect(() => {
    const fn = (n: Notes) => setValue(n[dayId] ?? "");
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [dayId]);
  return [value, (t) => setNote(dayId, t)];
}
