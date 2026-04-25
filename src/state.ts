import { useEffect, useState } from "react";
import type { Tab } from "./types";

type AppRoute = { tab: Tab; focusId?: string };

function parseHash(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [tab, focusId] = raw.split(":");
  const t: Tab = tab === "reservations" || tab === "shopping" ? tab : "days";
  return { tab: t, focusId: focusId || undefined };
}

function buildHash({ tab, focusId }: AppRoute): string {
  return `#/${tab}${focusId ? `:${focusId}` : ""}`;
}

export function useRoute(): [AppRoute, (next: AppRoute) => void] {
  const [route, setRoute] = useState<AppRoute>(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (next: AppRoute) => {
    const target = buildHash(next);
    if (window.location.hash !== target) window.location.hash = target;
    setRoute(next);
  };

  return [route, navigate];
}

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue];
}

const THEME_KEY = "japan-trip:theme:v1";
type Theme = "light" | "dark";

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw === "dark" || raw === "light") return raw;
    } catch {
      /* ignore */
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}
