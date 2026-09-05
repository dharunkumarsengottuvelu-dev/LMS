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

  // Authoritative server-side verification: batch MUST belong to institution
  const hasAccess = await InstitutionPerformanceService.verifyBatchAccess(batchId, institutionInfo!);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden: Unauthorized batch access" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const performance = await InstitutionPerformanceService.getBatchPerformance(batchId, search);

  return NextResponse.json({
    batch: performance.batch,
    students: performance.students,
    total: performance.students.length,
  });
}
