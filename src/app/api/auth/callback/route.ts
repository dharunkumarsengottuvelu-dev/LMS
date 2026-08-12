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

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Fetch user role to redirect to correct dashboard
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      const profile = profileData as { role?: string } | null;
      const role = profile?.role ?? "student";
      const redirectPath =
        role === "admin"
          ? "/admin/dashboard"
          : role === "trainer"
          ? "/trainer/dashboard"
          : "/student/dashboard";

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
