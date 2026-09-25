import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/clear-cookies
 * Emergency endpoint — wipes all Supabase auth cookies and redirects to /login.
 * Fixes 494 REQUEST_HEADER_TOO_LARGE for users with bloated cookie jars.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  const response = NextResponse.redirect(
    new URL("/login", request.url).toString()
  );

  for (const c of all) {
    const isAuthCookie =
      c.name.startsWith("sb-") ||
      c.name.includes("-auth-token") ||
      c.name.includes("-code-verifier") ||
      c.name.includes("-provider-token") ||
      c.name.includes("-refresh-token");

    if (isAuthCookie) {
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
