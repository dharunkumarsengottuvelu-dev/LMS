import { NextResponse } from "next/server";
import { getCompilerLanguages } from "@/services/compiler.service";

export async function GET() {
  try {
    const languages = await getCompilerLanguages(true);
    return NextResponse.json({
      status: "online",
      languages,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch compiler status" },
      { status: 500 }
    );
  }
}
