import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("student_id");
    const problemId = searchParams.get("problem_id");

    let targetStudentId = requestedStudentId;
    if (!targetStudentId && user) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      targetStudentId = profile?.id || user.id;
    }

    let query = adminClient
      .from("coding_submissions")
      .select("*, coding_problems(title, slug, difficulty)")
      .order("created_at", { ascending: false });

    if (targetStudentId) {
      // Could be profile id or auth user id
      query = query.or(`student_id.eq.${targetStudentId}`);
    }

    if (problemId) {
      query = query.eq("problem_id", problemId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const formatted = (rows || []).map((r: any) => ({
      id: r.id,
      problem_id: r.problem_id,
      problem_title: r.coding_problems?.title || `Problem ${r.problem_id}`,
      problem_slug: r.coding_problems?.slug,
      student_id: r.student_id,
      language: r.language,
      code: r.source_code,
      status: r.status,
      passed_test_cases: r.passed_test_cases || 0,
      total_test_cases: r.total_test_cases || 0,
      execution_time: r.execution_time_ms ? `${r.execution_time_ms}ms` : undefined,
      results: r.test_results || [],
      created_at: r.created_at,
    }));

    return NextResponse.json({
      success: true,
      submissions: formatted,
      total: formatted.length,
    });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    console.error("GET /api/code/submissions error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
