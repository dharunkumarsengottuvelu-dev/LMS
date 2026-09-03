import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveTimeService } from "@/services/active-time.service";
import { getStudentBatchAccess } from "@/lib/auth/batch-access";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const adminClient = createAdminClient();
    const batchContext = await getStudentBatchAccess(adminClient, user);
    const studentId = batchContext.profileId || user.id;

    const {
      sessionId,
      incrementSeconds = 15,
      isIdle = false,
      isHidden = false,
      isClosing = false,
      deviceInfo,
    } = body;

    if (isClosing && sessionId) {
      ActiveTimeService.closeSession(sessionId, studentId);
      return NextResponse.json({ success: true, closed: true });
    }

    const result = ActiveTimeService.recordHeartbeat({
      studentId,
      studentEmail: user.email,
      sessionId,
      incrementSeconds,
      isIdle,
      isHidden,
      deviceInfo,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("Heartbeat error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
