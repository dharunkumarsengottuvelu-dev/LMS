import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

// Singleton pattern — reset on sign-out to prevent stale token accumulation
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Purges all Supabase auth-related cookies from the browser to prevent
 * 494 REQUEST_HEADER_TOO_LARGE caused by stale/oversized cookie headers.
 */
export function purgeAuthCookies() {
  if (typeof document === "undefined") return;
  const cookies = document.cookie.split(";");
  for (const c of cookies) {
    const name = c.split("=")[0]?.trim();
    if (!name) continue;
    const isAuthCookie =
      name.startsWith("sb-") ||
      name.includes("-auth-token") ||
      name.includes("-code-verifier") ||
      name.includes("-refresh-token") ||
      name.includes("-provider-token");
    if (isAuthCookie) {
      // Expire on all path/domain combinations
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: typeof window !== "undefined" && window.location.protocol === "https:",
    },
    auth: {
      // Use PKCE for more secure OAuth flow and smaller token payloads
      flowType: "pkce",
      // Detect session from URL hash on OAuth callback
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  // Auto-reset singleton when user signs out to prevent stale cookie accumulation
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      purgeAuthCookies();
      client = null;
    }
  });

  return client;
}
