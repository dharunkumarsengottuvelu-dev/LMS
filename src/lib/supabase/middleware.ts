import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

/**
 * Calculates the total byte size of all cookies on the request.
 * Vercel / Nginx hard-limit: ~8 KB total headers. We target < 6 KB for cookies.
 */
function getTotalCookieSize(request: NextRequest): number {
  return request.cookies.getAll().reduce((sum, c) => sum + c.name.length + c.value.length + 3, 0);
}

/**
 * Removes stale Supabase auth cookies from both the request and response
 * to prevent 494 REQUEST_HEADER_TOO_LARGE errors.
 */
function cleanStaleAuthCookies(
  request: NextRequest,
  response: NextResponse
): void {
  const allCookies = request.cookies.getAll();
  const cookieNames = new Set(allCookies.map((c) => c.name));
  const isCallback = request.nextUrl.pathname.startsWith("/api/auth/callback");
  const hasCode = request.nextUrl.searchParams.has("code");

  for (const cookie of allCookies) {
    const { name } = cookie;
    let shouldDelete = false;

    // Always remove PKCE verifiers except during the OAuth callback itself
    if (name.includes("-code-verifier") && !isCallback && !hasCode) {
      shouldDelete = true;
    }

    // Remove unchunked token when chunked version (.0) exists — they conflict
    if (name.endsWith("-auth-token") && cookieNames.has(`${name}.0`)) {
      shouldDelete = true;
    }

    // Remove provider token chunks (large, rarely needed client-side)
    if (name.includes("-provider-token")) {
      shouldDelete = true;
    }

    if (shouldDelete) {
      response.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
    }
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          })
        );
      },
    },
  });

  // Refresh session — required on every request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always clean stale cookies to keep header size under 8 KB
  cleanStaleAuthCookies(request, supabaseResponse);

  // Emergency: if cookies are STILL too large (> 6 KB), nuke all auth cookies
  if (getTotalCookieSize(request) > 6144) {
    console.warn("[Middleware] Cookie header too large — force-purging all auth cookies");
    request.cookies.getAll().forEach((c) => {
      if (
        c.name.startsWith("sb-") ||
        c.name.includes("-auth-token") ||
        c.name.includes("-code-verifier")
      ) {
        supabaseResponse.cookies.set(c.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
    });
  }

  return { supabase, supabaseResponse, user };
}
