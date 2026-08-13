import { NextRequest, NextResponse } from "next/server";
import { jobeService } from "@/services/jobe";
import { SQLExecutionService } from "@/services/sql-execution.service";
import type { ExecuteCodeInput } from "@/types/coding";
import { getErrorMessage } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLanguageEnabled } from "@/services/compiler.service";

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

    // Handle SQL execution category
    if (language === "sql") {
      const sqlRes = SQLExecutionService.executeQuery(code);
      return NextResponse.json({
        stdout: sqlRes.error ? null : JSON.stringify(sqlRes.rows, null, 2),
        stderr: sqlRes.error ?? null,
        compile_output: null,
        message: sqlRes.error ?? null,
        status: {
          id: sqlRes.error ? 7 : 3,
          description: sqlRes.error ? "SQL Execution Error" : "Accepted",
        },
        time: `${(sqlRes.executionTimeMs / 1000).toFixed(2)}`,
        memory: 12400,
        sqlResult: sqlRes,
      });
    }

    // Handle Web Live Preview category (HTML, CSS, React)
    if (language === "html" || language === "css" || language === "react") {
      return NextResponse.json({
        stdout: "Live Sandboxed Web Preview rendered successfully.",
        stderr: null,
        compile_output: null,
        message: null,
        status: { id: 3, description: "Accepted" },
        time: "0.01",
        memory: 8000,
      });
    }

    // 1. Language validation against database (with fallback)
    const languageEnabled = await isLanguageEnabled(language);
    
    if (!languageEnabled) {
      return NextResponse.json(
        { error: `Unsupported or disabled programming language: '${language}'` },
        { status: 400 }
      );
    }

    // 2. Execute via Jobe API
    const result = await jobeService.executeCode(language, code, stdin);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    console.error("API /api/code/run Error:", error);
    
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
