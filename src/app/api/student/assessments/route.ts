import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = user.id;

    // 1. Get student's batches
    const { data: batchMembers, error: batchError } = await supabase
      .from("batch_members")
      .select("batch_id")
      .eq("user_id", studentId) as any;

    if (batchError) throw batchError;
    const batchIds = batchMembers?.map((b: any) => b.batch_id) || [];

    // 2. Get student's courses
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", studentId) as any;

    if (enrollmentError) throw enrollmentError;
    const courseIds = enrollments?.map((e: any) => e.course_id) || [];

    // 3. Compile list of target IDs the student belongs to
    const targetIds = [studentId, ...batchIds, ...courseIds];

    if (targetIds.length === 0) {
      return NextResponse.json({ assessments: [] }, { status: 200 });
    }

    // 4. Query assessment_assignments for these target IDs
    const { data: assignments, error: assignmentError } = await supabase
      .from("assessment_assignments")
      .select("assessment_id")
      .in("assigned_to_id", targetIds) as any;

    if (assignmentError) throw assignmentError;
    
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ assessments: [] }, { status: 200 });
    }

    const assessmentIds = Array.from(new Set(assignments.map((a: any) => a.assessment_id)));

    // 5. Fetch the actual assessments
    const { data: assessments, error: assessmentError } = await supabase
      .from("assessments")
      .select(`
        *,
        assessment_attempts (
          id,
          student_id,
          status,
          score,
          started_at,
          submitted_at
        )
      `)
      .in("id", assessmentIds)
      .eq("status", "active") // Only fetch active assessments
      .order("created_at", { ascending: false }) as any;

    if (assessmentError) throw assessmentError;

    // Filter attempts for this student specifically (since the select query fetches attempts for this assessment)
    // Wait, since we are doing a joined query on attempts without filtering by student in the query, we must filter in JS
    // Better yet, just return the assessment and let the client handle it or we map it.
    const mappedAssessments = (assessments as any[])?.map(a => ({
      ...a,
      my_attempts: a.assessment_attempts?.filter((att: any) => att.student_id === studentId) || []
    })) || [];

    return NextResponse.json({ assessments: mappedAssessments }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/student/assessments Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
