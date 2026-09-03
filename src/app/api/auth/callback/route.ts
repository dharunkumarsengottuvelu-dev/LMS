import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Determine current origin safely (handles Vercel reverse proxy headers)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  const token_hash = requestUrl.searchParams.get("token_hash");
  const otpType = (requestUrl.searchParams.get("type") as any) || "magiclink";

  if (code || token_hash) {
    const supabase = await createClient();
    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: token_hash!, type: otpType });

    if (!error && data.user) {
      // Fetch user role to redirect to correct dashboard
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
      const isTrainer =
        dbRole === "trainer" ||
        emailLower.includes("trainer");
      const isRecruiter = dbRole === "recruiter";

      const defaultPath = isSuperAdminOrAdmin
        ? "/admin/dashboard"
        : isTrainer
        ? "/trainer/dashboard"
        : isRecruiter
        ? "/admin/students"
        : "/student/dashboard";

      const next = requestUrl.searchParams.get("next");
      const redirectPath =
        next && next.startsWith("/") && !next.startsWith("/login") && !next.startsWith("/register")
          ? next
          : defaultPath;

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
