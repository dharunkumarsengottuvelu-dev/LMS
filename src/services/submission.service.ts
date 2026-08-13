import type {
  CodingProblem,
  CodingSubmission,
  TestCase,
  TestCaseResult,
  CodingLanguage,
  SubmissionStatus,
  SubmitCodeInput,
} from "@/types/coding";
import { jobeService } from "@/services/jobe";
import { SQLExecutionService } from "@/services/sql-execution.service";

// Repository for user-authored coding problems (Starts completely fresh)
export const SAMPLE_CODING_PROBLEMS: CodingProblem[] = [
  {
    id: "prob_1",
    title: "Two Sum",
    slug: "two-sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
    difficulty: "easy",
    category: "Arrays",
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
    input_format: "First line contains n. Second line contains n integers. Third line contains the target.",
    output_format: "Two integers representing the indices.",
    points: 10,
    sample_input: "4\n2 7 11 15\n9",
    sample_output: "0 1",
    templates: {
      python3: "def twoSum(nums, target):\n    # Write your code here\n    pass",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[]{};\n    }\n}",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        return {};\n    }\n};",
      javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    // Write your code here\n};"
    },
    test_cases: [
      { id: "tc_1", input: "4\n2 7 11 15\n9", expected_output: "0 1", is_hidden: false },
      { id: "tc_2", input: "3\n3 2 4\n6", expected_output: "1 2", is_hidden: true }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const LOCAL_STORAGE_SUBMISSIONS_KEY = "edunexus_coding_submissions_v1";
const LOCAL_STORAGE_PROBLEMS_KEY = "edunexus_custom_coding_problems_v1";

import { createClient } from "@/lib/supabase/client";

export class SubmissionService {
  private static submissionsMemoryStore: CodingSubmission[] = [];
  private static customProblemsMemoryStore: CodingProblem[] = [];

  /**
   * Retrieves all coding problems (static + custom created).
   */
  public static getAllProblems(): CodingProblem[] {
    let customLocal: CodingProblem[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_PROBLEMS_KEY);
        if (raw) {
          customLocal = JSON.parse(raw);
        }
      } catch (err) {
        console.error("Failed to parse custom coding problems from localStorage:", err);
      }
    }

    const map = new Map<string, CodingProblem>();
    SAMPLE_CODING_PROBLEMS.forEach((p) => map.set(p.id, p));
    this.customProblemsMemoryStore.forEach((p) => map.set(p.id, p));
    customLocal.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }

  /**
   * Saves a new or updated coding problem to memory, localStorage, and Supabase DB.
   */
  public static async saveProblem(problem: CodingProblem): Promise<void> {
    const existingIdx = this.customProblemsMemoryStore.findIndex((p) => p.id === problem.id);
    if (existingIdx >= 0) {
      this.customProblemsMemoryStore[existingIdx] = problem;
    } else {
      this.customProblemsMemoryStore.unshift(problem);
    }

    const sampleIdx = SAMPLE_CODING_PROBLEMS.findIndex((p) => p.id === problem.id);
    if (sampleIdx >= 0) {
      SAMPLE_CODING_PROBLEMS[sampleIdx] = problem;
    } else {
      SAMPLE_CODING_PROBLEMS.unshift(problem);
    }

    if (typeof window !== "undefined") {
      try {
        const all = this.getAllProblems();
        localStorage.setItem(LOCAL_STORAGE_PROBLEMS_KEY, JSON.stringify(all));
      } catch (err) {
        console.error("Failed to save coding problem to localStorage:", err);
      }
    }

    try {
      const supabase = createClient();
      await (supabase as any).from("coding_problems").upsert([
        {
          id: problem.id,
          title: problem.title,
          slug: problem.slug,
          description: problem.description,
          difficulty: problem.difficulty,
          constraints: problem.constraints,
          input_format: problem.input_format,
          output_format: problem.output_format,
          points: problem.points,
          templates: problem.templates,
          test_cases: problem.test_cases,
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn("Supabase coding_problems persistence fallback to local storage:", err);
    }
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
    const problem = this.getProblemById(input.problem_id, false);

    if (!problem) {
      throw new Error(`Problem not found: ${input.problem_id}`);
    }

    const testCases = problem.test_cases;
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
        const sqlRes = SQLExecutionService.executeQuery(input.code, problem.dataset_name ?? "university");
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
        const res = await jobeService.executeCode(input.language, input.code, tc.input);
        trimmedActual = (res.stdout || "").trim();
        executionTime = res.time ? parseFloat(res.time) : 0.02;

        passed =
          res.outcome === 15 || res.outcome === 0
            ? trimmedActual === trimmedExpected
            : false;

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
      problem_id: problem.id,
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
