import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "placeholder-service-role-key";

/**
 * Filters out stale/duplicate auth cookies that cause 494 REQUEST_HEADER_TOO_LARGE.
 * Keeps only the chunked form (.0, .1 …) when both unchunked and chunked exist.
 */
function pruneAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  try {
    const all = cookieStore.getAll();
    const names = new Set(all.map((c) => c.name));

    for (const c of all) {
      // Remove PKCE verifiers when they linger after auth completes
      if (c.name.includes("-code-verifier")) {
        cookieStore.delete(c.name);
        continue;
      }
      // Remove unchunked token when the chunked version (.0) already exists
      if (c.name.endsWith("-auth-token") && names.has(`${c.name}.0`)) {
        cookieStore.delete(c.name);
      }
    }
  } catch {
    // Read-only context (Server Component) — ignore
  }
}

export async function createClient() {
  const cookieStore = await cookies();
  pruneAuthCookies(cookieStore);

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            })
          );
        } catch {
          // Server Component — ignore
        }
      },
    },
  });
}

// Admin client with service role
export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: false,
      autoRefreshToken: false,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // ignore in server components
        }
      },
    },
  });
}
