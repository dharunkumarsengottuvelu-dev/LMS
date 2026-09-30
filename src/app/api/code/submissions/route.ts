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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("student_id");
    const problemId = searchParams.get("problem_id");

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const userRole = (profile?.role || "").toLowerCase();
    const isStaff = userRole === "admin" || userRole === "super_admin" || userRole === "trainer";
    const myProfileId = profile?.id || user.id;

    // Students can only view their own submissions; staff can query any student
    const targetStudentId = isStaff && requestedStudentId ? requestedStudentId : myProfileId;

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

function toDeterministicUUID(str: string): string {
  if (!str) return "00000000-0000-0000-0000-000000000000";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, "0");
  const hex2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, "0");
  const hex3 = Math.abs((hash * 57) | 0).toString(16).padStart(8, "0");
  const hex4 = Math.abs((hash * 93) | 0).toString(16).padStart(8, "0");
  const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const body = await request.json();

    const {
      problem_id,
      language = "python",
      code,
      source_code,
      status = "accepted",
      passed_test_cases = 0,
      total_test_cases = 0,
      results,
      test_results,
    } = body;

    const actualCode = source_code || code || "";
    if (!problem_id) {
      return NextResponse.json({ error: "problem_id is required" }, { status: 400 });
    }

    // Resolve student profile id
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const studentProfileId = profile?.id || user.id;
    const problemUUID = toDeterministicUUID(problem_id);

    // Ensure problem exists in coding_problems to satisfy foreign key constraint
    const { data: existingProblem } = await adminClient
      .from("coding_problems")
      .select("id")
      .eq("id", problemUUID)
      .maybeSingle();

    if (!existingProblem) {
      await (adminClient.from("coding_problems") as any).insert({
        id: problemUUID,
        title: body.problem_title || `Problem ${problem_id}`,
        slug: body.problem_slug || `prob-${String(problem_id).toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        description: "Coding challenge problem",
        created_by: studentProfileId,
        status: "published",
      });
    }

    const submissionPayload = {
      problem_id: problemUUID,
      student_id: studentProfileId,
      language,
      source_code: actualCode,
      status,
      passed_test_cases: Number(passed_test_cases) || 0,
      total_test_cases: Number(total_test_cases) || 0,
      test_results: test_results || results || [],
      created_at: new Date().toISOString(),
    };

    const { data: savedRow, error: insertError } = await (adminClient
      .from("coding_submissions") as any)
      .insert([submissionPayload])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("Failed to insert coding submission:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: savedRow?.id,
        problem_id: problemUUID,
        student_id: studentProfileId,
        language,
        code: actualCode,
        status,
        passed_test_cases: Number(passed_test_cases) || 0,
        total_test_cases: Number(total_test_cases) || 0,
        results: test_results || results || [],
        created_at: savedRow?.created_at,
      },
    });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    console.error("POST /api/code/submissions error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

