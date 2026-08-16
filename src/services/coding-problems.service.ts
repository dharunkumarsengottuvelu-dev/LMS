import type { CodingProblem } from "@/types/coding";
import { createClient } from "@/lib/supabase/client";

export const SAMPLE_CODING_PROBLEMS: CodingProblem[] = [];

const LOCAL_STORAGE_PROBLEMS_KEY = "edunexus_custom_coding_problems_v1";

export class CodingProblemsService {
  private static customProblemsMemoryStore: CodingProblem[] = [];

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
      console.warn("Supabase problem upsert warning (offline / fallback active):", err);
    }
  }

  public static getProblemById(id: string): CodingProblem | undefined {
    return this.getAllProblems().find((p) => p.id === id);
  }

  public static getProblemBySlug(slug: string): CodingProblem | undefined {
    return this.getAllProblems().find((p) => p.slug === slug);
  }
}
