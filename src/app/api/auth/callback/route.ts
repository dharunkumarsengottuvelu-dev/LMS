import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Determine current origin safely (handles reverse proxy headers like Vercel / Railway)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  // Check if provider returned an error directly in query string
  const authError = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  if (authError) {
    console.error("OAuth provider returned error in callback:", authError, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || authError)}`);
  }

  const token_hash = requestUrl.searchParams.get("token_hash");
  const otpType = (requestUrl.searchParams.get("type") as any) || "magiclink";

  if (code || token_hash) {
    const supabase = await createClient();
    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: token_hash!, type: otpType });

    if (error) {
      console.error("Supabase exchangeCodeForSession failed:", error.message, error);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data?.user) {
      // Fetch user role to redirect to the correct dashboard
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
      const [localPart = ""] = emailLower.split("@");
      const dbRole = (profile?.role || userMetaRole || "").toLowerCase();
      const isSuperAdminOrAdmin =
        dbRole === "super_admin" ||
        dbRole === "admin" ||
        dbRole === "founder" ||
        dbRole === "ceo" ||
        (!dbRole && (localPart === "admin" || localPart.startsWith("admin.") || localPart.startsWith("superadmin")));
      const isInstitution =
        dbRole === "institution" ||
        (!dbRole && (localPart === "institution" || localPart.startsWith("institution.")));
      const isTrainer =
        dbRole === "trainer" ||
        (!dbRole && (localPart === "trainer" || localPart.startsWith("trainer.")));
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
        if (isSuperAdminOrAdmin && (next.startsWith("/admin") || next.startsWith("/coding") || next.startsWith("/courses") || next.startsWith("/ide"))) {
          redirectPath = next;
        } else if (isInstitution && next.startsWith("/institution")) {
          redirectPath = next;
        } else if (isTrainer && (next.startsWith("/trainer") || next.startsWith("/coding") || next.startsWith("/ide"))) {
          redirectPath = next;
        } else if (!isSuperAdminOrAdmin && !isInstitution && !isTrainer && !next.startsWith("/admin") && !next.startsWith("/trainer") && !next.startsWith("/institution")) {
          redirectPath = next;
        }
      }

      const response = NextResponse.redirect(new URL(redirectPath, origin));

      // 1. Ensure the clean, compact tokens-only session cookie is attached to the 302 response
      const { cookies: getCookies } = await import("next/headers");
      const cookieStore = await getCookies();
      for (const c of cookieStore.getAll()) {
        if (
          !c.name.includes("provider-token") &&
          !c.name.includes("provider-refresh-token") &&
          !c.name.includes("provider_token") &&
          !/\-auth\-token\.\d+$/.test(c.name)
        ) {
          response.cookies.set(c.name, c.value, {
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            domain: undefined,
          });
        }
      }

      // 2. Cleanse any bloated provider tokens, old chunked cookies (.0, .1), or legacy cookies
      // from the client across all scopes to guarantee the subsequent request to /student/dashboard
      // carries only the single ~1.2 KB session token.
      const cookieHeader = request.headers.get("cookie") || "";
      const cookiePairs = cookieHeader.split(";").map((p) => p.trim());
      const host = requestUrl.hostname;
      const isDomainWithDots = host.includes(".");
      const paths = ["/", "/api/auth/callback", "/student", "/admin", "/trainer", "/institution", "/api"];
      const domains: (string | undefined)[] = isDomainWithDots ? [undefined, host, `.${host}`] : [undefined];

      for (const pair of cookiePairs) {
        const eqIdx = pair.indexOf("=");
        const name = eqIdx > -1 ? pair.slice(0, eqIdx).trim() : pair.trim();
        if (
          name.includes("provider-token") ||
          name.includes("provider-refresh-token") ||
          name.includes("provider_token") ||
          /\-auth\-token\.\d+$/.test(name) ||
          name.endsWith("-code-verifier") ||
          name.startsWith("falcon_") ||
          name.startsWith("g_state")
        ) {
          for (const p of paths) {
            for (const d of domains) {
              response.cookies.set(name, "", {
                path: p,
                domain: d,
                maxAge: 0,
                expires: new Date(0),
              });
            }
          }
        }
      }

      return response;
    }
  }

  // Fallback if neither code nor token_hash is present
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`);
}
