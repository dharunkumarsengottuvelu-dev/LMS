import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();
    const { testId, isCommon, assignedBatches, resetAttempts = true, candidateIds } = body;

    if (!testId) {
      return NextResponse.json({ error: "Missing test ID" }, { status: 400 });
    }

    const { data: currentTest, error: fetchErr } = await adminClient
      .from("assessments")
      .select("*")
      .eq("id", testId)
      .single();

    if (fetchErr || !currentTest) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    let meta: any = {};
    if (currentTest.tags && currentTest.tags[0]) {
      try {
        meta = JSON.parse(currentTest.tags[0]);
      } catch {}
    }

    const reassignedBatches = isCommon ? [] : assignedBatches || [];
    const reassignedAt = new Date().toISOString();

    meta.isCommon = Boolean(isCommon);
    meta.assignedBatches = reassignedBatches;
    meta.reassignedAt = reassignedAt;

    // Update assessment to active and set batches
    const { error: updateErr } = await adminClient
      .from("assessments")
      .update({
        status: "active",
        is_common: Boolean(isCommon),
        assigned_batches: reassignedBatches,
        tags: [JSON.stringify(meta)],
      })
      .eq("id", testId);

    if (updateErr) {
      throw updateErr;
    }

    // Reset previous attempts if requested
    if (resetAttempts) {
      try {
        // Delete or clear previous attempts for this test
        if (candidateIds && candidateIds.length > 0) {
          await adminClient
            .from("assessment_submissions")
            .delete()
            .eq("assessment_id", testId)
            .in("student_id", candidateIds);

          await adminClient
            .from("test_attempts")
            .delete()
            .eq("test_id", testId)
            .in("user_id", candidateIds);
        } else {
          // Reassign for everyone / all assigned batches
          await adminClient
            .from("assessment_submissions")
            .delete()
            .eq("assessment_id", testId);

          await adminClient
            .from("test_attempts")
            .delete()
            .eq("test_id", testId);
        }
      } catch (resetErr) {
        console.warn("Attempt reset error (non-fatal):", resetErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test "${currentTest.title}" successfully reassigned! Candidates can now retake this assessment.`,
      reassignedAt,
    });
  } catch (error) {
    console.error("POST /api/admin/tests/reassign error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
