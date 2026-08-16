import type {
  CodingProblem,
  CodingSubmission,
  TestCase,
  TestCaseResult,
  CodingLanguage,
  SubmissionStatus,
  SubmitCodeInput,
} from "@/types/coding";
import { SQLExecutionService } from "@/services/sql-execution.service";
import { CodingProblemsService } from "@/services/coding-problems.service";
export { SAMPLE_CODING_PROBLEMS } from "@/services/coding-problems.service";

const LOCAL_STORAGE_SUBMISSIONS_KEY = "edunexus_coding_submissions_v1";

import { createClient } from "@/lib/supabase/client";

export class SubmissionService {
  private static submissionsMemoryStore: CodingSubmission[] = [];

  /**
   * Retrieves all coding problems (static + custom created).
   */
  public static getAllProblems(): CodingProblem[] {
    return CodingProblemsService.getAllProblems();
  }

  /**
   * Saves a new or updated coding problem to memory, localStorage, and Supabase DB.
   */
  public static async saveProblem(problem: CodingProblem): Promise<void> {
    return CodingProblemsService.saveProblem(problem);
  }

  /**
   * Retrieves a problem by ID, option to sanitize hidden test cases for public client view.
   */
  public static getProblemById(problemId: string, publicOnly = true): CodingProblem | null {
    const all = this.getAllProblems();
    const problem = all.find((p) => p.id === problemId || p.slug === problemId);
    if (!problem) return null;

    if (publicOnly) {
      return {
        ...problem,
        test_cases: problem.test_cases.filter((tc) => !tc.is_hidden),
      };
    }

    return problem;
  }

  /**
   * Evaluates a solution against test cases via the Jobe execution server.
   */
  public static async submitSolution(
    input: SubmitCodeInput,
    studentId: string = "student-1"
  ): Promise<CodingSubmission> {
    let testCases = input.test_cases;
    let datasetName = "university";

    if (!testCases || testCases.length === 0) {
      const problem = this.getProblemById(input.problem_id, false);
      if (!problem) {
        throw new Error(`Problem not found: ${input.problem_id}`);
      }
      testCases = problem.test_cases;
      datasetName = problem.dataset_name ?? "university";
    }

    const testResults: TestCaseResult[] = [];
    let passedCount = 0;
    let overallStatus: SubmissionStatus = "accepted";
    let firstError: string | undefined;

    // Evaluate each test case through Jobe or SQLExecutionService
    for (const tc of testCases) {
      let passed = false;
      let trimmedActual = "";
      let trimmedExpected = (tc.expected_output || "").trim();
      let resError: string | undefined;
      let executionTime = 0.02;

      if (input.language === "sql") {
        const sqlRes = SQLExecutionService.executeQuery(input.code, datasetName);
        executionTime = sqlRes.executionTimeMs / 1000;
        if (sqlRes.error) {
          passed = false;
          resError = sqlRes.error;
          trimmedActual = sqlRes.error;
        } else {
          trimmedActual = JSON.stringify(sqlRes.rows);
          passed = SQLExecutionService.compareSQLResults(sqlRes, trimmedExpected);
        }
      } else {
        const cleanInput = (tc.input || "")
          .replace(/\\r\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\r\n/g, "\n");
        const cleanExpected = (tc.expected_output || "")
          .replace(/\\r\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\r\n/g, "\n")
          .trim();

        const { jobeService } = await import("@/services/jobe");
        const res = await jobeService.executeCode(input.language, input.code, cleanInput);

        trimmedActual = (res.stdout || "").trim();
        executionTime = res.time ? parseFloat(res.time) : 0.02;

        const normalizeOutput = (str: string) =>
          (str || "").replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").trim();

        const isSuccessStatus = res.status?.id === 3 || res.outcome === 15 || res.outcome === 0;
        passed = isSuccessStatus && normalizeOutput(trimmedActual) === normalizeOutput(cleanExpected);

        if (!passed) {
          resError = res.compile_output || res.stderr || res.message || "Output mismatch";
        }
      }

      if (passed) {
        passedCount++;
      } else if (overallStatus === "accepted") {
        overallStatus = resError?.includes("Syntax") || resError?.includes("compile")
          ? "compilation_error"
          : "wrong_answer";
        firstError = resError || "Output mismatch";
      }

      // Prepare sanitized test result (never expose hidden test inputs/expected output to browser)
      testResults.push({
        test_case_id: tc.id,
        passed,
        actual_output: tc.is_hidden ? (passed ? "Match" : "Mismatch (Hidden Test Case)") : trimmedActual,
        expected_output: tc.is_hidden ? "Hidden" : trimmedExpected,
        error: !passed ? (tc.is_hidden ? "Hidden Test Failed" : firstError) : undefined,
        time_seconds: executionTime,
        memory_kb: 12400,
      });
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

    await this.saveSubmission(submission);
    return submission;
  }

  /**
   * Saves a submission to Supabase DB, in-memory store and localStorage.
   */
  public static async saveSubmission(submission: CodingSubmission): Promise<void> {
    this.submissionsMemoryStore.unshift(submission);

    // Save to Supabase DB if possible
    try {
      const supabase = createClient();
      await (supabase as any).from("coding_submissions").insert([
        {
          language: submission.language,
          code: submission.code,
          status: submission.status,
          passed_test_cases: submission.passed_test_cases,
          total_test_cases: submission.total_test_cases,
          test_results: submission.results,
          submitted_at: submission.created_at || new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn("Supabase submission persistence fallback to local storage:", e);
    }

    if (typeof window !== "undefined") {
      try {
        const existing = this.getStudentSubmissions(submission.student_id);
        const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
        localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(updated.slice(0, 50)));
      } catch (err) {
        console.error("Failed to save submission to localStorage:", err);
      }
    }
  }

  /**
   * Retrieves submissions for a student from Supabase DB or LocalStorage.
   */
  public static getStudentSubmissions(studentId: string = "student-1"): CodingSubmission[] {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CodingSubmission[];
          return parsed.filter((s) => s.student_id === studentId);
        }
      } catch {}
    }

    return this.submissionsMemoryStore.filter((s) => s.student_id === studentId);
  }
}
