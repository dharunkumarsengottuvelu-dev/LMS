import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const studentUserId = user.id;

    // 1. Get student profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", studentUserId)
      .maybeSingle() as any;

    const profileId = profile?.id || studentUserId;

    // 2. Get student's batches
    const { data: batchMembers } = await adminClient
      .from("batch_members")
      .select("batch_id")
      .or(`user_id.eq.${profileId},user_id.eq.${studentUserId}`) as any;

    const batchIds = (batchMembers || []).map((b: any) => b.batch_id).filter(Boolean);
    if (profile?.batch_id) batchIds.push(profile.batch_id);
    if (profile?.batch) batchIds.push(profile.batch);

    // 3. Get student's enrolled courses
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("course_id")
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`) as any;

    const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);

    // 4. Compile list of target IDs the student belongs to
    const targetIds = Array.from(new Set([
      studentUserId,
      profileId,
      ...batchIds,
      ...courseIds
    ])).filter(Boolean);

    // 5. Query assessment_assignments
    let assignedAssessmentIds: string[] = [];
    if (targetIds.length > 0) {
      const { data: assignments } = await adminClient
        .from("assessment_assignments")
        .select("assessment_id")
        .in("assigned_to_id", targetIds) as any;

      if (assignments && assignments.length > 0) {
        assignedAssessmentIds = Array.from(new Set(assignments.map((a: any) => a.assessment_id)));
      }
    }

    // 6. Fetch assessments
    let assessmentsQuery = adminClient
      .from("assessments")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // If specific assignments exist for this user, filter to those; otherwise return active practice assessments
    if (assignedAssessmentIds.length > 0) {
      assessmentsQuery = assessmentsQuery.in("id", assignedAssessmentIds);
    }

    const { data: assessments, error: assessmentError } = await assessmentsQuery as any;

    if (assessmentError) {
      console.error("Error fetching assessments from DB:", assessmentError);
      throw assessmentError;
    }

    const assessmentList = assessments || [];

    // 7. Fetch student's attempts for these assessments
    const assessmentIds = assessmentList.map((a: any) => a.id);
    let attemptsList: any[] = [];

    if (assessmentIds.length > 0) {
      const { data: attempts } = await adminClient
        .from("assessment_attempts")
        .select("id, assessment_id, student_id, status, score, total_marks, started_at, submitted_at")
        .in("assessment_id", assessmentIds)
        .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`)
        .order("started_at", { ascending: false }) as any;

      attemptsList = attempts || [];
    }

    // 8. Map attempts to assessments
    const mappedAssessments = assessmentList.map((a: any) => ({
      ...a,
      my_attempts: attemptsList.filter((att: any) => att.assessment_id === a.id)
    }));

    return NextResponse.json({ assessments: mappedAssessments }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/student/assessments Error:", error);
    return NextResponse.json({ 
      error: getErrorMessage(error),
      assessments: [] 
    }, { status: 500 });
  }
}
