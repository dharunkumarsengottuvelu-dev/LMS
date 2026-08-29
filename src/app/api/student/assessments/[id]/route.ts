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

    // 2. Fetch assessment from database
    const { data: assessment, error } = await adminClient
      .from("assessments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && assessment) {
      let meta: any = {};
      if (assessment.tags && assessment.tags[0]) {
        try {
          meta = JSON.parse(assessment.tags[0]);
        } catch {}
      }

      const assignedBatches =
        assessment.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        (assessment.course_id ? [assessment.course_id] : []);

      const isCommon =
        assessment.is_common !== undefined
          ? assessment.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      // Rule 8 & 21: Server-side authorization
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
          { error: "Access Denied. You do not belong to the assigned batch for this assessment." },
          { status: 403 }
        );
      }

      return NextResponse.json({
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          type: assessment.type || "mcq",
          durationMinutes: typeof assessment.duration_minutes === "number" ? assessment.duration_minutes : (typeof meta.durationMinutes === "number" ? meta.durationMinutes : 0),
          totalMarks: assessment.total_marks || 100,
          passingMarks: assessment.passing_marks || 40,
          isCommon,
          assignedBatches,
        },
      });
    }

    // 3. Fallback: Check if it's a submodule inside practice_tracks
    const { data: dbTracks } = await adminClient
      .from("practice_tracks")
      .select("*");

    for (const t of dbTracks || []) {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try {
          meta = JSON.parse(t.tags[0]);
        } catch {}
      }

      const subModules = meta.subModules || t.sub_modules || [];
      const sm = subModules.find((s: any) => s.id === id);

      if (sm) {
        const assignedBatches =
          t.assigned_batches ||
          meta.assignedBatches ||
          meta.assigned_batches ||
          [];

        const isCommon =
          t.is_common !== undefined
            ? t.is_common
            : meta.isCommon !== undefined
            ? meta.isCommon
            : assignedBatches.length === 0;

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
            { error: "Access Denied. You do not belong to the assigned batch for this assessment." },
            { status: 403 }
          );
        }

        const parsedDuration =
          typeof sm.durationMinutes === "number"
            ? sm.durationMinutes
            : typeof sm.duration_minutes === "number"
            ? sm.duration_minutes
            : typeof sm.duration === "number"
            ? sm.duration
            : 0;

        return NextResponse.json({
          assessment: {
            id: sm.id,
            title: sm.title,
            description: sm.description,
            type: sm.type || "coding",
            durationMinutes: parsedDuration,
            totalMarks: sm.totalMarks || sm.total_marks || 100,
            passingMarks: Math.floor((sm.totalMarks || 100) / 2),
            trackId: t.id,
            isCommon,
            assignedBatches,
          },
        });
      }
    }

    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/student/assessments/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { answers, score = 0, totalMarks = 100, trackId } = body;

    const adminClient = createAdminClient();

    // 1. Resolve student profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, user_id")
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle() as any;

    const profileId = profile?.id || user.id;
    const studentUserId = user.id;

    // 2. Ensure assessment record exists to satisfy foreign key constraints
    const { data: existingAssessment } = await adminClient
      .from("assessments")
      .select("id")
      .eq("id", id)
      .maybeSingle() as any;

    if (!existingAssessment) {
      await (adminClient.from("assessments") as any).insert({
        id: id,
        title: body.title || "Practice Assessment Module",
        type: body.type || "coding",
        total_marks: totalMarks,
        passing_marks: Math.floor(totalMarks / 2),
        created_by: studentUserId,
        status: "active",
        duration_minutes: body.durationMinutes || 60,
        max_attempts: 10,
        shuffle_questions: false,
        negative_marking: false,
        negative_marks_per_wrong: 0,
      });
    }

    // 3. Insert or update attempt record in database for both profileId and studentUserId
    const attemptPayload = {
      assessment_id: id,
      student_id: profileId,
      status: "submitted",
      score: score,
      total_marks: totalMarks,
      answers: answers || {},
      submitted_at: new Date().toISOString(),
    };

    const { data: attempt, error: attemptError } = await (adminClient
      .from("assessment_attempts") as any)
      .upsert(attemptPayload, { onConflict: "assessment_id,student_id" })
      .select()
      .maybeSingle();

    if (attemptError) {
      // Fallback direct insert if upsert conflict target differs
      await (adminClient.from("assessment_attempts") as any).insert(attemptPayload);
    }

    // If profileId != studentUserId, also ensure studentUserId has a record
    if (profileId !== studentUserId) {
      try {
        await (adminClient.from("assessment_attempts") as any).insert({
          ...attemptPayload,
          student_id: studentUserId,
        });
      } catch {}
    }

    // 4. Save any individual coding submissions to coding_submissions table
    if (answers && typeof answers === "object") {
      for (const [qId, ans] of Object.entries(answers)) {
        if (ans && typeof ans === "object" && (ans as any).code) {
          try {
            await (adminClient.from("coding_submissions") as any).insert({
              problem_id: qId,
              student_id: profileId,
              language: (ans as any).language || "java",
              code: (ans as any).code,
              status: "accepted",
              score: totalMarks,
              max_score: totalMarks,
              submitted_at: new Date().toISOString(),
            });
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Assessment submission recorded in database successfully",
      attempt: attempt || attemptPayload,
    });
  } catch (error) {
    console.error("POST /api/student/assessments/[id] error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
