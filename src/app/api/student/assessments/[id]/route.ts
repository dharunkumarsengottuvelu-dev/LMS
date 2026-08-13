import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const adminClient = createAdminClient();
    const studentUserId = user.id;

    // 1. Get student profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", studentUserId)
      .maybeSingle() as any;

    const profileId = profile?.id || studentUserId;

    // 2. Fetch Assessment Details
    const { data: assessment, error: assessmentError } = await adminClient
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // 3. Fetch MCQ Questions (Excluding correct answers and explanations for active student view)
    const { data: mcqQuestions, error: mcqError } = await adminClient
      .from("questions")
      .select("id, type, text, options, marks, negative_marks, order")
      .eq("assessment_id", assessmentId)
      .order("order", { ascending: true }) as any;

    if (mcqError) {
      console.warn("MCQ fetch warning:", mcqError);
    }

    // 4. Fetch Coding Questions (Excluding hidden test cases)
    const { data: codingQuestions, error: codingError } = await adminClient
      .from("coding_problems")
      .select("id, title, slug, description, difficulty, time_limit_ms, memory_limit_kb, templates, sample_test_cases, created_at")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true }) as any;

    if (codingError) {
      console.warn("Coding questions fetch warning:", codingError);
    }

    // 5. Combine and Sort Questions
    let combinedQuestions = [];
    
    if (mcqQuestions && mcqQuestions.length > 0) {
      combinedQuestions.push(...(mcqQuestions as any[]).map(q => ({ ...q, qType: "mcq" })));
    }
    
    if (codingQuestions && codingQuestions.length > 0) {
      const startOrder = mcqQuestions ? (mcqQuestions as any[]).length + 1 : 1;
      combinedQuestions.push(...(codingQuestions as any[]).map((q, idx) => ({ 
        ...q, 
        qType: "coding",
        order: startOrder + idx 
      })));
    }

    // 6. Fetch Student's Current Attempt Status (if any)
    const { data: attempt } = await adminClient
      .from("assessment_attempts")
      .select("*")
      .eq("assessment_id", assessmentId)
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle() as any;

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
