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
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session so it doesn't expire
  const { data: { user } } = await supabase.auth.getUser();

  // Active Garbage Collection: Prune dead PKCE code verifiers & duplicate unchunked tokens
  if (user) {
    const allCookies = request.cookies.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.includes("-code-verifier")) {
        supabaseResponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
      if (cookie.name.endsWith("-auth-token") && request.cookies.has(`${cookie.name}.0`)) {
        supabaseResponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    });
  }

  return { supabase, supabaseResponse, user };
}
