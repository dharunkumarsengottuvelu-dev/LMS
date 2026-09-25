import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { getAppOrigin } from "@/config/site";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!;

/**
 * After a successful OAuth session exchange, prunes spent temporary PKCE cookies,
 * duplicate unchunked session tokens, and oversized provider tokens.
 *
 * Runs exclusively AFTER exchangeCodeForSession has consumed the code_verifier.
 */
function cleanupAfterExchange(
  response: NextResponse,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  try {
    const all = cookieStore.getAll();
    const names = new Set(all.map((c) => c.name));

    for (const c of all) {
      let shouldExpire = false;

      // 1. The code_verifier was consumed by exchangeCodeForSession
      if (c.name.includes("-code-verifier")) {
        shouldExpire = true;
      }

      // 2. Remove duplicate unchunked session cookie if chunked (.0) now exists
      if (c.name.endsWith("-auth-token") && names.has(`${c.name}.0`)) {
        shouldExpire = true;
      }

      // 3. Remove raw provider token (Google access/refresh tokens ~2-3KB, unneeded for app auth)
      if (c.name.includes("-provider-token") || c.name.includes("-provider-refresh-token")) {
        shouldExpire = true;
      }

      // 4. Remove legacy brand cookies
      if (
        c.name.startsWith("falcon_") ||
        c.name.includes("falcon") ||
        c.name.startsWith("g_state") ||
        c.name.includes("oauth_state")
      ) {
        shouldExpire = true;
      }

      if (shouldExpire) {
        try {
          cookieStore.delete(c.name);
        } catch {}

        // Strictly host-only expiration
        response.cookies.set(c.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
    }
  } catch {
    // Non-critical — cookie cleanup failure must not block authentication redirect
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getAppOrigin(request);

  // ── 1. Handle OAuth provider errors (e.g. user cancelled or state expired) ─
  const authError = requestUrl.searchParams.get("error");
  const errorCode = requestUrl.searchParams.get("error_code");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (authError || errorCode) {
    console.warn(`[auth/callback] OAuth provider returned error: ${errorCode || authError}`);

    const failureRedirect = errorCode === "bad_oauth_state" || (errorDescription && errorDescription.includes("expired"))
      ? `${origin}/login?error=oauth_state_expired`
      : `${origin}/login?error=${encodeURIComponent(errorDescription || authError || "authentication_failed")}`;

    const failureResponse = NextResponse.redirect(failureRedirect);

    // Clean up any in-flight code-verifier so subsequent login attempts start completely fresh
    try {
      const cookieStore = await cookies();
      cookieStore.getAll().forEach((c) => {
        if (c.name.includes("-code-verifier")) {
          failureResponse.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0) });
        }
      });
    } catch { /* ignore */ }

    return failureResponse;
  }

  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const otpType = (requestUrl.searchParams.get("type") as any) || "magiclink";

  if (!code && !token_hash) {
    console.warn("[auth/callback] Invoked without code or token_hash parameter");
    return NextResponse.redirect(`${origin}/login?error=no_auth_code`);
  }

  // ── 2. Exchange authorization code for authenticated session ──────────────
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // Host-only: never specify domain
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
          console.warn("[auth/callback] Notice: cookieStore write in handler context");
        }
      },
    },
  });

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: token_hash!, type: otpType });

  if (error) {
    console.warn(`[auth/callback] Exchange failed: ${error.message}`);
    const errResponse = NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );

    // Clean up spent/invalid PKCE verifier to avoid poisoning subsequent attempts
    try {
      cookieStore.getAll().forEach((c) => {
        if (c.name.includes("-code-verifier")) {
          errResponse.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0) });
        }
      });
    } catch { /* ignore */ }

    return errResponse;
  }

  if (!data?.user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // ── 3. Role-based routing to dedicated user portal ─────────────────────────
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

  // ── 4. Build redirect response and prune spent OAuth/duplicate state ───────
  const response = NextResponse.redirect(new URL(redirectPath, origin));

  // Copy active Supabase auth tokens to redirect response to guarantee persistence
  cookieStore.getAll().forEach((c) => {
    if (c.name.startsWith("sb-") && !c.name.includes("-code-verifier") && !c.name.includes("-provider-token")) {
      response.cookies.set(c.name, c.value, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  });

  cleanupAfterExchange(response, cookieStore);

  return response;
}
