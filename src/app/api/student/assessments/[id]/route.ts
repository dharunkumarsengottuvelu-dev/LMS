import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = user.id;

    // 1. Authorize: Check if assigned
    const { data: batchMembers } = await supabase.from("batch_members").select("batch_id").eq("user_id", studentId) as any;
    const batchIds = batchMembers?.map((b: any) => b.batch_id) || [];
    
    const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("student_id", studentId) as any;
    const courseIds = enrollments?.map((e: any) => e.course_id) || [];

    const targetIds = [studentId, ...batchIds, ...courseIds];

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "Not authorized to view this assessment." }, { status: 403 });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("assessment_assignments")
      .select("id")
      .eq("assessment_id", assessmentId)
      .in("assigned_to_id", targetIds)
      .limit(1)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Not authorized to view this assessment." }, { status: 403 });
    }

    // 2. Fetch Assessment Details
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (assessmentError) throw assessmentError;

    // 3. Fetch MCQ Questions
    const { data: mcqQuestions, error: mcqError } = await supabase
      .from("questions")
      .select("id, type, text, options, marks, negative_marks, order") // DO NOT SELECT correct_answers or explanation!
      .eq("assessment_id", assessmentId)
      .order("order", { ascending: true }) as any;

    if (mcqError) throw mcqError;

    // 4. Fetch Coding Questions
    const { data: codingQuestions, error: codingError } = await supabase
      .from("coding_problems")
      .select("id, title, slug, description, difficulty, time_limit_ms, memory_limit_kb, templates, sample_test_cases, created_at") // DO NOT SELECT hidden_test_cases
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true }) as any;

    if (codingError) throw codingError;

    // 5. Combine and Sort Questions for Mixed Assessment
    // Since coding_problems doesn't have an `order` field currently, we can append them after MCQs, or use created_at.
    // For simplicity, we'll assign them an order starting from (mcq length + 1).
    let combinedQuestions = [];
    
    if (mcqQuestions) {
      combinedQuestions.push(...(mcqQuestions as any[]).map(q => ({ ...q, qType: "mcq" })));
    }
    
    if (codingQuestions) {
      const startOrder = mcqQuestions ? (mcqQuestions as any[]).length + 1 : 1;
      combinedQuestions.push(...(codingQuestions as any[]).map((q, idx) => ({ 
        ...q, 
        qType: "coding",
        order: startOrder + idx 
      })));
    }

    // 6. Fetch Student's Current Attempt Status (if any)
    const { data: attempt } = await supabase
      .from("assessment_attempts")
      .select("*")
      .eq("assessment_id", assessmentId)
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      assessment,
      questions: combinedQuestions,
      attempt: attempt || null
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("GET /api/student/assessments/[id] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
