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
 * No salt because PIN itself is the only secret; user picks 4-6 digits.
 */

export const config = {
  matcher: "/((?!api/auth|login.html|_vercel|icon\\.svg|manifest\\.webmanifest|robots\\.txt).*)",
};

export default function middleware(request: Request) {
  const expected = process.env.APP_PIN_HASH;
  if (!expected) {
    // No PIN configured → fail open in dev, fail closed in prod
    if (process.env.VERCEL_ENV === "production") {
      return new Response("APP_PIN_HASH env var is not set", { status: 500 });
    }
    return undefined;
  }
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/japan-trip-auth=([a-f0-9]+)/);
  if (m && m[1] === expected) return undefined; // pass through
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/login.html`, 302);
}
