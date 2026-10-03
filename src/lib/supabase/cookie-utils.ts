/**
 * Cookie utilities for resilient Supabase SSR authentication.
 * Prevents stale/duplicate path-scoped cookies from shadowing active sessions.
 */

export function extractTokenExp(val: string): number {
  if (!val || typeof val !== "string") return 0;
  try {
    let raw = val;
    if (raw.startsWith("base64-")) {
      if (typeof Buffer !== "undefined") {
        raw = Buffer.from(raw.slice(7), "base64").toString("utf8");
      } else if (typeof atob !== "undefined") {
        raw = atob(raw.slice(7));
      }
    } else if (raw.startsWith("base64url-")) {
      if (typeof Buffer !== "undefined") {
        raw = Buffer.from(raw.slice(10), "base64url").toString("utf8");
      } else if (typeof atob !== "undefined") {
        const b64 = raw.slice(10).replace(/-/g, "+").replace(/_/g, "/");
        raw = atob(b64);
      }
    }
    const parsed = JSON.parse(raw);
    const token = parsed.access_token || (Array.isArray(parsed) ? parsed[0] : null) || parsed;
    if (typeof token === "string") {
      const parts = token.split(".");
      if (parts.length === 3 && parts[1]) {
        let payloadStr: string = parts[1];
        if (typeof Buffer !== "undefined") {
          payloadStr = Buffer.from(payloadStr, "base64").toString("utf8");
        } else if (typeof atob !== "undefined") {
          const b64 = payloadStr.replace(/-/g, "+").replace(/_/g, "/");
          payloadStr = atob(b64);
        }
        if (payloadStr) {
          const payload = JSON.parse(payloadStr);
          return payload.exp || 0;
        }
      }
    }
  } catch {}
  return 0;
}

export function deduplicateCookies(cookies: { name: string; value: string }[]): { name: string; value: string }[] {
  const map = new Map<string, { name: string; value: string; exp: number }>();
  for (const c of cookies) {
    const exp = extractTokenExp(c.value);
    const existing = map.get(c.name);
    // If not in map, or this cookie has a later expiration timestamp, prefer it
    if (!existing || exp > existing.exp) {
      map.set(c.name, { name: c.name, value: c.value, exp });
    }
  }
  return Array.from(map.values()).map(({ name, value }) => ({ name, value }));
}

export const STALE_COOKIE_PATHS = [
  "/student",
  "/admin",
  "/trainer",
  "/institution",
  "/api",
  "/api/auth/callback",
  "/auth/callback",
];

export function appendEvictionHeaders(response: { headers: Headers }, host?: string): void {
  const isDomainWithDots = host && host.includes(".");
  const domains = isDomainWithDots ? ["", `; Domain=${host}`, `; Domain=.${host}`] : [""];

  // Known cookie prefixes that may have been written to sub-paths or sub-domains
  const prefixes = [
    "sb-vdpokcnbslgzyufybxey-auth-token",
    "sb-vdpokcnbslgzyufybxey-auth-token.0",
    "sb-vdpokcnbslgzyufybxey-auth-token.1",
    "sb-vdpokcnbslgzyufybxey-provider-token",
    "sb-vdpokcnbslgzyufybxey-provider-refresh-token",
  ];

  for (const name of prefixes) {
    for (const p of STALE_COOKIE_PATHS) {
      for (const d of domains) {
        response.headers.append(
          "Set-Cookie",
          `${name}=; Path=${p}${d}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`
        );
      }
    }
  }
}
