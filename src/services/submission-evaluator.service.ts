import type {
  CodingProblem,
  CodingSubmission,
  TestCaseResult,
  SubmissionStatus,
  SubmitCodeInput,
} from "@/types/coding";
import { UniversalExecutor } from "@/lib/compiler/universal-executor";
import { compareOutput, normalizeTestInput, normalizeExpectedOutput } from "@/lib/compiler/comparator";
import { SQLExecutionService } from "@/services/sql-execution.service";
import { SubmissionService } from "@/services/submission.service";

const PER_TESTCASE_TIMEOUT_MS = 4000; // 4 seconds max execution time per test case
const CHUNK_CONCURRENCY = 3; // Max parallel executions per submission

export class SubmissionEvaluatorService {
  /**
   * Evaluates a solution against public & hidden test cases using UniversalExecutor or SQL engine.
   * Features:
   * - Fast-path fail-fast on compilation errors (avoids compiling 10 times)
   * - Controlled chunked concurrency to prevent server/network overload
   * - Result deduplication for identical inputs
   * - Accurate classification of TLE, MLE, OLE, Compile Error, Runtime Error
   * - Non-blocking asynchronous DB persistence
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

    const testResults: TestCaseResult[] = new Array(testCases.length);
    const executionCache = new Map<string, {
      trimmedActual: string;
      execTime: number;
      passed: boolean;
      resError?: string;
    }>();

    async function evaluateSingleCase(tc: any, index: number, compileErrOverride?: string | null): Promise<void> {
      const isHidden = Boolean(tc.is_hidden || (tc as any).isHidden || (tc as any).hidden);
      const shouldReveal = isHidden ? Boolean((problem as any)?.reveal_hidden_testcases === true) : true;
      let passed = false;
      let trimmedActual = "";
      const rawInput = tc.input !== undefined ? tc.input : ((tc as any).stdin !== undefined ? (tc as any).stdin : "");
      const cleanInput = normalizeTestInput(rawInput);
      const expectedOutput = normalizeExpectedOutput(tc);
      let resError: string | undefined;
      let executionTime = 0.02;

      if (compileErrOverride) {
        passed = false;
        resError = compileErrOverride;
        trimmedActual = "";
      } else if (input.language === "sql") {
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
          if (!passed) {
            resError = isHidden
              ? `Query output mismatch: Your query returned ${trimmedActual}, which does not match expected dataset.`
              : `Query output mismatch: Expected ${expectedOutput}, but received ${trimmedActual}`;
          }
        }
      } else {
        const cacheKey = `${input.language}:::${input.version || "default"}:::${cleanInput}`;
        if (executionCache.has(cacheKey)) {
          const cached = executionCache.get(cacheKey)!;
          trimmedActual = cached.trimmedActual;
          executionTime = cached.execTime;
          const isSuccessStatus = !cached.resError || cached.resError.startsWith("Output mismatch");
          passed = isSuccessStatus && compareOutput(trimmedActual, expectedOutput, "WHITESPACE_NORMALIZED");
          if (!passed) {
            if (!isSuccessStatus) {
              resError = cached.resError || "Execution Error";
            } else if (trimmedActual) {
              resError = isHidden
                ? `Output mismatch: Your code produced "${trimmedActual}", which does not match expected output.`
                : `Output mismatch: Expected "${expectedOutput}", but received "${trimmedActual}".`;
            } else {
              resError = "Output mismatch: No output produced by your code (empty stdout). Please ensure your solution prints or returns the expected result.";
            }
          }
        } else {
          const res = await UniversalExecutor.execute(
            input.language,
            input.code,
            cleanInput,
            PER_TESTCASE_TIMEOUT_MS,
            input.version
          );

          trimmedActual = (res.stdout || "").trim();
          executionTime = res.time ? parseFloat(res.time) : 0.02;

          const hasStderr = Boolean(res.stderr && res.stderr.trim());
          const hasCompileError = Boolean(res.compile_output && res.compile_output.trim());
          const isSuccessStatus = (res.status?.id === 3 || res.outcome === 15 || res.outcome === 0) && !hasStderr && !hasCompileError;
          passed = isSuccessStatus && compareOutput(trimmedActual, expectedOutput, "WHITESPACE_NORMALIZED");

          if (!passed) {
            if (hasCompileError) {
              resError = res.compile_output.trim();
            } else if (res.status?.description === "TIME_LIMIT_EXCEEDED" || res.outcome === 13) {
              resError = "Time Limit Exceeded: Execution time exceeded 4.0 seconds limit.";
            } else if (res.status?.description === "OUTPUT_LIMIT_EXCEEDED" || res.outcome === 18) {
              resError = "Output Limit Exceeded: Output exceeded maximum allowed 256 KB buffer.";
            } else if (res.status?.description === "MEMORY_LIMIT_EXCEEDED" || res.outcome === 17) {
              resError = "Memory Limit Exceeded: Memory allocation exceeded permitted boundaries.";
            } else if (hasStderr) {
              resError = res.stderr.trim();
            } else if (!isSuccessStatus && res.message && res.message !== "Accepted") {
              resError = res.message;
            } else {
              if (trimmedActual) {
                resError = isHidden
                  ? `Output mismatch: Your code produced "${trimmedActual}", which does not match expected output.`
                  : `Output mismatch: Expected "${expectedOutput}", but received "${trimmedActual}".`;
              } else {
                resError = "Output mismatch: No output produced by your code (empty stdout). Please ensure your solution prints or returns the expected result.";
              }
            }
          }

          executionCache.set(cacheKey, {
            trimmedActual,
            execTime: executionTime,
            passed,
            resError: !isSuccessStatus ? resError : undefined,
          });
        }
      }

      const displayActual = trimmedActual || (resError && !resError.startsWith("Output mismatch") ? resError : (passed ? (shouldReveal ? expectedOutput : "Match") : "(No output produced)"));

      testResults[index] = {
        test_case_id: tc.id || `tc_${index + 1}`,
        passed,
        is_hidden: isHidden,
        input: shouldReveal ? (rawInput !== undefined && rawInput !== null ? String(rawInput) : "") : undefined,
        actual_output: displayActual,
        expected_output: shouldReveal ? expectedOutput : "[Hidden for evaluation]",
        error: !passed ? resError : undefined,
        time_seconds: executionTime,
        memory_kb: 16000,
      };
    }

    // Step 1: Run test case 0 first to verify compilation status
    if (testCases.length > 0) {
      await evaluateSingleCase(testCases[0], 0);

      const firstRes = testResults[0];
      const hasCompileError = Boolean(
        firstRes?.error &&
        (firstRes.error.toLowerCase().includes("compilation") ||
         firstRes.error.toLowerCase().includes("syntaxerror") ||
         firstRes.error.toLowerCase().includes("error:"))
      );

      // If compilation failed on first test case, short-circuit all remaining test cases instantly
      if (hasCompileError && firstRes?.error) {
        for (let i = 1; i < testCases.length; i++) {
          await evaluateSingleCase(testCases[i], i, firstRes.error);
        }
      } else {
        // Step 2: Run remaining test cases in controlled parallel chunks
        const remaining = testCases.slice(1);
        for (let i = 0; i < remaining.length; i += CHUNK_CONCURRENCY) {
          const chunk = remaining.slice(i, i + CHUNK_CONCURRENCY);
          await Promise.all(
            chunk.map((tc: any, chunkIdx: number) => {
              const actualIdx = 1 + i + chunkIdx;
              return evaluateSingleCase(tc, actualIdx);
            })
          );
        }
      }
    }

    const passedCount = testResults.filter((r) => r.passed).length;
    let overallStatus: SubmissionStatus = "accepted";
    if (passedCount < testCases.length) {
      const firstFailed = testResults.find((r) => !r.passed);
      const err = (firstFailed?.error || "").toLowerCase();
      if (err.includes("time limit") || err.includes("timed out")) {
        overallStatus = "time_limit_exceeded";
      } else if (err.includes("memory limit") || err.includes("out of memory")) {
        overallStatus = "memory_limit_exceeded";
      } else if (err.includes("output limit") || err.includes("excessive output")) {
        overallStatus = "output_limit_exceeded";
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

    // Save submission asynchronously so the student receives the response immediately without waiting for DB writes
    SubmissionService.saveSubmission(submission).catch((err) => {
      console.warn("Background submission persistence notice:", err);
    });

    return submission;
  }
}
