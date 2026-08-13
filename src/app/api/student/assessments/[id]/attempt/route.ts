import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const body = await request.json();
    const action = body.action; // "start" or "submit"

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const studentUserId = user.id;

    // Get profile ID
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", studentUserId)
      .maybeSingle() as any;

    const studentProfileId = profile?.id || studentUserId;

    if (action === "start") {
      // 1. Fetch Assessment duration to set expires_at
      const { data: assessment, error: assessmentError } = await adminClient
        .from("assessments")
        .select("duration_minutes")
        .eq("id", assessmentId)
        .single() as any;
      
      if (assessmentError || !assessment) {
        throw assessmentError || new Error("Assessment not found");
      }

      const durationMinutes = assessment.duration_minutes || 60;
      const expiresAt = new Date(Date.now() + durationMinutes * 60000);

      // Check for existing in_progress attempt
      const { data: existingAttempt } = await adminClient
        .from("assessment_attempts")
        .select("*")
        .eq("assessment_id", assessmentId)
        .or(`student_id.eq.${studentProfileId},student_id.eq.${studentUserId}`)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any;

      if (existingAttempt) {
        return NextResponse.json({ success: true, attempt: existingAttempt }, { status: 200 });
      }

      const { data: attempt, error: attemptError } = await adminClient
        .from("assessment_attempts")
        .insert({
          student_id: studentProfileId,
          assessment_id: assessmentId,
          status: "in_progress",
          answers: {},
          expires_at: expiresAt.toISOString(),
        } as any)
        .select()
        .single() as any;

      if (attemptError) throw attemptError;

      return NextResponse.json({ success: true, attempt }, { status: 201 });
    } 
    else if (action === "submit") {
      // Finalize attempt
      const attemptId = body.attempt_id;
      if (!attemptId) return NextResponse.json({ error: "Missing attempt_id" }, { status: 400 });

      // Fetch the attempt
      const { data: attempt, error: attemptError } = await adminClient
        .from("assessment_attempts")
        .select("*")
        .eq("id", attemptId)
        .single() as any;

      if (attemptError || !attempt) throw attemptError || new Error("Attempt not found");

      if (attempt.status !== "in_progress") {
        return NextResponse.json({ success: true, result: attempt }, { status: 200 });
      }

      // Fetch all MCQs for this assessment
      const { data: mcqQuestions } = await adminClient
        .from("questions")
        .select("id, correct_answers, marks, negative_marks")
        .eq("assessment_id", assessmentId) as any;

      let mcqScore = 0;
      let totalMcqMarks = 0;

      const studentAnswers = (attempt.answers as Record<string, string[]>) || {};

      (mcqQuestions as any[])?.forEach((q: any) => {
        const qMarks = Number(q.marks || 1);
        totalMcqMarks += qMarks;
        const studentAns = studentAnswers[q.id] || [];
        
        const isCorrect = q.correct_answers && 
                          q.correct_answers.length > 0 && 
                          studentAns.length === q.correct_answers.length && 
                          q.correct_answers.every((a: any) => studentAns.includes(a));

        if (isCorrect) {
          mcqScore += qMarks;
        } else if (studentAns.length > 0 && q.negative_marks > 0) {
          mcqScore -= Number(q.negative_marks);
        }
      });

      // Fetch Coding submissions for this attempt
      const { data: codingSubmissions } = await adminClient
        .from("coding_submissions")
        .select("score, max_score")
        .eq("assessment_attempt_id", attemptId);

      let codingScore = 0;
      let totalCodingMarks = 0;

      codingSubmissions?.forEach(cs => {
        codingScore += Number(cs.score || 0);
        totalCodingMarks += Number(cs.max_score || 100);
      });

      const finalScore = Math.max(0, mcqScore + codingScore);
      const totalMarks = Math.max(1, totalMcqMarks + totalCodingMarks);

      // Update attempt
      const { data: updatedAttempt, error: updateError } = await adminClient
        .from("assessment_attempts")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          score: finalScore,
          total_marks: totalMarks,
          percentage: Math.round((finalScore / totalMarks) * 100)
        })
        .eq("id", attemptId)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, result: updatedAttempt }, { status: 200 });
    }
    else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error("POST /api/student/assessments/[id]/attempt Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Save MCQ Answers
  try {
    const { id: assessmentId } = await params;
    const body = await request.json();
    const { attempt_id, answers } = body;

    if (!attempt_id || !answers) {
      return NextResponse.json({ error: "Missing attempt_id or answers" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: currentAttempt, error: fetchError } = await adminClient
      .from("assessment_attempts")
      .select("answers, status")
      .eq("id", attempt_id)
      .single() as any;

    if (fetchError || !currentAttempt) throw fetchError || new Error("Attempt not found");

    if (currentAttempt.status !== "in_progress") {
      return NextResponse.json({ error: "Cannot modify a submitted attempt" }, { status: 403 });
    }

    const mergedAnswers = {
      ...(currentAttempt.answers as object),
      ...answers
    };

    const { error: updateError } = await adminClient
      .from("assessment_attempts")
      .update({ answers: mergedAnswers })
      .eq("id", attempt_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, answers: mergedAnswers }, { status: 200 });

  } catch (error: unknown) {
    console.error("PUT /api/student/assessments/[id]/attempt Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
