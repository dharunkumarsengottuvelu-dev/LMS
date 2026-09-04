import type {
  CodingProblem,
  CodingSubmission,
  TestCaseResult,
  SubmissionStatus,
  SubmitCodeInput,
} from "@/types/coding";
import { UniversalExecutor } from "@/lib/compiler/universal-executor";
import { compareOutput } from "@/lib/compiler/comparator";
import { SQLExecutionService } from "@/services/sql-execution.service";
import { SubmissionService } from "@/services/submission.service";

export class SubmissionEvaluatorService {
  /**
   * Evaluates a solution against public & hidden test cases using UniversalExecutor or SQL engine.
   */
  public static async evaluateSolution(
    input: SubmitCodeInput,
    studentId: string = "student-1"
  ): Promise<CodingSubmission> {
    let testCases = input.test_cases;
    let datasetName = "university";
    let problem: CodingProblem | null = null;

    if (input.problem_id) {
      problem = SubmissionService.getProblemById(input.problem_id, false);
      if (problem) {
        if (!testCases || testCases.length === 0) {
          testCases = problem.test_cases;
        }
        datasetName = problem.dataset_name ?? "university";
      }
    }

    if (!testCases || testCases.length === 0) {
      testCases = [
        {
          id: "tc_default",
          input: "",
          expected_output: "",
          is_hidden: false,
        },
      ];
    }

    // Evaluate all test cases concurrently in parallel
    const testResults: TestCaseResult[] = await Promise.all(
      testCases.map(async (tc) => {
        let passed = false;
        let trimmedActual = "";
        const expectedOutput = tc.expected_output || "";
        let resError: string | undefined;
        let executionTime = 0.02;

        if (input.language === "sql") {
          const sqlRes = await SQLExecutionService.executeQuery(input.code, datasetName, {
            engine: input.sql_engine || (problem as any)?.sql_engine || "sqlite",
            schemaSql: input.schema_sql !== undefined ? input.schema_sql : ((problem as any)?.schema_sql || ""),
            seedSql: input.seed_sql !== undefined ? input.seed_sql : ((problem as any)?.seed_sql || ""),
          });
          executionTime = sqlRes.executionTimeMs / 1000;
          if (sqlRes.error) {
            passed = false;
            resError = sqlRes.error;
            trimmedActual = sqlRes.error;
          } else {
            trimmedActual = JSON.stringify(sqlRes.rows);
            passed = SQLExecutionService.compareSQLResults(
              sqlRes,
              expectedOutput.trim(),
              input.comparison_mode || (problem as any)?.comparison_mode || "ORDER_SENSITIVE"
            );
          }
        } else {
          const res = await UniversalExecutor.execute(input.language, input.code, tc.input);

          trimmedActual = (res.stdout || "").trim();
          executionTime = res.time ? parseFloat(res.time) : 0.02;

          const isSuccessStatus = res.status?.id === 3 || res.outcome === 15 || res.outcome === 0;
          passed = isSuccessStatus && compareOutput(trimmedActual, expectedOutput, "WHITESPACE_NORMALIZED");

          if (!passed) {
            resError = res.compile_output || res.stderr || res.message || (isSuccessStatus ? "Output mismatch" : "Execution Error");
          }
        }

        const shouldReveal =
          (problem as any)?.reveal_hidden_testcases !== false &&
          (input as any)?.reveal_hidden_testcases !== false;

        return {
          test_case_id: tc.id,
          passed,
          input: shouldReveal || !tc.is_hidden ? tc.input : undefined,
          actual_output: shouldReveal || !tc.is_hidden ? trimmedActual : (passed ? "Match" : "Mismatch (Hidden Test Case)"),
          expected_output: shouldReveal || !tc.is_hidden ? expectedOutput : "Hidden",
          error: !passed ? (resError || "Output mismatch") : undefined,
          time_seconds: executionTime,
          memory_kb: 16000,
        };
      })
    );

    const passedCount = testResults.filter((r) => r.passed).length;
    let overallStatus: SubmissionStatus = "accepted";
    if (passedCount < testCases.length) {
      const firstFailed = testResults.find((r) => !r.passed);
      const err = (firstFailed?.error || "").toLowerCase();
      if (err.includes("time limit") || err.includes("timed out")) {
        overallStatus = "time_limit_exceeded";
      } else if (err.includes("syntax") || err.includes("compile") || err.includes("compilation")) {
        overallStatus = "compilation_error";
      } else if (err.includes("exception") || (err.includes("error") && !err.includes("mismatch"))) {
        overallStatus = "runtime_error";
      } else {
        overallStatus = "wrong_answer";
      }
    }

    const submission: CodingSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      problem_id: input.problem_id,
      student_id: studentId,
      language: input.language,
      code: input.code,
      status: overallStatus,
      passed_test_cases: passedCount,
      total_test_cases: testCases.length,
      results: testResults,
      created_at: new Date().toISOString(),
    };

    await SubmissionService.saveSubmission(submission);
    return submission;
  }
}
