import type { CodingProblem } from "@/types/coding";
import { createClient } from "@/lib/supabase/client";
import type { ExtendedCodingProblem } from "@/data/coding-problems-data";
import axios from "axios";

export class CodingProblemsService {
  private static cachedProblems: (ExtendedCodingProblem | CodingProblem)[] = [];
  private static isInitialized = false;

  /**
   * Fetch all coding problems directly from Supabase DB via /api/admin/coding
   */
  public static async fetchProblems(scope: string = "codelab"): Promise<(ExtendedCodingProblem | CodingProblem)[]> {
    try {
      const res = await axios.get(`/api/admin/coding?scope=${encodeURIComponent(scope)}`);
      const dbProblems: CodingProblem[] = res.data?.problems || [];

      // Ensure chronological ordering: oldest first (1st added is #1)
      dbProblems.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });

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
      const mergedProblem = { ...problem, ...saved };

      // Update in-memory cache
      const idx = this.cachedProblems.findIndex((p) =>
        (problem.id && p.id === problem.id) ||
        (saved.id && p.id === saved.id) ||
        (problem.slug && p.slug === problem.slug) ||
        (saved.slug && p.slug === saved.slug)
      );
      if (idx >= 0) {
        this.cachedProblems[idx] = mergedProblem;
      } else {
        // Append newly created problem at the end so it gets the next sequential question number
        this.cachedProblems.push(mergedProblem);
      }

      return mergedProblem;
    } catch (err) {
      console.error("Failed to save problem via /api/admin/coding:", err);
      throw err;
    }
  }

  /**
   * Enterprise Bulk Question Upload Execution with Job Tracking & Database Reconciliation
   */
  public static async executeBulkUploadJob(
    problems: CodingProblem[],
    filename: string = "bulk_challenges.xlsx",
    onJobUpdate?: (job: any, progressPercent: number) => void
  ): Promise<{ job: any; reconciliationReport: any; allSaved: CodingProblem[] }> {
    if (!problems || problems.length === 0) {
      throw new Error("No problem records provided for upload.");
    }

    const BATCH_SIZE = 50;
    const totalRecords = problems.length;
    const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

    // 1. Initialize persistent upload job on backend
    const initialRecords = problems.map((p, idx) => ({
      source_row_number: idx + 1,
      title: p.title || `Challenge ${idx + 1}`,
      difficulty: p.difficulty || "medium",
    }));

    const createRes = await axios.post("/api/admin/coding/upload-job", {
      action: "create",
      original_filename: filename,
      total_records: totalRecords,
      total_batches: totalBatches,
      initial_records: initialRecords,
    });

    const jobId = createRes.data?.job_id;
    let currentJob = createRes.data?.job;

    if (onJobUpdate && currentJob) {
      onJobUpdate(currentJob, 0);
    }

    const allSaved: CodingProblem[] = [];

    // 2. Process batches sequentially with live status updates
    for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
      const start = bIdx * BATCH_SIZE;
      const slice = problems.slice(start, start + BATCH_SIZE).map((p, sIdx) => ({
        ...p,
        source_row_number: start + sIdx + 1,
      }));

      try {
        const batchRes = await axios.post(
          "/api/admin/coding/upload-job",
          {
            action: "process_batch",
            job_id: jobId,
            batch_index: bIdx + 1,
            problems: slice,
          },
          { timeout: 90000 }
        );

        currentJob = batchRes.data?.job || currentJob;
      } catch (batchErr) {
        console.warn(`[CodingProblemsService] Batch #${bIdx + 1} fallback handling:`, batchErr);
        // Sub-chunk fallback for network glitches
        for (let j = 0; j < slice.length; j += 5) {
          const subSlice = slice.slice(j, j + 5);
          try {
            const subRes = await axios.post(
              "/api/admin/coding/upload-job",
              {
                action: "process_batch",
                job_id: jobId,
                batch_index: bIdx + 1,
                problems: subSlice,
              },
              { timeout: 60000 }
            );
            currentJob = subRes.data?.job || currentJob;
          } catch (subErr) {
            console.error("[CodingProblemsService] Sub-chunk failed:", subErr);
          }
        }
      }

      const percent = Math.round(((bIdx + 1) / totalBatches) * 100);
      if (onJobUpdate && currentJob) {
        onJobUpdate(currentJob, percent);
      }
    }

    // 3. Final Database Reconciliation & Verification
    const reconcileRes = await axios.post("/api/admin/coding/upload-job", {
      action: "reconcile",
      job_id: jobId,
    });

    const reconciliationReport = reconcileRes.data?.reconciliation_report;
    const finalJob = reconcileRes.data?.job || currentJob;

    if (onJobUpdate) {
      onJobUpdate(finalJob, 100);
    }

    // Refresh memory cache
    await this.fetchProblems();

    return {
      job: finalJob,
      reconciliationReport,
      allSaved,
    };
  }

  /**
   * Save multiple problems directly in the database in bulk with automatic chunking and live progress reporting
   */
  public static async saveProblems(
    problems: CodingProblem[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<CodingProblem[]> {
    if (!problems || problems.length === 0) return [];
    try {
      const result = await this.executeBulkUploadJob(
        problems,
        "bulk_challenges.xlsx",
        (job, percent) => {
          if (onProgress) {
            onProgress(job.successful_records + job.failed_records, job.total_records);
          }
        }
      );
      return result.allSaved;
    } catch (err) {
      console.error("Failed to batch save problems via upload job engine:", err);
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

  /**
   * Delete multiple problems in bulk from the database
   */
  public static async deleteProblems(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    this.cachedProblems = this.cachedProblems.filter((p) => !ids.includes(p.id));

    try {
      await axios.delete(`/api/admin/coding?ids=${encodeURIComponent(ids.join(","))}`);
    } catch (err) {
      console.warn("Failed to batch delete problems via API:", err);
      try {
        const supabase = createClient();
        await (supabase as any).from("coding_problems").delete().in("id", ids);
      } catch (e) {
        console.error("Direct Supabase batch delete failed:", e);
      }
    }
  }
}
