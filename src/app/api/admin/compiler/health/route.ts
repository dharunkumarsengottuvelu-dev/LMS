import { NextResponse } from "next/server";
import { getAllLanguagesHealth } from "@/services/compiler.service";

export async function GET() {
  try {
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
