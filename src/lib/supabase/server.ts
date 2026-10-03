import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://vdpokcnbslgzyufybxey.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzU2NTIsImV4cCI6MjEwMTUxMTY1Mn0.TpGuQ61f7i1RYuB4uOfz3BQoVzCQsYqdfZNnYjDSTUE";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkzNTY1MiwiZXhwIjoyMTAxNTExNjUyfQ.49urHYZdnUAcKdvNJekLIFtCdUF8Ftz2UzoQCvH0gLw";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        encode: "tokens-only",
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // 1. Drop third-party provider tokens (Google OAuth access/refresh tokens).
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

              // 2. Enforce host-only scoping (domain: undefined) and standard root path
              cookieStore.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                domain: undefined,
              });
            });
          } catch {
            // Server Component ignore (Next.js prohibits cookie writes during render)
          }
        },
      },
    }
  );
}

// Admin client with service role for server-side database access (does not touch auth cookies)
export async function createAdminClient() {
  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service role client never sets browser cookies
        },
      },
    }
  );
}
