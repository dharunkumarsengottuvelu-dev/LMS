import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminSession } from "@/app/api/admin/_auth";
import { BulkUploadJobManager } from "@/lib/bulk-upload/job-manager";
import { formatCleanProblemTitle } from "@/lib/utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse, adminClient: supabase } = await authenticateAdminSession([
      "super_admin",
      "admin",
      "trainer",
    ]);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json({ error: "job_id is required." }, { status: 400 });
    }

    const job = await BulkUploadJobManager.getJob(supabase, jobId);
    if (!job) {
      return NextResponse.json({ error: "Upload job not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    console.error("GET /api/admin/coding/upload-job error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse, adminClient: supabase, user } = await authenticateAdminSession([
      "super_admin",
      "admin",
      "trainer",
    ]);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const action = body.action || "create";

    // ─── ACTION 1: CREATE UPLOAD JOB ───────────────────────────────────────────
    if (action === "create") {
      const { original_filename, total_records, total_batches, initial_records, metadata } = body;
      if (!total_records || !Array.isArray(initial_records)) {
        return NextResponse.json(
          { error: "total_records and initial_records are required." },
          { status: 400 }
        );
      }

      const job = await BulkUploadJobManager.createJob(supabase, {
        original_filename: original_filename || "upload.xlsx",
        uploaded_by: user?.id,
        total_records,
        total_batches: total_batches || Math.ceil(total_records / 25),
        initial_records,
        metadata: metadata || {},
      });

      return NextResponse.json({ success: true, job_id: job.id, job });
    }

    // ─── ACTION 2: PROCESS BATCH WITH ATOMIC COMMIT & IDEMPOTENCY ──────────────
    if (action === "process_batch") {
      const { job_id, batch_index, problems } = body;
      if (!job_id || !Array.isArray(problems)) {
        return NextResponse.json({ error: "job_id and problems array are required." }, { status: 400 });
      }

      // Pre-fetch titles in current batch to detect existing database records
      const titlesToCheck = problems
        .map((p: any) => formatCleanProblemTitle(p.title || `Challenge ${p.source_row_number || 1}`).trim())
        .filter(Boolean);

      const titleToExistingProblemMap = new Map<string, { id: string; slug: string }>();
      if (titlesToCheck.length > 0) {
        try {
          const { data: matchTitles } = await supabase
            .from("coding_problems")
            .select("id, title, slug, starter_code")
            .in("title", titlesToCheck);

          (matchTitles || []).forEach((m: any) => {
            if (m?.title && m?.id) {
              const norm = formatCleanProblemTitle(m.title).toLowerCase().trim();
              titleToExistingProblemMap.set(norm, { id: m.id, slug: m.slug });
            }
          });
        } catch {}
      }

      const seenBatchTitles = new Set<string>();

      // Concurrently process records in batch with atomic rollback on test case failure
      const processedResults = await Promise.all(
        problems.map(async (item: any, idx: number) => {
          const rowNumber = Number(item.source_row_number || item.rowNumber || idx + 1);
          const rawTitle = item.title !== undefined && item.title !== null ? item.title : "";
          const cleanTitle = formatCleanProblemTitle(rawTitle).trim();
          const normalizedTitle = cleanTitle.toLowerCase();

          // 1. Validation check: Missing mandatory title
          if (!cleanTitle) {
            return {
              source_row_number: rowNumber,
              title: `Row #${rowNumber}`,
              status: "FAILED_VALIDATION" as const,
              error_message: "Mandatory field 'Title' is missing or blank.",
              error_category: "VALIDATION_ERROR" as const,
            };
          }

          // 2. Intra-batch duplicate check: Duplicate title within the same upload batch
          if (seenBatchTitles.has(normalizedTitle)) {
            return {
              source_row_number: rowNumber,
              title: cleanTitle,
              status: "DUPLICATE" as const,
              error_message: `Duplicate title in uploaded dataset: '${cleanTitle}'. Duplicate row skipped.`,
              error_category: "DUPLICATE_CONFLICT" as const,
            };
          }
          seenBatchTitles.add(normalizedTitle);

          // 3. Deterministic Idempotency Key & Slug Generation
          const idempotencyKey = BulkUploadJobManager.generateRowIdempotencyKey(job_id, rowNumber, cleanTitle);
          const baseSlug = (item.slug || cleanTitle || "challenge")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "challenge";
          const deterministicSlug = `${baseSlug}-${idempotencyKey}`;

          try {
            // 4. Idempotency Check: Check if problem with this exact deterministic slug already exists
            const { data: existingBySlug } = await supabase
              .from("coding_problems")
              .select("id, slug")
              .eq("slug", deterministicSlug)
              .maybeSingle();

            if (existingBySlug?.id) {
              // Row was already successfully inserted in a previous run/retry: reuse it idempotently!
              return {
                source_row_number: rowNumber,
                title: cleanTitle,
                status: "INSERTED" as const,
                problem_id: existingBySlug.id,
              };
            }

            // 5. Database Pre-Existence Check: Check if problem with this exact title already existed in LMS
            // If duplicate and not tagged for upsert, record it as DUPLICATE outcome without failing
            const existingInDb = titleToExistingProblemMap.get(normalizedTitle);
            if (existingInDb && !item.allow_overwrite) {
              return {
                source_row_number: rowNumber,
                title: cleanTitle,
                status: "DUPLICATE" as const,
                problem_id: existingInDb.id,
                error_message: `Problem with identical title already exists in LMS database (ID: ${existingInDb.id}).`,
                error_category: "DUPLICATE_CONFLICT" as const,
              };
            }

            // 6. Test Case Preparation
            const rawTestCases: any[] = Array.isArray(item.test_cases)
              ? [...item.test_cases]
              : Array.isArray(item.testCases)
              ? [...item.testCases]
              : [];

            const isTcHidden = (tc: any): boolean =>
              Boolean(
                tc?.is_hidden ||
                tc?.isHidden ||
                tc?.hidden ||
                String(tc?.is_hidden).toLowerCase() === "true" ||
                String(tc?.type).toLowerCase() === "hidden"
              );

            const allTestCases = rawTestCases.map((tc: any, tcIdx: number) => {
              const isHidden = isTcHidden(tc);
              return {
                id: tc.id || `tc_${tcIdx + 1}`,
                name: tc.name || (isHidden ? `Hidden Case ${tcIdx + 1}` : `Test Case ${tcIdx + 1}`),
                input: String(tc.input ?? tc.stdin ?? ""),
                expected_output: String(tc.expected_output ?? tc.expectedOutput ?? tc.output ?? ""),
                is_hidden: isHidden,
                weight: tc.weight !== undefined ? Number(tc.weight) : isHidden ? 20 : 10,
              };
            });

            const sampleTestCases = allTestCases.filter((tc: any) => !tc.is_hidden);
            const hiddenTestCases = allTestCases.filter((tc: any) => !!tc.is_hidden);

            const starterCodePayload = {
              ...(typeof item.starter_code === "object" && item.starter_code !== null ? item.starter_code : {}),
              scope: "codelab",
              is_codelab: true,
              isCodeLab: true,
              upload_job_id: job_id,
              source_row_number: rowNumber,
              idempotency_key: idempotencyKey,
              templates: item.templates || {},
              allowed_languages: item.allowed_languages || item.allowedLanguages || undefined,
              default_language: item.default_language || undefined,
              constraints: item.constraints || "",
              input_format: item.input_format || "",
              output_format: item.output_format || "",
              points: item.points || 100,
              category: item.category || item.type || "Algorithm",
              topic_tags: item.topic_tags || [],
              test_cases: allTestCases,
              sample_test_cases: sampleTestCases,
              hidden_test_cases: hiddenTestCases,
              sql_engine: item.sql_engine || undefined,
              schema_sql: item.schema_sql || undefined,
            };

            // 7. Step 1 of Transaction: Insert problem record
            const { data: dbProblem, error: pErr } = await supabase
              .from("coding_problems")
              .insert({
                title: cleanTitle,
                slug: deterministicSlug,
                description:
                  item.description ||
                  `Solve algorithmic challenge: ${cleanTitle}. Implement the optimal solution.`,
                difficulty: (item.difficulty || "medium").toLowerCase(),
                tags: item.topic_tags || [],
                time_limit_ms: item.time_limit_ms || 2000,
                memory_limit_mb: item.memory_limit_mb || 256,
                starter_code: starterCodePayload,
                solution_code: item.solution_editorial || item.solution_code || null,
                status: "published",
              })
              .select("id")
              .single();

            if (pErr || !dbProblem?.id) {
              throw new Error(pErr?.message || "Failed to insert problem record into database.");
            }

            // 8. Step 2 of Transaction: Insert test cases atomically
            if (allTestCases.length > 0) {
              const tcRows = allTestCases.map((tc: any, oIdx: number) => ({
                problem_id: dbProblem.id,
                input: tc.input || "",
                expected_output: tc.expected_output || "",
                is_hidden: Boolean(tc.is_hidden),
                order_index: oIdx,
              }));

              const { error: tcErr } = await supabase.from("test_cases").insert(tcRows);

              if (tcErr) {
                // ATOMIC ROLLBACK: Delete problem if test case insertion failed!
                try {
                  await supabase.from("coding_problems").delete().eq("id", dbProblem.id);
                } catch (delErr) {
                  console.error(`[Upload Job] Rollback deletion error for ${dbProblem.id}:`, delErr);
                }
                throw new Error(`Test case commit failed: ${tcErr.message}. Problem was rolled back.`);
              }
            }

            return {
              source_row_number: rowNumber,
              title: cleanTitle,
              status: "INSERTED" as const,
              problem_id: dbProblem.id,
            };
          } catch (itemErr: any) {
            console.error(`[Upload Job] Row #${rowNumber} failed:`, itemErr?.message || itemErr);
            return {
              source_row_number: rowNumber,
              title: cleanTitle,
              status: "FAILED_DATABASE" as const,
              error_message: itemErr?.message || "Database insert error",
              error_category: "DATABASE_ERROR" as const,
            };
          }
        })
      );

      // Update persistent job state
      const updatedJob = await BulkUploadJobManager.updateBatchResults(supabase, {
        job_id,
        batch_index: batch_index || 1,
        processed_records: processedResults,
      });

      return NextResponse.json({
        success: true,
        batch_index,
        processed_count: processedResults.length,
        successful_count: processedResults.filter((r) => r.status === "INSERTED").length,
        duplicate_count: processedResults.filter((r) => r.status === "DUPLICATE").length,
        failed_count: processedResults.filter(
          (r) => r.status === "FAILED_DATABASE" || r.status === "FAILED_VALIDATION"
        ).length,
        job: updatedJob,
      });
    }

    // ─── ACTION 3: FINAL DATABASE RECONCILIATION ───────────────────────────────
    if (action === "reconcile") {
      const { job_id } = body;
      if (!job_id) {
        return NextResponse.json({ error: "job_id is required." }, { status: 400 });
      }

      const report = await BulkUploadJobManager.reconcileJob(supabase, job_id);
      const job = await BulkUploadJobManager.getJob(supabase, job_id);

      return NextResponse.json({
        success: true,
        reconciliation_report: report,
        job,
      });
    }

    // ─── ACTION 4: RESUME INTERRUPTED UPLOAD ───────────────────────────────────
    if (action === "resume") {
      const { job_id } = body;
      if (!job_id) {
        return NextResponse.json({ error: "job_id is required." }, { status: 400 });
      }

      const resumeData = await BulkUploadJobManager.getPendingOrFailedRecords(supabase, job_id);
      const job = await BulkUploadJobManager.getJob(supabase, job_id);

      return NextResponse.json({
        success: true,
        job,
        checkpoint: resumeData.checkpoint,
        pending_records: resumeData.pending,
        failed_records: resumeData.failed,
      });
    }

    // ─── ACTION 5: CANCEL UPLOAD JOB ───────────────────────────────────────────
    if (action === "cancel") {
      const { job_id } = body;
      if (!job_id) {
        return NextResponse.json({ error: "job_id is required." }, { status: 400 });
      }

      const job = await BulkUploadJobManager.cancelJob(supabase, job_id);
      return NextResponse.json({ success: true, job });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/coding/upload-job error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
