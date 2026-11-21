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

    // ─── ACTION 2: PROCESS BATCH WITH RECONCILIATION ────────────────────────────
    if (action === "process_batch") {
      const { job_id, batch_index, problems } = body;
      if (!job_id || !Array.isArray(problems)) {
        return NextResponse.json({ error: "job_id and problems array are required." }, { status: 400 });
      }

      // Concurrently process all records in the batch for maximum execution speed
      const processedResults = await Promise.all(
        problems.map(async (item: any, idx: number) => {
          const rowNumber = Number(item.source_row_number || item.rowNumber || idx + 1);
          const title = formatCleanProblemTitle(item.title || `Challenge ${rowNumber}`);

          try {
            const cleanTitle = title.trim();

            const baseSlug = (item.slug || cleanTitle || "challenge")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "challenge";

            const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}-${idx}`;
            const slug = `${baseSlug}-${uniqueSuffix}`;

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

            // 1. Insert problem into coding_problems table
            const { data: dbProblem, error: pErr } = await supabase
              .from("coding_problems")
              .insert({
                title: cleanTitle,
                slug,
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
              .select()
              .single();

            if (pErr || !dbProblem?.id) {
              throw new Error(pErr?.message || "Failed to insert coding problem into database.");
            }

            // 2. Insert test cases if present
            if (allTestCases.length > 0) {
              try {
                const tcRows = allTestCases.map((tc: any, oIdx: number) => ({
                  problem_id: dbProblem.id,
                  input: tc.input || "",
                  expected_output: tc.expected_output || "",
                  is_hidden: Boolean(tc.is_hidden),
                  order_index: oIdx,
                }));
                await supabase.from("test_cases").insert(tcRows);
              } catch (tcErr) {
                console.warn("[Upload Job] Test case sync warning:", tcErr);
              }
            }

            return {
              source_row_number: rowNumber,
              title: cleanTitle,
              status: "INSERTED" as const,
              problem_id: dbProblem.id,
            };
          } catch (itemErr: any) {
            console.error(`[Upload Job] Row #${rowNumber} failed:`, itemErr);
            return {
              source_row_number: rowNumber,
              title,
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
        failed_count: processedResults.filter((r) => r.status === "FAILED_DATABASE").length,
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

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/coding/upload-job error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
