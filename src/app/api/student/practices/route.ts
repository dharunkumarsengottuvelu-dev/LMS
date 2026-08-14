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
    const studentEmail = user.email || profile?.email || "";
    const studentFullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

    // 2. Get student's batches
    const { data: batchMembers } = await adminClient
      .from("batch_members")
      .select("batch_id")
      .or(`user_id.eq.${profileId},user_id.eq.${studentUserId}`) as any;

    const studentBatchIds: string[] = (batchMembers || []).map((b: any) => b.batch_id).filter(Boolean);
    if (profile?.batch_id) studentBatchIds.push(profile.batch_id);

    // Fetch batch names for these batch IDs
    let studentBatchNames: string[] = [];
    if (profile?.batch_name) studentBatchNames.push(profile.batch_name);
    if (profile?.batch) studentBatchNames.push(profile.batch);

    if (studentBatchIds.length > 0) {
      const { data: batchesData } = await adminClient
        .from("batches")
        .select("id, name, batch_name")
        .in("id", studentBatchIds) as any;

      if (batchesData) {
        batchesData.forEach((b: any) => {
          if (b.name) studentBatchNames.push(b.name);
          if (b.batch_name) studentBatchNames.push(b.batch_name);
        });
      }
    }

    // 3. Get student's enrolled courses
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("course_id")
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`) as any;

    const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);

    // 4. Compile all target assignment identifiers for this student
    const studentTargetIdentifiers = new Set<string>([
      studentUserId,
      profileId,
      studentEmail.toLowerCase(),
      studentFullName.toLowerCase(),
      ...studentBatchIds,
      ...studentBatchNames.map((n) => n.toLowerCase()),
      ...courseIds,
    ]);

    // 5. Query practice_tracks from Supabase
    const { data: dbTracks, error: tracksError } = await adminClient
      .from("practice_tracks")
      .select("*")
      .order("created_at", { ascending: false }) as any;

    // Also check assessment_assignments to see if any submodules are assigned
    const { data: assignments } = await adminClient
      .from("assessment_assignments")
      .select("assessment_id, assigned_to_id, assigned_to_type") as any;

    const assignedAssessmentIds = new Set<string>();
    if (assignments && assignments.length > 0) {
      assignments.forEach((a: any) => {
        const target = String(a.assigned_to_id || "").toLowerCase();
        if (studentTargetIdentifiers.has(target) || studentTargetIdentifiers.has(a.assigned_to_id)) {
          assignedAssessmentIds.add(a.assessment_id);
        }
      });
    }

    // 6. Map and Filter authorized tracks
    const allTracks = (dbTracks || []).map((t: any) => {
      let meta: any = {};
      if (t.tags && t.tags[0]) {
        try {
          meta = JSON.parse(t.tags[0]);
        } catch {}
      }

      return {
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty || "medium",
        description: meta.description || t.description || "Practice Track",
        thumbnail: meta.thumbnail || t.thumbnail || "",
        assigned_by_name: meta.assignedByName || t.assigned_by_name || t.assignedByName || "Admin",
        assigned_batches: meta.assignedBatches || t.assigned_batches || t.assignedBatches || [],
        assigned_students: meta.assignedStudents || t.assigned_students || t.assignedStudents || [],
        sub_modules: meta.subModules || t.sub_modules || t.subModules || [],
        created_at: t.created_at
      };
    });

    const authorizedTracks = allTracks.filter((track: any) => {
      const assignedStudents = (track.assigned_students || []).map((s: string) => String(s).toLowerCase());
      const assignedBatches = (track.assigned_batches || []).map((b: string) => String(b).toLowerCase());
      const subModules = track.sub_modules || [];

      // Check if student directly assigned
      const isStudentAssigned = assignedStudents.some((s: string) => 
        studentTargetIdentifiers.has(s) || s === profileId.toLowerCase() || s === studentUserId.toLowerCase() || s === studentEmail.toLowerCase()
      );
      if (isStudentAssigned) return true;

      // Check if student's batch is assigned
      const isBatchAssigned = assignedBatches.some((b: string) => 
        studentTargetIdentifiers.has(b) || studentBatchNames.some((sbn) => sbn.toLowerCase() === b) || studentBatchIds.includes(b)
      );
      if (isBatchAssigned) return true;

      // Check if any submodule inside track is assigned in assessment_assignments
      const hasAssignedSubModule = subModules.some((sm: any) => assignedAssessmentIds.has(sm.id));
      if (hasAssignedSubModule) return true;

      // If track has NO assigned batches and NO assigned students, consider it open/public practice
      if (assignedStudents.length === 0 && assignedBatches.length === 0) {
        return true;
      }

      return false;
    });

    // 7. Calculate real student progress for each track
    // Fetch student's coding submissions
    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status")
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`) as any;

    const completedProblemIds = new Set<string>();
    (submissions || []).forEach((sub: any) => {
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemIds.add(sub.problem_id);
      }
    });

    // Fetch student's assessment attempts for MCQs/mixed submodules
    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("assessment_id, status, score, total_marks")
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`) as any;

    const completedSubModuleIds = new Set<string>();
    (attempts || []).forEach((att: any) => {
      if (att.status === "submitted") {
        completedSubModuleIds.add(att.assessment_id);
      }
    });

    // 8. Map tracks with real module counts and progress
    const mappedTracks = authorizedTracks.map((track: any) => {
      const subModules = (track.sub_modules || track.subModules || []).map((sm: any) => {
        const isCompleted = completedSubModuleIds.has(sm.id) || (sm.problemId && completedProblemIds.has(sm.problemId));
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
      const progressPercentage = totalSubModules > 0 ? Math.round((completedSubModules / totalSubModules) * 100) : 0;

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

    return NextResponse.json({ tracks: mappedTracks }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/student/practices Error:", error);
    return NextResponse.json({ 
      error: getErrorMessage(error),
      tracks: [] 
    }, { status: 500 });
  }
}
