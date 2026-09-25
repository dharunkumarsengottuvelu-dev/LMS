import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

// Module-level singleton — prevents multiple GoTrueClient instances in the browser
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Removes only the unchunked session cookie when the chunked form exists.
 * Called on sign-out only — NEVER before an OAuth redirect.
 *
 * Does NOT touch code_verifier cookies.
 * The PKCE code_verifier is owned by the Supabase SDK and must be preserved
 * from signInWithOAuth() until exchangeCodeForSession() consumes it.
 */
export function purgeStaleSessionCookies() {
  if (typeof document === "undefined") return;

  const cookieList = document.cookie.split(";").map((c) => {
    const [name, ...rest] = c.split("=");
    return { name: name?.trim() ?? "", value: rest.join("=") };
  });

  const names = new Set(cookieList.map((c) => c.name));

  for (const { name } of cookieList) {
    if (!name) continue;

    // Remove unchunked token when chunked form (.0) exists
    if (name.endsWith("-auth-token") && names.has(`${name}.0`)) {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      if (window.location.hostname) {
        document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }

    // Remove provider-token — large, not needed client-side
    if (name.includes("-provider-token")) {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      if (window.location.hostname) {
        document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
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
  });

  // Reset singleton and clean stale cookies when the user signs out
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      purgeStaleSessionCookies();
      client = null;
    }
  });

  return client;
}
