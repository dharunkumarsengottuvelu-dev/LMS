import type { CodingLanguage, CodingSubmission, TestCaseResult } from "@/types/coding";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";

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
  updatedAt: string;
}

const LOCAL_STORAGE_PROGRESS_KEY = "falcon_coding_progress_v2";
const LOCAL_STORAGE_ACTIVE_PROBLEM_KEY = "falcon_coding_active_problem_v2";

export class CodingProgressService {
  private static memoryStore: Map<string, ProblemSavedState> = new Map();

  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  private static loadStore(): Map<string, ProblemSavedState> {
    if (!this.isBrowser()) return this.memoryStore;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ProblemSavedState>;
        const map = new Map<string, ProblemSavedState>();
        Object.entries(parsed).forEach(([k, v]) => map.set(k, v));
        this.memoryStore = map;
        return map;
      }
    } catch (e) {
      console.error("Failed to load coding progress from localStorage:", e);
    }
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
    return state?.status || "not_started";
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

    // If already marked as solved, do not downgrade to in_progress
    const currentStatus = existing?.status === "solved" ? "solved" : "in_progress";

    const updated: ProblemSavedState = {
      problemId,
      status: currentStatus,
      language,
      code,
      customInput: opts?.customInput !== undefined ? opts.customInput : existing?.customInput,
      timerSeconds: opts?.timerSeconds !== undefined ? opts.timerSeconds : existing?.timerSeconds,
      lastExecutionResult: opts?.lastExecutionResult || existing?.lastExecutionResult,
      lastSubmission: existing?.lastSubmission,
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

  public static markAttempted(
    problemId: string,
    language: CodingLanguage,
    code: string,
    submission: CodingSubmission
  ): void {
    const store = this.loadStore();
    const existing = store.get(problemId);

    const isAccepted = submission.status === "accepted";
    const nextStatus: ProblemSolveStatus = isAccepted ? "solved" : (existing?.status === "solved" ? "solved" : "attempted");

    const updated: ProblemSavedState = {
      problemId,
      status: nextStatus,
      language,
      code,
      customInput: existing?.customInput,
      timerSeconds: existing?.timerSeconds,
      lastExecutionResult: existing?.lastExecutionResult,
      lastSubmission: submission,
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

    store.forEach((state, problemId) => {
      if (state.status === "in_progress" || state.status === "attempted") {
        const p = allProblems.find((item) => item.id === problemId || item.slug === problemId);
        if (p) {
          result.push({ problem: p, state });
        }
      }
    });

    return result.sort((a, b) => new Date(b.state.updatedAt).getTime() - new Date(a.state.updatedAt).getTime());
  }

  public static getSolvedProblems(allProblems: ExtendedCodingProblem[]): { problem: ExtendedCodingProblem; state: ProblemSavedState }[] {
    const store = this.loadStore();
    const result: { problem: ExtendedCodingProblem; state: ProblemSavedState }[] = [];

    store.forEach((state, problemId) => {
      if (state.status === "solved") {
        const p = allProblems.find((item) => item.id === problemId || item.slug === problemId);
        if (p) {
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
      const state = store.get(p.id) || store.get(p.slug);
      if (state) {
        if (state.status === "solved") {
          solvedCount++;
          if (p.difficulty === "easy") easySolved++;
          else if (p.difficulty === "medium") mediumSolved++;
          else if (p.difficulty === "hard") hardSolved++;
        } else if (state.status === "in_progress") {
          inProgressCount++;
        } else if (state.status === "attempted") {
          attemptedCount++;
        }

        if (state.lastSubmission) {
          totalSubmissions++;
          if (state.lastSubmission.status === "accepted") acceptedSubmissions++;
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
