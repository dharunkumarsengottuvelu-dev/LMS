import type { CodingProblem } from "@/types/coding";
import { createClient } from "@/lib/supabase/client";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import axios from "axios";

// No static mock problems - clean slate connected directly to DB
export const SAMPLE_CODING_PROBLEMS: (ExtendedCodingProblem | CodingProblem)[] = [];

const LOCAL_STORAGE_PROBLEMS_KEY = "edunexus_coding_problems_db_cache_v2";

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

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LOCAL_STORAGE_PROBLEMS_KEY, JSON.stringify(dbProblems));
        } catch (e) {
          console.warn("Failed to update localStorage cache:", e);
        }
      }

      return dbProblems;
    } catch (err) {
      console.warn("API fetch from /api/admin/coding failed, checking cache:", err);

      // Fallback to localStorage cache
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_PROBLEMS_KEY);
          if (raw) {
            const cached: CodingProblem[] = JSON.parse(raw);
            this.cachedProblems = cached;
            return cached;
          }
        } catch (e) {
          console.error("Failed to parse cached problems:", e);
        }
      }

      return this.cachedProblems;
    }
  }

  /**
   * Synchronous getter that returns in-memory cache or localStorage cache
   */
  public static getAllProblems(): (ExtendedCodingProblem | CodingProblem)[] {
    if (this.cachedProblems.length > 0) {
      return this.cachedProblems;
    }

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_PROBLEMS_KEY);
        if (raw) {
          const parsed: CodingProblem[] = JSON.parse(raw);
          this.cachedProblems = parsed;
          return parsed;
        }
      } catch (err) {
        console.error("Failed to read problems from cache:", err);
      }
    }

    return [];
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

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LOCAL_STORAGE_PROBLEMS_KEY, JSON.stringify(this.cachedProblems));
        } catch (e) {
          console.warn("Failed to update cache after save:", e);
        }
      }

      return saved;
    } catch (err) {
      console.error("Failed to save problem via /api/admin/coding:", err);
      // Local fallback
      const idx = this.cachedProblems.findIndex((p) => p.id === problem.id);
      if (idx >= 0) {
        this.cachedProblems[idx] = problem;
      } else {
        this.cachedProblems.unshift(problem);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_PROBLEMS_KEY, JSON.stringify(this.cachedProblems));
      }
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

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_PROBLEMS_KEY, JSON.stringify(this.cachedProblems));
      } catch (err) {
        console.error("Failed to update localStorage after delete:", err);
      }
    }

    try {
      await axios.delete(`/api/admin/coding?id=${encodeURIComponent(id)}`);
    } catch (err) {
      console.warn("Failed to delete problem via API:", err);
      // Direct Supabase fallback
      try {
        const supabase = createClient();
        await (supabase as any).from("coding_problems").delete().eq("id", id);
      } catch (e) {
        console.error("Direct Supabase delete failed:", e);
      }
    }
  }
}
