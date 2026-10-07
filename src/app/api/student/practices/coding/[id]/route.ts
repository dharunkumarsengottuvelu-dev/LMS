import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { extractSampleTestCases } from "@/lib/compiler/comparator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: problemId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const studentUserId = user.id;

    // Get student profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", studentUserId)
      .maybeSingle() as any;

    const profileId = profile?.id || studentUserId;

    // Fetch problem details (NEVER select hidden_test_cases or hidden test answers)
    const { data: problem, error: problemError } = await adminClient
      .from("coding_problems")
      .select("id, title, slug, description, difficulty, tags, time_limit_ms, memory_limit_mb, starter_code, sample_test_cases, test_cases, example_cases, constraints, input_format, output_format, points, templates, created_at")
      .eq("id", problemId)
      .maybeSingle() as any;

    if (problemError || !problem) {
      return NextResponse.json({ error: "Coding problem not found" }, { status: 404 });
    }

    const starter = typeof problem.starter_code === "object" && problem.starter_code !== null ? problem.starter_code : {};

    // Filter public test cases safely
    let publicTestCases = extractSampleTestCases(problem);
    if (publicTestCases.length === 0 || (publicTestCases.length === 1 && !publicTestCases[0]?.expected_output)) {
      const { data: dbTc } = await adminClient
        .from("test_cases")
        .select("id, input, expected_output")
        .eq("problem_id", problemId)
        .eq("is_hidden", false)
        .order("order_index", { ascending: true });
      if (dbTc && dbTc.length > 0) {
        publicTestCases = dbTc.map((tc: any, i: number) => ({
          id: tc.id || `tc_pub_${i + 1}`,
          name: `Sample Case ${i + 1}`,
          input: tc.input || "",
          expected_output: tc.expected_output || "",
          is_hidden: false,
        }));
      }
    }

    // Fetch student's latest submission for this problem
    const { data: latestSubmission } = await adminClient
      .from("coding_submissions")
      .select("id, code, language, status, score, max_score, execution_time_ms, memory_used_kb, created_at")
      .eq("problem_id", problemId)
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as any;

    return NextResponse.json({
      problem: {
        id: problem.id,
        title: problem.title,
        slug: problem.slug,
        description: problem.description,
        difficulty: problem.difficulty || "medium",
        tags: problem.tags || [],
        points: problem.points || 100,
        constraints: problem.constraints || starter.constraints || "",
        input_format: problem.input_format || starter.input_format || "",
        output_format: problem.output_format || starter.output_format || "",
        example_cases: problem.example_cases || starter.example_cases || [],
        timeLimitMs: problem.time_limit_ms || 2000,
        memoryLimitKb: (problem.memory_limit_mb ? problem.memory_limit_mb * 1024 : 262144),
        templates: starter.templates || problem.templates || {},
        allowedLanguages: starter.allowed_languages || starter.allowedLanguages || (starter.templates ? Object.keys(starter.templates) : undefined),
        allowed_languages: starter.allowed_languages || starter.allowedLanguages || (starter.templates ? Object.keys(starter.templates) : undefined),
        defaultLanguage: starter.default_language || (starter.allowed_languages?.[0]) || "java",
        sampleTestCases: publicTestCases,
        test_cases: publicTestCases,
      },
      latestSubmission: latestSubmission || null,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("GET /api/student/practices/coding/[id] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
