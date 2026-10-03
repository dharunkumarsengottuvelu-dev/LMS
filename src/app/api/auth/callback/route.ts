import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vdpokcnbslgzyufybxey.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

interface BufferedCookie {
  name: string;
  value: string;
  options: {
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
    sameSite?: "lax" | "strict" | "none" | boolean;
    secure?: boolean;
    httpOnly?: boolean;
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Determine current origin safely (handles reverse proxy headers like Vercel / Railway / Cloudflare)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

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
    const cookieStore = await cookies();
    const cookiesToPersist: BufferedCookie[] = [];

    // Create Supabase SSR client specifically configured for route handlers with direct cookie capture
    const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        encode: "tokens-only",
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Drop oversized third-party provider tokens (Google OAuth access/refresh tokens: ~2-4 KB)
            // They cause 494 REQUEST_HEADER_TOO_LARGE on Vercel
            if (
              name.includes("provider-token") ||
              name.includes("provider-refresh-token") ||
              name.includes("provider_token") ||
              /\-auth\-token\.\d+$/.test(name)
            ) {
              return;
            }

            const cookieOpts = {
              ...options,
              path: "/",
              sameSite: "lax" as const,
              secure: process.env.NODE_ENV === "production",
              domain: undefined,
            };

            // Write to Next.js cookie store
            try {
              cookieStore.set(name, value, cookieOpts);
            } catch {
              // Ignore if headers are already closed
            }

            // Buffer cookie so we can explicitly set it on the outgoing NextResponse.redirect
            cookiesToPersist.push({ name, value, options: cookieOpts });
          });
        },
      },
    });

    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: token_hash!, type: otpType });

    if (error) {
      console.error("Supabase exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data?.user) {
      const user = data.user;
      let userRole = "student";
      let userStatus = "active";

      // 1. Authoritative profile lookup & sync
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();

        const { data: existingProfileData } = await adminClient
          .from("profiles")
          .select("role, status")
          .eq("user_id", user.id)
          .maybeSingle();

        const existingProfile = existingProfileData as { role?: string; status?: string } | null;

        if (existingProfile) {
          userRole = (existingProfile.role || "student").toLowerCase();
          userStatus = existingProfile.status || "active";
        } else {
          // Brand new user from OAuth — create their initial profile without overwriting existing data
          const meta = user.user_metadata || {};
          const fullName = meta.full_name || meta.name || "";
          const nameParts = fullName.split(" ");
          const firstName = meta.first_name || meta.given_name || nameParts[0] || user.email?.split("@")[0] || "User";
          const lastName = meta.last_name || meta.family_name || nameParts.slice(1).join(" ") || "";
          const avatarUrl = meta.avatar_url || meta.picture || null;
          const initialRole = (meta.role || user.app_metadata?.role || "student").toLowerCase();

          const { data: createdProfileData, error: insertError } = await (adminClient.from("profiles") as any)
            .upsert(
              {
                user_id: user.id,
                first_name: firstName,
                last_name: lastName,
                email: user.email,
                role: initialRole,
                avatar_url: avatarUrl,
                status: "active",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            )
            .select("role, status")
            .maybeSingle();

          const createdProfile = createdProfileData as { role?: string; status?: string } | null;

          if (!insertError && createdProfile) {
            userRole = (createdProfile.role || initialRole).toLowerCase();
            userStatus = createdProfile.status || "active";
          }
        }
      } catch (adminErr) {
        console.warn("Admin profile sync fallback in OAuth callback:", adminErr);
        // Fallback to user client
        const { data: profileData } = await (supabase.from("profiles") as any)
          .select("role, status")
          .eq("user_id", user.id)
          .maybeSingle();

        const profile = profileData as { role?: string; status?: string } | null;

        if (profile?.role) {
          userRole = profile.role.toLowerCase();
          userStatus = profile.status || "active";
        } else {
          userRole = (user.user_metadata?.role || user.app_metadata?.role || "student").toLowerCase();
        }
      }

      // Check account suspension
      if (userStatus === "suspended") {
        return NextResponse.redirect(`${origin}/login?error=suspended`);
      }

      // 2. Resolve target dashboard based on authoritative role
      const isSuperAdminOrAdmin =
        userRole === "super_admin" ||
        userRole === "admin" ||
        userRole === "founder" ||
        userRole === "ceo" ||
        userRole === "hod" ||
        userRole === "principal";
      const isInstitution = userRole === "institution";
      const isTrainer = userRole === "trainer";
      const isRecruiter = userRole === "recruiter";

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

      // 3. Construct redirect response and explicitly attach authenticated session cookies
      const response = NextResponse.redirect(new URL(redirectPath, origin));

      for (const { name, value, options } of cookiesToPersist) {
        response.cookies.set(name, value, options);
      }

      // 4. Evict obsolete/bloated provider tokens from the client across all scopes
      const allCookies = cookieStore.getAll();
      const host = requestUrl.hostname;
      const isDomainWithDots = host.includes(".");
      const paths = ["/", "/api/auth/callback", "/auth/callback", "/student", "/admin", "/trainer", "/institution", "/api"];
      const domains: (string | undefined)[] = isDomainWithDots ? [undefined, host, `.${host}`] : [undefined];

      for (const cookie of allCookies) {
        const { name } = cookie;
        if (
          name.includes("provider-token") ||
          name.includes("provider-refresh-token") ||
          name.includes("provider_token") ||
          /\-auth\-token\.\d+$/.test(name) ||
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
