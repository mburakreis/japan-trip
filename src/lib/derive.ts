import daysData from "../data/days.json";
import reservationsData from "../data/reservations.json";
import shoppingData from "../data/shopping.json";
import type { Day, Reservation, ShoppingItem } from "../types";

export const days = daysData as Day[];
export const reservations = reservationsData as Reservation[];
export const shopping = shoppingData as ShoppingItem[];

export function dayById(id: string): Day | undefined {
  return days.find((d) => d.id === id);
}

export function reservationsForDay(dayId: string): Reservation[] {
  return reservations.filter((r) => r.dayIds.includes(dayId));
}

export function shoppingForDay(dayId: string): ShoppingItem[] {
  return shopping.filter((s) => s.dayIds.includes(dayId));
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
