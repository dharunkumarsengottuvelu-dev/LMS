import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
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

    // 2. Fetch Practice Track
    const { data: track, error: trackError } = await adminClient
      .from("practice_tracks")
      .select("*")
      .eq("id", trackId)
      .single() as any;

    if (trackError || !track) {
      return NextResponse.json({ error: "Practice track not found" }, { status: 404 });
    }

    // 3. Security: Check if student is authorized
    const assignedStudents = (track.assigned_students || track.assignedStudents || []).map((s: string) => String(s).toLowerCase());
    const assignedBatches = (track.assigned_batches || track.assignedBatches || []).map((b: string) => String(b).toLowerCase());

    let isAuthorized = assignedStudents.length === 0 && assignedBatches.length === 0;

    if (!isAuthorized) {
      // Check direct student match
      if (
        assignedStudents.includes(studentUserId.toLowerCase()) ||
        assignedStudents.includes(profileId.toLowerCase()) ||
        assignedStudents.includes(studentEmail.toLowerCase()) ||
        assignedStudents.includes(studentFullName.toLowerCase())
      ) {
        isAuthorized = true;
      }

      // Check batch match
      if (!isAuthorized) {
        const { data: batchMembers } = await adminClient
          .from("batch_members")
          .select("batch_id")
          .or(`user_id.eq.${profileId},user_id.eq.${studentUserId}`) as any;

        const studentBatchIds = (batchMembers || []).map((b: any) => b.batch_id);
        if (profile?.batch_id) studentBatchIds.push(profile.batch_id);

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

        if (
          assignedBatches.some((b: string) => 
            studentBatchIds.includes(b) || studentBatchNames.some((n) => n.toLowerCase() === b)
          )
        ) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied. You are not assigned to this practice track." }, { status: 403 });
    }

    // 4. Fetch SubModules & their coding problems / questions
    const subModules = track.sub_modules || track.subModules || [];
    const subModuleIds = subModules.map((sm: any) => sm.id).filter(Boolean);

    // Fetch coding problems linked to these submodules
    let codingProblemsMap: Record<string, any[]> = {};
    if (subModuleIds.length > 0) {
      const { data: codingProblems } = await adminClient
        .from("coding_problems")
        .select("id, title, slug, description, difficulty, assessment_id, time_limit_ms, memory_limit_kb, templates, sample_test_cases")
        .in("assessment_id", subModuleIds) as any;

      if (codingProblems) {
        codingProblems.forEach((cp: any) => {
          if (!codingProblemsMap[cp.assessment_id]) {
            codingProblemsMap[cp.assessment_id] = [];
          }
          const list = codingProblemsMap[cp.assessment_id];
          if (list) {
            list.push(cp);
          }
        });
      }
    }

    // Fetch student's coding submissions
    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status, score, max_score, created_at")
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`) as any;

    const completedProblemsMap = new Map<string, any>();
    (submissions || []).forEach((sub: any) => {
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemsMap.set(sub.problem_id, sub);
      }
    });

    // Fetch assessment attempts
    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("assessment_id, status, score, total_marks, submitted_at")
      .or(`student_id.eq.${profileId},student_id.eq.${studentUserId}`) as any;

    const attemptsMap = new Map<string, any>();
    (attempts || []).forEach((att: any) => {
      if (att.status === "submitted") {
        attemptsMap.set(att.assessment_id, att);
      }
    });

    // Format submodules with enriched problem data and status
    const enrichedSubModules = subModules.map((sm: any, idx: number) => {
      const problems = codingProblemsMap[sm.id] || [];
      const attempt = attemptsMap.get(sm.id);
      const isAttemptCompleted = Boolean(attempt);
      const allProblemsCompleted = problems.length > 0 && problems.every((p: any) => completedProblemsMap.has(p.id));

      const isCompleted = isAttemptCompleted || allProblemsCompleted;

      return {
        id: sm.id,
        subModuleNumber: `1.${idx + 1}`,
        title: sm.title,
        description: sm.description || `Interactive ${sm.type || "coding"} practice module.`,
        type: sm.type || "coding",
        durationMinutes: sm.durationMinutes || sm.duration_minutes || 30,
        totalMarks: sm.totalMarks || sm.total_marks || 100,
        questionCount: problems.length > 0 ? problems.length : (sm.questionCount || 1),
        status: isCompleted ? "completed" : "not_started",
        score: attempt ? attempt.score : isCompleted ? (sm.totalMarks || 100) : 0,
        codingProblems: problems,
        mcqQuestions: sm.mcqQuestions || [],
      };
    });

    const totalSubModules = enrichedSubModules.length;
    const completedCount = enrichedSubModules.filter((sm: any) => sm.status === "completed").length;
    const progressPercentage = totalSubModules > 0 ? Math.round((completedCount / totalSubModules) * 100) : 0;

    return NextResponse.json({
      track: {
        id: track.id,
        title: track.title,
        category: track.category || "General",
        description: track.description || "",
        thumbnail: track.thumbnail || "",
        assignedByName: track.assigned_by_name || track.assignedByName || "Admin",
        subModules: enrichedSubModules,
        totalSubModules,
        completedCount,
        progressPercentage,
      }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("GET /api/student/practices/[id] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
