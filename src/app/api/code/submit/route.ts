import { NextRequest, NextResponse } from "next/server";
import { SubmissionEvaluatorService } from "@/services/submission-evaluator.service";
import { jobeService } from "@/services/jobe";
import type { SubmitCodeInput } from "@/types/coding";
import { getErrorMessage } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isLanguageEnabled } from "@/services/compiler.service";

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

    if (testCasesToRun.length === 0) {
      const supabase = createAdminClient();
      const { data: problem } = await supabase
        .from("coding_problems")
        .select("test_cases")
        .eq("id", problem_id)
        .maybeSingle();

      if (problem && problem.test_cases) {
        testCasesToRun = problem.test_cases;
      } else {
        // Search in practice_tracks
        const { data: tracks } = await supabase.from("practice_tracks").select("tags");
        (tracks || []).forEach((t: any) => {
          if (t.tags && t.tags[0]) {
            try {
              const meta = JSON.parse(t.tags[0]);
              (meta.subModules || []).forEach((sm: any) => {
                (sm.codingQuestions || []).forEach((cq: any) => {
                  if (cq.id === problem_id || `${sm.id}_${cq.id}` === problem_id) {
                    testCasesToRun = [
                      ...(cq.publicTestCases || []),
                      ...(cq.hiddenTestCases || [])
                    ];
                  }
                });
              });
            } catch {}
          }
        });
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

    let studentProfileId = user?.id || (body as any).student_id || "student-1";
    if (user?.id) {
      const adminClient = createAdminClient();
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      if (profile?.id) {
        studentProfileId = profile.id;
      }
    }

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
