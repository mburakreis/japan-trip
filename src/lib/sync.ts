/**
 * Online sync for shopping state — talks to /api/shopping if available,
 * silently no-ops on plain GitHub Pages (no API).
 */

const API_URL = "/api/shopping";

let cachedAvailable: boolean | null = null;

async function isApiAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const r = await fetch(API_URL, { method: "GET", credentials: "same-origin" });
    cachedAvailable = r.status < 500 && r.headers.get("content-type")?.includes("json") === true;
  } catch {
    cachedAvailable = false;
  }
  return cachedAvailable;
}

export async function pullState<T>(): Promise<T | null> {
  if (!(await isApiAvailable())) return null;
  try {
    const r = await fetch(API_URL, { credentials: "same-origin" });
    if (!r.ok) return null;
    const { ok, data } = (await r.json()) as { ok: boolean; data: T | null };
    return ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function pushState<T>(state: T): Promise<boolean> {
  if (!(await isApiAvailable())) return false;
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function isSyncEnabled(): boolean {
  return cachedAvailable === true;
}
