import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch class details
    const { data: classRecord } = await adminClient
      .from("live_classes")
      .select("id, course_id, batch_id")
      .eq("id", classId)
      .maybeSingle();

    const courseId = classRecord?.course_id;
    const batchId = classRecord?.batch_id;

    // 2. Fetch enrolled students from profiles
    let query = adminClient
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, role, avatar_url, batch, batch_name, batch_id")
      .eq("role", "student");

    if (batchId) {
      const sanitizedBatch = String(batchId).replace(/[^a-zA-Z0-9_\-\s]/g, "");
      if (sanitizedBatch) {
        query = query.or(`batch_id.eq.${sanitizedBatch},batch.eq.${sanitizedBatch},batch_name.eq.${sanitizedBatch}`);
      }
    }

    const { data: studentsData, error } = await query.order("first_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const roster = (studentsData || []).map((s: any) => ({
      userId: s.user_id || s.id,
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email?.split("@")[0] || "Student",
      email: s.email || "",
      avatarUrl: s.avatar_url || null,
      role: "student" as const,
      batch: s.batch_name || s.batch || "General",
    }));

    return NextResponse.json({ roster });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch class roster" }, { status: 500 });
  }
}
