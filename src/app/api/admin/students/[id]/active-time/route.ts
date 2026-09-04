import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveTimeService } from "@/services/active-time.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = profile?.role || "student";
    if (role !== "admin" && role !== "superadmin" && role !== "trainer") {
      return NextResponse.json({ error: "Forbidden: Admin or Trainer access required" }, { status: 403 });
    }

    const { id: studentId } = await context.params;
    const activeTimeData = await ActiveTimeService.getStudentActiveTime(studentId);

    return NextResponse.json({
      success: true,
      activeTime: activeTimeData,
    });
  } catch (err: any) {
    console.error("Admin get active time error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
