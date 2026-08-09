import { NextResponse } from "next/server";
import { LANGUAGE_REGISTRY } from "@/types/coding";

export async function GET() {
  const languagesList = Object.values(LANGUAGE_REGISTRY);
  return NextResponse.json({
    languages: languagesList,
    total: languagesList.length,
  });
}
