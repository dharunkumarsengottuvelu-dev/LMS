import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchLMSEvent } from "@/lib/notifications/dispatcher";
import type { CodingProblem, TestCase } from "@/types/coding";

// GET /api/admin/coding - Fetch coding problems from Supabase DB scoped to Code Lab or Practice
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get("scope") || searchParams.get("context") || "codelab";

    // 1. Fetch practice tracks to identify practice problem associations
    const { data: dbTracks } = await supabase.from("practice_tracks").select("sub_modules, tags");
    const practiceProblemIds = new Set<string>();
    (dbTracks || []).forEach((t: any) => {
      let subModules = t.sub_modules || [];
      if (!Array.isArray(subModules) && t.tags && t.tags[0]) {
        try { subModules = JSON.parse(t.tags[0]).subModules || []; } catch {}
      }
      (subModules || []).forEach((sm: any) => {
        (sm.codingQuestions || []).forEach((cq: any) => {
          if (cq.id) practiceProblemIds.add(cq.id);
        });
        (sm.modules || []).forEach((m: any) => {
          (m.codingQuestions || []).forEach((cq: any) => {
            if (cq.id) practiceProblemIds.add(cq.id);
          });
        });
      });
    });

    // 2. Fetch problems from coding_problems table in chronological order (1st added is #1, followed by #2, #3, ...)
    const { data: rawProblems, error: pError } = await supabase
      .from("coding_problems")
      .select("*")
      .order("created_at", { ascending: true });

    if (pError) {
      console.error("Error fetching coding_problems from Supabase:", pError);
      return NextResponse.json({ error: pError.message }, { status: 500 });
    }

    // 3. Scope separation (Option 1 with toggle support):
    // - "codelab": problems created for Code Lab + practice problems explicitly toggled on for Code Lab
    // - "practice": problems created for Practice tracks
    // - "all": all problems
    const dbProblems = (rawProblems || []).filter((p: any) => {
      const extra = typeof p.starter_code === "object" && p.starter_code !== null ? p.starter_code : {};
      const isExplicitCodeLab =
        extra.is_codelab === true ||
        extra.isCodeLab === true ||
        extra.scope === "codelab" ||
        extra.scope === "both" ||
        (p as any).is_codelab === true ||
        (p as any).isCodeLab === true ||
        (p as any).scope === "codelab" ||
        (p as any).scope === "both";
      const isPractice = extra.scope === "practice" || !!extra.module_id || practiceProblemIds.has(p.id);

      if (scopeParam === "practice") {
        return isPractice || extra.scope === "both";
      }
      if (scopeParam === "codelab") {
        if (isExplicitCodeLab) return true;
        return !isPractice && extra.scope !== "practice";
      }
      // "all": return all problems
      return true;
    });

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
      const dbTc = testCasesByProblem.get(p.id);
      const sampleTc = Array.isArray(extra.sample_test_cases) ? extra.sample_test_cases : [];
      const hiddenTc = Array.isArray(extra.hidden_test_cases) ? extra.hidden_test_cases : [];
      const combinedTc = [...sampleTc, ...hiddenTc];
      const tcList = (dbTc && dbTc.length > 0) ? dbTc : (combinedTc.length > 0 ? combinedTc : (extra.test_cases || []));

      return {
        id: p.id,
        problem_number: extra.problem_number ? Number(extra.problem_number) : (idx + 1),
        title: p.title,
        slug: p.slug,
        description: p.description,
        difficulty: p.difficulty,
        category: extra.category || extra.type || p.category || (p as any).type || "Algorithm",
        type: extra.type || extra.category || (p as any).type || p.category || "Algorithm",
        topic_tags: p.tags || extra.topic_tags || [],
        points: extra.points || 100,
        constraints: extra.constraints || "",
        input_format: extra.input_format || "",
        output_format: extra.output_format || "",
        example_cases: extra.example_cases || [],
        solution_editorial: sol.overview ? sol : extra.solution_editorial,
        templates: extra.templates || {},
        allowed_languages: extra.allowed_languages || extra.allowedLanguages || (extra.templates ? Object.keys(extra.templates) : undefined),
        allowedLanguages: extra.allowedLanguages || extra.allowed_languages || (extra.templates ? Object.keys(extra.templates) : undefined),
        default_language: extra.default_language || undefined,
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
        enforce_fullscreen: !!extra.enforce_fullscreen,
        restrict_copy_paste: !!extra.restrict_copy_paste,
        restrict_screenshot: !!extra.restrict_screenshot,
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

      // Only treat as existing record if it's a real UUID (36-char standard format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      // Bulk-generated IDs like "problem-two-sum-1234-0" are NOT real UUIDs and must be inserted as new
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isRealUUID = Boolean(problem.id && UUID_REGEX.test(problem.id));
      let problemId = isRealUUID ? problem.id : undefined;

      // If problemId is not directly a UUID, check if this problem already exists in DB by slug so we UPDATE it instead of creating a duplicate
      if (!problemId && problem.slug) {
        const { data: matchSlug } = await supabase
          .from("coding_problems")
          .select("id")
          .eq("slug", problem.slug)
          .maybeSingle();
        if (matchSlug?.id) {
          problemId = matchSlug.id;
        }
      }

      // Generate a clean slug: preserve exact slug for existing problems, only append timestamp for new inserts
      const baseSlug = problem.slug || problem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const slug = problemId ? (problem.slug || baseSlug) : `${baseSlug}-${Date.now().toString(36)}`;

      const rawTestCases = Array.isArray(problem.test_cases)
        ? problem.test_cases
        : Array.isArray((problem as any).testCases)
        ? (problem as any).testCases
        : [];

      const allTestCases = rawTestCases.map((tc: any, idx: number) => ({
        id: tc.id || `tc_${idx + 1}`,
        name: tc.name || `Test Case ${idx + 1}`,
        input: tc.input !== undefined && tc.input !== null ? String(tc.input) : (tc.stdin !== undefined && tc.stdin !== null ? String(tc.stdin) : ""),
        expected_output: tc.expected_output !== undefined && tc.expected_output !== null
          ? String(tc.expected_output)
          : (tc.expectedOutput !== undefined && tc.expectedOutput !== null
            ? String(tc.expectedOutput)
            : (tc.output !== undefined && tc.output !== null ? String(tc.output) : "")),
        is_hidden: Boolean(tc.is_hidden || tc.isHidden),
        weight: tc.weight !== undefined ? Number(tc.weight) : 10,
      }));

      const sampleTestCases = allTestCases.filter((tc: any) => !tc.is_hidden);
      const hiddenTestCases = allTestCases.filter((tc: any) => !!tc.is_hidden);

      const problemScope = (problem as any).scope || ((problem as any).module_id || (problem as any).assessment_id ? "practice" : "codelab");
      const starterCodePayload = {
        scope: problemScope,
        module_id: (problem as any).module_id || (problem as any).moduleId || undefined,
        assessment_id: (problem as any).assessment_id || undefined,
        templates: problem.templates || {},
        allowed_languages: problem.allowed_languages || (problem as any).allowedLanguages || undefined,
        allowedLanguages: problem.allowed_languages || (problem as any).allowedLanguages || undefined,
        default_language: (problem as any).default_language || undefined,
        function_signature: problem.function_signature || "",
        example_cases: problem.example_cases || [],
        constraints: problem.constraints || "",
        input_format: problem.input_format || "",
        output_format: problem.output_format || "",
        points: problem.points || 100,
        category: problem.category || (problem as any).type || "Algorithm",
        type: (problem as any).type || problem.category || "Algorithm",
        topic_tags: problem.topic_tags || [],
        max_attempts: problem.max_attempts || 0,
        start_date: problem.start_date || "",
        due_date: problem.due_date || "",
        allow_run: problem.allow_run !== false,
        allow_submit: problem.allow_submit !== false,
        is_mandatory: !!problem.is_mandatory,
        enforce_fullscreen: !!problem.enforce_fullscreen,
        restrict_copy_paste: !!problem.restrict_copy_paste,
        restrict_screenshot: !!problem.restrict_screenshot,
        acceptance_rate: problem.acceptance_rate || undefined,
        problem_number: (problem as any).problem_number ? Number((problem as any).problem_number) : undefined,
        test_cases: allTestCases,
        sample_test_cases: sampleTestCases,
        hidden_test_cases: hiddenTestCases,
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
      if (savedProblem && savedProblem.id && allTestCases.length > 0) {
        // Delete existing test cases for this problem
        await supabase.from("test_cases").delete().eq("problem_id", savedProblem.id);

        const tcRows = allTestCases.map((tc: any, idx: number) => ({
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

      savedResults.push({
        ...savedProblem,
        test_cases: allTestCases,
        sample_test_cases: sampleTestCases,
        hidden_test_cases: hiddenTestCases,
      });

      // Asynchronously dispatch notification if published
      try {
        const isDraft = (savedProblem?.status || "").toLowerCase() === "draft";
        const isUpdate = Boolean(problemId);
        const eventType = isUpdate ? "CODING_PROBLEM_UPDATED" : "CODING_PROBLEM_PUBLISHED";
        const pTitle = savedProblem?.title || problem.title;
        const problemTargetUrl = `/coding/problems/${savedProblem?.id || problemId || savedProblem?.slug || "1"}`;

        if (!isDraft) {
          dispatchLMSEvent({
            isCommon: true,
            eventType,
            name: pTitle,
            title: isUpdate ? `Coding Challenge Updated – ${pTitle}` : `New Coding Challenge Available – ${pTitle}`,
            category: (problem.topic_tags && problem.topic_tags[0]) || "Algorithms & Problem Solving",
            difficulty: savedProblem?.difficulty || problem.difficulty,
            resourceType: "problem",
            resourceId: savedProblem?.id,
            targetUrl: problemTargetUrl,
            assignedBy: "SensiLearn Academic Faculty",
            changeSummary: isUpdate ? "Problem statements or test suites updated" : undefined,
          }).catch((e) => console.warn("Coding problem broadcast notification error:", e));
        }
      } catch (notifErr) {
        console.warn("Notice: Problem notification trigger warning:", notifErr);
      }
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

// DELETE /api/admin/coding - Delete problem(s) from Supabase DB
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");

    let idsToDelete: string[] = [];
    if (idsParam) {
      idsToDelete = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (id) {
      idsToDelete = [id];
    } else {
      try {
        const body = await request.json();
        if (Array.isArray(body.ids)) {
          idsToDelete = body.ids;
        } else if (body.id) {
          idsToDelete = [body.id];
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: "Missing problem 'id' or 'ids' parameter." }, { status: 400 });
    }

    const { error } = await supabase.from("coding_problems").delete().in("id", idsToDelete);
    if (error) {
      console.error("Error deleting coding problem(s):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: idsToDelete.length });
  } catch (error: any) {
    console.error("DELETE /api/admin/coding error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete coding problem." }, { status: 500 });
  }
}
