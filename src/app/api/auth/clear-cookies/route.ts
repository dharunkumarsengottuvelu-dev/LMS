import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/clear-cookies
 *
 * Migration endpoint for users who are stuck with oversized cookie headers
 * from the previous broken implementation (494 REQUEST_HEADER_TOO_LARGE).
 *
 * Removes accumulated stale Supabase session cookies, then redirects to /login.
 * Does NOT remove code-verifier cookies — those are short-lived and self-expiring.
 *
 * Safe to call at any time. Does not affect non-auth cookies.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const origin = new URL(request.url).origin;

  const response = NextResponse.redirect(`${origin}/login`);

  for (const c of all) {
    const isStaleAuthCookie =
      // Chunked session tokens
      c.name.includes("-auth-token") ||
      // Provider token (large, not needed)
      c.name.includes("-provider-token") ||
      // Refresh token if stored separately
      c.name.includes("-refresh-token");

    // Intentionally NOT removing code-verifier — it's short-lived and harmless
    // Intentionally NOT removing non-auth cookies

    if (isStaleAuthCookie) {
      try { cookieStore.delete(c.name); } catch { /* ignore */ }
      response.cookies.set(c.name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }

  return response;
}
