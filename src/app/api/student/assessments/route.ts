import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";
import { extractPracticeIds, isPracticeAssessment } from "@/lib/module-isolation";

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

    // 1. Concurrently resolve student batch context, assessments, and practice tracks
    const [batchContext, { data: dbAssessments }, { data: dbTracks }] = await Promise.all([
      getStudentBatchAccess(adminClient, user),
      adminClient
        .from("assessments")
        .select("id, title, description, type, duration_minutes, total_marks, course_id, assigned_batches, is_common, tags, created_at")
        .order("created_at", { ascending: false }) as any,
      adminClient
        .from("practice_tracks")
        .select("id, sub_modules, tags") as any,
    ]);

    const practiceIdSet = extractPracticeIds(dbTracks || []);

    // 2. Fetch attempts for student with specific columns
    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("id, assessment_id, score, total_marks, percentage, status, created_at, tab_switch_count")
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId},student_id.eq.${user.id}`) as any;

    const attemptsMap = new Map<string, any[]>();
    (attempts || []).forEach((att: any) => {
      const list = attemptsMap.get(att.assessment_id) || [];
      list.push(att);
      attemptsMap.set(att.assessment_id, list);
    });

    const mappedAssessments: any[] = [];

    // Filter dbAssessments - Strict module isolation: never include practice items
    (dbAssessments || []).forEach((a: any) => {
      if (isPracticeAssessment(a, practiceIdSet)) return;

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
        (a.course_id ? [a.course_id] : []);

      const isCommon =
        a.is_common !== undefined
          ? a.is_common
          : meta.isCommon !== undefined
          ? meta.isCommon
          : assignedBatches.length === 0;

      const isVisible = isContentVisibleToStudent(
        {
          is_common: isCommon,
          assigned_batches: assignedBatches,
          assigned_students: meta.assignedStudents || [],
        },
        batchContext
      );

      if (isVisible) {
        mappedAssessments.push({
          id: a.id,
          title: a.title,
          description: a.description || "Assigned Assessment",
          type: a.type || "mcq",
          duration_minutes: a.duration_minutes || a.duration || 60,
          total_marks: a.total_marks || 100,
          isCommon,
          assignedBatches,
          my_attempts: attemptsMap.get(a.id) || [],
        });
      }
    });

    return NextResponse.json({ assessments: mappedAssessments }, { status: 200 });
  } catch (error) {
    console.error("GET /api/student/assessments Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error), assessments: [] },
      { status: 500 }
    );
  }
}
