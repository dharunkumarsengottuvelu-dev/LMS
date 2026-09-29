import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "placeholder-service-role-key";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Completely drop provider tokens (Google OAuth access/refresh tokens).
              // Supabase Auth provides these for calling third-party Google APIs, which this LMS does not do.
              // Storing them in cookies adds 3-5 KB of header weight, causing 494 REQUEST_HEADER_TOO_LARGE on Vercel.
              if (
                name.includes("provider-token") ||
                name.includes("provider-refresh-token") ||
                name.includes("provider_token")
              ) {
                try {
                  cookieStore.set(name, "", {
                    path: "/",
                    maxAge: 0,
                    expires: new Date(0),
                  });
                } catch {}
                return;
              }

              // Enforce host-only scoping (domain: undefined) and standard path
              cookieStore.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                domain: undefined,
              });
            });
          } catch {
            // Server Component ignore
          }
        },
      },
    }
  );
}

// Admin client with service role
export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (
                name.includes("provider-token") ||
                name.includes("provider-refresh-token") ||
                name.includes("provider_token")
              ) {
                try {
                  cookieStore.set(name, "", {
                    path: "/",
                    maxAge: 0,
                    expires: new Date(0),
                  });
                } catch {}
                return;
              }
              cookieStore.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                domain: undefined,
              });
            });
          } catch {
            // ignore in server components
          }
        },
      },
    }
  );
}
