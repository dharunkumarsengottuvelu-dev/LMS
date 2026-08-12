import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/security/rate-limiter";

// Define protected route patterns and their required roles (RBAC)
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/admin": ["super_admin", "admin"],
  "/trainer": ["super_admin", "admin", "trainer"],
  "/recruiter": ["super_admin", "admin", "recruiter"],
  "/student": ["super_admin", "admin", "trainer", "student"],
  "/ide": ["super_admin", "admin", "trainer", "student"],
};

// Public routes that never require auth
const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/courses",
  "/pricing",
  "/login",
  "/register",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/api/auth",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function getRequiredRoles(pathname: string): string[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_ROLE_MAP)) {
    if (pathname.startsWith(prefix)) {
      return roles;
    }
  }
  return null;
}

function getRoleDefaultPath(role: string): string {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin/dashboard";
    case "trainer":
      return "/trainer/dashboard";
    case "recruiter":
      return "/admin/students";
    case "student":
      return "/student/dashboard";
    default:
      return "/login";
  }
}

/**
 * Applies OWASP Top 10 Security Headers to the response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), display-capture=(self)");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; worker-src 'self' blob: data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: https:; media-src 'self' blob: data:; connect-src 'self' blob: data: https://*.supabase.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; frame-ancestors 'none';"
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Auto-route OAuth callback if `code` query param is present
  const codeParam = request.nextUrl.searchParams.get("code");
  if (codeParam && !pathname.startsWith("/api/auth/callback")) {
    const callbackUrl = new URL("/api/auth/callback", request.url);
    callbackUrl.searchParams.set("code", codeParam);
    return applySecurityHeaders(NextResponse.redirect(callbackUrl));
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. Rate Limiting Check (IP-based with route scoping)
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    (request as unknown as { ip?: string }).ip ||
    "127.0.0.1";

  const isAuthApi = pathname.startsWith("/api/auth");
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api/");

  let scope = "general";
  let limit = 300; // 300 req/min for general routes

  if (isAuthApi) {
    scope = "auth_api";
    limit = 60; // 60 req/min for auth API endpoints
  } else if (isAuthPage) {
    scope = "auth_page";
    limit = 200; // 200 req/min for auth UI pages
  } else if (isApiRoute) {
    scope = "api";
    limit = 200;
  }

  const rateCheckKey = `${scope}:${clientIp}`;
  const rateCheck = checkRateLimit(rateCheckKey, limit, 60 * 1000);

  if (!rateCheck.success) {
    const isHtmlRequest = request.headers.get("accept")?.includes("text/html");

    if (isHtmlRequest && !isApiRoute) {
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Too Many Requests | EduNexus LMS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #090d16;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: #111827;
      border: 1px solid #1f293d;
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .icon-wrapper {
      width: 64px;
      height: 64px;
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem auto;
      color: #fb7185;
    }
    h1 { font-size: 1.5rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.75rem; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.75rem; }
    .btn {
      display: inline-block;
      width: 100%;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      border: none;
      padding: 0.85rem 1.5rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </div>
    <h1>Too Many Requests</h1>
    <p>You have made too many requests in a short period of time. Please wait a minute before trying again.</p>
    <a href="${request.url}" class="btn" onclick="window.location.reload(); return false;">Try Again</a>
  </div>
</body>
</html>`;
      const htmlResponse = new NextResponse(htmlContent, {
        status: 429,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
      htmlResponse.headers.set("X-RateLimit-Limit", String(rateCheck.limit));
      htmlResponse.headers.set("X-RateLimit-Remaining", "0");
      htmlResponse.headers.set("Retry-After", "60");
      return applySecurityHeaders(htmlResponse);
    }

    const errorResponse = new NextResponse(
      JSON.stringify({ error: "Too many requests. Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
    errorResponse.headers.set("X-RateLimit-Limit", String(rateCheck.limit));
    errorResponse.headers.set("X-RateLimit-Remaining", "0");
    errorResponse.headers.set("Retry-After", "60");
    return applySecurityHeaders(errorResponse);
  }

  // 2. Update Supabase Session
  const { supabaseResponse, user } = await updateSession(request);

  const isPublic = isPublicRoute(pathname);
  const requiredRoles = getRequiredRoles(pathname);

  // 3. Unauthenticated User Protection
  if (!user && !isPublic && requiredRoles !== null) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  // 4. Authenticated User Redirection from Login/Auth pages
  if (user && (pathname.startsWith("/auth/") || pathname === "/login" || pathname === "/register")) {
    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const userEmail = user.email?.toLowerCase() || "";
    const role = userEmail.includes("admin")
      ? "admin"
      : userEmail.includes("trainer")
      ? "trainer"
      : profile?.role || "student";

    return applySecurityHeaders(
      NextResponse.redirect(new URL(getRoleDefaultPath(role), request.url))
    );
  }

  return applySecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
