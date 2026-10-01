import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { InstitutionPerformanceService } from "@/services/institution-performance.service";

export async function authenticateInstitutionSession() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return {
        errorResponse: NextResponse.json(
          { error: "Unauthorized: Active session required" },
          { status: 401 }
        ),
        user: null,
        institutionInfo: null,
      };
    }

    const role = (
      user.user_metadata?.role ||
      user.app_metadata?.role ||
      ""
    ).toLowerCase();

    const emailLower = user.email?.toLowerCase() || "";
    const [localPart = ""] = emailLower.split("@");

    // Check if role is allowed
    const isAllowed =
      role === "institution" ||
      role === "admin" ||
      role === "super_admin";

    // Also verify profile role
    const instInfo = await InstitutionPerformanceService.resolveInstitution(user.id, role);

    if (!isAllowed && !instInfo.isPlatformAdmin) {
      return {
        errorResponse: NextResponse.json(
          { error: "Forbidden: Access restricted to authorized institution accounts" },
          { status: 403 }
        ),
        user: null,
        institutionInfo: null,
      };
    }

    return {
      errorResponse: null,
      user,
      institutionInfo: instInfo,
    };
  } catch (err: any) {
    console.error("Institution auth error:", err);
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication service error" },
        { status: 500 }
      ),
      user: null,
      institutionInfo: null,
    };
  }
}
