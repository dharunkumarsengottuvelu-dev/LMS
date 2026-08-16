import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

export async function GET(request: NextRequest) {
  try {
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

    // 2. Fetch all assignments from database
    const { data: assignmentsData, error } = await adminClient
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 3. Fetch student submissions
    const { data: submissions } = await adminClient
      .from("assignment_submissions")
      .select("*")
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId}`) as any;

    const submissionMap = new Map<string, any>();
    (submissions || []).forEach((sub: any) => {
      submissionMap.set(sub.assignment_id, sub);
    });

    // 4. Map & filter only assignments visible to this student (Common OR assigned to student's batch)
    const allAssignments = (assignmentsData || []).map((a: any) => {
      let meta: any = {};
      if (a.tags && a.tags[0]) {
        try {
          meta = JSON.parse(a.tags[0]);
        } catch {}
      }

      const assignedBatches =
        a.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        [];

      const isCommon =
        a.is_common !== undefined
          ? a.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      const sub = submissionMap.get(a.id);
      const isSubmitted = Boolean(sub);
      const isGraded = sub && sub.status === "graded";

      return {
        id: a.id,
        title: a.title,
        description: a.description || "",
        course: meta.courseName || "Core Program",
        deadline: a.deadline ? new Date(a.deadline).toLocaleDateString() : "Next Week",
        maxMarks: a.max_marks || 100,
        status: isGraded ? "graded" : isSubmitted ? "submitted" : "pending",
        instructions: a.instructions || a.description || "Follow guidelines to complete this assignment.",
        score: sub?.marks ?? undefined,
        trainerFeedback: sub?.feedback ?? undefined,
        submittedUrl: sub?.github_link || sub?.file_url || undefined,
        submittedFileName: sub?.file_url ? "Solution_Document.pdf" : undefined,
        submittedNotes: sub?.text_content ?? undefined,
        submittedAt: sub?.submitted_at ? new Date(sub.submitted_at).toLocaleString() : undefined,
        isCommon,
        assignedBatches,
        assignedStudents: meta.assignedStudents || [],
      };
    });

    const authorizedAssignments = allAssignments.filter((assignment) =>
      isContentVisibleToStudent(assignment, batchContext)
    );

    return NextResponse.json(
      { assignments: authorizedAssignments },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/student/assignments error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error), assignments: [] },
      { status: 500 }
    );
  }
}
