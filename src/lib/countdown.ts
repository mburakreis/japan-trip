import type { Trip } from "../types";

export type TripStatus =
  | { kind: "before"; daysUntil: number }
  | { kind: "active"; dayNumber: number; totalDays: number }
  | { kind: "after"; daysSince: number };

export function tripStatus(trip: Trip, now: Date = new Date()): TripStatus {
  const start = new Date(trip.startDate + "T00:00:00");
  const end = new Date(trip.endDate + "T23:59:59");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 86400000;

  if (today < start) {
    return { kind: "before", daysUntil: Math.ceil((start.getTime() - today.getTime()) / dayMs) };
  }
  if (today > end) {
    return { kind: "after", daysSince: Math.ceil((today.getTime() - end.getTime()) / dayMs) };
  }
  const dayNumber = Math.floor((today.getTime() - start.getTime()) / dayMs) + 1;
  const totalDays =
    Math.ceil((new Date(trip.endDate).getTime() - start.getTime()) / dayMs) + 1;
  return { kind: "active", dayNumber, totalDays };
}

export function todayDayId(trip: Trip, now: Date = new Date()): string | null {
  const s = tripStatus(trip, now);
  return s.kind === "active" ? `day-${s.dayNumber}` : null;
}
