import daysData from "../data/days.json";
import reservationsData from "../data/reservations.json";
import shoppingData from "../data/shopping.json";
import budgetData from "../data/budget.json";
import type { Day, Reservation, ShoppingItem, Budget, BudgetItem } from "../types";

export const days = daysData as Day[];
export const reservations = reservationsData as Reservation[];
export const shopping = shoppingData as ShoppingItem[];
export const budget = budgetData as Budget;

export function dayById(id: string): Day | undefined {
  return days.find((d) => d.id === id);
}

export function reservationsForDay(dayId: string): Reservation[] {
  return reservations.filter((r) => r.dayIds.includes(dayId));
}

export function shoppingForDay(dayId: string): ShoppingItem[] {
  return shopping.filter((s) => s.dayIds.includes(dayId));
}

export function budgetForDay(dayId: string): BudgetItem[] {
  const items: BudgetItem[] = [];
  for (const section of budget.sections) {
    for (const item of section.items) {
      if (item.dayIds.includes(dayId)) items.push(item);
    }
  }
  return items;
}

export type BudgetTotal = { min: number; max: number; currency: string };

export function budgetTotalsByCurrency(): BudgetTotal[] {
  const totals = new Map<string, { min: number; max: number }>();
  for (const section of budget.sections) {
    for (const item of section.items) {
      if (!item.currency) continue;
      const t = totals.get(item.currency) ?? { min: 0, max: 0 };
      t.min += item.min || 0;
      t.max += item.max || 0;
      totals.set(item.currency, t);
    }
  }
  return [...totals.entries()].map(([currency, t]) => ({ ...t, currency }));
}

export function inferCity(d: Day): string {
  const m = d.title.match(
    /(Tokyo|Kyoto|Kinosaki|Osaka|Seul|Incheon|Narita|Shinjuku|Ginza|Akihabara|Namba)/,
  );
  if (m) return m[0];
  return d.title.split(/[—-]/)[0].trim();
}

export function shortDate(dateRaw: string): string {
  return dateRaw.split(" ").slice(0, 2).join(" ");
}
