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
   * Deterministic UUID converter for any string problem ID
   */
  public static toDeterministicUUID(str: string): string {
    if (!str) return "00000000-0000-0000-0000-000000000000";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
      return str;
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const hex1 = Math.abs(hash).toString(16).padStart(8, "0");
    const hex2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, "0");
    const hex3 = Math.abs((hash * 57) | 0).toString(16).padStart(8, "0");
    const hex4 = Math.abs((hash * 93) | 0).toString(16).padStart(8, "0");
    const full = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
    return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
  }

  /**
   * Saves a submission to Supabase DB, in-memory store and localStorage.
   */
  public static async saveSubmission(submission: CodingSubmission): Promise<void> {
    this.submissionsMemoryStore.unshift(submission);

    // Save to Supabase DB with admin privileges (bypassing RLS) on server
    if (typeof window === "undefined") {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();
        const problemUUID = this.toDeterministicUUID(submission.problem_id);

        // Resolve student profile ID (student_id in coding_submissions REFERENCES profiles(id))
        let profileId = submission.student_id;
        if (submission.student_id) {
          const { data: profile } = await adminClient
            .from("profiles")
            .select("id")
            .or(`user_id.eq.${submission.student_id},id.eq.${submission.student_id}`)
            .maybeSingle();

          if (profile?.id) {
            profileId = profile.id;
          }
        }

        // Ensure problem exists in coding_problems to satisfy foreign key constraint
        const { data: existingProblem } = await adminClient
          .from("coding_problems")
          .select("id")
          .eq("id", problemUUID)
          .maybeSingle();

        if (!existingProblem) {
          const createdBy = profileId || "dc010d4a-e983-4a05-a3cb-40390e99629c";
          await (adminClient.from("coding_problems") as any).insert({
            id: problemUUID,
            title: `Problem ${submission.problem_id}`,
            slug: `prob-${submission.problem_id.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            description: "Coding challenge problem",
            created_by: createdBy,
            status: "published",
          });
        }

        // Insert into coding_submissions using correct schema (source_code, NOT code)
        await (adminClient.from("coding_submissions") as any).insert([
          {
            problem_id: problemUUID,
            student_id: profileId,
            language: submission.language,
            source_code: submission.code,
            status: submission.status,
            passed_test_cases: submission.passed_test_cases,
            total_test_cases: submission.total_test_cases,
            test_results: submission.results,
            created_at: submission.created_at || new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.warn("Supabase submission persistence notice:", e);
      }
    }

    if (typeof window !== "undefined") {
      try {
        this.submissionsMemoryStore = [submission, ...this.submissionsMemoryStore.filter((s) => s.id !== submission.id)];
        window.dispatchEvent(new CustomEvent("student-activity-updated"));
      } catch (err) {
        console.error("Failed to update submission store:", err);
      }
    }
  }

  /**
   * Asynchronously fetches authoritative submissions for the student from the backend database API.
   */
  public static async fetchStudentSubmissions(studentId?: string): Promise<CodingSubmission[]> {
    try {
      const url = studentId ? `/api/code/submissions?student_id=${encodeURIComponent(studentId)}` : "/api/code/submissions";
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.submissions)) {
          this.submissionsMemoryStore = data.submissions;
          return data.submissions;
        }
      }
    } catch (err) {
      console.error("Failed to fetch submissions from database API:", err);
    }
    return this.submissionsMemoryStore;
  }

  /**
   * Retrieves current in-memory cached submissions.
   */
  public static getStudentSubmissions(studentId?: string): CodingSubmission[] {
    if (studentId) {
      return this.submissionsMemoryStore.filter((s) => s.student_id === studentId);
    }
    return this.submissionsMemoryStore;
  }
}
