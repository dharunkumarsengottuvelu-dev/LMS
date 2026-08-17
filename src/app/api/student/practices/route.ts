import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

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

    // 1. Resolve student batch context
    const batchContext = await getStudentBatchAccess(adminClient, user);

    // 2. Query practice_tracks from database
    const { data: dbTracks } = await adminClient
      .from("practice_tracks")
      .select("*")
      .order("created_at", { ascending: false }) as any;

    // 3. Map and Filter authorized tracks
    const allTracks = (dbTracks || []).map((t: any) => {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try {
          meta = JSON.parse(t.tags[0]);
        } catch {}
      }

      const assignedBatches =
        t.assigned_batches ||
        meta.assignedBatches ||
        meta.assigned_batches ||
        [];

      const assignedStudents =
        t.assigned_students ||
        meta.assignedStudents ||
        meta.assigned_students ||
        [];

      const isCommon =
        t.is_common === true ||
        String(t.is_common) === "true" ||
        meta.isCommon === true ||
        String(meta.isCommon) === "true" ||
        meta.is_common === true ||
        String(meta.is_common) === "true" ||
        (assignedBatches.length === 0 && assignedStudents.length === 0) ||
        assignedBatches.includes("common") ||
        assignedBatches.includes("all");

      return {
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: meta.description || t.description || "Practice Track",
        thumbnail: meta.thumbnail || t.thumbnail || "",
        assigned_by_name: meta.assignedByName || t.assigned_by_name || t.assignedByName || "Admin",
        assigned_batches: assignedBatches,
        assigned_students: assignedStudents,
        sub_modules: meta.subModules || t.sub_modules || t.subModules || [],
        is_common: isCommon,
        status: t.status || meta.status || "published",
        created_at: t.created_at,
      };
    });

    const authorizedTracks = allTracks.filter((track: any) =>
      track.status !== "draft" && isContentVisibleToStudent(track, batchContext)
    );

    // 4. Calculate student progress for authorized tracks
    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status")
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId}`) as any;

    const completedProblemIds = new Set<string>();
    (submissions || []).forEach((sub: any) => {
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemIds.add(sub.problem_id);
      }
    });

    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("assessment_id, status, score, total_marks")
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId}`) as any;

    const completedSubModuleIds = new Set<string>();
    (attempts || []).forEach((att: any) => {
      if (att.status === "submitted") {
        completedSubModuleIds.add(att.assessment_id);
      }
    });

    // 5. Map tracks with real module counts and progress
    const mappedTracks = authorizedTracks.map((track: any) => {
      const subModules = (track.sub_modules || track.subModules || []).map((sm: any) => {
        const isCompleted =
          completedSubModuleIds.has(sm.id) ||
          (sm.problemId && completedProblemIds.has(sm.problemId));
        return {
          id: sm.id,
          title: sm.title,
          type: sm.type || "coding",
          durationMinutes: sm.durationMinutes || sm.duration_minutes || 30,
          totalMarks: sm.totalMarks || sm.total_marks || 100,
          questionCount: sm.questionCount || sm.question_count || 1,
          status: isCompleted ? "completed" : "not_started",
        };
      });

      const totalSubModules = subModules.length;
      const completedSubModules = subModules.filter((sm: any) => sm.status === "completed").length;
      const totalProblems = subModules.reduce((acc: number, sm: any) => acc + (sm.questionCount || 1), 0);
      const progressPercentage =
        totalSubModules > 0 ? Math.round((completedSubModules / totalSubModules) * 100) : 0;

      return {
        id: track.id,
        title: track.title,
        category: track.category || "General",
        description: track.description || "Practice Track",
        thumbnail: track.thumbnail || "",
        assignedByName: track.assigned_by_name || track.assignedByName || "Admin",
        subModules,
        totalModules: totalSubModules,
        totalProblems,
        completedModules: completedSubModules,
        progressPercentage,
      };
    });

    // Deduplicate tracks by title & id
    const seenTrackKeys = new Set<string>();
    const uniqueTracks = mappedTracks.filter((t: any) => {
      const key = `${t.title}`.trim().toLowerCase();
      if (seenTrackKeys.has(key)) return false;
      seenTrackKeys.add(key);
      return true;
    });

    return NextResponse.json({ tracks: uniqueTracks }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/student/practices Error:", error);
    return NextResponse.json(
      {
        error: getErrorMessage(error),
        tracks: [],
      },
      { status: 500 }
    );
  }
}
