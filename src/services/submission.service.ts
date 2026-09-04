import type {
  CodingProblem,
  CodingSubmission,
  TestCase,
  TestCaseResult,
  CodingLanguage,
  SubmissionStatus,
  SubmitCodeInput,
} from "@/types/coding";
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
    await CodingProblemsService.saveProblem(problem);
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
   * Saves a submission to Supabase DB, in-memory store and localStorage.
   */
  public static async saveSubmission(submission: CodingSubmission): Promise<void> {
    this.submissionsMemoryStore.unshift(submission);

    // Save to Supabase DB if possible
    try {
      const supabase = createClient();
      await (supabase as any).from("coding_submissions").insert([
        {
          problem_id: submission.problem_id,
          student_id: submission.student_id,
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
        window.dispatchEvent(new CustomEvent("student-activity-updated"));
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
