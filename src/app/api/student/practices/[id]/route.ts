import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage, getTopicThumbnail } from "@/lib/utils";
import { getStudentBatchAccess, isContentVisibleToStudent } from "@/lib/auth/batch-access";

import {
  calculateModuleProgress,
  calculateTrackProgressPercentage,
  calculateCompletedModules,
  calculateAnsweredQuestions,
} from "@/lib/practice-progress";

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
      thumbnail: getTopicThumbnail(dbTrack.title, dbTrack.category, meta.thumbnail || dbTrack.thumbnail),
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

    // Fetch student's submissions & attempts across all possible student identifiers
    const studentFilter = `student_id.eq.${batchContext.profileId},student_id.eq.${batchContext.studentUserId},student_id.eq.${user.id}`;

    const { data: submissions } = await adminClient
      .from("coding_submissions")
      .select("problem_id, status, score, max_score, created_at")
      .or(studentFilter) as any;

    const completedProblemsMap = new Map<string, any>();
    (submissions || []).forEach((sub: any) => {
      if (sub.status === "accepted" || sub.status === "passed") {
        completedProblemsMap.set(sub.problem_id, sub);
      }
    });

    const { data: attempts } = await adminClient
      .from("assessment_attempts")
      .select("assessment_id, status, score, total_marks, submitted_at, answers")
      .or(studentFilter) as any;

    const attemptsMap = new Map<string, any>();
    (attempts || []).forEach((att: any) => {
      if (att.status === "submitted" || att.status === "auto_submitted" || att.status === "passed") {
        attemptsMap.set(att.assessment_id, att);
      }
    });

    let totalQuestionsAcrossTrack = 0;
    let completedQuestionsAcrossTrack = 0;

    const enrichedSubModules = subModules.map((sm: any, idx: number) => {
      const problems = codingProblemsMap[sm.id] || [];
      const combinedCodingQuestions =
        sm.codingQuestions && sm.codingQuestions.length > 0
          ? sm.codingQuestions
          : problems;

      const directMcqs = sm.mcqQuestions?.length || sm.mcqs?.length || 0;
      const sectionMcqs = sm.sections?.flatMap((s: any) => s.mcqQuestions || []).length || 0;
      const mcqsCount = Math.max(directMcqs, sectionMcqs);
      const codingCount = combinedCodingQuestions.length;

      let modTotalQuestions = mcqsCount + codingCount;
      if (modTotalQuestions === 0) {
        modTotalQuestions = sm.questionCount || sm.question_count || 1;
      }

      const attempt = attemptsMap.get(sm.id);
      const isAttemptCompleted = Boolean(
        attempt && (attempt.status === "submitted" || attempt.status === "auto_submitted" || attempt.status === "passed")
      );

      const solvedCodingCount = combinedCodingQuestions.filter((p: any) => completedProblemsMap.has(p.id)).length;

      let answeredInAttempt = 0;
      if (attempt && attempt.answers && typeof attempt.answers === "object") {
        answeredInAttempt = calculateAnsweredQuestions(attempt.answers, modTotalQuestions);
      }
      if (solvedCodingCount > 0) {
        answeredInAttempt = Math.max(answeredInAttempt, solvedCodingCount);
      }

      let modCompletedQuestions = 0;
      let isCompleted = false;
      let isInProgress = false;

      if (isAttemptCompleted) {
        modCompletedQuestions = Math.min(modTotalQuestions, answeredInAttempt);
        if (modCompletedQuestions >= modTotalQuestions && modTotalQuestions > 0) {
          isCompleted = true;
        } else {
          isInProgress = modCompletedQuestions > 0;
        }
      } else if (solvedCodingCount > 0) {
        modCompletedQuestions = Math.min(modTotalQuestions, solvedCodingCount);
        if (modCompletedQuestions >= modTotalQuestions && modTotalQuestions > 0) {
          isCompleted = true;
        } else {
          isInProgress = true;
        }
      } else if (attempt && attempt.status === "in_progress") {
        isInProgress = true;
        modCompletedQuestions = Math.min(modTotalQuestions, answeredInAttempt);
      }

      totalQuestionsAcrossTrack += modTotalQuestions;
      completedQuestionsAcrossTrack += modCompletedQuestions;

      const modulePercentage = calculateModuleProgress(modCompletedQuestions, modTotalQuestions);

      const status: "not_started" | "in_progress" | "completed" = isCompleted
        ? "completed"
        : isInProgress || isAttemptCompleted
        ? "in_progress"
        : "not_started";

      return {
        ...sm,
        id: sm.id,
        subModuleNumber: `1.${idx + 1}`,
        title: sm.title,
        description: sm.description || `Interactive ${sm.type || "coding"} practice module.`,
        type: sm.type || "coding",
        durationMinutes: typeof sm.durationMinutes === "number" ? sm.durationMinutes : (typeof sm.duration_minutes === "number" ? sm.duration_minutes : 0),
        totalMarks: sm.totalMarks || sm.total_marks || 100,
        questionCount: modTotalQuestions,
        totalQuestions: modTotalQuestions,
        completedQuestions: modCompletedQuestions,
        percentage: modulePercentage,
        status,
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
    const completedCount = calculateCompletedModules(enrichedSubModules);
    const progressPercentage = calculateTrackProgressPercentage(
      completedQuestionsAcrossTrack,
      totalQuestionsAcrossTrack
    );

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
          totalModules: totalSubModules,
          completedModules: completedCount,
          totalQuestions: totalQuestionsAcrossTrack,
          completedQuestions: completedQuestionsAcrossTrack,
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
