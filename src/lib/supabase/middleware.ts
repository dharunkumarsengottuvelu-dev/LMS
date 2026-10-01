import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

/**
 * Removes duplicate, stale, and oversized cookies from the outgoing response.
 * Completely evicts obsolete chunked cookies, third-party provider tokens,
 * and legacy state across all potential domain and path scopes.
 */
export function sanitizeResponseCookies(request: NextRequest, response: NextResponse): void {
  const allCookies = request.cookies.getAll();
  const host = request.nextUrl.hostname;
  const isDomainWithDots = host.includes(".");

  for (const cookie of allCookies) {
    const { name } = cookie;
    let shouldExpire = false;

    // 1. Remove obsolete chunked cookies (.0, .1, etc.) since tokens-only uses a single compact cookie
    if (/\-auth\-token\.\d+$/.test(name)) {
      shouldExpire = true;
    }

    // 2. Remove third-party provider tokens (Google OAuth access/refresh tokens: ~2-4 KB)
    if (
      name.includes("provider-token") ||
      name.includes("provider-refresh-token") ||
      name.includes("provider_token")
    ) {
      shouldExpire = true;
    }

    // 3. Remove stale OAuth verifiers or legacy temporary state
    if (
      name.endsWith("-code-verifier") ||
      name.includes("oauth_state") ||
      name.startsWith("falcon_") ||
      name.startsWith("g_state")
    ) {
      shouldExpire = true;
    }

    if (shouldExpire) {
      const paths = ["/", "/api/auth/callback", "/student", "/admin", "/trainer", "/institution", "/api"];
      const domains: (string | undefined)[] = isDomainWithDots ? [undefined, host, `.${host}`] : [undefined];

      for (const p of paths) {
        for (const d of domains) {
          response.cookies.set(name, "", {
            path: p,
            domain: d,
            maxAge: 0,
            expires: new Date(0),
          });
        }
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
      // Host-only: NEVER specify domain — prevents duplicate domain-scoped cookie writes
    },
    cookies: {
      encode: "tokens-only",
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          if (
            name.includes("provider-token") ||
            name.includes("provider-refresh-token") ||
            name.includes("provider_token") ||
            /\-auth\-token\.\d+$/.test(name)
          ) {
            return;
          }
          request.cookies.set(name, value);
        });

        // FIX: In Next.js 14+, modifying request.cookies doesn't update the headers for Server Components.
        // We must manually serialize the cookies back to request.headers.
        const updatedCookies = request.cookies.getAll();
        const cookieHeader = updatedCookies.map(c => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
        request.headers.set("cookie", cookieHeader);

        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          if (
            name.includes("provider-token") ||
            name.includes("provider-refresh-token") ||
            name.includes("provider_token") ||
            /\-auth\-token\.\d+$/.test(name)
          ) {
            // Expire immediately from response
            supabaseResponse.cookies.set(name, "", {
              path: "/",
              maxAge: 0,
              expires: new Date(0),
            });
            return;
          }
          supabaseResponse.cookies.set(name, value, {
            ...options,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            // Host-only: NEVER specify domain
            domain: undefined,
          });
        });
      },
    },
  });

  // Validate user session — this is the only server round-trip per request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Apply cookie hygiene: expire stale/duplicate/provider cookies across all scopes
  sanitizeResponseCookies(request, supabaseResponse);

  return { supabase, supabaseResponse, user };
}
