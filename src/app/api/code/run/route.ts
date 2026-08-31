import { NextRequest, NextResponse } from "next/server";
import { UniversalExecutor } from "@/lib/compiler/universal-executor";
import { SQLExecutionService } from "@/services/sql-execution.service";
import { getErrorMessage } from "@/lib/utils";
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

    if (!language || !code) {
      return NextResponse.json(
        { error: "Both 'language' and 'code' fields are required." },
        { status: 400 }
      );
    }

    // 1. Handle SQL execution sandbox
    if (language === "sql") {
      const sqlEngine = body.sql_engine || body.engine || "sqlite";
      const schemaSql = body.schema_sql || body.schema;
      const seedSql = body.seed_sql || body.seed;
      const datasetName = body.dataset_name || "university";

      const sqlRes = await SQLExecutionService.executeQuery(code, datasetName, {
        engine: sqlEngine,
        schemaSql,
        seedSql,
      });

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

    // 2. Handle Web Live Preview category (HTML, CSS, React)
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

    // 3. Language validation against database (with fallback)
    const languageEnabled = await isLanguageEnabled(language);
    if (!languageEnabled) {
      return NextResponse.json(
        { error: `Unsupported or disabled programming language: '${language}'` },
        { status: 400 }
      );
    }

    // 4. Universal multi-language execution
    const timeoutMs = body.timeout_ms ? parseInt(body.timeout_ms, 10) : undefined;
    const result = await UniversalExecutor.execute(language, code, stdin, timeoutMs);

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
