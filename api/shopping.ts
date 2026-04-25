/**
 * GET  /api/shopping  — read full user shopping state from KV
 * POST /api/shopping  — overwrite full user shopping state in KV
 *
 * Auth: protected by middleware (cookie checked at edge before this runs).
 * Storage: Vercel KV. Set up with `vercel kv create` and bind to project.
 *   Required env vars (auto-injected by KV binding):
 *     KV_REST_API_URL, KV_REST_API_TOKEN
 *
 * State shape mirrors src/lib/shoppingState.ts State type.
 */

export const config = { runtime: "edge" };

const KEY = "user-shopping:v1";

async function kvGet<T>(): Promise<T | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const r = await fetch(`${url}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const { result } = (await r.json()) as { result: string | null };
  if (!result) return null;
  try {
    return JSON.parse(result) as T;
  } catch {
    return null;
  }
}

async function kvSet(value: unknown): Promise<boolean> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  const r = await fetch(`${url}/set/${KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  return r.ok;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const data = await kvGet<unknown>();
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (request.method === "POST") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    const ok = await kvSet(body);
    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("Method not allowed", { status: 405 });
}
