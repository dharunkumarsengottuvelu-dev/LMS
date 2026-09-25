/**
 * Central Site & Brand Configuration
 *
 * Domain-agnostic, brand-agnostic, and environment-aware.
 * Configured via environment variables with sensible production defaults.
 */

export interface SiteConfig {
  name: string;
  companyName: string;
  description: string;
  supportEmail: string;
  url?: string;
  links: {
    terms: string;
    privacy: string;
  };
}

export const siteConfig: SiteConfig = {
  name: process.env["NEXT_PUBLIC_APP_NAME"] || "SensiLearn LMS",
  companyName: process.env["NEXT_PUBLIC_COMPANY_NAME"] || "SensiLearn Learning Technologies",
  description:
    process.env["NEXT_PUBLIC_APP_DESCRIPTION"] ||
    "Enterprise Learning Platform — Focused. Adaptive. Curated. Next-Gen.",
  supportEmail: process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] || "support@sensilearn.com",
  url: process.env["NEXT_PUBLIC_APP_URL"] || undefined,
  links: {
    terms: "/terms",
    privacy: "/privacy",
  },
};

/**
 * Resolves the application origin dynamically based on environment.
 *
 * - In the browser: Always returns `window.location.origin` (host-only, 100% domain-agnostic).
 * - On the server with a Request/Headers object:
 *     Inspects standard reverse-proxy headers (`x-forwarded-proto`, `x-forwarded-host`, `host`).
 * - On the server without a request:
 *     Falls back to NEXT_PUBLIC_APP_URL -> VERCEL_URL -> localhost:3000.
 *
 * This ensures the LMS works on localhost, any Vercel preview domain,
 * Vercel production, or any future custom domain without code modifications.
 */
export function getAppOrigin(requestOrHeaders?: Request | Headers | { headers: Headers }): string {
  // 1. Client-side execution — window.location.origin is always the exact current domain
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // 2. Server-side with request or headers
  if (requestOrHeaders) {
    const headers =
      requestOrHeaders instanceof Headers
        ? requestOrHeaders
        : "headers" in requestOrHeaders
        ? requestOrHeaders.headers
        : undefined;

    if (headers) {
      const forwardedHost = headers.get("x-forwarded-host");
      const host = forwardedHost || headers.get("host");
      if (host) {
        const proto =
          headers.get("x-forwarded-proto") ||
          (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
        return `${proto}://${host}`;
      }
    }

    if (requestOrHeaders instanceof Request) {
      try {
        const url = new URL(requestOrHeaders.url);
        if (url.origin && url.origin !== "null") {
          return url.origin;
        }
      } catch {
        // invalid URL string, continue to fallbacks
      }
    }
  }

  // 3. Configured environment variable
  if (process.env["NEXT_PUBLIC_APP_URL"]) {
    return process.env["NEXT_PUBLIC_APP_URL"].replace(/\/+$/, "");
  }

  // 4. Vercel deployment URL (auto-populated by Vercel for preview & prod)
  if (process.env["VERCEL_URL"]) {
    return `https://${process.env["VERCEL_URL"].replace(/\/+$/, "")}`;
  }

  // 5. Local development fallback
  return "http://localhost:3000";
}

/**
 * Returns an absolute URL for a given pathname on the current deployment origin.
 */
export function getAbsoluteUrl(path: string, requestOrHeaders?: Request | Headers | { headers: Headers }): string {
  const origin = getAppOrigin(requestOrHeaders);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

/**
 * Returns the OAuth callback URL for the current deployment origin.
 */
export function getOAuthCallbackUrl(requestOrHeaders?: Request | Headers | { headers: Headers }): string {
  return getAbsoluteUrl("/api/auth/callback", requestOrHeaders);
}
