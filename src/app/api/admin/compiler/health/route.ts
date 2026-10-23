import { NextResponse } from "next/server";
import { authenticateAdminSession } from "@/app/api/admin/_auth";
import { getAllLanguagesHealth } from "@/services/compiler.service";

export async function GET() {
  try {
    const { errorResponse } = await authenticateAdminSession([
      "super_admin",
      "admin",
      "trainer",
    ]);
    if (errorResponse) return errorResponse;
    const healthData = await getAllLanguagesHealth();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      languages: healthData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to execute compiler health checks" },
      { status: 500 }
    );
  }
}
