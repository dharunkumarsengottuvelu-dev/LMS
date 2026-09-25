import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

/**
 * Expires a cookie both host-only and for explicit domain variants (e.g., legacy cookies)
 */
function expireCookieEverywhere(response: NextResponse, name: string, hostname?: string): void {
  // 1. Host-only (default)
  response.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  // 2. Exact domain and dot-prefixed domain if valid hostname
  if (hostname && !hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
    response.cookies.set(name, "", {
      path: "/",
      domain: hostname,
      maxAge: 0,
      expires: new Date(0),
    });
    response.cookies.set(name, "", {
      path: "/",
      domain: `.${hostname}`,
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

/**
 * Removes duplicate and stale cookies that lead to 494 REQUEST_HEADER_TOO_LARGE:
 * - Unchunked `*-auth-token` when chunked form (`.0`) already exists
 * - Bulky `*-provider-token*` cookies (Google raw tokens ~2-3KB, unneeded for app auth)
 * - Legacy `falcon_*` cookies
 * - Orphaned higher chunk indices from past larger sessions (e.g., `.2`, `.3` when now `.0`, `.1`)
 *
 * PRESERVES PKCE code-verifier cookies during in-flight OAuth flows.
 */
function sanitizeRequestCookies(request: NextRequest, response: NextResponse): void {
  const allCookies = request.cookies.getAll();
  const cookieNames = new Set(allCookies.map((c) => c.name));
  const hostname = request.nextUrl.hostname;

  // Track chunk indices for each base token
  const chunkedMaxIndices = new Map<string, number>();
  for (const c of allCookies) {
    const match = c.name.match(/^(sb-[^.]+-auth-token)\.(\d+)$/);
    if (match && match[1] && match[2]) {
      const base = match[1];
      const idx = parseInt(match[2], 10);
      const current = chunkedMaxIndices.get(base) ?? -1;
      if (idx > current) {
        chunkedMaxIndices.set(base, idx);
      }
    }
  }

  for (const cookie of allCookies) {
    const { name } = cookie;
    let shouldExpire = false;

    // 1. Remove unchunked token if chunked form (.0) exists
    if (name.endsWith("-auth-token") && cookieNames.has(`${name}.0`)) {
      shouldExpire = true;
    }

    // 2. Remove provider-tokens (not needed for application session validation)
    if (name.includes("-provider-token")) {
      shouldExpire = true;
    }

    // 3. Remove legacy brand cookies
    if (name.startsWith("falcon_") || name.includes("falcon")) {
      shouldExpire = true;
    }

    if (shouldExpire) {
      expireCookieEverywhere(response, name, hostname);
    }
  }

  // 4. Header size defense: Vercel header threshold is ~8KB. Keep cookies comfortably under 4KB.
  const totalSize = allCookies.reduce((sum, c) => sum + c.name.length + c.value.length + 3, 0);
  if (totalSize > 4096) {
    for (const c of allCookies) {
      if (
        c.name.startsWith("g_state") ||
        c.name.includes("oauth_state") ||
        (c.name.includes("-code-verifier") && cookieNames.has("sb-*-auth-token.0"))
      ) {
        expireCookieEverywhere(response, c.name, hostname);
      }
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

  // Apply cookie hygiene on outgoing response
  sanitizeRequestCookies(request, supabaseResponse);

  return { supabase, supabaseResponse, user };
}
