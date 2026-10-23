import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UniversalExecutor } from "@/lib/compiler/universal-executor";
import { compareOutput, sanitizeCompilerOutput, normalizeTestInput, normalizeExpectedOutput } from "@/lib/compiler/comparator";
import { SQLExecutionService } from "@/services/sql-execution.service";
import { getErrorMessage } from "@/lib/utils";
import type { TestCaseResult, TestCase } from "@/types/coding";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLanguageEnabled } from "@/services/compiler.service";

export async function POST(request: NextRequest) {
  try {
    const supabaseUser = await createClient();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required to run test cases." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { problem_id, language, code, test_cases } = body;
    const version = body.version || body.language_version;

    if (!problem_id || !language || !code) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (typeof code === "string" && code.length > 65536) {
      return NextResponse.json(
        { error: "Payload too large: Code exceeds maximum allowed size (64KB)." },
        { status: 413 }
      );
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

    const includeHidden = body.include_hidden === true;
    let testCases = Array.isArray(test_cases)
      ? (includeHidden ? test_cases : test_cases.filter((tc: any) => !tc.is_hidden && !(tc as any).isHidden))
      : null;
    let datasetName = body.dataset_name || "university";
    let problem: any = null;

    if (!testCases || testCases.length === 0) {
      const supabase = createAdminClient();

      // 1. Check test_cases table directly
      const { data: dbTc } = await supabase
        .from("test_cases")
        .select("id, input, expected_output, is_hidden")
        .eq("problem_id", problem_id)
        .order("order_index", { ascending: true });

      if (dbTc && dbTc.length > 0) {
        testCases = includeHidden ? dbTc : dbTc.filter(tc => !tc.is_hidden);
        if (testCases.length === 0 && dbTc.length > 0) {
          testCases = dbTc;
        }
      } else {
        const { data: dbProblem } = await supabase
          .from("coding_problems")
          .select("test_cases, sample_test_cases, starter_code, dataset_name, sql_engine, schema_sql, seed_sql, comparison_mode")
          .eq("id", problem_id)
          .maybeSingle();

        if (dbProblem) {
          problem = dbProblem;
          const starter = typeof dbProblem.starter_code === "object" && dbProblem.starter_code !== null ? dbProblem.starter_code : {};
          const allDbCases = ((dbProblem.test_cases || dbProblem.sample_test_cases || starter.test_cases || starter.sample_test_cases) as TestCase[]) || [];
          testCases = includeHidden ? allDbCases : allDbCases.filter(tc => !tc.is_hidden && !(tc as any).isHidden);
          if (testCases.length === 0 && allDbCases.length > 0) {
            testCases = allDbCases;
          }
          datasetName = dbProblem.dataset_name ?? "university";
        }
      }

      if (!testCases || testCases.length === 0) {
        // Fallback: search in practice_tracks
        const { data: tracks } = await supabase.from("practice_tracks").select("tags");
        (tracks || []).forEach((t: any) => {
          if (t.tags && t.tags[0]) {
            try {
              const meta = JSON.parse(t.tags[0]);
              (meta.subModules || []).forEach((sm: any) => {
                const candidates = [
                  ...(sm.codingQuestions || []),
                  ...((sm.modules || []).flatMap((m: any) => m.codingQuestions || []))
                ];
                candidates.forEach((cq: any) => {
                  if (cq.id === problem_id || `${sm.id}_${cq.id}` === problem_id) {
                    const rawCases = cq.sample_test_cases || cq.sampleTestCases || cq.publicTestCases || cq.test_cases || [];
                    testCases = rawCases;
                  }
                });
              });
            } catch {}
          }
        });
      }

      if (!testCases || testCases.length === 0) {
        return NextResponse.json({ error: "Problem test cases not found." }, { status: 404 });
      }
    }

    // Fast evaluation: evaluate test case 0 first to fail-fast on compilation errors,
    // then evaluate remaining test cases in parallel chunks with deduplication
    const testResults: TestCaseResult[] = new Array(testCases.length);
    const executionCache = new Map<string, {
      trimmedActual: string;
      execTime: number;
      passed: boolean;
      resError?: string;
    }>();

    async function evaluateSingleTestCase(tc: any, index: number, compileErrOverride?: string | null): Promise<void> {
      const isHidden = Boolean(tc.is_hidden || tc.isHidden || tc.hidden);
      let passed = false;
      let trimmedActual = "";
      const rawInput = tc.input !== undefined ? tc.input : (tc.stdin !== undefined ? tc.stdin : "");
      const cleanInput = normalizeTestInput(rawInput);
      const expectedOutput = normalizeExpectedOutput(tc);
      let resError: string | undefined;
      let execTime = 0.02;

      if (compileErrOverride) {
        passed = false;
        resError = compileErrOverride;
        trimmedActual = "";
      } else if (language === "sql") {
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
          if (!passed) {
            resError = isHidden
              ? `Query output mismatch: Your query returned ${trimmedActual}, which does not match the expected dataset.`
              : `Query output mismatch: Expected ${expectedOutput}, but received ${trimmedActual}`;
          }
        }
      } else {
        const cacheKey = `${language}:::${version || "default"}:::${cleanInput}`;
        if (executionCache.has(cacheKey)) {
          const cached = executionCache.get(cacheKey)!;
          trimmedActual = cached.trimmedActual;
          execTime = cached.execTime;
          const isSuccess = !cached.resError || cached.resError.startsWith("Output mismatch");
          passed = isSuccess && compareOutput(trimmedActual, expectedOutput, "WHITESPACE_NORMALIZED");
          if (!passed) {
            if (!isSuccess) {
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
          const res = await UniversalExecutor.execute(language, code, cleanInput, 4000, version);
          trimmedActual = (res.stdout || "").trim();
          execTime = parseFloat(res.time) || 0.02;

          const hasStderr = Boolean(res.stderr && res.stderr.trim());
          const hasCompileError = Boolean(res.compile_output && res.compile_output.trim());
          const isSuccess = (res.outcome === 15 || res.status?.id === 3 || res.outcome === 0) && !hasStderr && !hasCompileError;
          passed = isSuccess && compareOutput(trimmedActual, expectedOutput, "WHITESPACE_NORMALIZED");

          if (!passed) {
            if (hasCompileError) {
              resError = res.compile_output.trim();
            } else if (res.status?.description === "TIME_LIMIT_EXCEEDED" || res.outcome === 13) {
              resError = "Time Limit Exceeded: Execution time exceeded 4.0 seconds limit.";
            } else if (res.status?.description === "OUTPUT_LIMIT_EXCEEDED" || res.outcome === 18) {
              resError = "Output Limit Exceeded: Program generated excessive output (exceeded 256 KB limit).";
            } else if (res.status?.description === "MEMORY_LIMIT_EXCEEDED" || res.outcome === 17) {
              resError = "Memory Limit Exceeded: Memory allocation exceeded allowed limits.";
            } else if (hasStderr) {
              resError = res.stderr.trim();
            } else if (!isSuccess && res.message && res.message !== "Accepted") {
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
            execTime,
            passed,
            resError: !isSuccess ? resError : undefined,
          });
        }
      }

      const displayActual = trimmedActual || (resError && !resError.startsWith("Output mismatch") ? resError : (passed ? (isHidden ? "Match" : expectedOutput) : "(No output produced)"));

      testResults[index] = {
        test_case_id: tc.id || `tc_${index + 1}`,
        passed,
        is_hidden: isHidden,
        input: isHidden ? undefined : (rawInput !== undefined && rawInput !== null ? String(rawInput) : ""),
        actual_output: displayActual,
        expected_output: isHidden ? "[Hidden for evaluation]" : expectedOutput,
        error: !passed ? resError : undefined,
        time_seconds: execTime,
        memory_kb: 16000,
      };
    }

    // Step 1: Run first test case to verify compilation
    if (testCases.length > 0) {
      await evaluateSingleTestCase(testCases[0], 0);

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
          await evaluateSingleTestCase(testCases[i], i, firstRes.error);
        }
      } else {
        // Step 2: Run remaining test cases in parallel chunks of 3
        const remaining = testCases.slice(1);
        const CHUNK_SIZE = 3;
        for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
          const chunk = remaining.slice(i, i + CHUNK_SIZE);
          await Promise.all(
            chunk.map((tc: any, chunkIdx: number) => {
              const actualIdx = 1 + i + chunkIdx;
              return evaluateSingleTestCase(tc, actualIdx);
            })
          );
        }
      }
    }

    const firstCompileError = testResults.find(
      (r) => r.error && (r.error.toLowerCase().includes("compilation") || r.error.toLowerCase().includes("error:") || r.error.toLowerCase().includes("syntaxerror"))
    );

    return NextResponse.json({
      results: testResults,
      has_error: testResults.some(r => !r.passed),
      compilation_error: firstCompileError?.error || null,
    }, { status: 200 });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
