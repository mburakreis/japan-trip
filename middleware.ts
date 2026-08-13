/**
 * Edge middleware: PIN gate for the entire site.
 *
 * Required env vars (set in Vercel dashboard):
 *   APP_PIN_HASH  — SHA-256 hex of the chosen PIN
 *
 * Generate the hash locally:
 *   node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"
 *
 * Auth model: cookie `japan-trip-auth` holds the same hash. Middleware compares.
 */

declare const process: { env: Record<string, string | undefined> };

const BYPASS_PATHS = new Set([
  "/login.html",
  "/api/auth",
  "/icon.svg",
  "/manifest.webmanifest",
  "/robots.txt",
  "/favicon.ico",
  "/sw.js",
]);

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Bypass: login page, auth endpoint, public static assets, Vercel internals
  if (BYPASS_PATHS.has(path) || path.startsWith("/_vercel/") || path.startsWith("/_next/")) {
    return undefined;
  }

  const expected = process.env.APP_PIN_HASH;
  if (!expected) {
    if (process.env.VERCEL_ENV === "production") {
      return new Response("APP_PIN_HASH env var is not set", { status: 500 });
    }
    return undefined;
  }

  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/japan-trip-auth=([a-f0-9]+)/);
  if (m && m[1] === expected) return undefined;

  return Response.redirect(`${url.origin}/login.html`, 302);
}
