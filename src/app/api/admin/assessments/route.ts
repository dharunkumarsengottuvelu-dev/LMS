import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { AssessmentType, AssessmentStatus, QuestionType } from "@/types/assessment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 1. Validation
    if (!body.title || !body.type || !body.created_by) {
      return NextResponse.json({ error: "Missing required fields (title, type, created_by)" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let createdByProfileId = body.created_by;
    if (!createdByProfileId || !UUID_REGEX.test(createdByProfileId)) {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "trainer"])
        .limit(1)
        .maybeSingle() as any;

      if (adminProfile) {
        createdByProfileId = adminProfile.id;
      } else {
        const { data: anyProfile } = await supabase
          .from("profiles")
          .select("id")
          .limit(1)
          .maybeSingle() as any;
        createdByProfileId = anyProfile?.id;
      }
    }

    // 2. Insert into assessments table
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .insert({
        title: body.title,
        description: body.description || null,
        type: body.type as AssessmentType,
        course_id: body.course_id || null,
        created_by: createdByProfileId,
        duration_minutes: body.duration_minutes || 60,
        passing_marks: body.passing_marks || 40,
        total_marks: body.total_marks || 100,
        max_attempts: body.max_attempts || 1,
        shuffle_questions: body.shuffle_questions || false,
        negative_marking: body.negative_marking || false,
        negative_marks_per_wrong: body.negative_marks_per_wrong || 0,
        available_from: body.available_from || null,
        expires_at: body.expires_at || null,
        status: (body.status || "active") as AssessmentStatus,
        instructions: body.instructions || null,
      })
      .select()
      .single();

    if (assessmentError) {
      console.error("Assessment Error:", assessmentError);
      return NextResponse.json({ error: assessmentError.message }, { status: 500 });
    }

    const assessmentId = assessment.id;
    let questionsInserted = 0;
    let codingProblemsInserted = 0;

    // 3. Insert MCQs if any
    if (body.mcq_questions && body.mcq_questions.length > 0) {
      const mcqsToInsert = body.mcq_questions.map((q: any, index: number) => ({
        assessment_id: assessmentId,
        type: (q.type || "single_choice") as QuestionType,
        text: q.questionText || q.text,
        options: q.options || [],
        correct_answers: q.correct_answers || q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id),
        marks: q.marks || 1,
        negative_marks: q.negative_marks || 0,
        explanation: q.explanation || null,
        order: index + 1,
      }));

      const { error: mcqError } = await supabase
        .from("questions")
        .insert(mcqsToInsert);

      if (mcqError) {
        console.error("MCQ Error:", mcqError);
        // We shouldn't fail completely if possible, or maybe we should rollback. For now, log it.
        return NextResponse.json({ error: "Failed to insert MCQs: " + mcqError.message }, { status: 500 });
      }
      questionsInserted = mcqsToInsert.length;
    }

    // 4. Insert Coding Problems if any
    if (body.coding_questions && body.coding_questions.length > 0) {
      const codingProblemsToInsert = body.coding_questions.map((cq: any) => ({
        assessment_id: assessmentId,
        title: cq.title,
        slug: cq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
        description: cq.description || "",
        difficulty: cq.difficulty || "medium",
        tags: cq.tags || [],
        time_limit_ms: cq.timeLimitMs || 2000,
        memory_limit_kb: cq.memoryLimitKb || 262144,
        created_by: body.created_by,
        is_public: false,
        templates: cq.templates || {},
        sample_test_cases: cq.sampleTestCases || cq.sample_test_cases || [],
        hidden_test_cases: cq.hiddenTestCases || cq.hidden_test_cases || [],
      }));

      const { error: codingError } = await supabase
        .from("coding_problems")
        .insert(codingProblemsToInsert);

      if (codingError) {
        console.error("Coding Error:", codingError);
        return NextResponse.json({ error: "Failed to insert Coding Problems: " + codingError.message }, { status: 500 });
      }
      codingProblemsInserted = codingProblemsToInsert.length;
    }

    // 5. Automatic assignment (optional shortcut from creation)
    if (body.assign_to_type && body.assign_to_id) {
      const { error: assignError } = await supabase
        .from("assessment_assignments")
        .insert({
          assessment_id: assessmentId,
          assigned_to_type: body.assign_to_type,
          assigned_to_id: body.assign_to_id,
          assigned_by: body.created_by
        });
      
      if (assignError) {
        console.error("Assignment Error:", assignError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      assessment,
      summary: {
        mcqs_added: questionsInserted,
        coding_problems_added: codingProblemsInserted
      }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("POST /api/admin/assessments Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
