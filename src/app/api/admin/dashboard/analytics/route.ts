import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminSession } from "@/app/api/admin/_auth";
import { DashboardAnalyticsService } from "@/services/dashboard-analytics.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAdminSession(["super_admin", "admin", "trainer"]);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const analytics = await DashboardAnalyticsService.getAnalytics();
    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("Dashboard Analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load dashboard analytics",
      },
      { status: 500 }
    );
  }
}
