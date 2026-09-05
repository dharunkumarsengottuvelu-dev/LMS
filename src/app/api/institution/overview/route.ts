import { NextResponse } from "next/server";
import { authenticateInstitutionSession } from "@/app/api/institution/_auth";
import { InstitutionPerformanceService } from "@/services/institution-performance.service";

export async function GET() {
  const auth = await authenticateInstitutionSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { institutionInfo } = auth;
  const overview = await InstitutionPerformanceService.getOverviewMetrics(institutionInfo!);

  return NextResponse.json({
    overview,
  });
}
