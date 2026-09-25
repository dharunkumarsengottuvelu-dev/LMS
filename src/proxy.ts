import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { siteConfig } from "@/config/site";

// Define protected route patterns and their required roles (RBAC)
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/admin": ["super_admin", "admin"],
  "/api/admin": ["super_admin", "admin", "trainer"],
  "/trainer": ["super_admin", "admin", "trainer"],
  "/api/trainer": ["super_admin", "admin", "trainer"],
  "/recruiter": ["super_admin", "admin", "recruiter"],
  "/institution": ["super_admin", "admin", "institution"],
  "/api/institution": ["super_admin", "admin", "institution"],
  "/student": ["super_admin", "admin", "trainer", "student"],
  "/api/student": ["super_admin", "admin", "trainer", "student"],
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
  "/forgot-password",
  "/reset-password",
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
    case "institution":
      return "/institution/overview";
    default:
      return "/login";
  }
}

function getValidDestinationForRole(role: string, nextParam: string | null): string {
  const isSuperAdminOrAdmin = role === "super_admin" || role === "admin";
  const isInstitution = role === "institution";
  const isTrainer = role === "trainer";
  const isRecruiter = role === "recruiter";

  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("/login") || nextParam.startsWith("/register")) {
    return getRoleDefaultPath(role);
  }

  if (isSuperAdminOrAdmin) {
    if (nextParam.startsWith("/admin") || nextParam.startsWith("/coding") || nextParam.startsWith("/courses") || nextParam.startsWith("/ide")) {
      return nextParam;
    }
    return "/admin/dashboard";
  }

  if (isInstitution) {
    if (nextParam.startsWith("/institution")) {
      return nextParam;
    }
    return "/institution/overview";
  }

  if (isTrainer) {
    if (nextParam.startsWith("/trainer") || nextParam.startsWith("/coding") || nextParam.startsWith("/ide")) {
      return nextParam;
    }
    return "/trainer/dashboard";
  }

  if (isRecruiter) {
    return "/admin/students";
  }

  if (nextParam.startsWith("/admin") || nextParam.startsWith("/trainer") || nextParam.startsWith("/institution")) {
    return "/student/dashboard";
  }

  return nextParam;
}

/**
 * Resolves the user's effective role from the JWT user object alone —
 * NO database query required. Falls back gracefully to "student".
 *
 * Using JWT metadata means:
 * 1. Zero extra DB roundtrips in middleware (no cookie bloat from refreshes)
 * 2. Role is always available even before profile is synced
 */
function resolveRoleFromUser(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): string {
  const email = user.email?.toLowerCase() || "";
  const metaRole = (
    (user.user_metadata?.role as string) ||
    (user.app_metadata?.role as string) ||
    ""
  ).toLowerCase();

  // Trust app_metadata first (server-set, authoritative)
  if (user.app_metadata?.role) {
    const r = (user.app_metadata.role as string).toLowerCase();
    if (r === "super_admin" || r === "admin" || r === "founder" || r === "ceo") return "admin";
    if (r === "trainer") return "trainer";
    if (r === "institution") return "institution";
    if (r === "recruiter") return "recruiter";
    if (r === "student") return "student";
  }

  // Then user_metadata (set at registration or via admin)
  if (metaRole) {
    if (metaRole === "super_admin" || metaRole === "admin" || metaRole === "founder" || metaRole === "ceo") return "admin";
    if (metaRole === "trainer") return "trainer";
    if (metaRole === "institution") return "institution";
    if (metaRole === "recruiter") return "recruiter";
    if (metaRole === "student") return "student";
  }

  // Email-based role detection (last resort)
  if (email.includes("admin")) return "admin";
  if (email.includes("trainer")) return "trainer";
  if (email.includes("institution")) return "institution";

  return "student";
}

function createRedirectWithCookies(
  url: URL | string,
  request: NextRequest,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectUrl = url instanceof URL ? url : new URL(url, request.url);
  const response = NextResponse.redirect(redirectUrl);

  // Preserve all host-only cookies from the session refresh to avoid dropping auth state
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    response.cookies.set(name, value, {
      ...options,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  });

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 0. Skip proxy entirely for static assets, public files, and Next.js internals
  if (
    pathname === "/favicon.ico" ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname === "/manifest.json" ||
    pathname === "/site.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/clear.html" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. Auto-route OAuth callback only if code param is present on root or auth routes
  const codeParam = request.nextUrl.searchParams.get("code");
  const isAuthEntryPage = pathname === "/" || pathname === "/login" || pathname.startsWith("/auth/");
  if (codeParam && isAuthEntryPage && !pathname.startsWith("/api/auth/callback")) {
    const callbackUrl = new URL("/api/auth/callback", request.url);
    callbackUrl.searchParams.set("code", codeParam);
    const nextParam = request.nextUrl.searchParams.get("next");
    if (nextParam) callbackUrl.searchParams.set("next", nextParam);
    return NextResponse.redirect(callbackUrl);
  }

  // 2. Rate Limiting Check (IP-based with route scoping)
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    (request as unknown as { ip?: string }).ip ||
    "127.0.0.1";

  const isAuthApi = pathname.startsWith("/api/auth");
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register/") ||
    pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api/");

  let scope = "general";
  let limit = 300;

  if (isAuthApi) {
    scope = "auth_api";
    limit = 60;
  } else if (isAuthPage) {
    scope = "auth_page";
    limit = 200;
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
  <title>Too Many Requests | ${siteConfig.name}</title>
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
      return htmlResponse;
    }

    const errorResponse = new NextResponse(
      JSON.stringify({ error: "Too many requests. Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
    errorResponse.headers.set("X-RateLimit-Limit", String(rateCheck.limit));
    errorResponse.headers.set("X-RateLimit-Remaining", "0");
    errorResponse.headers.set("Retry-After", "60");
    return errorResponse;
  }

  // 3. Update Supabase Session (single call — also runs cookie sanitization)
  const { supabase: _supabase, supabaseResponse, user } = await updateSession(request);

  // 4. Redirect authenticated users away from auth pages
  //    Role is resolved purely from JWT metadata — NO extra DB query
  if (user && (pathname.startsWith("/auth/") || pathname === "/login" || pathname === "/register")) {
    const role = resolveRoleFromUser(user);
    const nextParam = request.nextUrl.searchParams.get("next");
    const destination = getValidDestinationForRole(role, nextParam);
    return createRedirectWithCookies(new URL(destination, request.url), request, supabaseResponse);
  }

  // 5. Protect private routes — unauthenticated access
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles && !user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: Active authentication session required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    const fullOriginalPath = `${pathname}${search}`;
    loginUrl.searchParams.set("next", fullOriginalPath);
    return createRedirectWithCookies(loginUrl, request, supabaseResponse);
  }

  // 6. Cross-role boundary enforcement — JWT metadata only (no DB call)
  if (user && (pathname.startsWith("/admin") || pathname.startsWith("/student") || pathname.startsWith("/trainer") || pathname.startsWith("/institution"))) {
    const role = resolveRoleFromUser(user);

    // Role-based boundary check for API routes
    if (requiredRoles && !requiredRoles.includes(role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden: Insufficient privileges for this resource" },
          { status: 403 }
        );
      }
    }

    // Portal boundary redirects
    if (role === "admin" && pathname.startsWith("/student")) {
      return createRedirectWithCookies(new URL("/admin/dashboard", request.url), request, supabaseResponse);
    }
    if (role === "institution" && (pathname.startsWith("/admin") || pathname.startsWith("/student") || pathname.startsWith("/trainer"))) {
      return createRedirectWithCookies(new URL("/institution/overview", request.url), request, supabaseResponse);
    }
    if (role === "student" && (pathname.startsWith("/admin") || pathname.startsWith("/trainer") || pathname.startsWith("/institution"))) {
      return createRedirectWithCookies(new URL("/student/dashboard", request.url), request, supabaseResponse);
    }
    if (role === "trainer" && (pathname.startsWith("/student") || pathname.startsWith("/institution"))) {
      return createRedirectWithCookies(new URL("/trainer/dashboard", request.url), request, supabaseResponse);
    }
  }

  return supabaseResponse;
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|site\\.webmanifest|robots\\.txt|sitemap\\.xml|clear\\.html|icons/.*|images/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot)$).*)",
  ],
};
