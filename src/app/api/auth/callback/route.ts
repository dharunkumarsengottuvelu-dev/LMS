import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!;

/**
 * Resolves the canonical origin for redirects, handling Vercel's reverse proxy headers.
 */
function resolveOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * After a successful session exchange, clean up ONLY the spent PKCE verifier
 * and any duplicate unchunked session tokens. The new session cookies are
 * already written by the SDK at this point.
 *
 * MUST be called AFTER exchangeCodeForSession — never before.
 */
function cleanupAfterExchange(response: NextResponse, cookieStore: Awaited<ReturnType<typeof cookies>>) {
  try {
    const all = cookieStore.getAll();
    const names = new Set(all.map((c) => c.name));

    for (const c of all) {
      let shouldExpire = false;

      // The code_verifier was consumed by exchangeCodeForSession — safe to remove
      if (c.name.includes("-code-verifier")) {
        shouldExpire = true;
      }

      // Remove unchunked session cookie if the chunked form (.0) now exists
      if (c.name.endsWith("-auth-token") && names.has(`${c.name}.0`)) {
        shouldExpire = true;
      }

      if (shouldExpire) {
        response.cookies.set(c.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
    }
  } catch {
    // Non-critical — cookie cleanup failure should not abort the redirect
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = resolveOrigin(request);

  // ── Handle errors sent back from the OAuth provider ──────────────────────
  const authError = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  if (authError) {
    console.warn("[auth/callback] OAuth provider returned error:", authError);
    // Clean up any stale PKCE state left from the failed attempt
    try {
      const cookieStore = await cookies();
      const failureResponse = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || authError)}`);
      cookieStore.getAll().forEach((c) => {
        if (c.name.includes("-code-verifier")) {
          failureResponse.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0) });
        }
      });
      return failureResponse;
    } catch {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || authError)}`);
    }
  }

  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const otpType = (requestUrl.searchParams.get("type") as any) || "magiclink";

  if (!code && !token_hash) {
    // No auth payload — stale or manually constructed URL
    console.warn("[auth/callback] No code or token_hash present");
    return NextResponse.redirect(`${origin}/login?error=no_auth_code`);
  }

  // ── Exchange the authorization code for a session ─────────────────────────
  // We build our own createServerClient here (not createClient()) to guarantee
  // that NO cookie pruning runs before exchangeCodeForSession reads the
  // code_verifier that the SDK stored during signInWithOAuth.
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            })
          );
        } catch {
          // Route handler context supports writes — this should not throw
          console.warn("[auth/callback] Failed to set cookie");
        }
      },
    },
  });

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: token_hash!, type: otpType });

  if (error) {
    console.warn("[auth/callback] Session exchange failed:", error.message);
    const errResponse = NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
    // Clean up the spent/invalid code_verifier so it cannot cause future errors
    try {
      cookieStore.getAll().forEach((c) => {
        if (c.name.includes("-code-verifier")) {
          errResponse.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0) });
        }
      });
    } catch { /* non-critical */ }
    return errResponse;
  }

  if (!data?.user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // ── Resolve role → determine redirect target ──────────────────────────────
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const profile = profileData as { role?: string } | null;
  const metaRole =
    (data.user.user_metadata?.role as string) ||
    (data.user.app_metadata?.role as string) ||
    "";
  const emailLower = data.user.email?.toLowerCase() || "";
  const dbRole = (profile?.role || metaRole || "").toLowerCase();

  const isAdmin = dbRole === "super_admin" || dbRole === "admin" || emailLower.includes("admin");
  const isInstitution = dbRole === "institution" || emailLower.includes("institution");
  const isTrainer = dbRole === "trainer" || emailLower.includes("trainer");
  const isRecruiter = dbRole === "recruiter";

  const defaultPath = isAdmin
    ? "/admin/dashboard"
    : isInstitution
    ? "/institution/overview"
    : isTrainer
    ? "/trainer/dashboard"
    : isRecruiter
    ? "/admin/students"
    : "/student/dashboard";

  const next = requestUrl.searchParams.get("next");
  let redirectPath = defaultPath;

  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/login") &&
    !next.startsWith("/register") &&
    !next.startsWith("/api/auth")
  ) {
    const isAllowedForRole =
      (isAdmin && (next.startsWith("/admin") || next.startsWith("/coding") || next.startsWith("/courses") || next.startsWith("/ide"))) ||
      (isInstitution && next.startsWith("/institution")) ||
      (isTrainer && (next.startsWith("/trainer") || next.startsWith("/coding") || next.startsWith("/ide"))) ||
      (!isAdmin && !isInstitution && !isTrainer && !next.startsWith("/admin") && !next.startsWith("/trainer") && !next.startsWith("/institution"));

    if (isAllowedForRole) {
      redirectPath = next;
    }
  }

  // ── Build redirect and clean up spent PKCE state ──────────────────────────
  const response = NextResponse.redirect(new URL(redirectPath, origin));
  cleanupAfterExchange(response, cookieStore);

  return response;
}
