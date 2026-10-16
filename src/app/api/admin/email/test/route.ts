import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { testSmtpConnection } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify sender is admin or super_admin
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, role")
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    const senderRole = (senderProfile?.role || "").toLowerCase();
    if (!["admin", "super_admin"].includes(senderRole)) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    let testEmail: string | undefined;
    try {
      const body = await request.json();
      testEmail = body?.testEmail;
    } catch {
      // Body may be empty, defaults to SMTP_USER
    }

    const result = await testSmtpConnection(testEmail);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error during SMTP test" },
      { status: 500 }
    );
  }
}
