import { NextResponse } from "next/server";
import { authenticateInstitutionSession } from "@/app/api/institution/_auth";
import { InstitutionPerformanceService } from "@/services/institution-performance.service";

export async function GET() {
  const auth = await authenticateInstitutionSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { institutionInfo } = auth;
  const batches = await InstitutionPerformanceService.getAssignedBatches(institutionInfo!);

  return NextResponse.json({
    batches,
    total: batches.length,
  });
}
