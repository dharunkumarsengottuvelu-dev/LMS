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
    case "admin":
      return "/admin/dashboard";
    case "trainer":
      return "/trainer/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/login";
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
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user IS logged in and tries to access auth pages, redirect to dashboard
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

    return NextResponse.redirect(
      new URL(getRoleDefaultPath(role), request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
