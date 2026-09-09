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
      const emailLower = data.user.email?.toLowerCase() || "";

      const dbRole = (profile?.role || userMetaRole || "").toLowerCase();
      const isSuperAdminOrAdmin =
        dbRole === "super_admin" ||
        dbRole === "admin" ||
        emailLower.includes("admin");
      const isInstitution =
        dbRole === "institution" ||
        emailLower.includes("institution");
      const isTrainer =
        dbRole === "trainer" ||
        emailLower.includes("trainer");
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

      const redirectPath = isSafeNext ? next : defaultPath;

      return NextResponse.redirect(new URL(redirectPath, origin));
    }
  }

  // Fallback if neither code nor token_hash is present
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`);
}
