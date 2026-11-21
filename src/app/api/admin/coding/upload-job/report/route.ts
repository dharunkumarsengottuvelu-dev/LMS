import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminSession } from "@/app/api/admin/_auth";
import { BulkUploadJobManager } from "@/lib/bulk-upload/job-manager";

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

    // Dynamic import for server runtime
    const { default: writeXlsxFile } = await import("write-excel-file/node");

    // Sheet 1: Summary
    const summaryData: any[][] = [
      [{ value: "METRIC", fontWeight: "bold" }, { value: "VALUE", fontWeight: "bold" }],
      [{ value: "Upload Job ID" }, { value: job.id }],
      [{ value: "Original Filename" }, { value: job.original_filename }],
      [{ value: "Status" }, { value: job.upload_status }],
      [{ value: "Total Source Records" }, { value: job.total_records, type: Number }],
      [{ value: "Validated Records" }, { value: job.validated_records, type: Number }],
      [{ value: "Successfully Inserted" }, { value: job.successful_records, type: Number }],
      [{ value: "Failed Records" }, { value: job.failed_records, type: Number }],
      [{ value: "Duplicate Conflicts" }, { value: job.duplicate_records, type: Number }],
      [{ value: "Total Batches Processed" }, { value: `${job.current_batch} of ${job.total_batches}` }],
      [{ value: "Started At" }, { value: job.started_at }],
      [{ value: "Completed At" }, { value: job.completed_at || "In Progress" }],
      [{ value: "Reconciliation Status" }, { value: job.failed_records === 0 ? "VERIFIED (100% RECONCILED)" : "COMPLETED WITH ERRORS" }],
    ];

    // Sheet 2: All Records
    const recordHeaderRow = [
      { value: "Source Row #", fontWeight: "bold" },
      { value: "Problem Title", fontWeight: "bold" },
      { value: "Difficulty", fontWeight: "bold" },
      { value: "Processing Status", fontWeight: "bold" },
      { value: "Database ID", fontWeight: "bold" },
      { value: "Error Category", fontWeight: "bold" },
      { value: "Failure Details", fontWeight: "bold" },
    ];

    const recordsData = [
      recordHeaderRow,
      ...job.records.map((r) => [
        { value: r.source_row_number, type: Number },
        { value: r.title },
        { value: r.difficulty || "medium" },
        { value: r.status },
        { value: r.problem_id || "N/A" },
        { value: r.error_category || "" },
        { value: r.error_message || "" },
      ]),
    ];

    // Sheet 3: Failed Records Only
    const failedRecords = job.records.filter((r) => r.status === "FAILED_DATABASE" || r.status === "FAILED_VALIDATION");
    const failedData = [
      [
        { value: "Source Row #", fontWeight: "bold" },
        { value: "Problem Title", fontWeight: "bold" },
        { value: "Failure Reason", fontWeight: "bold" },
        { value: "Error Category", fontWeight: "bold" },
      ],
      ...failedRecords.map((r) => [
        { value: r.source_row_number, type: Number },
        { value: r.title },
        { value: r.error_message || "Insert failed" },
        { value: r.error_category || "DATABASE_ERROR" },
      ]),
    ];

    const sheetsPayload = [
      { sheet: "Job Summary", data: summaryData },
      { sheet: "All Records Audit", data: recordsData },
      { sheet: "Failed Records", data: failedData },
    ];

    const output = (writeXlsxFile as any)(sheetsPayload, {});
    const buffer = await output.toBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="upload_job_${job.id.substring(0, 8)}_audit_report.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/coding/upload-job/report error:", err);
    return NextResponse.json({ error: err?.message || "Failed to generate audit report" }, { status: 500 });
  }
}
