import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Resolve student batch context
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // 2. Fetch the requested assignment
    const { data: assignment, error } = await adminClient
      .from("assignments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    let meta: any = {};
    if (assignment.tags && assignment.tags[0]) {
      try {
        meta = JSON.parse(assignment.tags[0]);
      } catch {}
    }

    const assignedBatches =
      assignment.assigned_batches ||
      meta.assignedBatches ||
      meta.assigned_batches ||
      [];

    const isCommon =
      assignment.is_common !== undefined
        ? assignment.is_common
        : meta.isCommon !== undefined
        ? meta.isCommon
        : assignedBatches.length === 0;

    // 3. SECURITY RULE 8 & 21: Server-side batch authorization
    const isAuthorized = isContentVisibleToStudent(
      {
        is_common: isCommon,
        assigned_batches: assignedBatches,
        assigned_students: meta.assignedStudents || [],
      },
      batchContext
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Access Denied. You do not belong to the assigned batch for this assignment." },
        { status: 403 }
      );
    }

    // 4. Fetch student's submission if exists
    const { data: sub } = await adminClient
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", id)
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId}`)
      .maybeSingle() as any;

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions || assignment.description,
        deadline: assignment.deadline,
        maxMarks: assignment.max_marks || 100,
        isCommon,
        assignedBatches,
        submission: sub || null,
      },
    });
  } catch (error) {
    console.error("GET /api/student/assignments/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
