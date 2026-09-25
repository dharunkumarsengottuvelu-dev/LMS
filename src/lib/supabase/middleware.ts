import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

/**
 * Removes only duplicate/stale session cookies that cause header bloat:
 * - Unchunked auth-token when the chunked form (.0) already exists
 * - Provider-token chunks (large, not needed after session establishment)
 *
 * NEVER removes code-verifier cookies.
 * The PKCE code_verifier must survive from signInWithOAuth → exchangeCodeForSession.
 * The Supabase SDK deletes it automatically after the exchange succeeds.
 */
function removeSessionDuplicates(request: NextRequest, response: NextResponse): void {
  const allCookies = request.cookies.getAll();
  const cookieNames = new Set(allCookies.map((c) => c.name));

  for (const cookie of allCookies) {
    const { name } = cookie;

    // Remove unchunked token when chunked form (.0) exists — avoids sending both
    if (name.endsWith("-auth-token") && cookieNames.has(`${name}.0`)) {
      response.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
      continue;
    }

    // Remove provider tokens — they are large and not needed after login
    if (name.includes("-provider-token")) {
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

  // Refresh the session on every request — required by @supabase/ssr
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Remove only genuinely stale/duplicate cookies — never the code_verifier
  removeSessionDuplicates(request, supabaseResponse);

  return { supabase, supabaseResponse, user };
}
