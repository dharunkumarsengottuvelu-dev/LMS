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
          durationMinutes: assessment.duration_minutes || 60,
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

        return NextResponse.json({
          assessment: {
            id: sm.id,
            title: sm.title,
            description: sm.description,
            type: sm.type || "coding",
            durationMinutes: sm.durationMinutes || sm.duration_minutes || 30,
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
