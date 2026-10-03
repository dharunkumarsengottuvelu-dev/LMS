import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Singleton pattern for browser client
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://vdpokcnbslgzyufybxey.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcG9rY25ic2xnenl1ZnlieGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzU2NTIsImV4cCI6MjEwMTUxMTY1Mn0.TpGuQ61f7i1RYuB4uOfz3BQoVzCQsYqdfZNnYjDSTUE";

export function createClient() {
  if (client) return client;

  const userStorageAdapter = {
    getItem: (key: string): string | null => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {}
      return null;
    },
    setItem: (key: string, value: string): void => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {}
    },
    removeItem: (key: string): void => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {}
    },
  };

  client = createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        userStorage: userStorageAdapter,
      },
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: typeof window !== "undefined" && window.location.protocol === "https:",
      },
      cookies: {
        encode: "tokens-only",
        getAll() {
          if (typeof document === "undefined") return [];
          const raw = document.cookie;
          if (!raw) return [];
          return raw.split(";").map((p) => {
            const trimmed = p.trim();
            const eqIdx = trimmed.indexOf("=");
            const name = eqIdx > -1 ? trimmed.slice(0, eqIdx).trim() : trimmed;
            const value = eqIdx > -1 ? trimmed.slice(eqIdx + 1).trim() : "";
            return { name, value };
          });
        },
        setAll(cookiesToSet) {
          if (typeof window === "undefined" || typeof document === "undefined") return;
          const host = window?.location?.hostname || "";
          const isDomainWithDots = host.includes(".");
          const paths = ["/", "/api/auth/callback", "/student", "/admin", "/trainer", "/institution", "/api"];

          cookiesToSet.forEach(({ name, value, options }) => {
            // 1. Never store third-party Google OAuth provider tokens in client cookies
            if (
              name.includes("provider-token") ||
              name.includes("provider-refresh-token") ||
              name.includes("provider_token")
            ) {
              document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
              return;
            }

            const isHttps = window.location.protocol === "https:";
            const secureFlag = isHttps ? "; Secure" : "";
            const maxAge = options?.maxAge !== undefined ? `; max-age=${options.maxAge}` : "";
            const expires = options?.expires ? `; expires=${options.expires.toUTCString()}` : "";
            const sameSite = options?.sameSite ? `; samesite=${options.sameSite}` : "; samesite=lax";
            document.cookie = `${name}=${value}; path=/${maxAge}${expires}${sameSite}${secureFlag}`;
          });
        },
      },
    }
  );

  return client;
}
