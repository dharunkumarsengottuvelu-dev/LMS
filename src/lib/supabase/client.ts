import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

// Module-level singleton — prevents multiple GoTrueClient instances in the browser
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

function expireClientCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname;
    document.cookie = `${name}=; path=/; domain=${host}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${name}=; path=/; domain=.${host}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Removes duplicate and stale cookies from browser cookie jar:
 * - Unchunked session cookie when chunked (.0) exists
 * - Bulky provider-tokens (Google raw access tokens ~2-3KB)
 * - Legacy brand cookies (falcon_*)
 * - Orphaned chunk indices
 *
 * Defaults to preserving PKCE code-verifier unless explicitly instructed to clean up.
 */
export function purgeStaleSessionCookies(options?: { clearCodeVerifier?: boolean }) {
  if (typeof document === "undefined") return;

  const cookieList = document.cookie.split(";").map((c) => {
    const [name, ...rest] = c.split("=");
    return { name: name?.trim() ?? "", value: rest.join("=") };
  });

  const names = new Set(cookieList.map((c) => c.name));

  for (const { name } of cookieList) {
    if (!name) continue;

    // 1. Remove unchunked token when chunked form (.0) exists
    if (name.endsWith("-auth-token") && names.has(`${name}.0`)) {
      expireClientCookie(name);
    }

    // 2. Remove provider-tokens — large, unneeded client-side
    if (name.includes("-provider-token") || name.includes("-provider-refresh-token")) {
      expireClientCookie(name);
    }

    // 3. Remove legacy brand cookies
    if (name.startsWith("falcon_") || name.includes("falcon")) {
      expireClientCookie(name);
    }

    // 4. Optionally clear code-verifier on complete sign-out or fresh OAuth start
    if (options?.clearCodeVerifier && name.includes("-code-verifier")) {
      expireClientCookie(name);
    }
  }

  // 5. Emergency size defense: if cookie header exceeds 3500 chars, prune non-essential cookies
  if (document.cookie.length > 3500) {
    for (const { name } of cookieList) {
      if (
        name.startsWith("g_state") ||
        name.includes("oauth_state") ||
        name.startsWith("_ga") ||
        name.startsWith("_gid")
      ) {
        expireClientCookie(name);
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
