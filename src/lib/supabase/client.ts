import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Singleton pattern for browser client
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

export function createClient() {
  if (client) return client;

  const userStorageAdapter =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
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
            // 1. Never store third-party Google OAuth provider tokens or obsolete chunks in client cookies
            if (
              name.includes("provider-token") ||
              name.includes("provider-refresh-token") ||
              name.includes("provider_token") ||
              /\-auth\-token\.\d+$/.test(name)
            ) {
              paths.forEach((p) => {
                document.cookie = `${name}=; path=${p}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                if (isDomainWithDots) {
                  document.cookie = `${name}=; path=${p}; domain=${host}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                  document.cookie = `${name}=; path=${p}; domain=.${host}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                }
              });
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
