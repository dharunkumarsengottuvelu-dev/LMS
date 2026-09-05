import { NextResponse } from "next/server";
import { authenticateInstitutionSession } from "@/app/api/institution/_auth";
import { InstitutionPerformanceService } from "@/services/institution-performance.service";

export async function GET() {
  const auth = await authenticateInstitutionSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { institutionInfo } = auth;
  const batches = await InstitutionPerformanceService.getAssignedBatches(institutionInfo!);

  let totalStudents = 0;
  batches.forEach((b) => {
    totalStudents += b.studentCount;
  });

  return NextResponse.json({
    institution: {
      id: institutionInfo!.institutionId,
      name: institutionInfo!.name,
      code: institutionInfo!.code,
      email: institutionInfo!.email,
      phone: institutionInfo!.phone,
      address: institutionInfo!.address,
      college: institutionInfo!.college,
      totalBatches: batches.length,
      totalStudents,
      isPlatformAdmin: institutionInfo!.isPlatformAdmin,
    },
  });
}
