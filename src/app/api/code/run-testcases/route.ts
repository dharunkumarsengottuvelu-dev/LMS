import { NextRequest, NextResponse } from "next/server";
import { UniversalExecutor } from "@/lib/compiler/universal-executor";
import { compareOutput, sanitizeCompilerOutput } from "@/lib/compiler/comparator";
import { SQLExecutionService } from "@/services/sql-execution.service";
import { getErrorMessage } from "@/lib/utils";
import type { TestCaseResult, TestCase } from "@/types/coding";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLanguageEnabled } from "@/services/compiler.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem_id, language, code, test_cases } = body;

    if (!problem_id || !language || !code) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
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

    let testCases = test_cases;
    let datasetName = body.dataset_name || "university";
    let problem: any = null;

    if (!testCases || testCases.length === 0) {
      const supabase = createAdminClient();
      const { data: dbProblem, error: problemError } = await supabase
        .from("coding_problems")
        .select("test_cases, dataset_name, sql_engine, schema_sql, seed_sql, comparison_mode")
        .eq("id", problem_id)
        .single();

      if (problemError || !dbProblem) {
        return NextResponse.json({ error: "Problem not found in database" }, { status: 404 });
      }
      problem = dbProblem;
      // true = only public testcases for the 'Run' feature
      testCases = (dbProblem.test_cases as TestCase[]).filter(tc => !tc.is_hidden);
      datasetName = dbProblem.dataset_name ?? "university";
    }

    // Evaluate each testcase concurrently in parallel
    const testResults: TestCaseResult[] = await Promise.all(
      testCases.map(async (tc: TestCase) => {
        let passed = false;
        let trimmedActual = "";
        const expectedOutput = tc.expected_output || "";
        let resError: string | undefined;
        let execTime = 0.02;

        if (language === "sql") {
          const sqlEngine = body.sql_engine || problem?.sql_engine || "sqlite";
          const schemaSql = body.schema_sql !== undefined ? body.schema_sql : (problem?.schema_sql || "");
          const seedSql = body.seed_sql !== undefined ? body.seed_sql : (problem?.seed_sql || "");
          const comparisonMode = body.comparison_mode || problem?.comparison_mode || "ORDER_SENSITIVE";

          const sqlRes = await SQLExecutionService.executeQuery(code, datasetName, {
            engine: sqlEngine,
            schemaSql,
            seedSql,
          });

          execTime = sqlRes.executionTimeMs / 1000;
          if (sqlRes.error) {
            passed = false;
            resError = sqlRes.error;
            trimmedActual = sqlRes.error;
          } else {
            trimmedActual = JSON.stringify(sqlRes.rows);
            passed = SQLExecutionService.compareSQLResults(sqlRes, expectedOutput.trim(), comparisonMode);
          }
        } else {
          const res = await UniversalExecutor.execute(language, code, tc.input);
          trimmedActual = (res.stdout || "").trim();
          execTime = parseFloat(res.time) || 0.02;

          const isSuccess = res.outcome === 15 || res.status?.id === 3;
          passed = isSuccess && compareOutput(trimmedActual, expectedOutput, "WHITESPACE_NORMALIZED");

          if (!passed) {
            resError = res.compile_output || res.stderr || res.message || (isSuccess ? "Output mismatch" : "Execution Error");
          }
        }

        return {
          test_case_id: tc.id,
          passed,
          input: tc.input,
          actual_output: trimmedActual,
          expected_output: expectedOutput,
          error: resError,
          time_seconds: execTime,
          memory_kb: 16000,
        };
      })
    );

    return NextResponse.json({ results: testResults }, { status: 200 });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
