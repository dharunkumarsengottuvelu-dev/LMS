import { NextRequest, NextResponse } from "next/server";
import { authenticateInstitutionSession } from "@/app/api/institution/_auth";
import { InstitutionPerformanceService } from "@/services/institution-performance.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateInstitutionSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { id: batchId } = await params;
  const { institutionInfo } = auth;

  // Verify batch belongs to institution
  const hasAccess = await InstitutionPerformanceService.verifyBatchAccess(batchId, institutionInfo!);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden: This batch does not belong to your institution" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const batchPerf = await InstitutionPerformanceService.getBatchPerformance(batchId, search);

  return NextResponse.json({
    batch: batchPerf.batch,
    students: batchPerf.students,
    totalStudents: batchPerf.students.length,
  });
}
