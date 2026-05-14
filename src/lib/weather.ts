import { useEffect, useState } from "react";

export type WeatherDay = {
  date: string;       // ISO YYYY-MM-DD
  code: number;       // WMO weather code
  tMax: number;       // °C, rounded
  tMin: number;       // °C, rounded
  rainProb: number;   // 0-100
};

type DayLocation = { date: string; lat: number; lng: number };

// Each day in the trip mapped to a date + coordinate.
// day-0 (Türkiye transit) excluded — no Japan weather to show.
const DAY_LOCATIONS: Record<string, DayLocation | null> = {
  "day-0":  null,
  "day-1":  { date: "2026-05-18", lat: 35.6762, lng: 139.6503 }, // Tokyo
  "day-2":  { date: "2026-05-19", lat: 35.6762, lng: 139.6503 }, // Tokyo
  "day-3":  { date: "2026-05-20", lat: 35.0116, lng: 135.7681 }, // Kyoto
  "day-4":  { date: "2026-05-21", lat: 35.0116, lng: 135.7681 }, // Kyoto
  "day-5":  { date: "2026-05-22", lat: 35.6248, lng: 134.8025 }, // Kinosaki Onsen
  "day-6":  { date: "2026-05-23", lat: 35.9032, lng: 136.1684 }, // Echizen-Takefu
  "day-7":  { date: "2026-05-24", lat: 35.9032, lng: 136.1684 },
  "day-8":  { date: "2026-05-25", lat: 35.9032, lng: 136.1684 },
  "day-9":  { date: "2026-05-26", lat: 35.9032, lng: 136.1684 },
  "day-10": { date: "2026-05-27", lat: 35.6762, lng: 139.6503 }, // Tokyo
  "day-11": { date: "2026-05-28", lat: 35.6762, lng: 139.6503 },
  "day-12": { date: "2026-05-29", lat: 35.6762, lng: 139.6503 },
  "day-13": { date: "2026-05-30", lat: 35.7651, lng: 140.3859 }, // Narita
};

const CACHE_KEY = "weather-cache-v1";
const TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

type Cache = { fetchedAt: number; days: Record<string, WeatherDay> };

let cache: Cache | null = null;
let inFlight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function loadCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Cache;
  } catch {
    return null;
  }
}

function saveCache(c: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // ignore quota
  }
}

async function fetchOne(
  lat: number,
  lng: number,
  start: string,
  end: string,
): Promise<Record<string, WeatherDay>> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia/Tokyo&start_date=${start}&end_date=${end}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather fetch failed");
  const j = await res.json();
  const out: Record<string, WeatherDay> = {};
  const t: string[] = j.daily.time;
  const codes: number[] = j.daily.weather_code;
  const maxes: number[] = j.daily.temperature_2m_max;
  const mins: number[] = j.daily.temperature_2m_min;
  const probs: (number | null)[] = j.daily.precipitation_probability_max ?? [];
  for (let i = 0; i < t.length; i++) {
    out[t[i]] = {
      date: t[i],
      code: codes[i],
      tMax: Math.round(maxes[i]),
      tMin: Math.round(mins[i]),
      rainProb: probs[i] ?? 0,
    };
  }
  return out;
}

async function fetchAll(): Promise<Record<string, WeatherDay>> {
  // Group dayIds by (lat,lng) to minimize requests.
  const groups = new Map<string, { lat: number; lng: number; dayIds: string[] }>();
  for (const [dayId, loc] of Object.entries(DAY_LOCATIONS)) {
    if (!loc) continue;
    const key = `${loc.lat},${loc.lng}`;
    if (!groups.has(key)) groups.set(key, { lat: loc.lat, lng: loc.lng, dayIds: [] });
    groups.get(key)!.dayIds.push(dayId);
  }
  const dates = Object.values(DAY_LOCATIONS)
    .filter((l): l is DayLocation => l != null)
    .map((l) => l.date)
    .sort();
  if (dates.length === 0) return {};
  const start = dates[0];
  const end = dates[dates.length - 1];

  const results = await Promise.all(
    Array.from(groups.values()).map((g) =>
      fetchOne(g.lat, g.lng, start, end).then((weather) => ({ g, weather })),
    ),
  );

  const out: Record<string, WeatherDay> = {};
  for (const { g, weather } of results) {
    for (const dayId of g.dayIds) {
      const loc = DAY_LOCATIONS[dayId];
      if (!loc) continue;
      const w = weather[loc.date];
      if (w) out[dayId] = w;
    }
  }
  return out;
}

function notify() {
  for (const fn of subscribers) fn();
}

function ensureFresh() {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return;
  if (inFlight) return;
  inFlight = fetchAll()
    .then((days) => {
      cache = { fetchedAt: Date.now(), days };
      saveCache(cache);
      notify();
    })
    .catch(() => {
      // silent fail: cards just don't show the chip
    })
    .finally(() => {
      inFlight = null;
    });
}

export function useWeather(dayId: string): WeatherDay | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (!cache) cache = loadCache();
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    ensureFresh();
    return () => {
      subscribers.delete(fn);
    };
  }, []);
  return cache?.days[dayId] ?? null;
}

export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}
