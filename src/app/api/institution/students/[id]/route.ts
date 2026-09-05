import { NextRequest, NextResponse } from "next/server";
import { authenticateInstitutionSession } from "@/app/api/institution/_auth";
import { InstitutionPerformanceService } from "@/services/institution-performance.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateInstitutionSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { id: studentId } = await params;
  const { institutionInfo } = auth;

  // Authoritative server-side verification: student MUST belong to institution's assigned batches
  const hasAccess = await InstitutionPerformanceService.verifyStudentAccess(studentId, institutionInfo!);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden: Student does not belong to your institution's assigned batches" },
      { status: 403 }
    );
  }

  const performance = await InstitutionPerformanceService.getIndividualStudentPerformance(studentId);

  if (!performance) {
    return NextResponse.json(
      { error: "Student record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    student: performance,
  });
}
