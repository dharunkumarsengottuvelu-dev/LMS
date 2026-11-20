import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateAdminSession } from "@/app/api/admin/_auth";
import { dispatchLMSEvent } from "@/lib/notifications/dispatcher";
import { formatCleanProblemTitle } from "@/lib/utils";
import type { CodingProblem, TestCase } from "@/types/coding";

// GET /api/admin/coding - Fetch coding problems from Supabase DB scoped to Code Lab or Practice
export async function GET(request: NextRequest) {
  try {
    const { errorResponse, adminClient: supabase } = await authenticateAdminSession([
      "super_admin",
      "admin",
      "trainer",
      "student",
    ]);
    if (errorResponse) return errorResponse;
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

    // 3. Strict scope separation & module isolation:
    // - "codelab": problems explicitly created for Code Lab / Challenges
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
      const isPractice =
        extra.scope === "practice" ||
        (p as any).scope === "practice" ||
        Boolean(extra.module_id) ||
        Boolean(extra.assessment_id) ||
        practiceProblemIds.has(p.id);

      if (scopeParam === "practice") {
        return isPractice || extra.scope === "both";
      }
      if (scopeParam === "codelab") {
        // Strict isolation: only explicitly assigned/created Challenge problems appear in Challenges.
        // Practice problems NEVER appear in Challenges.
        return isExplicitCodeLab && !isPractice;
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
      let extra = typeof p.starter_code === "object" && p.starter_code !== null ? p.starter_code : {};
      if (typeof p.starter_code === "string") {
        try {
          extra = JSON.parse(p.starter_code);
        } catch {
          extra = {};
        }
      }
      let sol = typeof p.solution_code === "object" && p.solution_code !== null ? p.solution_code : {};
      if (typeof p.solution_code === "string") {
        try {
          sol = JSON.parse(p.solution_code);
        } catch {
          sol = {};
        }
      }
      const extraStarter = typeof extra.starter_code === "object" && extra.starter_code !== null ? extra.starter_code : {};
      const dbTc = testCasesByProblem.get(p.id) || [];
      const sampleTc = Array.isArray(extra.sample_test_cases) ? extra.sample_test_cases : (Array.isArray(extra.sampleTestCases) ? extra.sampleTestCases : []);
      const hiddenTc = Array.isArray(extra.hidden_test_cases)
        ? extra.hidden_test_cases
        : (Array.isArray(extra.hiddenTestCases)
          ? extra.hiddenTestCases
          : (Array.isArray(extraStarter.hidden_test_cases)
            ? extraStarter.hidden_test_cases
            : (Array.isArray(extraStarter.hiddenTestCases) ? extraStarter.hiddenTestCases : [])));
      const directTc = Array.isArray(extra.test_cases) ? extra.test_cases : (Array.isArray(extra.testCases) ? extra.testCases : []);

      let tcList: any[] = [];
      if (dbTc.length > 0) {
        tcList = [...dbTc];
        // If dbTc has no hidden cases, check if extra has hidden test cases and merge them
        const hasDbHidden = dbTc.some((tc: any) => tc.is_hidden || tc.isHidden);
        if (!hasDbHidden) {
          const fallbackHidden = hiddenTc.length > 0
            ? hiddenTc
            : directTc.filter((tc: any) => tc.is_hidden || tc.isHidden || String(tc.is_hidden).toLowerCase() === "true");
          fallbackHidden.forEach((htc: any, hIdx: number) => {
            tcList.push({
              id: htc.id || `tc_hid_${p.id}_${hIdx + 1}`,
              name: htc.name || `Hidden Case ${hIdx + 1}`,
              input: htc.input || "",
              expected_output: htc.expected_output || htc.expectedOutput || "",
              is_hidden: true,
              order_index: tcList.length,
              weight: htc.weight || 20,
              is_enabled: true,
            });
          });
        }
      } else if (sampleTc.length > 0 || hiddenTc.length > 0) {
        tcList = [
          ...sampleTc.map((tc: any) => ({ ...tc, is_hidden: false })),
          ...hiddenTc.map((tc: any) => ({ ...tc, is_hidden: true })),
        ];
      } else if (directTc.length > 0) {
        tcList = directTc;
      }

      // If tcList has > 5 cases and zero marked hidden, treat cases >= 5 as hidden
      const currentHiddenCount = tcList.filter((tc: any) => tc.is_hidden || tc.isHidden).length;
      if (currentHiddenCount === 0 && tcList.length > 5) {
        tcList.forEach((tc: any, idx: number) => {
          if (idx >= 5) {
            tc.is_hidden = true;
            tc.isHidden = true;
            if (tc.name) tc.name = tc.name.replace(/Test Case/i, "Hidden Case");
          }
        });
      }

      const rawAllowed = extra.allowed_languages || extra.allowedLanguages;
      let finalAllowed: string[] | undefined = undefined;
      if (Array.isArray(rawAllowed)) {
        finalAllowed = rawAllowed.map((s: any) => String(s).toLowerCase().trim()).filter(Boolean);
      } else if (typeof rawAllowed === "string" && rawAllowed.trim()) {
        try {
          const parsed = JSON.parse(rawAllowed);
          if (Array.isArray(parsed)) {
            finalAllowed = parsed.map((s: any) => String(s).toLowerCase().trim()).filter(Boolean);
          } else {
            finalAllowed = rawAllowed.split(/[,|;\s]+/).map(s => s.toLowerCase().trim()).filter(Boolean);
          }
        } catch {
          finalAllowed = rawAllowed.split(/[,|;\s]+/).map(s => s.toLowerCase().trim()).filter(Boolean);
        }
      } else if (extra.templates && Object.keys(extra.templates).length > 0) {
        finalAllowed = Object.keys(extra.templates);
      }

      const defaultLang = extra.default_language || (finalAllowed?.[0]) || undefined;

      return {
        id: p.id,
        problem_number: extra.problem_number ? Number(extra.problem_number) : (idx + 1),
        title: formatCleanProblemTitle(p.title),
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
        allowed_languages: finalAllowed,
        allowedLanguages: finalAllowed,
        default_language: defaultLang,
        function_signature: extra.function_signature || "",
        test_cases: tcList,
        testCases: tcList,
        sample_test_cases: tcList.filter((tc: any) => !tc.is_hidden && !tc.isHidden),
        sampleTestCases: tcList.filter((tc: any) => !tc.is_hidden && !tc.isHidden),
        hidden_test_cases: tcList.filter((tc: any) => !!(tc.is_hidden || tc.isHidden)),
        hiddenTestCases: tcList.filter((tc: any) => !!(tc.is_hidden || tc.isHidden)),
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
        starter_code: extra,
        sql_engine: extra.sql_engine,
        schema_sql: extra.schema_sql,
        seed_sql: extra.seed_sql,
        tables_schema: extra.tables_schema,
        sample_data: extra.sample_data,
        comparison_mode: extra.comparison_mode,
        question_mode: extra.question_mode,
        track_id: extra.track_id,
        submodule_id: extra.submodule_id,
        learning_objectives: extra.learning_objectives,
        reference_solution: extra.reference_solution,
        explanation: extra.explanation || (sol?.overview),
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
    const { errorResponse, adminClient: supabase } = await authenticateAdminSession([
      "super_admin",
      "admin",
      "trainer",
    ]);
    if (errorResponse) return errorResponse;

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
    const isBulk = problemsList.length > 1;
    const CHUNK_SIZE = 8;

    for (let chunkIdx = 0; chunkIdx < problemsList.length; chunkIdx += CHUNK_SIZE) {
      const chunk = problemsList.slice(chunkIdx, chunkIdx + CHUNK_SIZE);

      const chunkResults = await Promise.all(
        chunk.map(async (problem: any) => {
          if (!problem || !problem.title) return null;
          const cleanProblemTitle = formatCleanProblemTitle(problem.title);

          // Only treat as existing record if it's a real UUID (36-char standard format)
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const isRealUUID = Boolean(problem.id && UUID_REGEX.test(problem.id));
          let problemId = isRealUUID ? problem.id : undefined;

          // Check if this problem already exists in DB by slug so we UPDATE it instead of creating a duplicate
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

          const baseSlug = problem.slug || problem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const slug = problemId ? (problem.slug || baseSlug) : `${baseSlug}-${Date.now().toString(36)}`;

          const isTcHidden = (tc: any): boolean => {
            if (!tc) return false;
            return (
              tc.is_hidden === true ||
              tc.isHidden === true ||
              tc.hidden === true ||
              String(tc.is_hidden).trim().toLowerCase() === "true" ||
              String(tc.is_hidden).trim() === "1" ||
              String(tc.isHidden).trim().toLowerCase() === "true" ||
              String(tc.isHidden).trim() === "1" ||
              String(tc.type).trim().toLowerCase() === "hidden" ||
              String(tc.category).trim().toLowerCase() === "hidden"
            );
          };

          const rawTestCases: any[] = Array.isArray(problem.test_cases)
            ? [...problem.test_cases]
            : Array.isArray((problem as any).testCases)
            ? [...(problem as any).testCases]
            : [];

          const directSample = Array.isArray(problem.sample_test_cases)
            ? problem.sample_test_cases
            : Array.isArray((problem as any).sampleTestCases)
            ? (problem as any).sampleTestCases
            : [];

          const directHidden = Array.isArray(problem.hidden_test_cases)
            ? problem.hidden_test_cases
            : Array.isArray((problem as any).hiddenTestCases)
            ? (problem as any).hiddenTestCases
            : [];

          const extraStarter = typeof (problem as any).starter_code === "object" && (problem as any).starter_code !== null ? (problem as any).starter_code : {};
          const starterHidden = Array.isArray(extraStarter.hidden_test_cases)
            ? extraStarter.hidden_test_cases
            : Array.isArray(extraStarter.hiddenTestCases)
            ? extraStarter.hiddenTestCases
            : [];

          const seenTcKeys = new Set(rawTestCases.map((tc: any) => `${String(tc.input ?? "")}:::${String(tc.expected_output ?? tc.expectedOutput ?? tc.output ?? "")}:::${isTcHidden(tc)}`));

          if (rawTestCases.length === 0 && directSample.length > 0) {
            directSample.forEach((tc: any) => {
              const tcHidden = isTcHidden(tc);
              rawTestCases.push({ ...tc, is_hidden: tcHidden });
              seenTcKeys.add(`${String(tc.input ?? "")}:::${String(tc.expected_output ?? tc.expectedOutput ?? tc.output ?? "")}:::${tcHidden}`);
            });
          }

          const allHiddenSources = [...directHidden, ...starterHidden];
          allHiddenSources.forEach((tc: any, hIdx: number) => {
            const key = `${String(tc.input ?? "")}:::${String(tc.expected_output ?? tc.expectedOutput ?? tc.output ?? "")}:::true`;
            if (!seenTcKeys.has(key)) {
              seenTcKeys.add(key);
              rawTestCases.push({
                ...tc,
                id: tc.id || `tc_hid_${hIdx + 1}`,
                is_hidden: true,
                isHidden: true,
              });
            } else {
              const existing = rawTestCases.find((e: any) => `${String(e.input ?? "")}:::${String(e.expected_output ?? e.expectedOutput ?? e.output ?? "")}:::${isTcHidden(e)}` === key);
              if (existing) {
                existing.is_hidden = true;
                existing.isHidden = true;
              }
            }
          });

          const allTestCases = rawTestCases.map((tc: any, idx: number) => {
            const isHidden = isTcHidden(tc);
            return {
              id: tc.id || `tc_${idx + 1}`,
              name: tc.name || (isHidden ? `Hidden Case ${idx + 1}` : `Test Case ${idx + 1}`),
              input: tc.input !== undefined && tc.input !== null ? String(tc.input) : (tc.stdin !== undefined && tc.stdin !== null ? String(tc.stdin) : ""),
              expected_output: tc.expected_output !== undefined && tc.expected_output !== null
                ? String(tc.expected_output)
                : (tc.expectedOutput !== undefined && tc.expectedOutput !== null
                  ? String(tc.expectedOutput)
                  : (tc.output !== undefined && tc.output !== null ? String(tc.output) : "")),
              is_hidden: isHidden,
              weight: tc.weight !== undefined ? Number(tc.weight) : (isHidden ? 20 : 10),
            };
          });

          // Fallback: If author provided > 5 test cases and none are explicitly marked as hidden,
          // treat test cases >= 5 as hidden test cases!
          const explicitHiddenCount = allTestCases.filter((tc: any) => tc.is_hidden).length;
          if (explicitHiddenCount === 0 && allTestCases.length > 5) {
            allTestCases.forEach((tc: any, idx: number) => {
              if (idx >= 5) {
                tc.is_hidden = true;
                tc.isHidden = true;
                tc.name = tc.name.replace(/Test Case/i, "Hidden Case");
                tc.weight = 20;
              }
            });
          }

          const sampleTestCases = allTestCases.filter((tc: any) => !tc.is_hidden);
          const hiddenTestCases = allTestCases.filter((tc: any) => !!tc.is_hidden);

          const problemScope = (problem as any).scope || ((problem as any).module_id || (problem as any).assessment_id ? "practice" : "codelab");
          const starterCodePayload = {
            ...extraStarter,
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
            testCases: allTestCases,
            sample_test_cases: sampleTestCases,
            sampleTestCases: sampleTestCases,
            hidden_test_cases: hiddenTestCases,
            hiddenTestCases: hiddenTestCases,
            // SQL specific properties
            sql_engine: (problem as any).sql_engine || extraStarter.sql_engine || undefined,
            schema_sql: (problem as any).schema_sql || extraStarter.schema_sql || undefined,
            seed_sql: (problem as any).seed_sql || extraStarter.seed_sql || undefined,
            tables_schema: (problem as any).tables_schema || extraStarter.tables_schema || undefined,
            sample_data: (problem as any).sample_data || extraStarter.sample_data || undefined,
            comparison_mode: (problem as any).comparison_mode || extraStarter.comparison_mode || undefined,
            question_mode: (problem as any).question_mode || extraStarter.question_mode || undefined,
            track_id: (problem as any).track_id || extraStarter.track_id || undefined,
            submodule_id: (problem as any).submodule_id || extraStarter.submodule_id || undefined,
            learning_objectives: (problem as any).learning_objectives || extraStarter.learning_objectives || undefined,
            reference_solution: (problem as any).reference_solution || extraStarter.reference_solution || undefined,
            explanation: (problem as any).explanation || extraStarter.explanation || undefined,
          };

          const solutionCodePayload = problem.solution_editorial || null;
          let savedProblem: any = null;

          if (problemId) {
            const { data, error } = await supabase
              .from("coding_problems")
              .upsert([
                {
                  id: problemId,
                  title: cleanProblemTitle,
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

            if (!error && data) savedProblem = data;
          } else {
            const { data, error } = await supabase
              .from("coding_problems")
              .insert([
                {
                  title: cleanProblemTitle,
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

            if (!error && data) savedProblem = data;
          }

          if (savedProblem && savedProblem.id && allTestCases.length > 0) {
            try {
              await supabase.from("test_cases").delete().eq("problem_id", savedProblem.id);
              const tcRows = allTestCases.map((tc: any, idx: number) => ({
                problem_id: savedProblem.id,
                input: tc.input || "",
                expected_output: tc.expected_output || "",
                is_hidden: Boolean(tc.is_hidden),
                order_index: idx,
              }));
              const { error: tcErr } = await supabase.from("test_cases").insert(tcRows);
              if (tcErr) {
                console.warn("[Admin Coding] Supabase test_cases insert warning:", tcErr);
              }
            } catch (tcEx) {
              console.warn("[Admin Coding] Error syncing test_cases table:", tcEx);
            }
          }

          // Single item notification only
          if (!isBulk && savedProblem) {
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
                }).catch(() => {});
              }
            } catch {}
          }

          return {
            ...savedProblem,
            test_cases: allTestCases,
            sample_test_cases: sampleTestCases,
            hidden_test_cases: hiddenTestCases,
          };
        })
      );

      for (const res of chunkResults) {
        if (res) savedResults.push(res);
      }
    }

    // Consolidated single notification for bulk import
    if (isBulk && savedResults.length > 0) {
      try {
        dispatchLMSEvent({
          isCommon: true,
          eventType: "CODING_PROBLEM_PUBLISHED",
          name: `${savedResults.length} New Challenges`,
          title: `New Coding Challenges – ${savedResults.length} Problems Added`,
          category: "Algorithms & Problem Solving",
          difficulty: "Multiple",
          resourceType: "problem",
          resourceId: savedResults[0]?.id,
          targetUrl: "/coding/problems",
          assignedBy: "SensiLearn Academic Faculty",
          changeSummary: `${savedResults.length} challenges added via curriculum update`,
        }).catch(() => {});
      } catch {}
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
    const { errorResponse, adminClient: supabase } = await authenticateAdminSession([
      "super_admin",
      "admin",
      "trainer",
    ]);
    if (errorResponse) return errorResponse;

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

    // Safely delete associated test cases and submissions first to satisfy foreign key constraints
    try { await supabase.from("test_cases").delete().in("problem_id", idsToDelete); } catch (e) {}
    try { await supabase.from("coding_submissions").delete().in("problem_id", idsToDelete); } catch (e) {}

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
