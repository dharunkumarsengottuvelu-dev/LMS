import { NextRequest, NextResponse } from "next/server";
import { SubmissionService } from "@/services/submission.service";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id") || "student-1";

    const submissions = SubmissionService.getStudentSubmissions(studentId);

    return NextResponse.json({
      submissions,
      total: submissions.length,
    });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
