import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";
import { dispatchLMSEvent } from "@/lib/notifications/dispatcher";

export async function POST(
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

    // 2. Fetch the assignment
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

    // 3. SECURITY RULE 8 & 21: Server-side authorization check
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

    const body = await request.json();
    const { githubUrl, solutionFileUrl, remarks } = body;

    const payload = {
      assignment_id: id,
      student_id: batchContext.profileId || batchContext.studentUserId,
      github_link: githubUrl || null,
      file_url: solutionFileUrl || null,
      text_content: remarks || null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    };

    const { data: submission, error: subError } = await adminClient
      .from("assignment_submissions")
      .upsert(payload, { onConflict: "assignment_id,student_id" })
      .select()
      .single();

    if (subError) throw subError;

    // Asynchronously dispatch submission alert to trainers
    try {
      const { data: studentProf } = await adminClient
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      const studentFullName = `${studentProf?.first_name || ""} ${studentProf?.last_name || ""}`.trim() || user.email?.split("@")[0] || "Student";
      const assignTitle = assignment?.title || "Course Assignment";

      dispatchLMSEvent({
        eventType: "ASSIGNMENT_SUBMITTED",
        targetRole: "trainer",
        studentName: studentFullName,
        name: assignTitle,
        title: `New Assignment Submission – ${assignTitle}`,
        batchName: batchContext.batchNames?.[0] || "Assigned Cohort",
        resourceType: "assignment",
        resourceId: id,
        targetUrl: `/admin/submissions`,
      }).catch((e) => console.warn("Notice: Trainer assignment submission notification error:", e));
    } catch (notifErr) {
      console.warn("Notice: Assignment submission notification warning:", notifErr);
    }

    return NextResponse.json({ success: true, submission }, { status: 200 });
  } catch (error) {
    console.error("POST /api/student/assignments/[id]/submit error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
