import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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
    }
  );

  // Refresh session so it doesn't expire
  const { data: { user } } = await supabase.auth.getUser();

  // Active Garbage Collection: Prune dead PKCE code verifiers & duplicate unchunked tokens
  const allCookies = request.cookies.getAll();
  const isAuthCallback = request.nextUrl.pathname.startsWith("/api/auth/callback");
  allCookies.forEach((cookie) => {
    // Clean PKCE verifiers whenever user is logged in OR when not in the middle of OAuth callback
    if (cookie.name.includes("-code-verifier")) {
      if (user || (!isAuthCallback && !request.nextUrl.searchParams.has("code"))) {
        supabaseResponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    }
    // Clean duplicate unchunked auth-token when chunked (.0) exists
    if (cookie.name.endsWith("-auth-token") && request.cookies.has(`${cookie.name}.0`)) {
      supabaseResponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  });

  return { supabase, supabaseResponse, user };
}
