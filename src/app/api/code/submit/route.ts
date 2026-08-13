import { NextRequest, NextResponse } from "next/server";
import { SubmissionService } from "@/services/submission.service";
import { jobeService } from "@/services/jobe";
import type { SubmitCodeInput } from "@/types/coding";
import { getErrorMessage } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const languageEnabled = await isLanguageEnabled(language);
    
    if (!languageEnabled) {
      return NextResponse.json(
        { error: `Unsupported or disabled programming language: '${language}'` },
        { status: 400 }
      );
    }

    // 2. Payload size validation
    const payloadVal = jobeService.validatePayload(code);
    if (!payloadVal.valid) {
      return NextResponse.json(
        { error: payloadVal.error },
        { status: 400 }
      );
    }

    // 3. Fetch test cases securely from Supabase
    const supabase = createAdminClient();
    const { data: problem, error: problemError } = await supabase
      .from("coding_problems")
      .select("test_cases")
      .eq("id", problem_id)
      .single();

    if (problemError || !problem) {
      return NextResponse.json(
        { error: "Problem not found in database." },
        { status: 404 }
      );
    }

    // 4. Submit solution for automated evaluation against public & hidden test cases
    const submission = await SubmissionService.submitSolution({
      problem_id,
      language,
      code,
      test_cases: problem.test_cases
    });

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
