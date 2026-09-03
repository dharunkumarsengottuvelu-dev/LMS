import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveTimeService } from "@/services/active-time.service";
import { getStudentBatchAccess } from "@/lib/auth/batch-access";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const batchContext = await getStudentBatchAccess(adminClient, user);
    const studentId = batchContext.profileId || user.id;

    const activeTimeData = ActiveTimeService.getStudentActiveTime(studentId);

    return NextResponse.json({
      success: true,
      activeTime: activeTimeData,
    });
  } catch (err: any) {
    console.error("Get active time error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
