import { NextRequest, NextResponse } from "next/server";
import { jobeService } from "@/services/jobe";
import type { ExecuteCodeInput } from "@/types/coding";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, any>;
    const language = body.language;
    const code = body.code;
    const stdin = body.input_data !== undefined
      ? body.input_data
      : body.input !== undefined
      ? body.input
      : body.stdin !== undefined
      ? body.stdin
      : "";

    console.log("[Backend Received Execution Request]", {
      language,
      codeLength: code?.length ?? 0,
      inputLength: typeof stdin === "string" ? stdin.length : 0,
      inputContent: typeof stdin === "string" ? JSON.stringify(stdin) : "",
    });

    if (!language || !code) {
      return NextResponse.json(
        { error: "Both 'language' and 'code' fields are required." },
        { status: 400 }
      );
    }

    const langVal = jobeService.validateLanguage(language);
    if (!langVal.valid) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    const payloadVal = jobeService.validatePayload(code, stdin);
    if (!payloadVal.valid) {
      return NextResponse.json(
        { error: payloadVal.error },
        { status: 400 }
      );
    }

    // Delegate to sandboxed Jobe execution service
    const result = await jobeService.executeCode(language, code, stdin);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error during code execution";
    console.error("Backward-compatible /api/coding/execute error:", error);

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
