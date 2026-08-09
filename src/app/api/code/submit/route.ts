import { NextRequest, NextResponse } from "next/server";
import { SubmissionService } from "@/services/submission.service";
import { jobeService } from "@/services/jobe";
import type { SubmitCodeInput } from "@/types/coding";
import { getErrorMessage } from "@/lib/utils";

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

    // 1. Language validation
    const langVal = jobeService.validateLanguage(language);
    if (!langVal.valid) {
      return NextResponse.json(
        { error: `Unsupported programming language: '${language}'` },
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

    // 3. Submit solution for automated evaluation against public & hidden test cases
    const submission = await SubmissionService.submitSolution({
      problem_id,
      language,
      code,
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
