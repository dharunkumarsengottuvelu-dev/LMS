import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "placeholder-service-role-key";

/**
 * Removes duplicate session cookies (unchunked token when chunked form exists)
 * and bulky provider tokens from the request cookie store.
 *
 * PRESERVES PKCE code-verifier cookies needed for OAuth authorization.
 */
function pruneSessionDuplicates(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  try {
    const all = cookieStore.getAll();
    const names = new Set(all.map((c) => c.name));

    for (const c of all) {
      // Remove unchunked session cookie when chunked form (.0) already exists
      if (c.name.endsWith("-auth-token") && names.has(`${c.name}.0`)) {
        cookieStore.delete(c.name);
      }
      // Remove provider token
      if (c.name.includes("-provider-token")) {
        cookieStore.delete(c.name);
      }
    }
  } catch {
    // Read-only context (Server Component) — ignore
  }
}

export async function createClient() {
  const cookieStore = await cookies();
  pruneSessionDuplicates(cookieStore);

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // Host-only: never specify domain
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
          // Called from a Server Component render — not writeable, ignore
        }
      },
    },
  });
}

export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
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
