import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function authenticateAdminSession(
  allowedRoles: string[] = ["super_admin", "admin"]
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return {
        errorResponse: NextResponse.json(
          { error: "Unauthorized: Active session required" },
          { status: 401 }
        ),
        user: null,
        role: null,
        adminClient: null,
      };
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const role = (
      profile?.role ||
      user.user_metadata?.role ||
      user.app_metadata?.role ||
      ""
    ).toLowerCase();

    const emailLower = user.email?.toLowerCase() || "";
    const isSuperAdmin = role === "super_admin";
    const isAdmin = role === "admin" || emailLower.includes("admin");
    const isTrainer = role === "trainer" || emailLower.includes("trainer");

    const effectiveRole = isSuperAdmin
      ? "super_admin"
      : isAdmin
      ? "admin"
      : isTrainer
      ? "trainer"
      : role || "student";

    const isAllowed = allowedRoles.includes(effectiveRole);

    if (!isAllowed) {
      return {
        errorResponse: NextResponse.json(
          { error: `Forbidden: Restricted to ${allowedRoles.join(", ")}` },
          { status: 403 }
        ),
        user: null,
        role: null,
        adminClient: null,
      };
    }

    return {
      errorResponse: null,
      user,
      role: effectiveRole,
      adminClient,
    };
  } catch (err: any) {
    console.error("Admin auth session error:", err);
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication service error" },
        { status: 500 }
      ),
      user: null,
      role: null,
      adminClient: null,
    };
  }
}
