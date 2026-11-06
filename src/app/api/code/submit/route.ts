import { NextRequest, NextResponse } from "next/server";
import { SubmissionEvaluatorService } from "@/services/submission-evaluator.service";
import { jobeService } from "@/services/jobe";
import type { SubmitCodeInput } from "@/types/coding";
import { getErrorMessage } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isLanguageEnabled } from "@/services/compiler.service";
import { normalizeLanguageId, getLanguageDisplayName } from "@/lib/compiler/coding-language-mode";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitCodeInput;
    const { problem_id, language, code } = body;

    if (!problem_id || !language || !code) {
      return NextResponse.json(
        { error: "Fields 'problem_id', 'language', and 'code' are required." },
        { status: 400 }
      );
    }

    // 1. Language validation against database (with fallback)
    if (language !== "sql" && language !== "html" && language !== "css" && language !== "react") {
      const languageEnabled = await isLanguageEnabled(language);
      
      if (!languageEnabled) {
        return NextResponse.json(
          { error: `Unsupported or disabled programming language: '${language}'` },
          { status: 400 }
        );
      }
    }

    // 2. Payload size validation
    const payloadVal = jobeService.validatePayload(code);
    if (!payloadVal.valid) {
      return NextResponse.json(
        { error: payloadVal.error },
        { status: 400 }
      );
    }

    // 3. Resolve test cases from payload, coding_problems table, or practice_tracks
    let testCasesToRun: any[] = (body as any).test_cases || (body as any).custom_test_cases || [];

    const hasHiddenCasesInPayload = testCasesToRun.some((tc: any) => tc.is_hidden || tc.isHidden);
    const hasMaskedHiddenCases = testCasesToRun.some((tc: any) =>
      (tc.is_hidden || tc.isHidden) &&
      (!tc.expected_output || tc.expected_output === "[Hidden for evaluation]")
    );

    // If payload has no test cases OR has no hidden test cases OR has masked hidden test cases,
    // resolve authoritative test cases with real inputs/expected outputs from DB
    if (testCasesToRun.length === 0 || !hasHiddenCasesInPayload || hasMaskedHiddenCases) {
      const supabase = createAdminClient();
      let dbProblemCases: any[] | null = null;

      // 1. Search in practice_tracks (prioritize track_id if provided)
      let tracks: any[] = [];
      const trackId = (body as any).track_id || (body as any).trackId;
      const problemTitle = (body as any).problem_title || (body as any).problemTitle || (body as any).title;
      if (trackId) {
        const { data: trackData } = await supabase
          .from("practice_tracks")
          .select("id, sub_modules, tags")
          .eq("id", trackId)
          .maybeSingle();
        if (trackData) tracks.push(trackData);
      }
      if (tracks.length === 0) {
        const { data: allTracks } = await supabase
          .from("practice_tracks")
          .select("id, sub_modules, tags");
        tracks = allTracks || [];
      }

      for (const t of tracks) {
        let subModules: any[] = [];
        if (Array.isArray(t.sub_modules)) {
          subModules = t.sub_modules;
        } else if (typeof t.sub_modules === "string") {
          try {
            subModules = JSON.parse(t.sub_modules);
          } catch {
            subModules = [];
          }
        } else if (t.tags && t.tags[0]) {
          try {
            const meta = typeof t.tags[0] === "string" ? JSON.parse(t.tags[0]) : t.tags[0];
            subModules = meta.subModules || meta.sub_modules || [];
          } catch {}
        }

        for (const sm of subModules || []) {
          const allQuestions = [
            ...(sm.codingQuestions || []),
            ...((sm.modules || []).flatMap((m: any) => m.codingQuestions || [])),
          ];

          for (const cq of allQuestions) {
            const cleanProbTitle = String(problemTitle || "").replace(/^#\d+\.?\s*/, "").trim().toLowerCase();
            const cleanCqTitle = String(cq.title || "").replace(/^#\d+\.?\s*/, "").trim().toLowerCase();
            const cleanProbId = String(problem_id || "").trim().toLowerCase();

            const isMatch =
              cq.id === problem_id ||
              cq.slug === problem_id ||
              `${sm.id}_${cq.id}` === problem_id ||
              (cleanProbTitle && cleanCqTitle && cleanProbTitle === cleanCqTitle) ||
              (cleanProbId && cleanCqTitle && cleanProbId === cleanCqTitle) ||
              (cq.slug && cleanProbId.includes(cq.slug)) ||
              (cq.id && cleanProbId.includes(cq.id));

            if (isMatch) {
              const starter = typeof cq.starter_code === "object" && cq.starter_code !== null ? cq.starter_code : {};
              const direct = Array.isArray(cq.test_cases) ? cq.test_cases : (Array.isArray(starter.test_cases) ? starter.test_cases : []);
              const sample = (Array.isArray(cq.sample_test_cases) && cq.sample_test_cases.length > 0)
                ? cq.sample_test_cases
                : (Array.isArray(cq.sampleTestCases) && cq.sampleTestCases.length > 0)
                ? cq.sampleTestCases
                : (Array.isArray(starter.sample_test_cases) ? starter.sample_test_cases : []);
              const hidden = (Array.isArray(cq.hidden_test_cases) && cq.hidden_test_cases.length > 0)
                ? cq.hidden_test_cases
                : (Array.isArray(cq.hiddenTestCases) && cq.hiddenTestCases.length > 0)
                ? cq.hiddenTestCases
                : (Array.isArray(starter.hidden_test_cases) ? starter.hidden_test_cases : []);

              if (direct.length > 0 && direct.some((tc: any) => tc.is_hidden || tc.isHidden)) {
                dbProblemCases = direct.map((tc: any) => ({
                  ...tc,
                  is_hidden: Boolean(tc.is_hidden || tc.isHidden),
                  isHidden: Boolean(tc.is_hidden || tc.isHidden),
                }));
              } else if (sample.length > 0 || hidden.length > 0) {
                dbProblemCases = [
                  ...sample.map((tc: any) => ({ ...tc, is_hidden: false, isHidden: false })),
                  ...hidden.map((tc: any) => ({ ...tc, is_hidden: true, isHidden: true })),
                ];
              } else if (direct.length > 0) {
                dbProblemCases = direct;
              }
              break;
            }
          }
          if (dbProblemCases) break;
        }
        if (dbProblemCases) break;
      }

      // 2. Check coding_problems table if not found in practice_tracks
      if (!dbProblemCases) {
        const { data: problem } = await supabase
          .from("coding_problems")
          .select("id, starter_code, sample_test_cases, hidden_test_cases, test_cases")
          .or(`id.eq.${problem_id},slug.eq.${problem_id}`)
          .maybeSingle();

        if (problem) {
          // Enforce problem allowed_languages restriction
          const starter = typeof problem.starter_code === "object" && problem.starter_code !== null ? problem.starter_code : {};
          const rawAllowed = (body as any).allowed_languages || (body as any).allowedLanguages || starter.allowed_languages || starter.allowedLanguages || (problem as any).allowed_languages;
          if (rawAllowed) {
            let allowedList: string[] = [];
            if (Array.isArray(rawAllowed)) {
              allowedList = rawAllowed.map((l: any) => normalizeLanguageId(String(l))).filter(Boolean);
            } else if (typeof rawAllowed === "string" && rawAllowed.trim()) {
              allowedList = rawAllowed.split(/[,|;\s]+/).map(normalizeLanguageId).filter(Boolean);
            }
            const normSubmitted = normalizeLanguageId(language);
            if (allowedList.length > 0 && !allowedList.includes(normSubmitted)) {
              return NextResponse.json(
                {
                  error: `Programming language '${language}' is not permitted for this problem. Allowed languages: [${allowedList.map(getLanguageDisplayName).join(", ")}].`,
                },
                { status: 400 }
              );
            }
          }

          // Check test_cases table for this problem
          const { data: dbTc } = await supabase
            .from("test_cases")
            .select("id, input, expected_output, is_hidden")
            .eq("problem_id", problem.id)
            .order("order_index", { ascending: true });

          if (dbTc && dbTc.length > 0) {
            dbProblemCases = dbTc;
          } else {
            const directTc = Array.isArray(problem.test_cases) ? problem.test_cases : [];
            const sampleTc = Array.isArray(problem.sample_test_cases) ? problem.sample_test_cases : [];
            const hiddenTc = Array.isArray(problem.hidden_test_cases) ? problem.hidden_test_cases : [];
            if (directTc.length > 0 && directTc.some((tc: any) => tc.is_hidden || tc.isHidden)) {
              dbProblemCases = directTc;
            } else if (sampleTc.length > 0 || hiddenTc.length > 0) {
              dbProblemCases = [
                ...sampleTc.map((tc: any) => ({ ...tc, is_hidden: false })),
                ...hiddenTc.map((tc: any) => ({ ...tc, is_hidden: true })),
              ];
            } else if (directTc.length > 0) {
              dbProblemCases = directTc;
            } else {
              const starterObj = typeof problem.starter_code === "object" && problem.starter_code !== null ? problem.starter_code : {};
              if (Array.isArray(starterObj.test_cases) && starterObj.test_cases.length > 0) {
                dbProblemCases = starterObj.test_cases;
              }
            }
          }
        }
      }

      if (dbProblemCases && dbProblemCases.length > 0) {
        testCasesToRun = dbProblemCases;
      }
    }

    if (testCasesToRun.length === 0) {
      testCasesToRun = [
        {
          id: "tc_default",
          input: "",
          expected_output: "",
          is_hidden: false
        }
      ];
    }

    // 4. Resolve authenticated student ID & profile ID
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required to submit solutions" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const studentProfileId = profile?.id || user.id;

    // 5. Submit solution for automated evaluation against public & hidden test cases
    const submission = await SubmissionEvaluatorService.evaluateSolution(
      {
        problem_id,
        language,
        code,
        test_cases: testCasesToRun,
      },
      studentProfileId
    );

    return NextResponse.json(submission, { status: 200 });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    console.error("API /api/code/submit Error:", error);

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
