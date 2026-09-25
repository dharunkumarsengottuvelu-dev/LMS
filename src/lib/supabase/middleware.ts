import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

/**
 * Removes duplicate and stale cookies from the outgoing response.
 * Uses strictly host-only cookies (no domain attribute) to prevent multi-domain cookie explosion.
 */
function sanitizeRequestCookies(request: NextRequest, response: NextResponse): void {
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
      // Host-only deletion
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
      // Host-only: never specify domain to avoid duplicate domain-scoped cookies
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

  // Refresh user session on application routes
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Apply cookie hygiene on outgoing response (host-only, never causes redirect)
  sanitizeRequestCookies(request, supabaseResponse);

  return { supabase, supabaseResponse, user };
}
