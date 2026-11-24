import { SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export type UploadJobStatus =
  | "PENDING"
  | "VALIDATING"
  | "QUEUED"
  | "PROCESSING"
  | "PARTIALLY_FAILED"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED"
  | "CANCELLED";

export type RecordProcessingStatus =
  | "PENDING"
  | "PROCESSING"
  | "INSERTED"
  | "FAILED_VALIDATION"
  | "FAILED_DATABASE"
  | "DUPLICATE"
  | "REJECTED"
  | "RETRYING";

export type ErrorCategory =
  | "VALIDATION_ERROR"
  | "DUPLICATE_CONFLICT"
  | "DATABASE_ERROR"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "AUTH_ERROR"
  | "SYSTEM_ERROR"
  | "CONSTRAINT_ERROR";

export interface BulkUploadJobRecord {
  id: string;
  job_id: string;
  source_row_number: number;
  idempotency_key: string;
  title: string;
  difficulty?: string;
  status: RecordProcessingStatus;
  problem_id?: string;
  error_message?: string;
  error_category?: ErrorCategory;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface UploadCheckpoint {
  batch_index: number;
  completed_at: string;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  duplicate_count: number;
}

export interface BulkUploadJob {
  id: string;
  original_filename: string;
  uploaded_by?: string;
  total_records: number;
  validated_records: number;
  invalid_records: number;
  processing_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  rejected_records: number;
  current_batch: number;
  total_batches: number;
  upload_status: UploadJobStatus;
  last_processed_checkpoint?: UploadCheckpoint;
  started_at: string;
  completed_at?: string;
  last_error?: string;
  retry_count: number;
  metadata: Record<string, any>;
  records: BulkUploadJobRecord[];
  created_at: string;
  updated_at: string;
}

export interface ReconciliationReport {
  job_id: string;
  source_record_count: number;
  total_processed: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  rejected_records: number;
  pending_records: number;
  database_verified_count: number;
  is_reconciled: boolean;
  formula_check: string;
  reconciliation_errors: string[];
}

// Local durable fallback storage directory for zero-downtime persistence
const STORAGE_DIR = path.join(process.cwd(), ".upload-jobs");
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch {}
}

export class BulkUploadJobManager {
  private static inMemoryJobs = new Map<string, BulkUploadJob>();
  private static jobMutexLocks = new Map<string, Promise<void>>();

  /**
   * Acquire an async mutex lock for a specific job to prevent race conditions during concurrent batch writes
   */
  private static async acquireLock(jobId: string): Promise<() => void> {
    while (this.jobMutexLocks.has(jobId)) {
      await this.jobMutexLocks.get(jobId);
    }
    let resolveLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.jobMutexLocks.set(jobId, lockPromise);

    return () => {
      this.jobMutexLocks.delete(jobId);
      resolveLock();
    };
  }

  /**
   * Generates a deterministic idempotency key for each row to guarantee deduplication during retries
   */
  public static generateRowIdempotencyKey(jobId: string, rowNumber: number, title: string): string {
    const cleanTitle = (title || "").trim().toLowerCase();
    return crypto
      .createHash("sha256")
      .update(`${jobId}:${rowNumber}:${cleanTitle}`)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Persists job state to durable disk store using atomic rename
   */
  private static saveToDisk(job: BulkUploadJob): void {
    try {
      this.inMemoryJobs.set(job.id, job);
      const filePath = path.join(STORAGE_DIR, `${job.id}.json`);
      const tempPath = path.join(STORAGE_DIR, `${job.id}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`);

      fs.writeFileSync(tempPath, JSON.stringify(job, null, 2), "utf8");
      // Atomic replace
      try {
        fs.renameSync(tempPath, filePath);
      } catch {
        // Fallback for Windows cross-volume or lock edge cases
        fs.copyFileSync(tempPath, filePath);
        try { fs.unlinkSync(tempPath); } catch {}
      }
    } catch (err) {
      console.warn("[BulkUploadJobManager] Failed to persist job to disk:", err);
    }
  }

  /**
   * Loads job state from durable disk store or memory
   */
  private static loadFromDisk(jobId: string): BulkUploadJob | null {
    if (this.inMemoryJobs.has(jobId)) {
      return this.inMemoryJobs.get(jobId)!;
    }
    try {
      const filePath = path.join(STORAGE_DIR, `${jobId}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.inMemoryJobs.set(jobId, data);
        return data;
      }
    } catch {}
    return null;
  }

  /**
   * Initializes a new Upload Job with unique upload_job_id
   */
  public static async createJob(
    supabase: SupabaseClient,
    params: {
      original_filename: string;
      uploaded_by?: string;
      total_records: number;
      total_batches: number;
      initial_records: Array<{ source_row_number: number; title: string; difficulty?: string }>;
      metadata?: Record<string, any>;
    }
  ): Promise<BulkUploadJob> {
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const records: BulkUploadJobRecord[] = params.initial_records.map((r) => {
      const idempotency_key = this.generateRowIdempotencyKey(jobId, r.source_row_number, r.title);
      return {
        id: crypto.randomUUID(),
        job_id: jobId,
        source_row_number: r.source_row_number,
        idempotency_key,
        title: r.title,
        difficulty: r.difficulty || "medium",
        status: "PENDING",
        retry_count: 0,
        created_at: now,
        updated_at: now,
      };
    });

    const job: BulkUploadJob = {
      id: jobId,
      original_filename: params.original_filename,
      uploaded_by: params.uploaded_by,
      total_records: params.total_records,
      validated_records: params.total_records,
      invalid_records: 0,
      processing_records: 0,
      successful_records: 0,
      failed_records: 0,
      duplicate_records: 0,
      rejected_records: 0,
      current_batch: 0,
      total_batches: params.total_batches,
      upload_status: "QUEUED",
      started_at: now,
      retry_count: 0,
      metadata: params.metadata || {},
      records,
      created_at: now,
      updated_at: now,
    };

    // 1. Durable disk write
    this.saveToDisk(job);

    // 2. Best-effort Supabase database persistence if table exists
    try {
      const { error: jobErr } = await supabase.from("bulk_upload_jobs").insert({
        id: job.id,
        original_filename: job.original_filename,
        uploaded_by: job.uploaded_by,
        total_records: job.total_records,
        validated_records: job.validated_records,
        total_batches: job.total_batches,
        upload_status: job.upload_status,
        started_at: job.started_at,
        metadata: job.metadata,
      });

      if (!jobErr && records.length > 0) {
        const recordRows = records.map((r) => ({
          id: r.id,
          job_id: r.job_id,
          source_row_number: r.source_row_number,
          title: r.title,
          difficulty: r.difficulty,
          status: r.status,
          created_at: r.created_at,
        }));
        for (let i = 0; i < recordRows.length; i += 100) {
          await supabase.from("bulk_upload_job_records").insert(recordRows.slice(i, i + 100));
        }
      }
    } catch {}

    return job;
  }

  /**
   * Retrieves an upload job by ID from DB or durable cache
   */
  public static async getJob(supabase: SupabaseClient, jobId: string): Promise<BulkUploadJob | null> {
    try {
      const { data: dbJob, error } = await supabase
        .from("bulk_upload_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (!error && dbJob) {
        const { data: dbRecords } = await supabase
          .from("bulk_upload_job_records")
          .select("*")
          .eq("job_id", jobId)
          .order("source_row_number", { ascending: true });

        const job: BulkUploadJob = {
          ...dbJob,
          records: (dbRecords as BulkUploadJobRecord[]) || [],
        };
        this.saveToDisk(job);
        return job;
      }
    } catch {}

    return this.loadFromDisk(jobId);
  }

  /**
   * Updates record states and recalculates live job aggregates with mutex protection
   */
  public static async updateBatchResults(
    supabase: SupabaseClient,
    params: {
      job_id: string;
      batch_index: number;
      processed_records: Array<{
        source_row_number: number;
        title: string;
        status: RecordProcessingStatus;
        problem_id?: string;
        error_message?: string;
        error_category?: ErrorCategory;
      }>;
    }
  ): Promise<BulkUploadJob> {
    const releaseLock = await this.acquireLock(params.job_id);

    try {
      const job = (await this.getJob(supabase, params.job_id)) || this.loadFromDisk(params.job_id);
      if (!job) {
        throw new Error(`Upload job ${params.job_id} not found.`);
      }

      const now = new Date().toISOString();
      job.current_batch = Math.max(job.current_batch, params.batch_index);
      job.upload_status = "PROCESSING";
      job.updated_at = now;

      const recordMap = new Map<number, BulkUploadJobRecord>();
      job.records.forEach((r) => recordMap.set(r.source_row_number, r));

      for (const pr of params.processed_records) {
        const existing = recordMap.get(pr.source_row_number);
        if (existing) {
          existing.status = pr.status;
          existing.problem_id = pr.problem_id || existing.problem_id;
          existing.error_message = pr.error_message;
          existing.error_category = pr.error_category;
          existing.updated_at = now;
        } else {
          const newRecord: BulkUploadJobRecord = {
            id: crypto.randomUUID(),
            job_id: job.id,
            source_row_number: pr.source_row_number,
            idempotency_key: this.generateRowIdempotencyKey(job.id, pr.source_row_number, pr.title),
            title: pr.title,
            status: pr.status,
            problem_id: pr.problem_id,
            error_message: pr.error_message,
            error_category: pr.error_category,
            retry_count: 0,
            created_at: now,
            updated_at: now,
          };
          job.records.push(newRecord);
          recordMap.set(pr.source_row_number, newRecord);
        }
      }

      // Recalculate metrics strictly from source-of-truth records
      job.successful_records = job.records.filter((r) => r.status === "INSERTED").length;
      job.failed_records = job.records.filter(
        (r) => r.status === "FAILED_DATABASE" || r.status === "FAILED_VALIDATION"
      ).length;
      job.duplicate_records = job.records.filter((r) => r.status === "DUPLICATE").length;
      job.rejected_records = job.records.filter((r) => r.status === "REJECTED").length;
      job.processing_records = job.records.filter(
        (r) => r.status === "PROCESSING" || r.status === "RETRYING"
      ).length;

      // Update checkpoint for seamless resume
      job.last_processed_checkpoint = {
        batch_index: params.batch_index,
        completed_at: now,
        processed_count: job.successful_records + job.failed_records + job.duplicate_records + job.rejected_records,
        successful_count: job.successful_records,
        failed_count: job.failed_records,
        duplicate_count: job.duplicate_records,
      };

      // Save to durable disk
      this.saveToDisk(job);

      // Best-effort sync to Supabase if tables exist
      try {
        await supabase
          .from("bulk_upload_jobs")
          .update({
            current_batch: job.current_batch,
            successful_records: job.successful_records,
            failed_records: job.failed_records,
            duplicate_records: job.duplicate_records,
            processing_records: job.processing_records,
            upload_status: job.upload_status,
            updated_at: job.updated_at,
          })
          .eq("id", job.id);

        for (const pr of params.processed_records) {
          await supabase
            .from("bulk_upload_job_records")
            .update({
              status: pr.status,
              problem_id: pr.problem_id,
              error_message: pr.error_message,
              error_category: pr.error_category,
              updated_at: now,
            })
            .eq("job_id", job.id)
            .eq("source_row_number", pr.source_row_number);
        }
      } catch {}

      return job;
    } finally {
      releaseLock();
    }
  }

  /**
   * Retrieves pending or failed records from a job for seamless resumption without restarting from zero
   */
  public static async getPendingOrFailedRecords(
    supabase: SupabaseClient,
    jobId: string
  ): Promise<{ pending: BulkUploadJobRecord[]; failed: BulkUploadJobRecord[]; checkpoint?: UploadCheckpoint }> {
    const job = (await this.getJob(supabase, jobId)) || this.loadFromDisk(jobId);
    if (!job) {
      throw new Error(`Upload job ${jobId} not found.`);
    }

    const pending = job.records.filter((r) => r.status === "PENDING" || r.status === "RETRYING" || r.status === "PROCESSING");
    const failed = job.records.filter((r) => r.status === "FAILED_DATABASE" || r.status === "FAILED_VALIDATION");

    return {
      pending,
      failed,
      checkpoint: job.last_processed_checkpoint,
    };
  }

  /**
   * Cancels an ongoing upload job
   */
  public static async cancelJob(supabase: SupabaseClient, jobId: string): Promise<BulkUploadJob> {
    const releaseLock = await this.acquireLock(jobId);
    try {
      const job = (await this.getJob(supabase, jobId)) || this.loadFromDisk(jobId);
      if (!job) {
        throw new Error(`Upload job ${jobId} not found.`);
      }

      job.upload_status = "CANCELLED";
      job.completed_at = new Date().toISOString();
      job.updated_at = job.completed_at;

      // Mark any remaining pending records as REJECTED
      job.records.forEach((r) => {
        if (r.status === "PENDING" || r.status === "PROCESSING" || r.status === "RETRYING") {
          r.status = "REJECTED";
          r.error_message = "Upload was cancelled by user.";
          r.error_category = "SYSTEM_ERROR";
        }
      });

      this.saveToDisk(job);

      try {
        await supabase
          .from("bulk_upload_jobs")
          .update({
            upload_status: "CANCELLED",
            completed_at: job.completed_at,
            updated_at: job.updated_at,
          })
          .eq("id", job.id);
      } catch {}

      return job;
    } finally {
      releaseLock();
    }
  }

  /**
   * Performs mandatory final verification and data reconciliation against actual database records.
   * Guarantees: TOTAL INPUT ROWS = SUCCESSFULLY INSERTED + DUPLICATE ROWS + REJECTED ROWS + FAILED ROWS.
   * Never reports success if database verification fails.
   */
  public static async reconcileJob(
    supabase: SupabaseClient,
    jobId: string
  ): Promise<ReconciliationReport> {
    const releaseLock = await this.acquireLock(jobId);

    try {
      const job = (await this.getJob(supabase, jobId)) || this.loadFromDisk(jobId);
      if (!job) {
        throw new Error(`Upload job ${jobId} not found.`);
      }

      const insertedProblemIds = job.records
        .filter((r) => r.status === "INSERTED" && r.problem_id)
        .map((r) => r.problem_id as string);

      let databaseVerifiedCount = 0;
      let dbVerificationFailed = false;
      const reconciliationErrors: string[] = [];

      // Query actual database to verify inserted problem records exist in PostgreSQL
      if (insertedProblemIds.length > 0) {
        for (let i = 0; i < insertedProblemIds.length; i += 50) {
          const chunk = insertedProblemIds.slice(i, i + 50);
          try {
            const { count, error } = await supabase
              .from("coding_problems")
              .select("id", { count: "exact", head: true })
              .in("id", chunk);

            if (error) {
              dbVerificationFailed = true;
              reconciliationErrors.push(`Database verification query error: ${error.message}`);
            } else if (count !== null && count !== undefined) {
              databaseVerifiedCount += count;
              if (count < chunk.length) {
                dbVerificationFailed = true;
                reconciliationErrors.push(
                  `Record count discrepancy in batch: expected ${chunk.length} verified rows, found ${count}.`
                );
              }
            }
          } catch (queryErr: any) {
            dbVerificationFailed = true;
            reconciliationErrors.push(`Database verification network exception: ${queryErr?.message}`);
          }
        }
      }

      const successful = job.records.filter((r) => r.status === "INSERTED").length;
      const failed = job.records.filter(
        (r) => r.status === "FAILED_DATABASE" || r.status === "FAILED_VALIDATION"
      ).length;
      const duplicates = job.records.filter((r) => r.status === "DUPLICATE").length;
      const rejected = job.records.filter((r) => r.status === "REJECTED").length;
      const pending = job.records.filter(
        (r) => r.status === "PENDING" || r.status === "PROCESSING" || r.status === "RETRYING"
      ).length;

      const totalProcessed = successful + failed + duplicates + rejected;

      // Mandatory Reconciliation Formula Check:
      // TOTAL INPUT ROWS = SUCCESSFULLY INSERTED + DUPLICATE ROWS + REJECTED ROWS + FAILED ROWS
      const formulaHolds = job.total_records === (successful + duplicates + rejected + failed + pending);
      const formulaCheck = `${job.total_records} (Total) = ${successful} (Inserted) + ${duplicates} (Duplicate) + ${rejected} (Rejected) + ${failed} (Failed) + ${pending} (Pending)`;

      if (!formulaHolds) {
        reconciliationErrors.push(`Reconciliation invariant violation: ${formulaCheck}`);
      }

      // Check if DB verification matched
      if (databaseVerifiedCount !== successful && successful > 0) {
        dbVerificationFailed = true;
        reconciliationErrors.push(
          `Database verification mismatch: ${successful} records reported inserted, but actual DB verified count is ${databaseVerifiedCount}.`
        );
      }

      // Check for unfinished pending records
      if (pending > 0 && job.current_batch >= job.total_batches) {
        reconciliationErrors.push(`Job marked completed but ${pending} records are still in pending/processing state.`);
      }

      const isReconciled = !dbVerificationFailed && reconciliationErrors.length === 0 && pending === 0;

      // Determine final status strictly based on verified facts
      let finalStatus: UploadJobStatus;
      if (job.upload_status === "CANCELLED") {
        finalStatus = "CANCELLED";
      } else if (dbVerificationFailed) {
        finalStatus = "PARTIALLY_FAILED";
      } else if (failed > 0 && successful > 0) {
        finalStatus = "COMPLETED_WITH_ERRORS";
      } else if (failed > 0 && successful === 0) {
        finalStatus = "FAILED";
      } else if (isReconciled) {
        finalStatus = "COMPLETED";
      } else {
        finalStatus = "PARTIALLY_FAILED";
      }

      job.upload_status = finalStatus;
      job.completed_at = new Date().toISOString();
      job.updated_at = job.completed_at;
      job.successful_records = successful;
      job.failed_records = failed;
      job.duplicate_records = duplicates;
      job.rejected_records = rejected;

      this.saveToDisk(job);

      try {
        await supabase
          .from("bulk_upload_jobs")
          .update({
            upload_status: job.upload_status,
            completed_at: job.completed_at,
            successful_records: successful,
            failed_records: failed,
            duplicate_records: duplicates,
            updated_at: job.updated_at,
          })
          .eq("id", job.id);
      } catch {}

      return {
        job_id: jobId,
        source_record_count: job.total_records,
        total_processed: totalProcessed,
        successful_records: successful,
        failed_records: failed,
        duplicate_records: duplicates,
        rejected_records: rejected,
        pending_records: pending,
        database_verified_count: databaseVerifiedCount,
        is_reconciled: isReconciled,
        formula_check: formulaCheck,
        reconciliation_errors: reconciliationErrors,
      };
    } finally {
      releaseLock();
    }
  }
}
