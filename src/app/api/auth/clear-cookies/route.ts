import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppOrigin } from "@/config/site";

/**
 * GET /api/auth/clear-cookies
 *
 * Migration & recovery endpoint for browsers holding stale/bloated cookies
 * from prior sessions (protecting against 494 REQUEST_HEADER_TOO_LARGE).
 *
 * Removes duplicate chunks, provider tokens, and stale session tokens,
 * expiring them at both host-level and domain-level, then redirects to /login.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const origin = getAppOrigin(request);
  const hostname = new URL(request.url).hostname;

  const response = NextResponse.redirect(`${origin}/login`);

  for (const c of all) {
    const isAuthCookie =
      c.name.includes("-auth-token") ||
      c.name.includes("-provider-token") ||
      c.name.includes("-refresh-token") ||
      c.name.startsWith("sb-") ||
      c.name.includes("g_state") ||
      c.name.includes("oauth_state");

    if (isAuthCookie) {
      try {
        cookieStore.delete(c.name);
      } catch { /* ignore */ }

      // Host-only cookie expiration
      response.cookies.set(c.name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });

      // Domain-scoped expiration (to clean any legacy domain cookies)
      if (hostname && !hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
        response.cookies.set(c.name, "", {
          path: "/",
          domain: hostname,
          maxAge: 0,
          expires: new Date(0),
        });
      }
    }
  }

  return response;
}
