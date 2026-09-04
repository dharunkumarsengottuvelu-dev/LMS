import type { CodingProblem } from "@/types/coding";
import { createClient } from "@/lib/supabase/client";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import axios from "axios";

export const SAMPLE_CODING_PROBLEMS: (ExtendedCodingProblem | CodingProblem)[] = [];

export class CodingProblemsService {
  private static cachedProblems: (ExtendedCodingProblem | CodingProblem)[] = [];
  private static isInitialized = false;

  /**
   * Fetch all coding problems directly from Supabase DB via /api/admin/coding
   */
  public static async fetchProblems(): Promise<(ExtendedCodingProblem | CodingProblem)[]> {
    try {
      const res = await axios.get("/api/admin/coding");
      const dbProblems: CodingProblem[] = res.data?.problems || [];

      this.cachedProblems = dbProblems;
      this.isInitialized = true;
      return dbProblems;
    } catch (err) {
      console.warn("API fetch from /api/admin/coding failed:", err);
      return this.cachedProblems;
    }
  }

  /**
   * Synchronous getter that returns in-memory cache
   */
  public static getAllProblems(): (ExtendedCodingProblem | CodingProblem)[] {
    return this.cachedProblems;
  }

  /**
   * Save or update a problem directly in the database
   */
  public static async saveProblem(problem: CodingProblem): Promise<CodingProblem> {
    try {
      const res = await axios.post("/api/admin/coding", problem);
      const saved = res.data?.problem || problem;

      // Update in-memory cache
      const idx = this.cachedProblems.findIndex((p) => p.id === problem.id || p.id === saved.id);
      if (idx >= 0) {
        this.cachedProblems[idx] = { ...problem, id: saved.id || problem.id };
      } else {
        this.cachedProblems.unshift({ ...problem, id: saved.id || problem.id });
      }

      return saved;
    } catch (err) {
      console.error("Failed to save problem via /api/admin/coding:", err);
      throw err;
    }
  }

  public static getProblemById(id: string): (ExtendedCodingProblem | CodingProblem) | undefined {
    return this.getAllProblems().find((p) => p.id === id);
  }

  public static getProblemBySlug(slug: string): (ExtendedCodingProblem | CodingProblem) | undefined {
    return this.getAllProblems().find((p) => p.slug === slug);
  }

  /**
   * Delete a problem directly from the database
   */
  public static async deleteProblem(id: string): Promise<void> {
    this.cachedProblems = this.cachedProblems.filter((p) => p.id !== id);

    try {
      await axios.delete(`/api/admin/coding?id=${encodeURIComponent(id)}`);
    } catch (err) {
      console.warn("Failed to delete problem via API:", err);
      try {
        const supabase = createClient();
        await (supabase as any).from("coding_problems").delete().eq("id", id);
      } catch (e) {
        console.error("Direct Supabase delete failed:", e);
      }
    }
  }
}
