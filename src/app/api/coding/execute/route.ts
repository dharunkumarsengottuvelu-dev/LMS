import { NextRequest, NextResponse } from "next/server";
import type { ExecuteCodeInput, ExecuteCodeResult } from "@/types";
import { JUDGE0_LANGUAGE_MAP } from "@/types/coding";

const JUDGE0_BASE_URL = process.env["JUDGE0_BASE_URL"] ?? "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env["JUDGE0_API_KEY"];
const JUDGE0_API_HOST = process.env["JUDGE0_API_HOST"] ?? "judge0-ce.p.rapidapi.com";

export async function POST(request: NextRequest) {
  try {
    if (!JUDGE0_API_KEY) {
      return NextResponse.json(
        { error: "Code execution service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json() as ExecuteCodeInput;
    const { language, code, stdin } = body;

    if (!language || !code) {
      return NextResponse.json({ error: "Language and code are required" }, { status: 400 });
    }

    const language_id = JUDGE0_LANGUAGE_MAP[language as keyof typeof JUDGE0_LANGUAGE_MAP];
    if (!language_id) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    // Submit to Judge0
    const submitResponse = await fetch(`${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": JUDGE0_API_HOST,
      },
      body: JSON.stringify({
        source_code: code,
        language_id,
        stdin: stdin ?? "",
        cpu_time_limit: 5,
        memory_limit: 262144,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      return NextResponse.json(
        { error: `Judge0 error: ${submitResponse.status} ${errorText}` },
        { status: 502 }
      );
    }

    const result = await submitResponse.json() as ExecuteCodeResult;
    return NextResponse.json(result);
  } catch (error) {
    console.error("Code execution error:", error);
    return NextResponse.json(
      { error: "Internal server error during code execution" },
      { status: 500 }
    );
  }
}
