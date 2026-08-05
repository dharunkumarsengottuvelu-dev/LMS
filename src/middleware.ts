import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Define protected route patterns and their required roles
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/admin": ["admin"],
  "/trainer": ["admin", "trainer"],
  "/student": ["admin", "trainer", "student"],
  "/ide": ["admin", "trainer", "student"],
};

// Public routes that never require auth
const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/courses",
  "/pricing",
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
    case "admin":
      return "/admin/dashboard";
    case "trainer":
      return "/trainer/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/auth/login";
  }
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

  // Update session (refreshes cookie, returns current user)
  const { supabaseResponse, user } = await updateSession(request);

  const isPublic = isPublicRoute(pathname);
  const requiredRoles = getRequiredRoles(pathname);

  // If user is not logged in and trying to access a protected route
  if (!user && !isPublic && requiredRoles !== null) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user IS logged in and tries to access auth pages, redirect to dashboard
  if (user && pathname.startsWith("/auth/")) {
    // Fetch user role from profile
    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op here; handled by updateSession
          },
        },
      }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role) {
      return NextResponse.redirect(
        new URL(getRoleDefaultPath(profile.role), request.url)
      );
    }
  }

  // If user is logged in but doesn't have the required role
  if (user && requiredRoles !== null) {
    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // handled by updateSession
          },
        },
      }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !requiredRoles.includes(profile.role)) {
      // Redirect to their appropriate dashboard instead of a generic 403
      const userRole = profile?.role ?? "student";
      const redirectPath = getRoleDefaultPath(userRole);

      // If they're already at their dashboard path, show unauthorized
      if (pathname.startsWith(redirectPath.split("/")[1] ?? "")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
