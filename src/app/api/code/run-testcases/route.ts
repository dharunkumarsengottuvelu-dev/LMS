import { NextRequest, NextResponse } from "next/server";
import { jobeService } from "@/services/jobe";
import { SQLExecutionService } from "@/services/sql-execution.service";
import { SubmissionService } from "@/services/submission.service";
import { getErrorMessage } from "@/lib/utils";
import type { TestCaseResult } from "@/types/coding";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem_id, language, code } = body;

    if (!problem_id || !language || !code) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const problem = SubmissionService.getProblemById(problem_id, true); // true = only public testcases
    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const testCases = problem.test_cases;
    const testResults: TestCaseResult[] = [];

    // Evaluate each test case
    for (const tc of testCases) {
      let passed = false;
      let trimmedActual = "";
      let trimmedExpected = (tc.expected_output || "").trim();
      let resError: string | undefined;

      if (language === "sql") {
        const sqlRes = SQLExecutionService.executeQuery(code, problem.dataset_name ?? "university");
        if (sqlRes.error) {
          passed = false;
          resError = sqlRes.error;
          trimmedActual = sqlRes.error;
        } else {
          trimmedActual = JSON.stringify(sqlRes.rows);
          passed = SQLExecutionService.compareSQLResults(sqlRes, trimmedExpected);
        }
      } else {
        const res = await jobeService.executeCode(language, code, tc.input);
        trimmedActual = (res.stdout || "").trim();

        passed =
          res.outcome === 15 || res.outcome === 0
            ? trimmedActual === trimmedExpected
            : false;

        if (!passed) {
          resError = res.compile_output || res.stderr || res.message || "Output mismatch";
        }
      }

      testResults.push({
        test_case_id: tc.id,
        passed,
        actual_output: trimmedActual,
        error: resError,
      });
    }

    return NextResponse.json({ results: testResults }, { status: 200 });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
