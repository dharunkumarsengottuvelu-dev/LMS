import type { CodingLanguage, CodingSubmission, TestCaseResult } from "@/types/coding";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import { SubmissionService } from "@/services/submission.service";
import { CodingProblemsService } from "@/services/coding-problems.service";

export type ProblemSolveStatus = "not_started" | "in_progress" | "attempted" | "solved";

export interface ProblemSavedState {
  problemId: string;
  status: ProblemSolveStatus;
  language: CodingLanguage;
  code: string;
  customInput?: string;
  timerSeconds?: number;
  lastExecutionResult?: {
    results: TestCaseResult[];
    runAt: string;
  };
  lastSubmission?: CodingSubmission;
  acceptedSubmission?: CodingSubmission;
  updatedAt: string;
}

const LOCAL_STORAGE_PROGRESS_KEY = "falcon_coding_progress_v2";
const LOCAL_STORAGE_ACTIVE_PROBLEM_KEY = "falcon_coding_active_problem_v2";

export class CodingProgressService {
  private static memoryStore: Map<string, ProblemSavedState> = new Map();
  private static storeLoaded = false;

  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  public static invalidateCache(): void {
    this.storeLoaded = false;
  }

  private static loadStore(): Map<string, ProblemSavedState> {
    if (!this.isBrowser()) return this.memoryStore;
    if (this.storeLoaded) return this.memoryStore;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ProblemSavedState>;
        const map = new Map<string, ProblemSavedState>();
        Object.entries(parsed).forEach(([k, v]) => map.set(k, v));
        this.memoryStore = map;
        this.storeLoaded = true;
        return map;
      }
    } catch (e) {
      console.error("Failed to load coding progress from localStorage:", e);
    }
    this.storeLoaded = true;
    return this.memoryStore;
  }

  private static persistStore(): void {
    if (!this.isBrowser()) return;
    try {
      const obj: Record<string, ProblemSavedState> = {};
      this.memoryStore.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(obj));
    } catch (e) {
      console.error("Failed to save coding progress to localStorage:", e);
    }
  }

  public static getProblemState(problemId: string): ProblemSavedState | null {
    const store = this.loadStore();
    return store.get(problemId) || null;
  }

  public static getProblemStatus(problemId: string): ProblemSolveStatus {
    const state = this.getProblemState(problemId);
    if (!state) return "not_started";
    if (state.status === "solved" || Boolean(state.acceptedSubmission)) return "solved";
    return state.status || "not_started";
  }

  public static isProblemSolved(problemId: string, slug?: string): boolean {
    const store = this.loadStore();
    const state = store.get(problemId) || (slug ? store.get(slug) : null);
    return state?.status === "solved" || Boolean(state?.acceptedSubmission);
  }

  /**
   * Synchronizes progress store with authoritative database submissions.
   * If any submission for a problem was accepted, marks it permanently as solved.
   */
  public static syncWithSubmissions(
    submissions: CodingSubmission[],
    allProblems?: ExtendedCodingProblem[]
  ): void {
    if (!submissions || submissions.length === 0) return;
    const store = this.loadStore();
    let hasChanges = false;

    const problems = allProblems || (CodingProblemsService.getAllProblems() as ExtendedCodingProblem[]);

    problems.forEach((problem) => {
      const problemSubs = submissions.filter((s) =>
        SubmissionService.matchesProblem(s, problem)
      );
      if (problemSubs.length === 0) return;

      const acceptedSub = problemSubs.find((s) => s.status === "accepted");
      const latestSub = problemSubs[0];
      const existing = store.get(problem.id) || (problem.slug ? store.get(problem.slug) : undefined);

      const isSolved = Boolean(acceptedSub || existing?.status === "solved" || existing?.acceptedSubmission);
      const bestSub = acceptedSub || existing?.acceptedSubmission || latestSub;

      // Check if student has non-template code in draft
      const draftCode = existing?.code;
      const defaultTemplate = problem.templates?.[existing?.language || bestSub?.language || "python"] || "";
      const isCustomCode = draftCode && draftCode.trim() !== defaultTemplate.trim();

      const finalCode = isCustomCode ? draftCode : (bestSub?.code || draftCode || defaultTemplate);
      const finalLanguage = (existing?.language || bestSub?.language || "python") as CodingLanguage;

      const updatedState: ProblemSavedState = {
        problemId: problem.id,
        status: isSolved ? "solved" : (existing?.status || "attempted"),
        language: finalLanguage,
        code: finalCode,
        customInput: existing?.customInput,
        timerSeconds: existing?.timerSeconds,
        lastExecutionResult: existing?.lastExecutionResult,
        lastSubmission: latestSub || existing?.lastSubmission,
        acceptedSubmission: acceptedSub || existing?.acceptedSubmission,
        updatedAt: existing?.updatedAt || new Date().toISOString(),
      };

      store.set(problem.id, updatedState);
      if (problem.slug && problem.slug !== problem.id) {
        store.set(problem.slug, updatedState);
      }
      hasChanges = true;
    });

    if (hasChanges) {
      this.memoryStore = store;
      this.persistStore();
    }
  }

  public static saveDraft(
    problemId: string,
    language: CodingLanguage,
    code: string,
    opts?: {
      customInput?: string;
      timerSeconds?: number;
      lastExecutionResult?: { results: TestCaseResult[]; runAt: string };
    }
  ): ProblemSavedState {
    const store = this.loadStore();
    const existing = store.get(problemId);

    // CRITICAL: If already marked as solved, do NOT downgrade to in_progress
    const isAlreadySolved = existing?.status === "solved" || Boolean(existing?.acceptedSubmission);
    const currentStatus: ProblemSolveStatus = isAlreadySolved ? "solved" : "in_progress";

    const updated: ProblemSavedState = {
      problemId,
      status: currentStatus,
      language,
      code,
      customInput: opts?.customInput !== undefined ? opts.customInput : existing?.customInput,
      timerSeconds: opts?.timerSeconds !== undefined ? opts.timerSeconds : existing?.timerSeconds,
      lastExecutionResult: opts?.lastExecutionResult || existing?.lastExecutionResult,
      lastSubmission: existing?.lastSubmission,
      acceptedSubmission: existing?.acceptedSubmission,
      updatedAt: new Date().toISOString(),
    };

    store.set(problemId, updated);
    this.memoryStore = store;
    this.persistStore();

    // Also persist default draft key for backwards compatibility
    if (this.isBrowser()) {
      try {
        localStorage.setItem(`edunexus_draft_${problemId}_${language}`, code);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROBLEM_KEY, problemId);
      } catch {}
    }

    return updated;
  }

  /**
   * Records a problem submission attempt.
   * GUARANTEE: If a problem was ever solved, it NEVER downgrades back to "attempted" or loses "solved" status.
   */
  public static markAttempted(
    problemId: string,
    language: CodingLanguage,
    code: string,
    submission: CodingSubmission,
    forceKeepSolved: boolean = false
  ): void {
    const store = this.loadStore();
    const existing = store.get(problemId);

    const isAccepted = submission.status === "accepted";
    const wasAlreadySolved = forceKeepSolved || existing?.status === "solved" || Boolean(existing?.acceptedSubmission);

    // PERMANENT SOLVED RULE: If accepted or already solved previously, keep "solved" status forever!
    const nextStatus: ProblemSolveStatus = (isAccepted || wasAlreadySolved) ? "solved" : "attempted";

    // Retain previous accepted submission if this current attempt was not accepted
    const acceptedSubmission = isAccepted ? submission : existing?.acceptedSubmission;

    const updated: ProblemSavedState = {
      problemId,
      status: nextStatus,
      language,
      code,
      customInput: existing?.customInput,
      timerSeconds: existing?.timerSeconds,
      lastExecutionResult: existing?.lastExecutionResult,
      lastSubmission: submission,
      acceptedSubmission,
      updatedAt: new Date().toISOString(),
    };

    store.set(problemId, updated);
    this.memoryStore = store;
    this.persistStore();
  }

  public static getActiveProblemId(): string | null {
    if (!this.isBrowser()) return null;
    try {
      return localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROBLEM_KEY);
    } catch {
      return null;
    }
  }

  public static getInProgressProblems(allProblems: ExtendedCodingProblem[]): { problem: ExtendedCodingProblem; state: ProblemSavedState }[] {
    const store = this.loadStore();
    const result: { problem: ExtendedCodingProblem; state: ProblemSavedState }[] = [];
    const seen = new Set<string>();

    store.forEach((state, problemId) => {
      // Must not be solved
      if (state.status === "in_progress" || state.status === "attempted") {
        if (!state.acceptedSubmission) {
          const p = allProblems.find((item) => item.id === problemId || item.slug === problemId);
          if (p && !seen.has(p.id)) {
            seen.add(p.id);
            result.push({ problem: p, state });
          }
        }
      }
    });

    return result.sort((a, b) => new Date(b.state.updatedAt).getTime() - new Date(a.state.updatedAt).getTime());
  }

  public static getSolvedProblems(allProblems: ExtendedCodingProblem[]): { problem: ExtendedCodingProblem; state: ProblemSavedState }[] {
    const store = this.loadStore();
    const result: { problem: ExtendedCodingProblem; state: ProblemSavedState }[] = [];
    const seen = new Set<string>();

    store.forEach((state, problemId) => {
      if (state.status === "solved" || Boolean(state.acceptedSubmission)) {
        const p = allProblems.find((item) => item.id === problemId || item.slug === problemId);
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          result.push({ problem: p, state });
        }
      }
    });

    return result.sort((a, b) => new Date(b.state.updatedAt).getTime() - new Date(a.state.updatedAt).getTime());
  }

  public static getProgressStats(allProblems: ExtendedCodingProblem[]) {
    const store = this.loadStore();
    let solvedCount = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;
    let inProgressCount = 0;
    let attemptedCount = 0;

    let totalSubmissions = 0;
    let acceptedSubmissions = 0;

    allProblems.forEach((p) => {
      const state = store.get(p.id) || (p.slug ? store.get(p.slug) : undefined);
      if (state) {
        const isSolved = state.status === "solved" || Boolean(state.acceptedSubmission);
        if (isSolved) {
          solvedCount++;
          if (p.difficulty === "easy") easySolved++;
          else if (p.difficulty === "medium") mediumSolved++;
          else if (p.difficulty === "hard") hardSolved++;
        } else if (state.status === "in_progress") {
          inProgressCount++;
        } else if (state.status === "attempted") {
          attemptedCount++;
        }

        if (state.lastSubmission || state.acceptedSubmission) {
          totalSubmissions++;
          if (isSolved || state.lastSubmission?.status === "accepted" || state.acceptedSubmission) {
            acceptedSubmissions++;
          }
        }
      }
    });

    const acceptanceRate = totalSubmissions > 0
      ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(1) + "%"
      : "0.0%";

    return {
      totalProblems: allProblems.length,
      solvedCount,
      easySolved,
      mediumSolved,
      hardSolved,
      inProgressCount,
      attemptedCount,
      acceptanceRate,
      streakDays: solvedCount > 0 ? Math.min(solvedCount * 2, 14) : 0,
      totalPoints: solvedCount * 100 + mediumSolved * 50 + hardSolved * 100,
      totalSubmissions,
    };
  }
}
