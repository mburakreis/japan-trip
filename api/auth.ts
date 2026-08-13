/**
 * POST /api/auth — verify PIN, set auth cookie.
 *
 * Body: { "pin": "1234" }
 * Returns 200 + Set-Cookie on match, 401 on mismatch.
 */

export const config = { runtime: "edge" };

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const expected = process.env.APP_PIN_HASH;
  if (!expected) {
    return new Response("APP_PIN_HASH not configured", { status: 500 });
  }

  let body: { pin?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (!pin) {
    return new Response(JSON.stringify({ ok: false, reason: "missing" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hex = await sha256Hex(pin);
  if (hex !== expected) {
    // Tiny constant delay to soften brute-force
    await new Promise((r) => setTimeout(r, 400));
    return new Response(JSON.stringify({ ok: false, reason: "mismatch" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const oneYear = 365 * 24 * 3600;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `japan-trip-auth=${hex}; HttpOnly; Secure; SameSite=Lax; Max-Age=${oneYear}; Path=/`,
    },
  });
}
