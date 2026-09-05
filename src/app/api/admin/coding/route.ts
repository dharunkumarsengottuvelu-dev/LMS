import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CodingProblem, TestCase } from "@/types/coding";

// GET /api/admin/coding - Fetch all coding problems from Supabase DB
export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Fetch problems from coding_problems table in chronological order (1st added is #1, followed by #2, #3, ...)
    const { data: dbProblems, error: pError } = await supabase
      .from("coding_problems")
      .select("*")
      .order("created_at", { ascending: true });

    if (pError) {
      console.error("Error fetching coding_problems from Supabase:", pError);
      return NextResponse.json({ error: pError.message }, { status: 500 });
    }

    if (!dbProblems || dbProblems.length === 0) {
      return NextResponse.json({ problems: [] });
    }

    // 2. Fetch all test cases for these problems
    const problemIds = dbProblems.map((p: any) => p.id);
    const { data: dbTestCases } = await supabase
      .from("test_cases")
      .select("*")
      .in("problem_id", problemIds)
      .order("order_index", { ascending: true });

    const testCasesByProblem = new Map<string, TestCase[]>();
    (dbTestCases || []).forEach((tc: any) => {
      const list = testCasesByProblem.get(tc.problem_id) || [];
      list.push({
        id: tc.id,
        name: `Case ${list.length + 1}`,
        input: tc.input,
        expected_output: tc.expected_output,
        is_hidden: !!tc.is_hidden,
        order_index: tc.order_index,
        weight: tc.weight || 10,
        is_enabled: true,
      });
      testCasesByProblem.set(tc.problem_id, list);
    });

    // 3. Map DB rows to CodingProblem domain models
    const problems: CodingProblem[] = dbProblems.map((p: any, idx: number) => {
      const extra = typeof p.starter_code === "object" && p.starter_code !== null ? p.starter_code : {};
      const sol = typeof p.solution_code === "object" && p.solution_code !== null ? p.solution_code : {};
      const tcList = testCasesByProblem.get(p.id) || extra.test_cases || [];

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        difficulty: p.difficulty,
        category: extra.category || "Algorithms",
        topic_tags: p.tags || extra.topic_tags || [],
        points: extra.points || 100,
        constraints: extra.constraints || "",
        input_format: extra.input_format || "",
        output_format: extra.output_format || "",
        example_cases: extra.example_cases || [],
        solution_editorial: sol.overview ? sol : extra.solution_editorial,
        templates: extra.templates || {},
        function_signature: extra.function_signature || "",
        test_cases: tcList,
        status: p.status || "published",
        max_attempts: extra.max_attempts || 0,
        time_limit_ms: p.time_limit_ms || 2000,
        memory_limit_mb: p.memory_limit_mb || 256,
        start_date: extra.start_date || "",
        due_date: extra.due_date || "",
        allow_run: extra.allow_run !== false,
        allow_submit: extra.allow_submit !== false,
        is_mandatory: !!extra.is_mandatory,
        acceptance_rate: extra.acceptance_rate || undefined,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    return NextResponse.json({ problems });
  } catch (error: any) {
    console.error("GET /api/admin/coding error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch coding problems." }, { status: 500 });
  }
}

// POST /api/admin/coding - Save or update coding problem(s) in Supabase DB
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    // Support single problem or array / { problems: [...] }
    const problemsList: CodingProblem[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.problems)
      ? body.problems
      : [body];

    if (!problemsList || problemsList.length === 0 || !problemsList[0]?.title) {
      return NextResponse.json({ error: "Problem title is required." }, { status: 400 });
    }

    const savedResults: any[] = [];

    for (const problem of problemsList) {
      if (!problem || !problem.title) continue;

      const problemId = problem.id && problem.id.includes("-") ? problem.id : undefined;
      const slug = problem.slug || problem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const starterCodePayload = {
        templates: problem.templates || {},
        function_signature: problem.function_signature || "",
        example_cases: problem.example_cases || [],
        constraints: problem.constraints || "",
        input_format: problem.input_format || "",
        output_format: problem.output_format || "",
        points: problem.points || 100,
        category: problem.category || "Algorithms",
        topic_tags: problem.topic_tags || [],
        max_attempts: problem.max_attempts || 0,
        start_date: problem.start_date || "",
        due_date: problem.due_date || "",
        allow_run: problem.allow_run !== false,
        allow_submit: problem.allow_submit !== false,
        is_mandatory: !!problem.is_mandatory,
        acceptance_rate: problem.acceptance_rate || undefined,
        test_cases: problem.test_cases || [],
      };

      const solutionCodePayload = problem.solution_editorial || null;

      let savedProblem: any = null;

      if (problemId) {
        // Upsert existing
        const { data, error } = await supabase
          .from("coding_problems")
          .upsert([
            {
              id: problemId,
              title: problem.title,
              slug,
              description: problem.description,
              difficulty: (problem.difficulty || "easy").toLowerCase(),
              tags: problem.topic_tags || [],
              time_limit_ms: problem.time_limit_ms || 2000,
              memory_limit_mb: problem.memory_limit_mb || 256,
              starter_code: starterCodePayload,
              solution_code: solutionCodePayload,
              status: problem.status || "published",
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Error upserting coding problem:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        savedProblem = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("coding_problems")
          .insert([
            {
              title: problem.title,
              slug,
              description: problem.description,
              difficulty: (problem.difficulty || "easy").toLowerCase(),
              tags: problem.topic_tags || [],
              time_limit_ms: problem.time_limit_ms || 2000,
              memory_limit_mb: problem.memory_limit_mb || 256,
              starter_code: starterCodePayload,
              solution_code: solutionCodePayload,
              status: problem.status || "published",
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Error inserting coding problem:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        savedProblem = data;
      }

      // Synchronize test_cases table
      if (savedProblem && savedProblem.id && problem.test_cases && problem.test_cases.length > 0) {
        // Delete existing test cases for this problem
        await supabase.from("test_cases").delete().eq("problem_id", savedProblem.id);

        const tcRows = problem.test_cases.map((tc, idx) => ({
          problem_id: savedProblem.id,
          input: tc.input || "",
          expected_output: tc.expected_output || "",
          is_hidden: !!tc.is_hidden,
          order_index: idx,
        }));

        const { error: tcErr } = await supabase.from("test_cases").insert(tcRows);
        if (tcErr) {
          console.warn("Test cases insert warning:", tcErr);
        }
      }

      savedResults.push(savedProblem);
    }

    return NextResponse.json({
      success: true,
      count: savedResults.length,
      problem: savedResults[0],
      problems: savedResults,
    });
  } catch (error: any) {
    console.error("POST /api/admin/coding error:", error);
    return NextResponse.json({ error: error.message || "Failed to save coding problem." }, { status: 500 });
  }
}

// DELETE /api/admin/coding - Delete problem from Supabase DB
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing problem 'id' parameter." }, { status: 400 });
    }

    const { error } = await supabase.from("coding_problems").delete().eq("id", id);
    if (error) {
      console.error("Error deleting coding problem:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/coding error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete coding problem." }, { status: 500 });
  }
}
