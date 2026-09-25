import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Wipes ALL Supabase auth-related cookies from the cookie store.
 * Called before setting a new session to prevent cookie header bloat (494 errors).
 */
async function nukeAllAuthCookies(response: NextResponse) {
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();

    for (const c of all) {
      const isAuthCookie =
        c.name.startsWith("sb-") ||
        c.name.includes("-auth-token") ||
        c.name.includes("-code-verifier") ||
        c.name.includes("-provider-token") ||
        c.name.includes("-refresh-token");

      if (isAuthCookie) {
        // Delete from cookie store
        try { cookieStore.delete(c.name); } catch { /* ignore */ }
        // Also expire on response headers
        response.cookies.set(c.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
    }
  } catch (err) {
    console.warn("[Auth Callback] Cookie cleanup warning:", err);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Determine current origin safely (handles Vercel / Railway reverse proxy)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  // Handle provider-side OAuth errors
  const authError = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  if (authError) {
    console.error("[Auth Callback] OAuth provider error:", authError, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || authError)}`
    );
  }

  const token_hash = requestUrl.searchParams.get("token_hash");
  const otpType = (requestUrl.searchParams.get("type") as any) || "magiclink";

  if (code || token_hash) {
    // Create a temporary response so nukeAllAuthCookies can set expiry headers on it
    const tempResponse = NextResponse.next();

    // ── STEP 1: Nuke ALL stale auth cookies before exchanging the code ──────
    await nukeAllAuthCookies(tempResponse);

    // ── STEP 2: Exchange auth code for a fresh session ────────────────────
    const supabase = await createClient();
    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: token_hash!, type: otpType });

    if (error) {
      console.error("[Auth Callback] Session exchange failed:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    if (data?.user) {
      // ── STEP 3: Resolve role for dashboard redirect ──────────────────────
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      const profile = profileData as { role?: string } | null;
      const userMetaRole =
        (data.user.user_metadata?.role as string) ||
        (data.user.app_metadata?.role as string) ||
        "";
      const emailLower = data.user.email?.toLowerCase() || "";
      const dbRole = (profile?.role || userMetaRole || "").toLowerCase();

      const isSuperAdminOrAdmin =
        dbRole === "super_admin" || dbRole === "admin" || emailLower.includes("admin");
      const isInstitution =
        dbRole === "institution" || emailLower.includes("institution");
      const isTrainer = dbRole === "trainer" || emailLower.includes("trainer");
      const isRecruiter = dbRole === "recruiter";

      const defaultPath = isSuperAdminOrAdmin
        ? "/admin/dashboard"
        : isInstitution
        ? "/institution/overview"
        : isTrainer
        ? "/trainer/dashboard"
        : isRecruiter
        ? "/admin/students"
        : "/student/dashboard";

      const next = requestUrl.searchParams.get("next");
      const isSafeNext =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !next.startsWith("/login") &&
        !next.startsWith("/register") &&
        !next.startsWith("/api/auth");

      let redirectPath = defaultPath;
      if (isSafeNext) {
        if (
          isSuperAdminOrAdmin &&
          (next.startsWith("/admin") || next.startsWith("/coding") || next.startsWith("/courses") || next.startsWith("/ide"))
        ) {
          redirectPath = next;
        } else if (isInstitution && next.startsWith("/institution")) {
          redirectPath = next;
        } else if (
          isTrainer &&
          (next.startsWith("/trainer") || next.startsWith("/coding") || next.startsWith("/ide"))
        ) {
          redirectPath = next;
        } else if (
          !isSuperAdminOrAdmin &&
          !isInstitution &&
          !isTrainer &&
          !next.startsWith("/admin") &&
          !next.startsWith("/trainer") &&
          !next.startsWith("/institution")
        ) {
          redirectPath = next;
        }
      }

      // ── STEP 4: Build final redirect, re-apply cookie-wipe headers ────────
      const response = NextResponse.redirect(new URL(redirectPath, origin));

      // Copy the cookie-expiry headers from tempResponse to the real response
      tempResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
        response.cookies.set(name, value, opts as any);
      });

      // Final sweep: remove any -code-verifier or duplicate unchunked tokens
      try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const names = new Set(allCookies.map((c) => c.name));
        for (const c of allCookies) {
          if (
            c.name.includes("-code-verifier") ||
            (c.name.endsWith("-auth-token") && names.has(`${c.name}.0`)) ||
            c.name.includes("-provider-token")
          ) {
            response.cookies.set(c.name, "", {
              path: "/",
              maxAge: 0,
              expires: new Date(0),
            });
          }
        }
      } catch { /* ignore */ }

      return response;
    }
  }

  // Fallback — no code or token_hash
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`);
}
