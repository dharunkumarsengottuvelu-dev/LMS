import { NextResponse } from "next/server";

export async function GET() {
  // Return the standard Jobe languages array format
  return NextResponse.json([
    ["c", "11.4.0"],
    ["cpp", "11.4.0"],
    ["java", "21.0.2"],
    ["nodejs", "20.11.1"],
    ["python3", "3.11.2"]
  ]);
}
