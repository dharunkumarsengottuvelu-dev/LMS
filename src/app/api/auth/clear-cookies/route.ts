import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppOrigin } from "@/config/site";

/**
 * GET /api/auth/clear-cookies
 *
 * Emergency recovery endpoint to completely purge all authentication cookies
 * from the browser session using standard host-only expiration, then redirect to /login.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const origin = getAppOrigin(request);
  const requestUrl = new URL(request.url);
  const host = requestUrl.hostname;
  const isDomainWithDots = host.includes(".");

  const response = NextResponse.redirect(`${origin}/login`);
  const paths = ["/", "/api/auth/callback", "/student", "/admin", "/trainer", "/institution", "/api"];
  const domains: (string | undefined)[] = isDomainWithDots ? [undefined, host, `.${host}`] : [undefined];

  for (const c of all) {
    const isAuthCookie =
      c.name.includes("-auth-token") ||
      c.name.includes("-provider-token") ||
      c.name.includes("-refresh-token") ||
      c.name.startsWith("sb-") ||
      c.name.includes("g_state") ||
      c.name.includes("oauth_state") ||
      c.name.startsWith("falcon_");

    if (isAuthCookie) {
      try {
        cookieStore.delete(c.name);
      } catch { /* ignore */ }

      for (const p of paths) {
        for (const d of domains) {
          response.cookies.set(c.name, "", {
            path: p,
            domain: d,
            maxAge: 0,
            expires: new Date(0),
          });
        }
      }
    }
  }

  return response;
}
