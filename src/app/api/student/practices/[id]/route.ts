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
    const { id: trackId } = await params;
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

    // 2. Fetch Practice Track
    const { data: dbTrack, error: trackError } = await adminClient
      .from("practice_tracks")
      .select("*")
      .eq("id", trackId)
      .single() as any;

    if (trackError || !dbTrack) {
      return NextResponse.json({ error: "Practice track not found" }, { status: 404 });
    }

    let meta: any = {};
    if (dbTrack.tags && dbTrack.tags[0]) {
      try {
        meta = JSON.parse(dbTrack.tags[0]);
      } catch {}
    }

    const assignedBatches =
      dbTrack.assigned_batches ||
      meta.assignedBatches ||
      meta.assigned_batches ||
      [];

    const assignedStudents =
      dbTrack.assigned_students ||
      meta.assignedStudents ||
      meta.assigned_students ||
      [];

    const isCommon =
      dbTrack.is_common === true ||
      String(dbTrack.is_common) === "true" ||
      meta.isCommon === true ||
      String(meta.isCommon) === "true" ||
      meta.is_common === true ||
      String(meta.is_common) === "true" ||
      (assignedBatches.length === 0 && assignedStudents.length === 0) ||
      assignedBatches.includes("common") ||
      assignedBatches.includes("all");

    const track = {
      id: dbTrack.id,
      title: dbTrack.title,
      category: dbTrack.category,
      difficulty: dbTrack.difficulty || "medium",
      description: meta.description || dbTrack.description || "Practice Track",
      thumbnail: meta.thumbnail || dbTrack.thumbnail || "",
      assigned_by_name: meta.assignedByName || dbTrack.assigned_by_name || dbTrack.assignedByName || "Admin",
      assigned_batches: assignedBatches,
      assigned_students: assignedStudents,
      sub_modules: meta.subModules || dbTrack.sub_modules || dbTrack.subModules || [],
      is_common: isCommon,
      created_at: dbTrack.created_at,
    };

    // 3. SECURITY RULE 8 & 21: Server-side authorization check
    const isAuthorized = isContentVisibleToStudent(track, batchContext);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Access Denied. You do not belong to the assigned batch for this practice track." },
        { status: 403 }
      );
    }

    // 4. Fetch SubModules & their coding problems / questions
    const subModules = track.sub_modules || [];
    const subModuleIds = subModules.map((sm: any) => sm.id).filter(Boolean);

    let codingProblemsMap: Record<string, any[]> = {};
    if (subModuleIds.length > 0) {
      const { data: codingProblems } = await adminClient
        .from("coding_problems")
        .select(
          "id, title, slug, description, difficulty, assessment_id, time_limit_ms, memory_limit_kb, templates, sample_test_cases"
        )
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

    // Fetch student's submissions & attempts
    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status, score, max_score, created_at")
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId}`) as any;

    const completedProblemsMap = new Map<string, any>();
    (submissions || []).forEach((sub: any) => {
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemsMap.set(sub.problem_id, sub);
      }
    });

    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("assessment_id, status, score, total_marks, submitted_at")
      .or(`student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId}`) as any;

    const attemptsMap = new Map<string, any>();
    (attempts || []).forEach((att: any) => {
      if (att.status === "submitted") {
        attemptsMap.set(att.assessment_id, att);
      }
    });

    const enrichedSubModules = subModules.map((sm: any, idx: number) => {
      const problems = codingProblemsMap[sm.id] || [];
      const attempt = attemptsMap.get(sm.id);
      const isAttemptCompleted = Boolean(attempt);
      const allProblemsCompleted =
        problems.length > 0 && problems.every((p: any) => completedProblemsMap.has(p.id));

      const isCompleted = isAttemptCompleted || allProblemsCompleted;

      const combinedCodingQuestions =
        sm.codingQuestions && sm.codingQuestions.length > 0
          ? sm.codingQuestions
          : problems;

      return {
        ...sm,
        id: sm.id,
        subModuleNumber: `1.${idx + 1}`,
        title: sm.title,
        description: sm.description || `Interactive ${sm.type || "coding"} practice module.`,
        type: sm.type || "coding",
        durationMinutes: sm.durationMinutes || sm.duration_minutes || 30,
        totalMarks: sm.totalMarks || sm.total_marks || 100,
        questionCount:
          combinedCodingQuestions.length > 0
            ? combinedCodingQuestions.length
            : sm.questionCount || 1,
        status: isCompleted ? "completed" : "not_started",
        score: attempt ? attempt.score : isCompleted ? sm.totalMarks || 100 : 0,
        sections: sm.sections || [],
        codingProblems: combinedCodingQuestions,
        codingQuestions: combinedCodingQuestions,
        mcqQuestions: sm.mcqQuestions || [],
        hasHiddenTests: sm.hasHiddenTests || false,
        hiddenTestsCode: sm.hiddenTestsCode || "",
        hiddenTestCases: sm.hiddenTestCases || [],
        problemDescription: sm.problemDescription || "",
        starterCode: sm.starterCode || "",
        publicTestCases: sm.publicTestCases || "",
      };
    });

    const totalSubModules = enrichedSubModules.length;
    const completedCount = enrichedSubModules.filter((sm: any) => sm.status === "completed").length;
    const progressPercentage =
      totalSubModules > 0 ? Math.round((completedCount / totalSubModules) * 100) : 0;

    return NextResponse.json(
      {
        track: {
          id: track.id,
          title: track.title,
          category: track.category || "General",
          description: track.description || "",
          thumbnail: track.thumbnail || "",
          assignedByName: track.assigned_by_name || "Admin",
          subModules: enrichedSubModules,
          totalSubModules,
          completedCount,
          progressPercentage,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("GET /api/student/practices/[id] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
