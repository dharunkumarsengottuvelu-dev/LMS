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
   * Helper to execute HTTP POST requests with exponential backoff on retryable failures (rate limits, timeouts)
   */
  private static async postWithBackoff<T = any>(
    url: string,
    data: any,
    options: { timeout?: number; maxRetries?: number; initialDelayMs?: number } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    let delay = options.initialDelayMs ?? 1000;
    const timeout = options.timeout ?? 60000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await axios.post(url, data, { timeout });
        return res.data;
      } catch (err: any) {
        const status = err.response?.status;
        const isRetryable =
          err.code === "ECONNABORTED" ||
          err.message?.includes("timeout") ||
          status === 429 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          !err.response;

        if (attempt === maxRetries || !isRetryable) {
          throw err;
        }

        console.warn(
          `[CodingProblemsService] Request to ${url} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error("Request failed after maximum backoff retries.");
  }

  /**
   * Enterprise Bulk Question Upload Execution with Job Tracking, Exponential Backoff & Database Reconciliation
   */
  public static async executeBulkUploadJob(
    problems: CodingProblem[],
    filename: string = "bulk_challenges.xlsx",
    onJobUpdate?: (job: any, progressPercent: number) => void,
    options: { batchSize?: number } = {}
  ): Promise<{ job: any; reconciliationReport: any; allSaved: CodingProblem[] }> {
    if (!problems || problems.length === 0) {
      throw new Error("No problem records provided for upload.");
    }

    const BATCH_SIZE = options.batchSize || (problems.length > 500 ? 50 : 25);
    const totalRecords = problems.length;
    const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

    // 1. Initialize persistent upload job on backend with lightweight manifest
    const initialRecords = problems.map((p, idx) => ({
      source_row_number: idx + 1,
      title: (p.title || `Challenge ${idx + 1}`).substring(0, 120),
      difficulty: p.difficulty || "medium",
    }));

    const createRes = await this.postWithBackoff<{ job_id: string; job: any }>(
      "/api/admin/coding/upload-job",
      {
        action: "create",
        original_filename: filename,
        total_records: totalRecords,
        total_batches: totalBatches,
        initial_records: initialRecords,
      }
    );

    const jobId = createRes.job_id;
    let currentJob = createRes.job;

    if (onJobUpdate && currentJob) {
      onJobUpdate(currentJob, 0);
    }

    // 2. Process batches sequentially with exponential backoff & deterministic idempotency
    for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
      const start = bIdx * BATCH_SIZE;
      const slice = problems.slice(start, start + BATCH_SIZE).map((p, sIdx) => ({
        ...p,
        source_row_number: start + sIdx + 1,
      }));

      try {
        const batchRes = await this.postWithBackoff<{ job: any }>(
          "/api/admin/coding/upload-job",
          {
            action: "process_batch",
            job_id: jobId,
            batch_index: bIdx + 1,
            problems: slice,
          },
          { timeout: 75000, maxRetries: 3, initialDelayMs: 1500 }
        );

        currentJob = batchRes.job || currentJob;
      } catch (batchErr) {
        console.warn(`[CodingProblemsService] Batch #${bIdx + 1} primary failed, attempting isolated row recovery:`, batchErr);
        // Fallback: Process smaller sub-chunks to isolate any individual problematic rows
        for (let j = 0; j < slice.length; j += 10) {
          const subSlice = slice.slice(j, j + 10);
          try {
            const subRes = await this.postWithBackoff<{ job: any }>(
              "/api/admin/coding/upload-job",
              {
                action: "process_batch",
                job_id: jobId,
                batch_index: bIdx + 1,
                problems: subSlice,
              },
              { timeout: 45000, maxRetries: 2, initialDelayMs: 1000 }
            );
            currentJob = subRes.job || currentJob;
          } catch (subErr) {
            console.error("[CodingProblemsService] Sub-chunk failed:", subErr);
          }
        }
      }

      const percent = Math.min(99, Math.round(((bIdx + 1) / totalBatches) * 100));
      if (onJobUpdate && currentJob) {
        onJobUpdate(currentJob, percent);
      }
    }

    // 3. Final Database Reconciliation & Verification
    const reconcileRes = await this.postWithBackoff<{ reconciliation_report: any; job: any }>(
      "/api/admin/coding/upload-job",
      {
        action: "reconcile",
        job_id: jobId,
      },
      { timeout: 60000, maxRetries: 3 }
    );

    const reconciliationReport = reconcileRes.reconciliation_report;
    const finalJob = reconcileRes.job || currentJob;

    if (onJobUpdate) {
      onJobUpdate(finalJob, 100);
    }

    // Refresh memory cache
    await this.fetchProblems();

    return {
      job: finalJob,
      reconciliationReport,
      allSaved: [],
    };
  }

  /**
   * Resume an interrupted upload job without restarting from zero
   */
  public static async resumeBulkUploadJob(
    jobId: string,
    problems: CodingProblem[],
    onJobUpdate?: (job: any, progressPercent: number) => void
  ): Promise<{ job: any; reconciliationReport: any }> {
    // 1. Fetch resume checkpoint and pending records from server
    const resumeRes = await this.postWithBackoff<{
      job: any;
      pending_records: any[];
      failed_records: any[];
      checkpoint?: any;
    }>("/api/admin/coding/upload-job", {
      action: "resume",
      job_id: jobId,
    });

    const pendingRowNumbers = new Set<number>(
      (resumeRes.pending_records || []).map((r: any) => r.source_row_number)
    );
    const failedRowNumbers = new Set<number>(
      (resumeRes.failed_records || []).map((r: any) => r.source_row_number)
    );

    const rowsToProcess = problems
      .map((p, idx) => ({ ...p, source_row_number: idx + 1 }))
      .filter((p) => pendingRowNumbers.has(p.source_row_number) || failedRowNumbers.has(p.source_row_number));

    let currentJob = resumeRes.job;
    const BATCH_SIZE = 25;
    const totalBatches = Math.ceil(rowsToProcess.length / BATCH_SIZE);

    for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
      const slice = rowsToProcess.slice(bIdx * BATCH_SIZE, (bIdx + 1) * BATCH_SIZE);
      const batchRes = await this.postWithBackoff<{ job: any }>(
        "/api/admin/coding/upload-job",
        {
          action: "process_batch",
          job_id: jobId,
          batch_index: bIdx + 1,
          problems: slice,
        },
        { timeout: 60000 }
      );
      currentJob = batchRes.job || currentJob;

      if (onJobUpdate && currentJob) {
        const percent = Math.round(((bIdx + 1) / totalBatches) * 100);
        onJobUpdate(currentJob, percent);
      }
    }

    // Final reconciliation
    const reconcileRes = await this.postWithBackoff<{ reconciliation_report: any; job: any }>(
      "/api/admin/coding/upload-job",
      {
        action: "reconcile",
        job_id: jobId,
      }
    );

    if (onJobUpdate) {
      onJobUpdate(reconcileRes.job, 100);
    }
    await this.fetchProblems();

    return {
      job: reconcileRes.job,
      reconciliationReport: reconcileRes.reconciliation_report,
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
    try {
      const res = await axios.delete(`/api/admin/coding?id=${encodeURIComponent(id)}`);
      if (res.data?.success !== true && res.status !== 200) {
        throw new Error(res.data?.error || "Failed to delete problem from database.");
      }
      this.cachedProblems = this.cachedProblems.filter((p) => p.id !== id);
    } catch (err: any) {
      console.error("Failed to delete problem via API:", err);
      throw new Error(err?.response?.data?.error || err?.message || "Failed to delete problem from database.");
    }
  }

  /**
   * Delete multiple problems in bulk from the database
   */
  public static async deleteProblems(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;

    const CHUNK_SIZE = 50;
    try {
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const res = await axios.delete("/api/admin/coding", {
          data: { ids: chunk },
        });
        if (res.data?.success !== true && res.status !== 200) {
          throw new Error(res.data?.error || "Failed to batch delete problems from database.");
        }
      }
      this.cachedProblems = this.cachedProblems.filter((p) => !ids.includes(p.id));
    } catch (err: any) {
      console.error("Failed to batch delete problems via API:", err);
      throw new Error(err?.response?.data?.error || err?.message || "Failed to delete selected problems from database.");
    }
  }
}
