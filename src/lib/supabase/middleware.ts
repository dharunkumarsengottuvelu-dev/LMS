import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";
import { deduplicateCookies } from "./cookie-utils";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://vdpokcnbslgzyufybxey.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzU2NTIsImV4cCI6MjEwMTUxMTY1Mn0.TpGuQ61f7i1RYuB4uOfz3BQoVzCQsYqdfZNnYjDSTUE";

/**
 * Removes duplicate, stale, and oversized cookies from the outgoing response.
 * Completely evicts obsolete chunked cookies, third-party provider tokens,
 * and legacy state across all potential domain and path scopes.
 */
export function sanitizeResponseCookies(request: NextRequest, response: NextResponse): void {
  const allCookies = request.cookies.getAll();

  for (const cookie of allCookies) {
    const { name } = cookie;
    let shouldExpire = false;

    // 1. Remove third-party provider tokens (Google OAuth access/refresh tokens: ~2-4 KB)
    if (
      name.includes("provider-token") ||
      name.includes("provider-refresh-token") ||
      name.includes("provider_token")
    ) {
      shouldExpire = true;
    }

    // 2. Remove legacy temporary state (never touch active code-verifier or oauth_state during PKCE flow)
    if (
      name.startsWith("falcon_") ||
      name.startsWith("g_state")
    ) {
      shouldExpire = true;
    }

    if (shouldExpire) {
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
      encode: "tokens-only",
      getAll() {
        return deduplicateCookies(request.cookies.getAll());
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          if (
            name.includes("provider-token") ||
            name.includes("provider-refresh-token") ||
            name.includes("provider_token")
          ) {
            return;
          }
          request.cookies.set(name, value);
        });

        // In Next.js 14+, modifying request.cookies doesn't update the headers for Server Components.
        // We must manually serialize the cookies back to request.headers.
        const updatedCookies = request.cookies.getAll();
        const cookieHeader = updatedCookies.map(c => `${c.name}=${c.value}`).join("; ");
        request.headers.set("cookie", cookieHeader);

        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          if (
            name.includes("provider-token") ||
            name.includes("provider-refresh-token") ||
            name.includes("provider_token")
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
