import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

/**
 * Removes duplicate and stale cookies from the outgoing response.
 * Uses strictly host-only cookies (no domain attribute) to prevent
 * multi-domain cookie explosion and header bloat.
 *
 * Targets:
 * - Unchunked session token when chunked form (.0) already exists
 * - Provider tokens (Google raw access/refresh tokens — ~2-3 KB, not needed for app auth)
 * - Legacy branding cookies (falcon_*, g_state)
 * - Stale OAuth state cookies
 */
function sanitizeResponseCookies(request: NextRequest, response: NextResponse): void {
  const allCookies = request.cookies.getAll();
  const cookieNames = new Set(allCookies.map((c) => c.name));

  for (const cookie of allCookies) {
    const { name } = cookie;
    let shouldExpire = false;

    // 1. Remove unchunked token if chunked form (.0) exists
    if (name.endsWith("-auth-token") && cookieNames.has(`${name}.0`)) {
      shouldExpire = true;
    }

    // 2. Remove provider-tokens (not needed for session validation, saves ~2-3KB)
    if (name.includes("-provider-token") || name.includes("-provider-refresh-token")) {
      shouldExpire = true;
    }

    // 3. Remove legacy brand cookies or old temporary state
    if (
      name.startsWith("falcon_") ||
      name.includes("falcon") ||
      name.startsWith("g_state") ||
      name.includes("oauth_state")
    ) {
      shouldExpire = true;
    }

    if (shouldExpire) {
      // Host-only deletion — never specify domain
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
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
      // Host-only: NEVER specify domain — prevents duplicate domain-scoped cookie writes
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
            // Host-only: NEVER specify domain
            domain: undefined,
          })
        );
      },
    },
  });

  // Validate user session — this is the only server round-trip per request
  // getUser() is preferred over getSession() as it re-validates the JWT with Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Apply cookie hygiene: expire stale/duplicate/provider cookies (host-only, never causes redirect)
  sanitizeResponseCookies(request, supabaseResponse);

  return { supabase, supabaseResponse, user };
}
