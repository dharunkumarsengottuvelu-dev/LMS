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

  // 1. Rate Limiting Check (IP-based)
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/auth");
  const limit = isAuthRoute ? 10 : 120; // 10 req/min for auth, 120 for general routes
  const rateCheck = checkRateLimit(clientIp, limit, 60 * 1000);

  if (!rateCheck.success) {
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
